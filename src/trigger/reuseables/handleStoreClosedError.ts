import { OrganisationSyncUpdateReason } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/core';
import { AbortTaskRunError, logger, runs } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { PAYMENT_REQUIRED_ERROR_CODE } from 'src/utils/ShopifyConstants';

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
    runId?: string,
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

    const input = {
        apiUrl: cloudshelfApiUrl,
        domainName: retailer.domain,
        reason:
            errorCode === PAYMENT_REQUIRED_ERROR_CODE
                ? OrganisationSyncUpdateReason.PlatformPaymentRequired
                : undefined,
    };

    logger.info(`Request to API to fail organisation sync: ${JSON.stringify(input)}`);
    try {
        await CloudshelfApiOrganisationUtils.failOrganisationSync(input);
    } catch (error) {
        logger.error(`Error in failOrganisationSync - ${retailer.domain}`, error);
    }

    await appDataSource.flush();

    if (errorCode) {
        if (runId) {
            logger.info(`Ending task run early because retailer is closed`);
            await runs.cancel(runId);
        } else {
            throw new AbortTaskRunError(`Store closed: ${STORE_CLOSED_ERRORS[errorCode]} (${errorCode})`);
        }
    } else {
        throw err;
    }
}
