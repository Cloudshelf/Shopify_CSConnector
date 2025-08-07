import { forwardRef } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CloudshelfResolver } from '../cloudshelf.resolver';
import {
    CloudshelfSyncOrganisationInput,
    CloudshelfSyncOrganisationReason,
} from 'src/modules/cloudshelf/types/cloudshelf.sync.organisation.input';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerService } from 'src/modules/retailer/retailer.service';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';

jest.mock('src/modules/retailer/retailer.service');

jest.mock('joi', () => ({
    object: jest.fn().mockReturnThis(),
    boolean: jest.fn().mockReturnValue({
        required: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        default: jest.fn().mockReturnThis(),
        valid: jest.fn().mockReturnThis(),
    }),
    string: jest.fn().mockReturnValue({
        required: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        hostname: jest.fn().mockReturnThis(),
        default: jest.fn().mockReturnThis(),
        valid: jest.fn().mockReturnThis(),
        uri: jest.fn().mockReturnThis(),
    }),
    number: jest.fn().mockReturnValue({
        required: jest.fn().mockReturnThis(),
        optional: jest.fn().mockReturnThis(),
        port: jest.fn().mockReturnThis(),
        default: jest.fn().mockReturnThis(),
        valid: jest.fn().mockReturnThis(),
    }),
    enum: jest.fn().mockReturnThis(),
    validate: jest.fn().mockReturnThis(),
    required: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
}));
jest.mock('../cloudshelf.api.organisation.util');
jest.mock('src/trigger/data-ingestion/product/request-products');

describe('CloudshelfResolver', () => {
    let resolver: CloudshelfResolver;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CloudshelfResolver,
                {
                    provide: RetailerService,
                    useValue: {
                        findOneByDomain: jest.fn().mockResolvedValue({ id: 'test-domain.com' } as RetailerEntity),
                    },
                },
            ],
        }).compile();

        resolver = module.get<CloudshelfResolver>(CloudshelfResolver);
    });

    describe('syncOrganisation', () => {
        it('should call RequestProductsTask.trigger', async () => {
            const requestProductsTaskSpy = jest.spyOn(RequestProductsTask, 'trigger').mockResolvedValue({} as any);
            await resolver.syncOrganisation({
                domainName: 'test-domain.com',
                reason: CloudshelfSyncOrganisationReason.REACTIVATE,
            } as CloudshelfSyncOrganisationInput);
            expect(requestProductsTaskSpy).toHaveBeenCalledWith({
                organisationId: 'test-domain.com',
                fullSync: false,
            });
        });
    });
});
