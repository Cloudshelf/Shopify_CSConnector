import {
    KeyValuePairInput,
    MetadataInput,
    MetaimageInput,
    ProductInput,
    ProductVariantInput,
    UpsertVariantsInput,
} from '../src/graphql/cloudshelf/generated/cloudshelf';
import * as _ from 'lodash';
import { GlobalIDUtils } from '../src/utils/GlobalIDUtils';
import { JsonLUtils } from '../src/utils/JsonLUtils';

export async function runTest() {
    console.log('Hello from test.ts');

    const productInputs: ProductInput[] = [];
    const allProductShopifyIdsFromThisFile: string[] = [];
    const productIdsToExplicitlyEnsureDeleted: string[] = [];
    const variantInputs: UpsertVariantsInput[] = [];

    const chunkSize = 1000;
    const tempFile = `./test-content/made_the_edit_single_product.jsonl`;
    for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(tempFile, chunkSize)) {
        const shopifyIdsForThisChunk = productsInJsonLChunk.map((p: any) => p.id);

        //
        for (const productInJsonL of productsInJsonLChunk) {
            const product = productInJsonL as any;
            const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;

            if (product.status.toLowerCase() !== 'active' || !product.publishedOnCurrentPublication) {
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
                description: product.descriptionHtml,
                vendor: product.vendor,
                tags: product.tags,
                productType: product.productType,
                metadata: metadata,
            };
            productInputs.push(productInput);

            //convert shopify product variants to cloudshelf product variants
            (product.ProductVariant ?? []).reverse().map((variant: any, variantIndex: number) => {
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
                    //We only support in stock / out of stock not stock count in v3
                    isInStock: variant.sellableOnlineQuantity > 0,
                    attributes: attributes,
                    availableToPurchase: variant.availableForSale,
                    metaimages: metaimages,
                    //We don't yet support variant metadata
                    metadata: [],
                };

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
    }

    console.log('productInputs', JSON.stringify(productInputs));
    console.log('variantInputs', JSON.stringify(variantInputs));
}
