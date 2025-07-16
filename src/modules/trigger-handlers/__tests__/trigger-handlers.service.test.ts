import { TriggerHandlersService } from '../trigger-handlers.service';
import { runs } from '@trigger.dev/sdk/v3';

jest.mock('src/utils/ExtendedLogger', () => ({
    ExtendedLogger: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
    })),
}));

jest.mock('@trigger.dev/sdk/v3', () => ({
    runs: {
        list: jest.fn(),
        cancel: jest.fn(),
    },
}));

describe('TriggerHandlersService', () => {
    let triggerHandlersService: TriggerHandlersService;

    beforeEach(() => {
        jest.clearAllMocks();
        triggerHandlersService = new TriggerHandlersService();
    });

    it('should cancel triggers', async () => {
        const domain = 'test.com';
        const retailerId = '123';
        const cancelMock = jest.fn();

        const mockRuns = [
            { id: 'run1', tags: ['foo'], cancel: cancelMock },
            { id: 'run2', tags: ['bar', 'foo'], cancel: cancelMock },
            { id: 'run3', tags: ['baz'], cancel: cancelMock },
        ];

        (runs.list as jest.Mock).mockImplementation(() => ({
            [Symbol.asyncIterator]: async function* () {
                for (const run of mockRuns) {
                    yield run;
                }
            },
        }));

        await triggerHandlersService.cancelTriggersForDomain({ domain, retailerId });

        expect(runs.list).toHaveBeenCalledWith({
            tag: ['domain_test.com', 'retailer_123'],
            status: [
                'WAITING_FOR_DEPLOY',
                'DELAYED',
                'EXECUTING',
                'FROZEN',
                'INTERRUPTED',
                'QUEUED',
                'REATTEMPTING',
                'PENDING_VERSION',
            ],
        });
        expect(runs.cancel).toHaveBeenCalledWith('run1');
        expect(runs.cancel).toHaveBeenCalledWith('run2');
        expect(runs.cancel).toHaveBeenCalledWith('run3');
    });
});
