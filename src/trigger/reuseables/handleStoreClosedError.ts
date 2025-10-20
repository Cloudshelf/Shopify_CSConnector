import { OrganisationSyncUpdateReason } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/core';
import { logger, runs } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

const STORE_CLOSED_ERRORS: Record<string, string> = {
    '401': 'Retailer uninstalled?',
    '402': 'Retailer has outstanding shopify bill',
    '404': 'Retailer Closed',
};

const STORE_CLOSED_ERRORS_MESSAGE: Record<string, OrganisationSyncUpdateReason> = {
    '401': OrganisationSyncUpdateReason.Uninstalled,
    '402': OrganisationSyncUpdateReason.PlatformPaymentRequired,
    '404': OrganisationSyncUpdateReason.Closed,
};

export async function handleStoreClosedError({
    appDataSource,
    err,
    retailer,
    cloudshelfApiUrl,
    runId,
}: {
    appDataSource: EntityManager;
    err: any;
    retailer: RetailerEntity;
    cloudshelfApiUrl: string;
    runId?: string;
}): Promise<void> {
    const errorCode = Object.keys(STORE_CLOSED_ERRORS).find(
        code => typeof err.message === 'string' && err.message.includes(`status code ${code}`),
    );

    if (errorCode) {
        logger.warn(`Ignoring ApolloError with status code ${errorCode} (${STORE_CLOSED_ERRORS[errorCode]})`);
        retailer.syncErrorCode = errorCode;

        const input = { storeClosed: true };
        logger.info(`Reporting retailer closed.`, { input });
        await CloudshelfApiReportUtils.reportCatalogStats(cloudshelfApiUrl, retailer.domain, input);
    }

    const input = {
        apiUrl: cloudshelfApiUrl,
        domainName: retailer.domain,
        reason: errorCode ? STORE_CLOSED_ERRORS_MESSAGE[errorCode] : undefined,
    };

    logger.info(`Request to API to fail organisation sync: ${JSON.stringify(input)}`);
    try {
        await CloudshelfApiOrganisationUtils.failOrganisationSync(input);
    } catch (error) {
        logger.error(`Error in failOrganisationSync - ${retailer.domain}`, error);
    }

    await appDataSource.flush();

    if (errorCode && runId) {
        logger.info(`Ending task run early because retailer is closed`);
        await runs.cancel(runId);
    } else {
        throw err;
    }
}
