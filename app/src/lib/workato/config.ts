/**
 * Workato Configuration Module
 * Manages configuration loading and validation for Workato API integration
 */

export interface WorkatoConfig {
  salesforce: {
    apiToken: string;
    baseUrl: string;
    enabled: boolean;
  };
  stripe: {
    apiToken: string;
    baseUrl: string;
    enabled: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  retry: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  timeout: number;
  mockMode: boolean;
}

/**
 * Salesforce-specific configuration interface
 * Used for the Salesforce Client integration
 */
export interface WorkatoSalesforceConfig {
  baseUrl: string;              // Workato API base URL
  apiToken: string;             // Authentication token
  timeout: number;              // Request timeout in milliseconds (default: 30000)
  retryAttempts: number;        // Number of retry attempts (default: 3)
  mockMode: boolean;            // Enable mock mode for development (default: false)
  cacheEnabled: boolean;        // Enable response caching (default: true)
}

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Load Workato configuration from environment variables
 */
export function loadWorkatoConfig(): WorkatoConfig {
  const config: WorkatoConfig = {
    salesforce: {
      apiToken: process.env.WORKATO_API_AUTH_TOKEN || '',
      baseUrl: process.env.WORKATO_API_COLLECTION_URL || '',
      enabled: process.env.SALESFORCE_ENABLED !== 'false',
    },
    stripe: {
      apiToken: process.env.STRIPE_API_AUTH_TOKEN || '',
      baseUrl: process.env.STRIPE_API_COLLECTION_URL || '',
      enabled: process.env.STRIPE_ENABLED !== 'false',
    },
    cache: {
      enabled: process.env.WORKATO_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.WORKATO_CACHE_TTL || '30000', 10),
    },
    retry: {
      maxAttempts: parseInt(process.env.WORKATO_MAX_RETRIES || '3', 10),
      initialDelay: parseInt(process.env.WORKATO_RETRY_DELAY || '1000', 10),
      maxDelay: parseInt(process.env.WORKATO_MAX_RETRY_DELAY || '10000', 10),
      backoffMultiplier: parseFloat(process.env.WORKATO_BACKOFF_MULTIPLIER || '2'),
    },
    logging: {
      enabled: process.env.WORKATO_LOGGING_ENABLED !== 'false',
      level: (process.env.WORKATO_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
    timeout: parseInt(process.env.WORKATO_TIMEOUT || '10000', 10),
    mockMode: process.env.WORKATO_MOCK_MODE === 'true',
  };

  validateConfig(config);
  return config;
}

/**
 * Validate required configuration fields
 */
export function validateConfig(config: WorkatoConfig): void {
  const errors: string[] = [];

  // Validate Salesforce configuration if enabled
  if (config.salesforce.enabled) {
    if (!config.salesforce.apiToken || config.salesforce.apiToken.trim() === '') {
      errors.push('WORKATO_API_AUTH_TOKEN is required when Salesforce is enabled');
    }
    if (!config.salesforce.baseUrl || config.salesforce.baseUrl.trim() === '') {
      errors.push('WORKATO_API_COLLECTION_URL is required when Salesforce is enabled');
    }
  }

  // Validate numeric values
  if (config.timeout <= 0) {
    errors.push('WORKATO_TIMEOUT must be a positive number');
  }
  if (config.cache.ttl < 0) {
    errors.push('WORKATO_CACHE_TTL must be a non-negative number');
  }
  if (config.retry.maxAttempts < 0) {
    errors.push('WORKATO_MAX_RETRIES must be a non-negative number');
  }
  if (config.retry.initialDelay <= 0) {
    errors.push('WORKATO_RETRY_DELAY must be a positive number');
  }
  if (config.retry.maxDelay <= 0) {
    errors.push('WORKATO_MAX_RETRY_DELAY must be a positive number');
  }
  if (config.retry.backoffMultiplier <= 1) {
    errors.push('WORKATO_BACKOFF_MULTIPLIER must be greater than 1');
  }

  if (errors.length > 0) {
    throw new ConfigurationError(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get Salesforce-specific configuration from environment variables
 * Validates required configuration values and provides defaults for optional ones
 * 
 * @throws {ConfigurationError} If required configuration values are missing
 * @returns {WorkatoSalesforceConfig} Validated Salesforce configuration
 */
export function getWorkatoSalesforceConfig(): WorkatoSalesforceConfig {
  const baseUrl = process.env.WORKATO_API_COLLECTION_URL;
  const apiToken = process.env.WORKATO_API_AUTH_TOKEN;

  // Validate required configuration values
  const errors: string[] = [];
  
  if (!baseUrl || baseUrl.trim() === '') {
    errors.push('WORKATO_API_COLLECTION_URL is required');
  }
  
  if (!apiToken || apiToken.trim() === '') {
    errors.push('WORKATO_API_AUTH_TOKEN is required');
  }

  if (errors.length > 0) {
    throw new ConfigurationError(
      `Missing required Salesforce configuration:\n${errors.join('\n')}`
    );
  }

  // Parse optional configuration with defaults
  const timeout = parseInt(process.env.WORKATO_TIMEOUT || '30000', 10);
  const retryAttempts = parseInt(process.env.WORKATO_RETRY_ATTEMPTS || '3', 10);
  const mockMode = process.env.WORKATO_MOCK_MODE === 'true';
  const cacheEnabled = process.env.WORKATO_CACHE_ENABLED !== 'false';

  // Validate numeric values
  if (timeout <= 0) {
    throw new ConfigurationError('WORKATO_TIMEOUT must be a positive number');
  }
  
  if (retryAttempts < 0) {
    throw new ConfigurationError('WORKATO_RETRY_ATTEMPTS must be a non-negative number');
  }

  return {
    baseUrl: baseUrl!,
    apiToken: apiToken!,
    timeout,
    retryAttempts,
    mockMode,
    cacheEnabled,
  };
}

/**
 * Singleton instance of SalesforceClient
 * Lazy-initialized on first access
 */
let salesforceClientInstance: any | null = null;

/**
 * Get or create singleton instance of SalesforceClient
 * This ensures only one client instance is used throughout the application
 * 
 * @returns {SalesforceClient} Singleton SalesforceClient instance
 */
export function getSalesforceClient(): any {
  if (!salesforceClientInstance) {
    // Import SalesforceClient dynamically to avoid circular dependencies
    const { SalesforceClient } = require('./salesforce-client');
    const config = getWorkatoSalesforceConfig();
    salesforceClientInstance = new SalesforceClient(config);
  }
  
  return salesforceClientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 * @internal
 */
export function resetSalesforceClient(): void {
  salesforceClientInstance = null;
}
