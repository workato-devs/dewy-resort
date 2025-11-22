# Cognito Authentication Module

This directory contains the Amazon Cognito authentication integration for the Hotel Management System.

## Configuration Module

### File: `config.ts`

The configuration module handles loading and validating Cognito settings from environment variables.

#### Key Functions

- **`isCognitoEnabled()`**: Returns `true` if `AUTH_PROVIDER` is set to "cognito"
- **`loadCognitoConfig()`**: Loads Cognito configuration from environment variables
  - Returns `null` when Cognito is not enabled
  - Throws `CognitoConfigurationError` when required variables are missing
  - Validates AWS region format
  - Computes OAuth endpoints and JWKS URI
  - Provides defaults for redirect URI and domain

#### Environment Variables

**Required (when AUTH_PROVIDER=cognito):**
- `COGNITO_USER_POOL_ID`: Cognito User Pool ID (e.g., "us-east-1_ABC123")
- `COGNITO_CLIENT_ID`: OAuth 2.0 App Client ID
- `COGNITO_CLIENT_SECRET`: OAuth 2.0 App Client Secret
- `COGNITO_REGION`: AWS region (e.g., "us-east-1")

**Optional:**
- `COGNITO_REDIRECT_URI`: OAuth callback URL (defaults to `{APP_URL}/api/auth/cognito/callback`)
- `COGNITO_DOMAIN`: Cognito domain (defaults to computed value from User Pool ID and region)

**Also Required:**
- `APP_URL`: Application base URL (used to compute default redirect URI)

#### Configuration Object

The `CognitoConfig` interface includes:

```typescript
{
  userPoolId: string;               // User Pool ID
  clientId: string;                 // App Client ID
  clientSecret: string;             // App Client Secret
  region: string;                   // AWS region
  redirectUri: string;              // OAuth callback URL
  domain: string;                   // Cognito domain (with https://)
  issuer: string;                   // Token issuer URL
  authorizationEndpoint: string;    // OAuth authorization endpoint
  tokenEndpoint: string;            // OAuth token endpoint
  userInfoEndpoint: string;         // OAuth userInfo endpoint
  jwksUri: string;                  // JWKS endpoint for token validation
}
```

#### Validation

The module performs the following validations:

1. **Required Variables**: Ensures all required environment variables are present
2. **Region Format**: Validates AWS region format (e.g., "us-east-1", "eu-west-2")
3. **Region Consistency**: Ensures User Pool ID region matches the configured region

#### Error Handling

Throws `CognitoConfigurationError` for:
- Missing required environment variables
- Invalid AWS region format
- User Pool ID region mismatch with configured region

## Testing

Run the test script to verify configuration:

```bash
# Test with Cognito disabled
AUTH_PROVIDER=mock npx tsx scripts/test-cognito-config-simple.js

# Test with valid Cognito configuration
AUTH_PROVIDER=cognito \
  COGNITO_USER_POOL_ID=us-east-1_ABC123 \
  COGNITO_CLIENT_ID=test_client \
  COGNITO_CLIENT_SECRET=test_secret \
  COGNITO_REGION=us-east-1 \
  APP_URL=http://localhost:3000 \
  npx tsx scripts/test-cognito-config-simple.js

# Test with missing variables (should error)
AUTH_PROVIDER=cognito APP_URL=http://localhost:3000 \
  npx tsx scripts/test-cognito-config-simple.js

# Test with invalid region (should error)
AUTH_PROVIDER=cognito \
  COGNITO_USER_POOL_ID=us-east-1_ABC123 \
  COGNITO_CLIENT_ID=test \
  COGNITO_CLIENT_SECRET=secret \
  COGNITO_REGION=invalid-region \
  APP_URL=http://localhost:3000 \
  npx tsx scripts/test-cognito-config-simple.js
```

## Usage Example

```typescript
import { loadCognitoConfig, isCognitoEnabled } from '@/lib/auth/cognito/config';

// Check if Cognito is enabled
if (isCognitoEnabled()) {
  // Load configuration
  const config = loadCognitoConfig();
  
  if (config) {
    console.log('Cognito User Pool:', config.userPoolId);
    console.log('Authorization URL:', config.authorizationEndpoint);
  }
}
```

## Next Steps

The following modules will be implemented in subsequent tasks:

- **errors.ts**: Cognito-specific error classes
- **client.ts**: OAuth 2.0 client for authentication flow
- **validator.ts**: JWT token validation
- **management.ts**: User management operations using AWS SDK
