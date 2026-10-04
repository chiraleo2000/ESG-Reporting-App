import axios from 'axios';
import { RestApiConnector } from '../../src/integrations/restApiConnector';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RestApiConnector health check', () => {
  const config = { baseUrl: 'https://example.test', authType: 'none', endpoints: { activities: '/data' } };

  it('fails when the host does not answer', async () => {
    const head = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    mockedAxios.create.mockReturnValue({ head } as any);
    const connector = new RestApiConnector();
    await expect(connector.connect(config)).resolves.toBe(false);
  });

  it('fails on a server error', async () => {
    const head = jest.fn().mockRejectedValue({ response: { status: 503 }, message: 'unavailable' });
    mockedAxios.create.mockReturnValue({ head } as any);
    const connector = new RestApiConnector();
    await expect(connector.connect(config)).resolves.toBe(false);
  });

  it('treats a 404 HEAD as a reachable host', async () => {
    const head = jest.fn().mockRejectedValue({ response: { status: 404 }, message: 'missing' });
    mockedAxios.create.mockReturnValue({ head } as any);
    const connector = new RestApiConnector();
    await expect(connector.connect(config)).resolves.toBe(true);
  });
});
