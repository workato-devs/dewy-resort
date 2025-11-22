/**
 * Bedrock Configuration Module
 * 
 * Manages configuration loading and validation for Amazon Bedrock integration.
 * Validates Identity Pool, Bedrock, and MCP server configurations.
 */

// Import BedrockConfigurationError from errors module
import { BedrockConfigurationError } from './errors';

/**
 * Bedrock configuration interface
 */
export interface BedrockConfig {
  enabled: boolean;
  identityPool: {
    id: string;
    region: string;
    userPoolId: string;
    clientId: string;
  };
  bedrock: {
    modelId: string;
    maxTokens: number;
    temperature: number;
    region: string;
  };
  mcp: {
    configPath: string;
  };
}

/**
 * Load Bedrock configuration from environment variables
 * 
 * @returns Bedrock configuration object
 * @throws BedrockConfigurationError if configuration is invalid
 */
export function loadBedrockConfig(): BedrockConfig {
  const authProvider = process.env.AUTH_PROVIDER;
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  
  // Bedrock is only enabled when AUTH_PROVIDER is "cognito" and Identity Pool is configured
  const enabled = authProvider === 'cognito' && !!identityPoolId;

  const config: BedrockConfig = {
    enabled,
    identityPool: {
      id: identityPoolId || '',
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || '',
      userPoolId: process.env.COGNITO_USER_POOL_ID || '',
      clientId: process.env.COGNITO_CLIENT_ID || '',
    },
    bedrock: {
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || '',
    },
    mcp: {
      configPath: process.env.MCP_CONFIG_PATH || 'config/mcp',
    },
  };

  // Only validate if Bedrock is enabled
  if (enabled) {
    validateBedrockConfig(config);
  }

  return config;
}

/**
 * Validate Bedrock configuration
 * 
 * @param config - Configuration to validate
 * @throws BedrockConfigurationError if configuration is invalid
 */
export function validateBedrockConfig(config: BedrockConfig): void {
  const errors: string[] = [];

  // Validate Identity Pool configuration
  if (!config.identityPool.id || config.identityPool.id.trim() === '') {
    errors.push('COGNITO_IDENTITY_POOL_ID is required for Bedrock integration');
  } else if (!isValidIdentityPoolId(config.identityPool.id)) {
    errors.push('COGNITO_IDENTITY_POOL_ID must be in format: region:uuid (e.g., us-west-2:12345678-1234-1234-1234-123456789012)');
  }

  if (!config.identityPool.region || config.identityPool.region.trim() === '') {
    errors.push('AWS_REGION or COGNITO_REGION is required for Bedrock integration');
  } else if (!isValidAwsRegion(config.identityPool.region)) {
    errors.push('AWS_REGION or COGNITO_REGION must be a valid AWS region (e.g., us-east-1, eu-west-1)');
  }

  if (!config.identityPool.userPoolId || config.identityPool.userPoolId.trim() === '') {
    errors.push('COGNITO_USER_POOL_ID is required for Bedrock integration');
  }

  if (!config.identityPool.clientId || config.identityPool.clientId.trim() === '') {
    errors.push('COGNITO_CLIENT_ID is required for Bedrock integration');
  }

  // Validate Bedrock configuration
  if (!config.bedrock.modelId || config.bedrock.modelId.trim() === '') {
    errors.push('BEDROCK_MODEL_ID cannot be empty');
  } else if (!isValidBedrockModelId(config.bedrock.modelId)) {
    errors.push('BEDROCK_MODEL_ID must be in format: provider.model-name-version (e.g., anthropic.claude-3-sonnet-20240229-v1:0)');
  }

  if (!config.bedrock.region || config.bedrock.region.trim() === '') {
    errors.push('AWS_REGION or COGNITO_REGION is required for Bedrock integration');
  }

  // Validate numeric values
  if (config.bedrock.maxTokens <= 0) {
    errors.push('BEDROCK_MAX_TOKENS must be a positive number');
  }

  if (config.bedrock.maxTokens > 200000) {
    errors.push('BEDROCK_MAX_TOKENS cannot exceed 200000');
  }

  if (config.bedrock.temperature < 0 || config.bedrock.temperature > 1) {
    errors.push('BEDROCK_TEMPERATURE must be between 0 and 1');
  }

  if (errors.length > 0) {
    throw new BedrockConfigurationError(
      `Bedrock configuration validation failed:\n${errors.join('\n')}`
    );
  }
}

/**
 * Validate Identity Pool ID format
 * 
 * @param identityPoolId - Identity Pool ID to validate
 * @returns True if valid format
 */
function isValidIdentityPoolId(identityPoolId: string): boolean {
  // Format: region:uuid
  // Example: us-west-2:12345678-1234-1234-1234-123456789012
  const pattern = /^[a-z]{2}-[a-z]+-\d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(identityPoolId);
}

/**
 * Validate AWS region format
 * 
 * @param region - AWS region to validate
 * @returns True if valid format
 */
function isValidAwsRegion(region: string): boolean {
  // Format: us-east-1, eu-west-2, ap-southeast-1, etc.
  const pattern = /^[a-z]{2}-[a-z]+-\d$/;
  return pattern.test(region);
}

/**
 * Validate Bedrock model ID format
 * 
 * @param modelId - Bedrock model ID to validate
 * @returns True if valid format
 */
function isValidBedrockModelId(modelId: string): boolean {
  // Format: provider.model-name-version
  // Examples:
  // - anthropic.claude-3-sonnet-20240229-v1:0
  // - anthropic.claude-3-haiku-20240307-v1:0
  // - ai21.j2-ultra-v1
  const pattern = /^[a-z0-9]+\.[a-z0-9-]+/i;
  return pattern.test(modelId);
}

/**
 * Check if Bedrock integration is enabled
 * 
 * @returns True if Bedrock is enabled
 */
export function isBedrockEnabled(): boolean {
  const authProvider = process.env.AUTH_PROVIDER;
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  
  return authProvider === 'cognito' && !!identityPoolId;
}

/**
 * Get reason why Bedrock is disabled
 * 
 * @returns Reason string or null if enabled
 */
export function getBedrockDisabledReason(): string | null {
  const authProvider = process.env.AUTH_PROVIDER;
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;

  if (authProvider !== 'cognito') {
    return 'Bedrock integration requires AUTH_PROVIDER=cognito';
  }

  if (!identityPoolId) {
    return 'Bedrock integration requires COGNITO_IDENTITY_POOL_ID to be configured';
  }

  return null;
}
