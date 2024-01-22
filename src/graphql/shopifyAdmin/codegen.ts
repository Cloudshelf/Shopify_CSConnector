import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'environment-variables/.local' });

const config: CodegenConfig = {
    overwrite: true,
    schema: {
        [process.env.SHOPIFY_API_URL!]: {
            headers: {
                'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
            },
        },
    },
    generates: {
        'src/graphql/shopifyAdmin/generated/shopifyAdmin.ts': {
            plugins: ['typescript', 'typescript-document-nodes', 'typescript-operations'],
            config: {
                nameSuffix: 'Document',
            },
        },
        'src/graphql/shopifyAdmin/generated/shopifyAdmin.schema.json': {
            plugins: ['introspection'],
        },
    },
    documents: 'src/graphql/shopifyAdmin/**/*.graphql',
};

export default config;
