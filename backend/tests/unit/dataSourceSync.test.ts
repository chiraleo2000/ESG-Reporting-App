jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    queryOne: jest.fn(),
  },
}));

jest.mock('../../src/integrations/syncScheduler', () => ({
  SyncScheduler: {
    schedule: jest.fn(),
    stage: jest.fn(),
    execute: jest.fn().mockResolvedValue({
      success: true,
      recordsProcessed: 1,
      recordsFailed: 0,
      errors: [],
    }),
    stop: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn().mockReturnValue('audit-id'),
}));

import { db } from '../../src/config/database';
import { SyncScheduler } from '../../src/integrations/syncScheduler';
import { triggerSync } from '../../src/services/dataSourceService';

const mockDb = db as jest.Mocked<typeof db>;

describe('triggerSync schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the saved cron instead of a placeholder', async () => {
    mockDb.queryOne.mockResolvedValue({
      id: 'ds1',
      name: 'Utility',
      type: 'rest_api',
      project_id: 'proj',
      config: { baseUrl: 'https://example.test' },
      schedule: '0 2 * * *',
      mapping: {},
      enabled: true,
    });

    await triggerSync('ds1', 'proj', 'user-1');

    expect(SyncScheduler.schedule).toHaveBeenCalledWith(
      'ds1',
      'Utility',
      'proj',
      'rest_api',
      { baseUrl: 'https://example.test' },
      {},
      '0 2 * * *'
    );
    const crons = (SyncScheduler.schedule as jest.Mock).mock.calls.map((call) => call[6]);
    expect(crons).not.toContain('* * * * *');
  });

  it('stages a one-off run when no schedule is saved', async () => {
    mockDb.queryOne.mockResolvedValue({
      id: 'ds2',
      name: 'Drop',
      type: 'ssh_sftp',
      project_id: 'proj',
      config: { host: 'files.example' },
      schedule: null,
      mapping: {},
      enabled: true,
    });

    await triggerSync('ds2', 'proj', 'user-1');

    expect(SyncScheduler.stage).toHaveBeenCalled();
    expect(SyncScheduler.schedule).not.toHaveBeenCalled();
  });
});
