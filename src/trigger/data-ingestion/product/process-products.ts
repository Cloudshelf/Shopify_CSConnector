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
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { getDbForTrigger } from '../../reuseables/db';
import { logger, task } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import { IngestionQueue } from 'src/trigger/queues';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

export const PRODUCT_CHUNK_UPLOAD_SIZE = 1000;
export const VARIANT_CHUNK_UPLOAD_SIZE = 500;

export const ProcessProductsTask = task({
    id: 'process-products',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
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

        const AppDataSource = getDbForTrigger();
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
        // Arrays only needed for full sync stats
        let totalProductCount = 0;
        let totalVariantCount = 0;
        let totalImageCount = 0;

        for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(tempFile, chunkSize)) {
            logger.info(`--- Chunk Started ---`);
            const chunkProductInputs: ProductInput[] = [];
            const chunkVariantInputs: UpsertVariantsInput[] = [];
            for (const productInJsonL of productsInJsonLChunk) {
                const product = productInJsonL as any;
                const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;
                if (!product.publishedOnCurrentPublication) {
                    logger.info(
                        `Product is not published. Skipping. Prod: ${product.handle}, publishedOnCurrentPublication: ${product.publishedOnCurrentPublication}`,
                    );
                    continue;
                }

                //Map over shopify product metafields, and create cloudshelf metadata
                const metadata: MetadataInput[] = [];
                if (product.Metafield) {
                    for (const metafield of product.Metafield) {
                        const metafieldInput: MetadataInput = {
                            id: GlobalIDUtils.gidConverter(metafield.id, 'ShopifyMetafield'),
                            key: `${metafield.namespace}-${metafield.key}`,
                            data: metafield.value,
                        };
                        metadata.push(metafieldInput);
                    }
                }

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
                chunkProductInputs.push(productInput);

                //convert shopify product variants to cloudshelf product variants
                if (product.ProductVariant) {
                    for (const [variantIndex, variant] of product.ProductVariant.entries()) {
                        const attributes: KeyValuePairInput[] = [];
                        if (variant.selectedOptions) {
                            for (const opt of variant.selectedOptions) {
                                attributes.push({
                                    key: opt.name,
                                    value: opt.value,
                                });
                            }
                        }

                        const imageUrls = new Set<string>();
                        const metaimages: MetaimageInput[] = [];

                        if (variantIndex === 0) {
                            // We only support images on variants, while shopify supports them on product as well as the variant
                            // we handle this by allowing an image to be marked as the preferred image, which means it will be the
                            // image used for the product before a variant is selected
                            if (product.featuredImage) {
                                imageUrls.add(product.featuredImage.url);
                                metaimages.push({
                                    url: product.featuredImage.url,
                                    preferredImage: true,
                                });
                            }
                            if (product.ProductImage) {
                                for (const image of product.ProductImage) {
                                    if (!imageUrls.has(image.url)) {
                                        imageUrls.add(image.url);
                                        metaimages.push({
                                            url: image.url,
                                            preferredImage: false,
                                        });
                                    }
                                }
                            }
                        }
                        if (variant.image && !imageUrls.has(variant.image.url)) {
                            imageUrls.add(variant.image.url);
                            metaimages.push({
                                url: variant.image.url,
                                preferredImage: false,
                            });
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
                        totalImageCount += metaimages.length;
                        const existingVariantInput = chunkVariantInputs.find(v => v.productId === productId);
                        if (existingVariantInput) {
                            existingVariantInput.variants.push(ProductVariantInput);
                        } else {
                            chunkVariantInputs.push({
                                productId: productId,
                                variants: [ProductVariantInput],
                            });
                        }
                    }
                }

                // Process products immediately for this chunk
                if (chunkProductInputs.length > 0) {
                    logger.info(`Upserting ${chunkProductInputs.length} products from current chunk`);
                    const productChunks = _.chunk(chunkProductInputs, PRODUCT_CHUNK_UPLOAD_SIZE);
                    for (const productChunk of productChunks) {
                        await CloudshelfApiUtils.upsertProducts(
                            cloudshelfAPI,
                            bulkOperationRecord.domain,
                            productChunk,
                            {
                                info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                                warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                                error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                            },
                        );
                    }
                    totalProductCount += chunkProductInputs.length;
                }

                // Process variants immediately for this chunk
                if (chunkVariantInputs.length > 0) {
                    logger.info(`Upserting variants for ${chunkVariantInputs.length} products from current chunk`);
                    const variantChunks = _.chunk(chunkVariantInputs, VARIANT_CHUNK_UPLOAD_SIZE);
                    for (const variantChunk of variantChunks) {
                        await CloudshelfApiUtils.upsertProductVariants(
                            cloudshelfAPI,
                            bulkOperationRecord.domain,
                            variantChunk,
                        );
                    }
                    totalVariantCount += chunkVariantInputs.reduce((acc, val) => acc + val.variants.length, 0);
                }

                logger.info(`--- Chunk finished ---`);
            }
        }

        logger.info(
            `Finished processing all chunks. Total products: ${totalProductCount}, Total variants: ${totalVariantCount}`,
        );

        logger.info(`Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);

        if (payload.fullSync) {
            const input = {
                knownNumberOfProductGroups: undefined,
                knownNumberOfProducts: totalProductCount,
                knownNumberOfProductVariants: totalVariantCount,
                knownNumberOfImages: totalImageCount,
            };
            logger.info(`Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`);
            await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, bulkOperationRecord.domain, input);
        }

        await handleComplete(em, 'job complete', retailer);
    },
});
