import { deleteAllWebhooksForRetailer } from '../../tools/utils/deleteAllWebhooksForRetailer';
import { RetailerEntity } from '../retailer.entity';
import { RetailerEntityResolver } from '../retailer.resolver';
import { RetailerService } from '../retailer.service';

jest.mock('../retailer.service', () => ({
    RetailerService: jest.fn(),
}));
jest.mock('../../tools/utils/deleteAllWebhooksForRetailer', () => ({
    deleteAllWebhooksForRetailer: jest.fn(),
}));
jest.mock('src/decorators/telemetry', () => ({
    Telemetry: () => () => {},
}));
jest.mock('src/utils/ExtendedLogger', () => ({
    ExtendedLogger: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    })),
}));
jest.mock('../../auth/verify-request-is-from-cloudshelf-api', () => ({
    VerifyRequestIsFromCloudshelfAPI: () => () => {},
}));

const mockDeleteAllWebhooksForRetailer = deleteAllWebhooksForRetailer as jest.Mock;

describe('RetailerEntityResolver.unregisterWebhooksForOrganisations', () => {
    let resolver: RetailerEntityResolver;
    let retailerService: jest.Mocked<Pick<RetailerService, 'getByDomain'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        retailerService = {
            getByDomain: jest.fn(),
        };
        resolver = new RetailerEntityResolver(retailerService as unknown as RetailerService);
    });

    it('returns true immediately when domainNames is empty', async () => {
        const result = await resolver.unregisterWebhooksForOrganisations({ domainNames: [] });

        expect(result).toBe(true);
        expect(retailerService.getByDomain).not.toHaveBeenCalled();
        expect(mockDeleteAllWebhooksForRetailer).not.toHaveBeenCalled();
    });

    it('normalises domain names to lowercase before processing', async () => {
        const retailer = { id: '1', domain: 'example.myshopify.com' } as RetailerEntity;
        retailerService.getByDomain.mockResolvedValue(retailer);
        mockDeleteAllWebhooksForRetailer.mockResolvedValue(undefined);

        await resolver.unregisterWebhooksForOrganisations({ domainNames: ['EXAMPLE.myshopify.com'] });

        expect(retailerService.getByDomain).toHaveBeenCalledWith('example.myshopify.com');
    });

    it('returns true and deletes webhooks for all found retailers', async () => {
        const retailerA = { id: '1', domain: 'a.myshopify.com' } as RetailerEntity;
        const retailerB = { id: '2', domain: 'b.myshopify.com' } as RetailerEntity;
        retailerService.getByDomain.mockResolvedValueOnce(retailerA).mockResolvedValueOnce(retailerB);
        mockDeleteAllWebhooksForRetailer.mockResolvedValue(undefined);

        const result = await resolver.unregisterWebhooksForOrganisations({
            domainNames: ['a.myshopify.com', 'b.myshopify.com'],
        });

        expect(result).toBe(true);
        expect(mockDeleteAllWebhooksForRetailer).toHaveBeenCalledTimes(2);
        expect(mockDeleteAllWebhooksForRetailer).toHaveBeenCalledWith(retailerA);
        expect(mockDeleteAllWebhooksForRetailer).toHaveBeenCalledWith(retailerB);
    });

    it('skips and continues when a retailer is not found for a domain', async () => {
        const retailer = { id: '2', domain: 'b.myshopify.com' } as RetailerEntity;
        retailerService.getByDomain.mockResolvedValueOnce(null).mockResolvedValueOnce(retailer);
        mockDeleteAllWebhooksForRetailer.mockResolvedValue(undefined);

        const result = await resolver.unregisterWebhooksForOrganisations({
            domainNames: ['unknown.myshopify.com', 'b.myshopify.com'],
        });

        expect(result).toBe(true);
        expect(mockDeleteAllWebhooksForRetailer).toHaveBeenCalledTimes(1);
        expect(mockDeleteAllWebhooksForRetailer).toHaveBeenCalledWith(retailer);
    });

    it('returns false when deleteAllWebhooksForRetailer throws', async () => {
        const retailer = { id: '1', domain: 'a.myshopify.com' } as RetailerEntity;
        retailerService.getByDomain.mockResolvedValue(retailer);
        mockDeleteAllWebhooksForRetailer.mockRejectedValue(new Error('Shopify API error'));

        const result = await resolver.unregisterWebhooksForOrganisations({
            domainNames: ['a.myshopify.com'],
        });

        expect(result).toBe(false);
    });

    it('returns false when getByDomain throws', async () => {
        retailerService.getByDomain.mockRejectedValue(new Error('DB error'));

        const result = await resolver.unregisterWebhooksForOrganisations({
            domainNames: ['a.myshopify.com'],
        });

        expect(result).toBe(false);
        expect(mockDeleteAllWebhooksForRetailer).not.toHaveBeenCalled();
    });
});
