import {
    KeyValuePairInput,
    MetadataInput,
    MetaimageInput,
    OrganisationSyncRecoveryReason,
    ProductInput,
    ProductVariantInput,
    SyncStage,
    UpsertVariantsInput,
} from 'src/graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus, ProductVariantInventoryPolicy } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import _ from 'lodash';
import { AbortTaskRunError, logger } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { BulkOperation } from 'src/modules/data-ingestion/bulk.operation.entity';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerSyncEnvironmentConfig } from 'src/trigger/reuseables/env_validation';
import { getLoggerHelper } from 'src/trigger/reuseables/loggerObject';
import { SyncOptions, SyncStyle } from 'src/trigger/syncOptions.type';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { handleStoreClosedError } from '../../../reuseables/handleStoreClosedError';
import { requestAndWaitForBulkOperation } from '../../../reuseables/requestAndWaitForBulkOperation';
import { deleteTempFile, downloadTempFile } from '../../../reuseables/tempFileUtils';
import { buildQueryProductInfo } from '../queries/buildQueryProductInfo';

export const PROCESS_PRODUCTS_JSONL_CHUNK_SIZE = 1000;
export const PRODUCT_CHUNK_UPLOAD_SIZE = 1000;
export const VARIANT_CHUNK_UPLOAD_SIZE = 500;

export async function handleSyncProducts(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
    runId: string,
    recoveryReason?: OrganisationSyncRecoveryReason,
) {
    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.RequestProducts,
        recoveryReason,
    });

    if (syncOptions.style === SyncStyle.FULL) {
        logger.info('Building Product Data Bulk Operation Payload; Entire Store');
    } else {
        logger.info(
            `Building Product Data Bulk Operation Payload; Only Data changed since ${
                syncOptions.changesSince ? syncOptions.changesSince.toISOString() : 'UNDEFINED'
            }`,
        );
    }

    const tags = TriggerTagsUtils.createTags({
        domain: retailer.domain,
        retailerId: retailer.id,
        syncStage: SyncStage.RequestProducts,
    });

    const queryPayload = await buildQueryProductInfo(retailer, syncOptions.changesSince);
    let requestedBulkOperation: BulkOperation | undefined = undefined;
    try {
        requestedBulkOperation = await requestAndWaitForBulkOperation({
            appDataSource,
            retailer,
            operationType: BulkOperationType.ProductSync,
            queryPayload,
            syncStyle: syncOptions.style,
            timeoutSeconds: 600,
            maxWaits: 100,
            logs: getLoggerHelper(),
            waitpointTags: tags,
        });
    } catch (err) {
        await handleStoreClosedError({ appDataSource, err, retailer, cloudshelfApiUrl: env.CLOUDSHELF_API_URL, runId });
    }

    if (!requestedBulkOperation) {
        throw new AbortTaskRunError(`Missing Bulk Operation`);
    }

    if (requestedBulkOperation.status === BulkOperationStatus.Running) {
        throw new AbortTaskRunError(`Bulk Operation still running after max wait`);
    }

    if (!requestedBulkOperation.dataUrl) {
        //no need to sync anything
        logger.info('No dataURL exists after bulk operation finished');
        return;
    }

    // Download the bulk operation data to a temp file
    let tempFilePath: string | undefined;
    try {
        tempFilePath = await downloadTempFile(requestedBulkOperation.dataUrl);

        //Tell the Cloudshelf API that we are now processing products
        await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
            apiUrl: env.CLOUDSHELF_API_URL,
            retailer,
            syncStage: SyncStage.ProcessProducts,
            recoveryReason,
        });

        //setup some storage
        const productInputs: ProductInput[] = [];
        const variantInputsMap = new Map<string, UpsertVariantsInput>(); // Map product ID to variants
        let imageCount = 0;

        //Read all the JSONL data into our storage
        for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(
            tempFilePath,
            PROCESS_PRODUCTS_JSONL_CHUNK_SIZE,
        )) {
            logger.info(`--- Chunk Started ---`);
            for (const productInJsonL of productsInJsonLChunk) {
                const product = productInJsonL as any;
                const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;
                if ('publishedOnCurrentPublication' in product && product.publishedOnCurrentPublication === false) {
                    logger.info(
                        `Product is not published. Skipping. Prod: ${product.handle}, publishedOnCurrentPublication: ${product.publishedOnCurrentPublication}`,
                    );
                    continue;
                }

                //Map over shopify product metafields, and create cloudshelf metadata
                const metadata: MetadataInput[] = [];
                (product.Metafield ?? []).map((metafield: any) => {
                    const metafieldInput: MetadataInput = {
                        id: GlobalIDUtils.gidConverter(metafield.id, 'ShopifyMetafield'),
                        key: `${metafield.namespace}-${metafield.key}`,
                        data: metafield.value,
                    };
                    metadata.push(metafieldInput);
                });
                //convert shopify product data to cloudshelf product data
                const productInput: ProductInput = {
                    id: productId!,
                    displayName: product.title,
                    handle: product.handle,
                    description: product.descriptionHtml,
                    vendor: product.vendor,
                    tags: product.tags,
                    productType: product.productType,
                    metadata: metadata,
                };
                productInputs.push(productInput);
                //convert shopify product variants to cloudshelf product variants
                (product.ProductVariant ?? []).map((variant: any, variantIndex: number) => {
                    const attributes: KeyValuePairInput[] = [];
                    (variant.selectedOptions ?? []).map((opt: any) => {
                        attributes.push({
                            key: opt.name,
                            value: opt.value,
                        });
                    });
                    const imageUrls = new Set<string>();
                    const metaimages: MetaimageInput[] = [];
                    if (variantIndex === 0) {
                        // We only support images on variants, while shopify supports them on product as well as the variant
                        // we handle this by allowing an image to be marked as the preferred image, which means it will be the
                        // image used for the product before a variant is selected
                        if (product.featuredImage) {
                            metaimages.push({
                                url: product.featuredImage.url,
                                preferredImage: true,
                            });

                            imageUrls.add(product.featuredImage.url);
                        }
                        (product.ProductImage ?? []).map((image: any) => {
                            if (!imageUrls.has(image.url)) {
                                metaimages.push({
                                    url: image.url,
                                    preferredImage: false,
                                });
                                imageUrls.add(image.url);
                            }
                        });
                    }
                    if (variant.image) {
                        if (!imageUrls.has(variant.image.url)) {
                            metaimages.push({
                                url: variant.image.url,
                                preferredImage: false,
                            });
                        }
                    }
                    const currentPrice = parseFloat(variant.price);
                    let originalPrice = currentPrice;
                    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
                        const compareAtPrice = parseFloat(variant.compareAtPrice);
                        originalPrice = compareAtPrice;
                        if (compareAtPrice < currentPrice) {
                            originalPrice = currentPrice;
                        }
                    }

                    const ProductVariantInput: ProductVariantInput = {
                        id: GlobalIDUtils.gidConverter(variant.id, 'ShopifyProductVariant'),
                        position: variantIndex,
                        displayName: variant.title,
                        currentPrice: currentPrice,
                        originalPrice: originalPrice,
                        sku: variant.sku ?? '',
                        barcode: variant.barcode ?? '',
                        //We only support in stock / out of stock not stock count in v3
                        isInStock: variant.sellableOnlineQuantity > 0,
                        attributes: attributes,
                        availableToPurchase: variant.availableForSale,
                        metaimages: metaimages,
                        inventoryPolicy: variant.inventoryItem?.tracked
                            ? variant.inventoryPolicy
                            : ProductVariantInventoryPolicy.Continue,
                        //We don't yet support variant metadata
                        metadata: [],
                    };

                    imageCount += metaimages.length;
                    const existingVariantInput = variantInputsMap.get(productId);
                    if (existingVariantInput) {
                        existingVariantInput.variants.push(ProductVariantInput);
                    } else {
                        variantInputsMap.set(productId, {
                            productId: productId,
                            variants: [ProductVariantInput],
                        });
                    }
                });
            }
            logger.info(`--- Chunk finished ---`);
        }

        logger.info(
            `Upserting ${productInputs.length} products to cloudshelf for current file, in chunks of ${PRODUCT_CHUNK_UPLOAD_SIZE}`,
        );
        const chunkedProductInputs = _.chunk(productInputs, PRODUCT_CHUNK_UPLOAD_SIZE);
        for (const chunk of chunkedProductInputs) {
            logger.info(`Upserting ${chunk.length} products to cloudshelf for current file`);
            await CloudshelfApiProductUtils.upsertProducts(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                chunk,
                getLoggerHelper(),
            );
        }

        logger.info(
            `Upserting variants for ${variantInputsMap.size} products to cloudshelf for current file, in chunks of ${VARIANT_CHUNK_UPLOAD_SIZE}`,
        );
        const variantInputs = Array.from(variantInputsMap.values());
        const chunkedVariantInputs = _.chunk(variantInputs, VARIANT_CHUNK_UPLOAD_SIZE);
        for (const variantInput of chunkedVariantInputs) {
            logger.info(`Upserting ${variantInput.length} variants to cloudshelf for current file`);
            await CloudshelfApiProductUtils.upsertProductVariants(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                variantInput,
                getLoggerHelper(),
            );
        }

        retailer.lastProductSync = new Date();
        await appDataSource.flush();

        if (syncOptions.style === SyncStyle.FULL) {
            const sumOfVariants = variantInputs.reduce((acc, val) => acc + val.variants.length, 0);
            const input = {
                knownNumberOfProductGroups: undefined,
                knownNumberOfProducts: productInputs.length,
                knownNumberOfProductVariants: sumOfVariants,
                knownNumberOfImages: imageCount,
            };
            logger.info(`Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`);
            await CloudshelfApiReportUtils.reportCatalogStats(env.CLOUDSHELF_API_URL, retailer.domain, input);
        }
    } catch (err) {
        await CloudshelfApiOrganisationUtils.failOrganisationSync({
            apiUrl: env.CLOUDSHELF_API_URL,
            domainName: retailer.domain,
        });
        throw new AbortTaskRunError(`Unknown Error in HandleSyncProducts: ${JSON.stringify(err)}`);
    } finally {
        // Ensure temp file is cleaned up even if an error occurs
        if (tempFilePath) {
            await deleteTempFile(tempFilePath);
        }
    }
}
