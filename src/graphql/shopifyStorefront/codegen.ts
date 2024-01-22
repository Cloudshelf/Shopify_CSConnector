import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'environment-variables/.local' });

const config: CodegenConfig = {
    overwrite: true,
    schema: {
        [process.env.SHOPIFY_API_URL_STOREFRONT!]: {
            headers: {
                'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN_STOREFRONT!,
            },
        },
    },
    generates: {
        'src/graphql/shopifyStorefront/generated/shopifyStorefront.ts': {
            plugins: ['typescript', 'typescript-document-nodes', 'typescript-operations'],
            config: {
                nameSuffix: 'Document',
            },
        },
        'src/graphql/shopifyStorefront/generated/shopifyStorefront.schema.json': {
            plugins: ['introspection'],
        },
    },
    documents: 'src/graphql/shopifyStorefront/**/*.graphql',
};

export default config;
