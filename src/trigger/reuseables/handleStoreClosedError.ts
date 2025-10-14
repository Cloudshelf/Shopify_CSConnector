import { OrganisationSyncUpdateReason } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/core';
import { AbortTaskRunError, logger } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { LogsInterface } from 'src/modules/cloudshelf/logs.interface';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

const STORE_CLOSED_ERRORS: Record<string, string> = {
    '401': 'Retailer uninstalled?',
    '402': 'Retailer has outstanding shopify bill',
    '404': 'Retailer Closed',
};

export async function handleStoreClosedError(
    appDataSource: EntityManager,
    err: any,
    retailer: RetailerEntity,
    cloudshelfApiUrl: string,
): Promise<void> {
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

    await CloudshelfApiOrganisationUtils.failOrganisationSync({
        apiUrl: cloudshelfApiUrl,
        domainName: retailer.domain,
        reason: errorCode === '402' ? OrganisationSyncUpdateReason.PlatformPaymentRequired : undefined,
    });

    await appDataSource.flush();

    if (errorCode) {
        // Throw AbortTaskRunError to prevent retries for known store closed scenarios
        throw new AbortTaskRunError(`Store closed: ${STORE_CLOSED_ERRORS[errorCode]} (${errorCode})`);
    } else {
        throw err;
    }
}
