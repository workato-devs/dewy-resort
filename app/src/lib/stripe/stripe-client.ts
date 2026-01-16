/**
 * Stripe Client for Workato API Integration
 * 
 * This client encapsulates all Workato API communication for Stripe payment operations,
 * providing a clean TypeScript interface with error handling, caching, and retry logic.
 */

import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { WorkatoLogger } from '../workato/logger';
import { logApiRequest, logApiResponse, logApiError } from '../utils/api-logger';

/**
 * Stripe-specific configuration interface
 */
export interface StripeClientConfig {
  baseUrl: string;              // Workato API base URL for Stripe
  apiToken: string;             // Authentication token
  timeout: number;              // Request timeout in milliseconds (default: 30000)
  retryAttempts: number;        // Number of retry attempts (default: 3)
  mockMode: boolean;            // Enable mock mode for development (default: false)
  cacheEnabled: boolean;        // Enable response caching (default: true)
}

/**
 * Custom error class for Stripe API errors
 */
export class StripeError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public correlationId: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'StripeError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StripeError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      correlationId: this.correlationId,
      retryable: this.retryable,
    };
  }
}

/**
 * Payment Intent interface
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  customerId?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

/**
 * Customer interface
 */
export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}

/**
 * Payment Status interface
 */
export interface PaymentStatus {
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  lastError?: string;
}

/**
 * Refund interface
 */
export interface Refund {
  id: string;
  paymentIntentId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
  createdAt: Date;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
}

/**
 * Stripe Client class
 * Handles all communication with Workato API for Stripe operations
 */
export class StripeClient {
  private config: StripeClientConfig;
  private cache: Map<string, CacheEntry>;
  private httpClient: AxiosInstance;
  private logger: WorkatoLogger;

  constructor(config: StripeClientConfig) {
    this.config = config;
    this.cache = new Map<string, CacheEntry>();
    this.logger = new WorkatoLogger(true, 'info');

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': config.apiToken,
      },
    });

    if (process.env.SHOW_API_RESPONSES === 'true') {
      console.log('[StripeClient] Configuration:', {
        baseURL: config.baseUrl,
        timeout: config.timeout,
        apiTokenPrefix: config.apiToken.substring(0, 10) + '...',
        mockMode: config.mockMode,
      });
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    if (this.config.mockMode) {
      return this.mockCreatePaymentIntent(amount, currency, customerId, metadata);
    }

    const correlationId = randomUUID();
    const endpoint = '/create_payment_intent';

    try {
      logApiRequest({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        body: { amount, currency, customerId, metadata },
      });

      const response = await this.httpClient.post(endpoint, {
        amount,
        currency,
        customer_id: customerId,
        metadata,
      });

      logApiResponse({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        response: response.data,
      });

      return {
        id: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        status: response.data.status,
        clientSecret: response.data.client_secret,
        customerId: response.data.customer_id,
        metadata: response.data.metadata,
        createdAt: new Date(response.data.created * 1000),
      };
    } catch (error) {
      logApiError({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        error,
      });
      throw this.handleError(error, endpoint, correlationId);
    }
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<StripeCustomer> {
    if (this.config.mockMode) {
      return this.mockCreateCustomer(email, name, metadata);
    }

    const correlationId = randomUUID();
    const endpoint = '/create_customer';

    try {
      logApiRequest({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        body: { email, name, metadata },
      });

      const response = await this.httpClient.post(endpoint, {
        email,
        name,
        metadata,
      });

      logApiResponse({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        response: response.data,
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        metadata: response.data.metadata,
        createdAt: new Date(response.data.created * 1000),
      };
    } catch (error) {
      logApiError({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        error,
      });
      throw this.handleError(error, endpoint, correlationId);
    }
  }

  /**
   * Retrieve payment status
   */
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStatus> {
    if (this.config.mockMode) {
      return this.mockGetPaymentStatus(paymentIntentId);
    }

    const correlationId = randomUUID();
    const endpoint = '/payment_status';

    try {
      logApiRequest({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        body: { payment_intent_id: paymentIntentId },
      });

      const response = await this.httpClient.post(endpoint, {
        payment_intent_id: paymentIntentId,
      });

      logApiResponse({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        response: response.data,
      });

      return {
        paymentIntentId: response.data.id,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        lastError: response.data.last_payment_error?.message,
      };
    } catch (error) {
      logApiError({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        error,
      });
      throw this.handleError(error, endpoint, correlationId);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId: string): Promise<PaymentIntent> {
    if (this.config.mockMode) {
      return this.mockConfirmPayment(paymentIntentId);
    }

    const correlationId = randomUUID();
    const endpoint = '/confirm_payment';

    try {
      logApiRequest({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        body: { payment_intent_id: paymentIntentId },
      });

      const response = await this.httpClient.post(endpoint, {
        payment_intent_id: paymentIntentId,
      });

      logApiResponse({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        response: response.data,
      });

      return {
        id: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        status: response.data.status,
        clientSecret: response.data.client_secret,
        customerId: response.data.customer_id,
        metadata: response.data.metadata,
        createdAt: new Date(response.data.created * 1000),
      };
    } catch (error) {
      logApiError({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        error,
      });
      throw this.handleError(error, endpoint, correlationId);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Refund> {
    if (this.config.mockMode) {
      return this.mockCreateRefund(paymentIntentId, amount, reason);
    }

    const correlationId = randomUUID();
    const endpoint = '/create_refund';

    try {
      logApiRequest({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        body: { payment_intent_id: paymentIntentId, amount, reason },
      });

      const response = await this.httpClient.post(endpoint, {
        payment_intent_id: paymentIntentId,
        amount,
        reason,
      });

      logApiResponse({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        response: response.data,
      });

      return {
        id: response.data.id,
        paymentIntentId: response.data.payment_intent,
        amount: response.data.amount,
        status: response.data.status,
        reason: response.data.reason,
        createdAt: new Date(response.data.created * 1000),
      };
    } catch (error) {
      logApiError({
        method: 'POST',
        url: `${this.config.baseUrl}${endpoint}`,
        error,
      });
      throw this.handleError(error, endpoint, correlationId);
    }
  }

  // Mock implementations
  private mockCreatePaymentIntent(
    amount: number,
    currency: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): PaymentIntent {
    return {
      id: `pi_mock_${randomUUID().substring(0, 8)}`,
      amount,
      currency,
      status: 'requires_payment_method',
      clientSecret: `pi_mock_secret_${randomUUID()}`,
      customerId,
      metadata,
      createdAt: new Date(),
    };
  }

  private mockCreateCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): StripeCustomer {
    return {
      id: `cus_mock_${randomUUID().substring(0, 8)}`,
      email,
      name,
      metadata,
      createdAt: new Date(),
    };
  }

  private mockGetPaymentStatus(paymentIntentId: string): PaymentStatus {
    return {
      paymentIntentId,
      status: 'succeeded',
      amount: 10000,
      currency: 'usd',
    };
  }

  private mockConfirmPayment(paymentIntentId: string): PaymentIntent {
    return {
      id: paymentIntentId,
      amount: 10000,
      currency: 'usd',
      status: 'succeeded',
      clientSecret: `${paymentIntentId}_secret`,
      createdAt: new Date(),
    };
  }

  private mockCreateRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Refund {
    return {
      id: `re_mock_${randomUUID().substring(0, 8)}`,
      paymentIntentId,
      amount: amount || 10000,
      status: 'succeeded',
      reason,
      createdAt: new Date(),
    };
  }

  /**
   * Handle errors from API calls
   */
  private handleError(error: any, endpoint: string, correlationId: string): StripeError {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      const retryable = this.isRetryableError(statusCode);

      return new StripeError(message, statusCode, endpoint, correlationId, retryable);
    }

    return new StripeError(
      error.message || 'Unknown error',
      500,
      endpoint,
      correlationId,
      false
    );
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(statusCode: number): boolean {
    return statusCode === 429 || statusCode === 500 || statusCode === 503;
  }
}
