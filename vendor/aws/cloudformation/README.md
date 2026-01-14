# AWS Bedrock Integration

CloudFormation templates and deployment scripts for Amazon Bedrock AI chat integration.

## Directory Structure

```
vendor/aws/cloudformation/
├── scripts/              # Deployment scripts
│   ├── deploy-user-pool.sh
│   ├── deploy-identity-pool.sh
│   └── deploy-chat-table.sh
├── templates/            # CloudFormation templates
│   ├── cognito-user-pool.yaml
│   ├── cognito-identity-pool.yaml
│   └── chat-conversations-table.yaml
├── .env.user-pool-example
├── .env.identity-pool-example
└── README.md
```

## Overview

This integration enables AI-powered chat agents using Amazon Bedrock with:
- Streaming responses from Claude models
- Role-based access control via Cognito Identity Pool
- Persistent conversation storage in DynamoDB
- Temporary AWS credentials (no long-term keys needed)

## Prerequisites

- AWS CLI installed and configured
- Cognito User Pool with `custom:role` attribute (or deploy one using our template)
- Bedrock model access enabled: https://console.aws.amazon.com/bedrock/home#/modelaccess

## Quick Start

### 1. Deploy User Pool (Optional)

If you don't have a Cognito User Pool yet:

```bash
cd vendor/aws/cloudformation/scripts
./deploy-user-pool.sh dev http://localhost:3000/api/auth/cognito/callback http://localhost:3000/login your-domain-prefix
```

See `.env.user-pool-example` for configuration.

### 2. Deploy Identity Pool

```bash
cd vendor/aws/cloudformation/scripts
./deploy-identity-pool.sh dev <user-pool-id> <client-id>
```

Example:
```bash
./deploy-identity-pool.sh dev us-west-2_l1yPytMyD 1ss0ehv8du1d14398rioaurp0h
```

See `.env.identity-pool-example` for configuration.

### 3. Deploy Chat Table

```bash
./deploy-chat-table.sh dev
```

### 4. Update Environment

Add the output values to your `app/.env`:

```bash
# From User Pool deployment (if deployed)
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us-west-2_ABC123XYZ
COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
COGNITO_REGION=us-west-2
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito/callback
APP_URL=http://localhost:3000

# From Identity Pool deployment
COGNITO_IDENTITY_POOL_ID=us-west-2:12345678-1234-1234-1234-123456789012
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
AWS_REGION=us-west-2

# From Chat Table deployment
CHAT_CONVERSATIONS_TABLE=chat-conversations-dev
CHAT_STORAGE_MODE=dynamodb
```

### 5. Set User Roles

Ensure users have the `custom:role` attribute set to one of:
- `guest`
- `manager`
- `housekeeping`
- `maintenance`

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id <pool-id> \
  --username user@example.com \
  --user-attributes Name=custom:role,Value=guest
```

## Resources

### User Pool (`templates/cognito-user-pool.yaml`)

Creates:
- Cognito User Pool with email authentication
- User Pool Client with OAuth 2.0 support
- Custom `role` attribute for RBAC
- Hosted UI domain

**Deploy Script:** `scripts/deploy-user-pool.sh`

**Parameters:**
- `environment` - dev/staging/prod
- `callback-url` - OAuth callback URL
- `logout-url` - Logout redirect URL
- `domain-prefix` - Globally unique domain prefix

### Identity Pool (`templates/cognito-identity-pool.yaml`)

Creates:
- Cognito Identity Pool for temporary AWS credentials
- IAM role with Bedrock invoke permissions
- DynamoDB access for conversation storage

**Deploy Script:** `scripts/deploy-identity-pool.sh`

**Parameters:**
- `environment` - dev/staging/prod
- `user-pool-id` - Cognito User Pool ID
- `client-id` - User Pool App Client ID
- `bedrock-model-id` - Optional, defaults to Claude Sonnet

### Chat Table (`templates/chat-conversations-table.yaml`)

Creates:
- DynamoDB table for conversation history
- Global Secondary Index for user queries
- IAM policies for access control
- Point-in-time recovery enabled

**Deploy Script:** `scripts/deploy-chat-table.sh`

**Parameters:**
- `environment` - dev/staging/prod
- `billing-mode` - Optional: PAY_PER_REQUEST (default) or PROVISIONED

## Architecture

```
User → Cognito User Pool → Identity Pool → Temporary Credentials
                                          ↓
                                    Bedrock API
                                          ↓
                                    DynamoDB Table
```

## Troubleshooting

**"Access Denied" when invoking Bedrock:**
- Enable model access in Bedrock console
- Verify user has `custom:role` attribute set
- Check Identity Pool role mapping

**"Invalid Identity Pool" error:**
- Verify `COGNITO_IDENTITY_POOL_ID` in `.env`
- Ensure Identity Pool is deployed

**Stack already exists:**
- Scripts automatically update existing stacks
- Wait for update to complete

## Cleanup

```bash
# Delete Identity Pool
aws cloudformation delete-stack --stack-name hotel-mgmt-identity-pool-dev

# Delete Chat Table
aws cloudformation delete-stack --stack-name chat-conversations-dev
```

**Warning:** This will permanently delete all conversation data.

## Security

- Temporary credentials expire after 1 hour
- IAM roles have least-privilege access (Bedrock invoke only)
- DynamoDB access controlled at application layer
- All data encrypted at rest with AWS KMS

## Cost Considerations

- **Identity Pool:** Free
- **IAM Roles:** Free
- **Bedrock:** ~$3/million input tokens, ~$15/million output tokens (Claude Sonnet)
- **DynamoDB:** Pay-per-request or provisioned capacity
- **CloudFormation:** Free

## Additional Resources

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Cognito Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
