/**
 * Tests for Salesforce Client Request Handling and Retry Logic
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SalesforceClient } from '../salesforce-client';
import { WorkatoSalesforceConfig } from '../config';
import { WorkatoSalesforceError } from '../errors';

describe('SalesforceClient - Request Handling and Retry Logic', () => {
  let client: SalesforceClient;
  let mockAdapter: MockAdapter;
  let config: WorkatoSalesforceConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'https://test.workato.com',
      apiToken: 'test-token',
      timeout: 5000,
      retryAttempts: 3,
      mockMode: false,
      cacheEnabled: false, // Disable cache for these tests
    };
    
    client = new SalesforceClient(config);
    
    // Access the private httpClient for mocking
    const httpClient = (client as any).httpClient;
    mockAdapter = new MockAdapter(httpClient);
  });

  afterEach(() => {
    mockAdapter.reset();
  });

  describe('makeRequest', () => {
    it('should successfully make a GET request', async () => {
      const responseData = { id: 'test-123', name: 'Test Room' };
      mockAdapter.onGet('/test-endpoint').reply(200, responseData);

      const makeRequest = (client as any).makeRequest.bind(client);
      const result = await makeRequest('GET', '/test-endpoint');

      expect(result).toEqual(responseData);
    });

    it('should successfully make a POST request with data', async () => {
      const requestData = { name: 'New Room', floor: 2 };
      const responseData = { id: 'room-456', ...requestData };
      
      mockAdapter.onPost('/test-endpoint', requestData).reply(201, responseData);

      const makeRequest = (client as any).makeRequest.bind(client);
      const result = await makeRequest('POST', '/test-endpoint', requestData);

      expect(result).toEqual(responseData);
    });

    it('should throw WorkatoSalesforceError on 404', async () => {
      mockAdapter.onGet('/test-endpoint').reply(404);

      const makeRequest = (client as any).makeRequest.bind(client);
      
      await expect(makeRequest('GET', '/test-endpoint')).rejects.toThrow(WorkatoSalesforceError);
      
      try {
        await makeRequest('GET', '/test-endpoint');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.retryable).toBe(false);
        expect(error.correlationId).toBeDefined();
      }
    });

    it('should throw WorkatoSalesforceError on 400', async () => {
      mockAdapter.onPost('/test-endpoint').reply(400, { message: 'Invalid data' });

      const makeRequest = (client as any).makeRequest.bind(client);
      
      await expect(makeRequest('POST', '/test-endpoint', {})).rejects.toThrow(WorkatoSalesforceError);
      
      try {
        await makeRequest('POST', '/test-endpoint', {});
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.retryable).toBe(false);
      }
    });

    it('should throw WorkatoSalesforceError on 401', async () => {
      mockAdapter.onGet('/test-endpoint').reply(401);

      const makeRequest = (client as any).makeRequest.bind(client);
      
      await expect(makeRequest('GET', '/test-endpoint')).rejects.toThrow(WorkatoSalesforceError);
      
      try {
        await makeRequest('GET', '/test-endpoint');
      } catch (error: any) {
        expect(error.statusCode).toBe(401);
        expect(error.retryable).toBe(false);
      }
    });

    it('should mark 429 errors as retryable', async () => {
      mockAdapter.onGet('/test-endpoint').reply(429);

      const makeRequest = (client as any).makeRequest.bind(client);
      
      try {
        await makeRequest('GET', '/test-endpoint');
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
        expect(error.retryable).toBe(true);
      }
    });

    it('should mark 500 errors as retryable', async () => {
      mockAdapter.onGet('/test-endpoint').reply(500);

      const makeRequest = (client as any).makeRequest.bind(client);
      
      try {
        await makeRequest('GET', '/test-endpoint');
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
        expect(error.retryable).toBe(true);
      }
    });

    it('should mark 503 errors as retryable', async () => {
      mockAdapter.onGet('/test-endpoint').reply(503);

      const makeRequest = (client as any).makeRequest.bind(client);
      
      try {
        await makeRequest('GET', '/test-endpoint');
      } catch (error: any) {
        expect(error.statusCode).toBe(503);
        expect(error.retryable).toBe(true);
      }
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      const result = await retryWithBackoff(fn, 3);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      mockAdapter
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .reply(200, { success: true });

      const makeRequest = (client as any).makeRequest.bind(client);
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      
      const result = await retryWithBackoff(
        () => makeRequest('GET', '/test-endpoint'),
        3
      );

      expect(result).toEqual({ success: true });
    });

    it('should not retry on non-retryable error (404)', async () => {
      mockAdapter.onGet('/test-endpoint').reply(404);

      const makeRequest = (client as any).makeRequest.bind(client);
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      
      await expect(
        retryWithBackoff(() => makeRequest('GET', '/test-endpoint'), 3)
      ).rejects.toThrow(WorkatoSalesforceError);
    });

    it('should throw after max retry attempts', async () => {
      mockAdapter.onGet('/test-endpoint').reply(500);

      const makeRequest = (client as any).makeRequest.bind(client);
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      
      await expect(
        retryWithBackoff(() => makeRequest('GET', '/test-endpoint'), 2)
      ).rejects.toThrow(WorkatoSalesforceError);
    });

    it('should use exponential backoff delays', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to capture delays
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0) as any;
      }) as any;

      mockAdapter
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .reply(200, { success: true });

      const makeRequest = (client as any).makeRequest.bind(client);
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      
      await retryWithBackoff(() => makeRequest('GET', '/test-endpoint'), 3);

      // Verify exponential backoff: 1000ms, 2000ms
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should cap delay at 10 seconds', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0) as any;
      }) as any;

      mockAdapter
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .replyOnce(500)
        .onGet('/test-endpoint')
        .reply(200, { success: true });

      const makeRequest = (client as any).makeRequest.bind(client);
      const retryWithBackoff = (client as any).retryWithBackoff.bind(client);
      
      await retryWithBackoff(() => makeRequest('GET', '/test-endpoint'), 5);

      // Verify delays: 1000, 2000, 4000, 8000 (all capped at 10000)
      expect(delays).toHaveLength(4);
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(4000);
      expect(delays[3]).toBe(8000);
      expect(Math.max(...delays)).toBeLessThanOrEqual(10000);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const isRetryable = (client as any).isRetryable.bind(client);
      
      const retryableError = new WorkatoSalesforceError(
        'Rate limit exceeded',
        429,
        '/test',
        'corr-123',
        true
      );
      
      expect(isRetryable(retryableError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const isRetryable = (client as any).isRetryable.bind(client);
      
      const nonRetryableError = new WorkatoSalesforceError(
        'Not found',
        404,
        '/test',
        'corr-123',
        false
      );
      
      expect(isRetryable(nonRetryableError)).toBe(false);
    });
  });
});
