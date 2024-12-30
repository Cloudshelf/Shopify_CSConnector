import {
    KeyValuePairInput,
    MetadataInput,
    MetaimageInput,
    ProductInput,
    ProductVariantInput,
    UpsertVariantsInput,
} from '../../../graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import _ from 'lodash';
import { CloudshelfApiUtils } from '../../../modules/cloudshelf/cloudshelf.api.util';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { CollectionJobUtils } from '../../../modules/data-ingestion/collection.job.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { RetailerUtils } from '../../../modules/retailer/retailer.utils';
import { AppDataSource } from '../../../trigger/reuseables/orm';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { S3Utils } from '../../../utils/S3Utils';
import { logger, task } from '@trigger.dev/sdk/v3';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

export const PRODUCT_CHUNK_UPLOAD_SIZE = 1000;
export const VARIANT_CHUNK_UPLOAD_SIZE = 500;

export const ProcessProductsTask = task({
    id: 'process-products',
    queue: {
        name: `ingestion`,
        concurrencyLimit: 1,
    },
    run: async (payload: { remoteBulkOperationId: string; fullSync: boolean }, { ctx }) => {
        logger.info('Payload', payload);
        const handleComplete = async (em: EntityManager, msg: string, retailer?: RetailerEntity) => {
            if (retailer) {
                retailer.lastProductSync = new Date();
                await CollectionJobUtils.scheduleTriggerJob(retailer, payload.fullSync, undefined, {
                    info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                });
            }
            logger.info(`Handle Complete: ${msg}`);
            await em.flush();
        };
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }
        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;
        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }
        const connectorHost = process.env.SHOPIFY_CONNECTOR_HOST;
        if (!connectorHost) {
            logger.error(`SHOPIFY_CONNECTOR_HOST is not set`);
            throw new Error(`SHOPIFY_CONNECTOR_HOST is not set`);
        }
        const cloudflarePublicEndpoint = process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
        if (!cloudflarePublicEndpoint) {
            logger.error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
            throw new Error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
        }
        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });
        const bulkOperationRecord = await BulkOperationUtils.getOneByThirdPartyId(em, payload.remoteBulkOperationId);
        if (!bulkOperationRecord) {
            logger.error(`Bulk operation record not found for id "${payload.remoteBulkOperationId}"`);
            throw new Error(`Bulk operation record not found for id "${payload.remoteBulkOperationId}"`);
        }
        logger.info(`Consuming products for bulk operation "${payload.remoteBulkOperationId}"`, {
            bulkOperationRecord,
        });
        const retailer = await em.findOne(RetailerEntity, { domain: bulkOperationRecord.domain });
        if (!retailer) {
            logger.error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
            throw new Error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
        }
        retailer.syncErrorCode = null;
        if (!bulkOperationRecord.dataUrl || bulkOperationRecord.status !== BulkOperationStatus.Completed) {
            logger.warn(`Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`);
            await handleComplete(
                em,
                `No Data URL, or shopify job failed. Status: ${bulkOperationRecord.status}`,
                retailer,
            );
            //if shopify didn't return any data... there is nothing we can do here
            return;
        }
        const tempFileId = ulid();
        const tempFile = `/tmp/${tempFileId}.jsonl`;
        logger.info(`Downloading data url: ${bulkOperationRecord.dataUrl} to ${tempFile}`);
        const writer = createWriteStream(tempFile);
        await axios.get(bulkOperationRecord.dataUrl, { responseType: 'stream' }).then(response => {
            response.data.pipe(writer);
            return finished(writer);
        });
        if (payload.fullSync) {
            logger.info(`Full product update`);
        } else {
            logger.info(`Partial product update`);
        }
        const chunkSize = 1000;
        logger.info(`Reading data file in chunks of ${chunkSize}`);
        const productInputs: ProductInput[] = [];
        const allProductShopifyIdsFromThisFile: string[] = [];
        const allVariantShopifyIdsFromThisFile: string[] = [];
        const productIdsToExplicitlyEnsureDeleted: string[] = [];
        const variantInputs: UpsertVariantsInput[] = [];
        let imageCount = 0;
        for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(tempFile, chunkSize)) {
            logger.info(`--- Chunk Started ---`);
            for (const productInJsonL of productsInJsonLChunk) {
                const product = productInJsonL as any;
                const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;
                allProductShopifyIdsFromThisFile.push(productId);
                if (product.status.toLowerCase() !== 'active' || !product.publishedOnCurrentPublication) {
                    logger.info(
                        `Product is inactive or not published. Skipping. Prod: ${product.handle}, status: ${product.status}, publishedOnCurrentPublication: ${product.publishedOnCurrentPublication}`,
                    );
                    productIdsToExplicitlyEnsureDeleted.push(productId);
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
                        }
                        (product.ProductImage ?? []).map((image: any) => {
                            //check if metaimages already has this image, if so, don't add it again
                            if (metaimages.some(m => m.url === image.url)) {
                                return;
                            }
                            metaimages.push({
                                url: image.url,
                                preferredImage: false,
                            });
                        });
                    }
                    if (variant.image) {
                        if (!metaimages.some(m => m.url === variant.image.url)) {
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
                        //We don't yet support variant metadata
                        metadata: [],
                    };
                    imageCount += metaimages.length;
                    allVariantShopifyIdsFromThisFile.push(ProductVariantInput.id);
                    const existingVariantInput = variantInputs.find(v => v.productId === productId);
                    if (existingVariantInput) {
                        existingVariantInput.variants.push(ProductVariantInput);
                    } else {
                        variantInputs.push({
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
            await CloudshelfApiUtils.upsertProducts(cloudshelfAPI, bulkOperationRecord.domain, chunk, {
                info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
            });
        }
        logger.info(
            `Upserting variants for ${variantInputs.length} products to cloudshelf for current file, in chunks of ${VARIANT_CHUNK_UPLOAD_SIZE}`,
        );
        const chunkedVariantInputs = _.chunk(variantInputs, VARIANT_CHUNK_UPLOAD_SIZE);
        for (const variantInput of chunkedVariantInputs) {
            logger.info(`Upserting ${variantInput.length} variants to cloudshelf for current file`);
            await CloudshelfApiUtils.upsertProductVariants(cloudshelfAPI, bulkOperationRecord.domain, variantInput);
        }
        logger.info(`allProductShopifyIdsFromThisFile`, { allProductShopifyIdsFromThisFile });
        if (payload.fullSync) {
            //For a full sync, we know we should have seen all the ids, so we can call the keepKnownProductsViaFile mutation, which will delete any products that were not in the file
            const productContentToSave: { id: string }[] = [];
            //all the IDS that exist in allProductShopifyIdsFromThisFile and do not exist in productIdsToExplicitlyEnsureDeleted should added to contentToSave
            for (const id of allProductShopifyIdsFromThisFile) {
                if (!productIdsToExplicitlyEnsureDeleted.includes(id)) {
                    productContentToSave.push({ id: id });
                }
            }
            const productFileName = `${process.env.RELEASE_TYPE}_${retailer.domain}_products_${ulid()}.json`;
            let productUrl = cloudflarePublicEndpoint;
            if (!productUrl.endsWith('/')) {
                productUrl += '/';
            }
            productUrl += `${productFileName}`;
            const fileContent = JSON.stringify(productContentToSave);
            const didProductFileUpload = await S3Utils.UploadJsonFile(
                fileContent,
                'product-deletion-payloads',
                productFileName,
            );
            logger.info(`Product deletion file uploaded: ${fileContent}`);
            if (didProductFileUpload) {
                logger.info(`Starting delete products via file`);
                await CloudshelfApiUtils.keepKnownProductsViaFile(
                    cloudshelfAPI,
                    bulkOperationRecord.domain,
                    productUrl,
                );
                logger.info(`Finished delete products via file`);
            }
            const variantContentToSave: { id: string }[] = [];
            for (const id of allVariantShopifyIdsFromThisFile) {
                variantContentToSave.push({ id: id });
            }
            const variantFileName = `${process.env.RELEASE_TYPE}_${retailer.domain}_variants_${ulid()}.json`;
            let variantUrl = cloudflarePublicEndpoint;
            if (!variantUrl.endsWith('/')) {
                variantUrl += '/';
            }
            variantUrl += `${variantFileName}`;
            const didVariantFileUpload = await S3Utils.UploadJsonFile(
                JSON.stringify(variantContentToSave),
                'product-deletion-payloads',
                variantFileName,
            );
            if (didVariantFileUpload) {
                logger.info(`Starting delete variants via file`);
                await CloudshelfApiUtils.keepKnownVariantsViaFile(
                    cloudshelfAPI,
                    bulkOperationRecord.domain,
                    variantUrl,
                );
                logger.info(`Finished delete variants via file`);
            }
        }
        logger.info(`Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);
        if (payload.fullSync) {
            const sumOfVariants = variantInputs.reduce((acc, val) => acc + val.variants.length, 0);
            const input = {
                knownNumberOfProductGroups: undefined,
                knownNumberOfProducts: productInputs.length,
                knownNumberOfProductVariants: sumOfVariants,
                knownNumberOfImages: imageCount,
            };
            logger.info(`Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`);
            await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, bulkOperationRecord.domain, input);
        }
        await handleComplete(em, 'job complete', retailer);
    },
});
