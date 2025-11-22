/**
 * Tests for Workato Salesforce Error Handling
 */

import {
  WorkatoSalesforceError,
  isRetryableError,
  createWorkatoError,
} from '../errors';

describe('WorkatoSalesforceError', () => {
  it('should create error with all properties', () => {
    const error = new WorkatoSalesforceError(
      'Test error message',
      404,
      '/api/rooms/123',
      'corr-123',
      false
    );

    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(404);
    expect(error.endpoint).toBe('/api/rooms/123');
    expect(error.correlationId).toBe('corr-123');
    expect(error.retryable).toBe(false);
    expect(error.name).toBe('WorkatoSalesforceError');
  });

  it('should default retryable to false', () => {
    const error = new WorkatoSalesforceError(
      'Test error',
      400,
      '/api/test',
      'corr-456'
    );

    expect(error.retryable).toBe(false);
  });

  it('should serialize to JSON correctly', () => {
    const error = new WorkatoSalesforceError(
      'Test error',
      500,
      '/api/test',
      'corr-789',
      true
    );

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'WorkatoSalesforceError',
      message: 'Test error',
      statusCode: 500,
      endpoint: '/api/test',
      correlationId: 'corr-789',
      retryable: true,
    });
  });
});

describe('isRetryableError', () => {
  it('should return true for WorkatoSalesforceError with retryable=true', () => {
    const error = new WorkatoSalesforceError(
      'Test',
      429,
      '/api/test',
      'corr-1',
      true
    );

    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for WorkatoSalesforceError with retryable=false', () => {
    const error = new WorkatoSalesforceError(
      'Test',
      404,
      '/api/test',
      'corr-2',
      false
    );

    expect(isRetryableError(error)).toBe(false);
  });

  it('should return true for 429 status code', () => {
    const error = { response: { status: 429 } };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for 500 status code', () => {
    const error = { response: { status: 500 } };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for 503 status code', () => {
    const error = { response: { status: 503 } };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for 400 status code', () => {
    const error = { response: { status: 400 } };
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for 401 status code', () => {
    const error = { response: { status: 401 } };
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for 404 status code', () => {
    const error = { response: { status: 404 } };
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return true for ECONNRESET network error', () => {
    const error = { code: 'ECONNRESET' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT network error', () => {
    const error = { code: 'ETIMEDOUT' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for ENOTFOUND network error', () => {
    const error = { code: 'ENOTFOUND' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for unknown errors', () => {
    const error = new Error('Unknown error');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('createWorkatoError', () => {
  it('should create error from 404 response', () => {
    const axiosError = {
      response: {
        status: 404,
        data: { message: 'Room not found' },
      },
    };

    const error = createWorkatoError(axiosError, '/api/rooms/123', 'corr-1');

    expect(error.message).toBe('Room not found');
    expect(error.statusCode).toBe(404);
    expect(error.endpoint).toBe('/api/rooms/123');
    expect(error.correlationId).toBe('corr-1');
    expect(error.retryable).toBe(false);
  });

  it('should create error from 429 response with retryable=true', () => {
    const axiosError = {
      response: {
        status: 429,
      },
    };

    const error = createWorkatoError(axiosError, '/api/test', 'corr-2');

    expect(error.message).toBe('Rate Limit Exceeded: Too many requests');
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it('should create error from 500 response with retryable=true', () => {
    const axiosError = {
      response: {
        status: 500,
      },
    };

    const error = createWorkatoError(axiosError, '/api/test', 'corr-3');

    expect(error.message).toBe('Internal Server Error: Server encountered an error');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it('should create error from network error', () => {
    const networkError = {
      code: 'ECONNRESET',
      message: 'Connection reset',
    };

    const error = createWorkatoError(networkError, '/api/test', 'corr-4');

    expect(error.message).toBe('Network Error: ECONNRESET - Connection reset');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it('should use default message for 400 without API message', () => {
    const axiosError = {
      response: {
        status: 400,
      },
    };

    const error = createWorkatoError(axiosError, '/api/test', 'corr-5');

    expect(error.message).toBe('Bad Request: Invalid request parameters');
    expect(error.statusCode).toBe(400);
    expect(error.retryable).toBe(false);
  });

  it('should use default message for 401', () => {
    const axiosError = {
      response: {
        status: 401,
      },
    };

    const error = createWorkatoError(axiosError, '/api/test', 'corr-6');

    expect(error.message).toBe('Unauthorized: Authentication failed');
    expect(error.statusCode).toBe(401);
    expect(error.retryable).toBe(false);
  });
});
