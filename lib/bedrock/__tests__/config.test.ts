/**
 * Bedrock Configuration Tests
 * 
 * Tests for configuration loading and validation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  // Reset environment before each test
  process.env = { ...originalEnv };
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;
});

describe('Bedrock Configuration', () => {
  describe('loadBedrockConfig', () => {
    it('should load configuration from environment variables', () => {
      // Set up environment
      process.env.AUTH_PROVIDER = 'cognito';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';
      process.env.AWS_REGION = 'us-west-2';
      process.env.COGNITO_USER_POOL_ID = 'us-west-2_ABC123';
      process.env.COGNITO_CLIENT_ID = 'abc123def456';
      process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
      process.env.BEDROCK_MAX_TOKENS = '4096';
      process.env.BEDROCK_TEMPERATURE = '0.7';

      // Import after setting environment
      const { loadBedrockConfig } = require('../config');
      const config = loadBedrockConfig();

      expect(config.enabled).toBe(true);
      expect(config.identityPool.id).toBe('us-west-2:12345678-1234-1234-1234-123456789012');
      expect(config.identityPool.region).toBe('us-west-2');
      expect(config.bedrock.modelId).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
      expect(config.bedrock.maxTokens).toBe(4096);
      expect(config.bedrock.temperature).toBe(0.7);
    });

    it('should use default values when optional variables are not set', () => {
      process.env.AUTH_PROVIDER = 'cognito';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';
      process.env.AWS_REGION = 'us-west-2';
      process.env.COGNITO_USER_POOL_ID = 'us-west-2_ABC123';
      process.env.COGNITO_CLIENT_ID = 'abc123def456';

      const { loadBedrockConfig } = require('../config');
      const config = loadBedrockConfig();

      expect(config.bedrock.modelId).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
      expect(config.bedrock.maxTokens).toBe(4096);
      expect(config.bedrock.temperature).toBe(0.7);
    });

    it('should set enabled to false when AUTH_PROVIDER is not cognito', () => {
      process.env.AUTH_PROVIDER = 'okta';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';

      const { loadBedrockConfig } = require('../config');
      const config = loadBedrockConfig();

      expect(config.enabled).toBe(false);
    });

    it('should set enabled to false when COGNITO_IDENTITY_POOL_ID is not set', () => {
      process.env.AUTH_PROVIDER = 'cognito';

      const { loadBedrockConfig } = require('../config');
      const config = loadBedrockConfig();

      expect(config.enabled).toBe(false);
    });
  });

  describe('validateBedrockConfig', () => {
    it('should validate a correct configuration', () => {
      const { validateBedrockConfig } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 4096,
          temperature: 0.7,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).not.toThrow();
    });

    it('should throw error for invalid Identity Pool ID format', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'invalid-format',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 4096,
          temperature: 0.7,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/format: region:uuid/);
    });

    it('should throw error for invalid AWS region format', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'invalid-region',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 4096,
          temperature: 0.7,
          region: 'invalid-region',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/valid AWS region/);
    });

    it('should throw error for invalid Bedrock model ID format', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'invalid',
          maxTokens: 4096,
          temperature: 0.7,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/format: provider.model-name-version/);
    });

    it('should throw error for invalid max tokens', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: -1,
          temperature: 0.7,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/positive number/);
    });

    it('should throw error for max tokens exceeding limit', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 300000,
          temperature: 0.7,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/cannot exceed 200000/);
    });

    it('should throw error for invalid temperature', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: 'us-west-2:12345678-1234-1234-1234-123456789012',
          region: 'us-west-2',
          userPoolId: 'us-west-2_ABC123',
          clientId: 'abc123def456',
        },
        bedrock: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          maxTokens: 4096,
          temperature: 1.5,
          region: 'us-west-2',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
      expect(() => validateBedrockConfig(config)).toThrow(/between 0 and 1/);
    });

    it('should throw error for missing required fields', () => {
      const { validateBedrockConfig, BedrockConfigurationError } = require('../config');
      
      const config = {
        enabled: true,
        identityPool: {
          id: '',
          region: '',
          userPoolId: '',
          clientId: '',
        },
        bedrock: {
          modelId: '',
          maxTokens: 4096,
          temperature: 0.7,
          region: '',
        },
        mcp: {
          configPath: 'config/mcp',
        },
      };

      expect(() => validateBedrockConfig(config)).toThrow(BedrockConfigurationError);
    });
  });

  describe('isBedrockEnabled', () => {
    it('should return true when AUTH_PROVIDER is cognito and Identity Pool is configured', () => {
      process.env.AUTH_PROVIDER = 'cognito';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';

      const { isBedrockEnabled } = require('../config');
      expect(isBedrockEnabled()).toBe(true);
    });

    it('should return false when AUTH_PROVIDER is not cognito', () => {
      process.env.AUTH_PROVIDER = 'okta';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';

      const { isBedrockEnabled } = require('../config');
      expect(isBedrockEnabled()).toBe(false);
    });

    it('should return false when Identity Pool is not configured', () => {
      process.env.AUTH_PROVIDER = 'cognito';

      const { isBedrockEnabled } = require('../config');
      expect(isBedrockEnabled()).toBe(false);
    });
  });

  describe('getBedrockDisabledReason', () => {
    it('should return null when Bedrock is enabled', () => {
      process.env.AUTH_PROVIDER = 'cognito';
      process.env.COGNITO_IDENTITY_POOL_ID = 'us-west-2:12345678-1234-1234-1234-123456789012';

      const { getBedrockDisabledReason } = require('../config');
      expect(getBedrockDisabledReason()).toBeNull();
    });

    it('should return reason when AUTH_PROVIDER is not cognito', () => {
      process.env.AUTH_PROVIDER = 'okta';

      const { getBedrockDisabledReason } = require('../config');
      expect(getBedrockDisabledReason()).toContain('AUTH_PROVIDER=cognito');
    });

    it('should return reason when Identity Pool is not configured', () => {
      process.env.AUTH_PROVIDER = 'cognito';

      const { getBedrockDisabledReason } = require('../config');
      expect(getBedrockDisabledReason()).toContain('COGNITO_IDENTITY_POOL_ID');
    });
  });
});
