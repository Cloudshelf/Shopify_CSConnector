# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server with environment
yarn start:dev:env=local   # Local development
yarn start:dev:env=dev     # Development environment
yarn start:dev:env=prod    # Production environment

# Build and production
yarn build                 # Build with Sentry source maps
yarn start:prod           # Run production build
```

### Database Operations
```bash
yarn db:generate:migration  # Create new migration
yarn db:migrate:up         # Run migrations
yarn db:migrate:down       # Rollback migrations
```

### GraphQL Code Generation
```bash
yarn codegen:cloudshelf          # Generate Cloudshelf API types
yarn codegen:shopifyAdmin        # Generate Shopify Admin API types
yarn codegen:shopifyStorefront   # Generate Shopify Storefront API types
```

### Background Jobs (Trigger.dev)
```bash
yarn trigger:dev                # Development mode
yarn trigger:deploy:staging     # Deploy to staging
yarn trigger:deploy:production  # Deploy to production
```

## Architecture

### Core Stack
- **NestJS** with TypeScript for the main application
- **MikroORM** with PostgreSQL for data persistence
- **Apollo GraphQL** for API layer
- **Trigger.dev v4** for background job processing
- **Sentry** for monitoring and error tracking

### Module Structure
The application follows NestJS module patterns with domain-driven organization:

- **Shopify Module**: Handles OAuth, sessions, webhooks, and API integration
- **Retailer Module**: Core business entity management
- **Data Ingestion Module**: Bulk data processing and sync operations
- **Engine Module**: Stock level and inventory management
- **GraphQL Module**: API schema and resolvers
- **Database Module**: ORM configuration and entity management

### GraphQL Pattern
Multiple GraphQL configurations for different APIs:
- `src/graphql/cloudshelf/` - Cloudshelf API integration
- `src/graphql/shopifyAdmin/` - Shopify Admin API
- `src/graphql/shopifyStorefront/` - Shopify Storefront API

Each has its own codegen configuration and generated TypeScript types in `generated/` directories.

### Background Jobs
Jobs are organized in `src/trigger/` by domain:
- `data-ingestion/` - Product, order, and location sync
- `scheduled/` - Safety sync and reporting
- Machine sizes and costs are configurable per retailer

### Database Patterns
- Base entity class with common fields in `src/modules/database/abstract-entities/`
- Migrations in `src/modules/database/migrations/`
- Entity definitions centralized in `entities.ts`

### Configuration
Environment-based configuration with Joi validation schemas in `src/modules/configuration/schemas/`. Supports local/dev/prod environments.

## Important Notes

### Shopify Integration
- Uses a custom patch for `@nestjs-shopify/core` to support private Shopify apps
- Custom session storage with database persistence
- HMAC validation supports both standard and private app authentication

### Development Workflow
1. Make code changes
2. Run database migrations if schema changes: `yarn db:migrate:up`
3. Regenerate GraphQL types if queries/mutations change: `yarn codegen:*`
4. Test background jobs locally: `yarn trigger:dev`

### Error Handling
Comprehensive error handling with Sentry integration and structured logging using ULID request tracking.