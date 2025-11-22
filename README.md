# Hotel Management Demo

A Next.js-based hotel management application demonstrating integration patterns with Workato, Salesforce, Stripe, Twilio, and Home Assistant.

## Features

- **Guest Portal**: Service requests, billing, room controls, AI assistant (Dewy)
- **Manager Portal**: Dashboard, maintenance management, room management, billing overview
- **Mock Integrations**: Workato API endpoints for Salesforce, Stripe, and Twilio
- **IoT Controls**: Home Assistant integration for room devices (with demo mode)

## System Prerequisites

- Node.js 20+ and npm
- SQLite (included via better-sqlite3)
- Python 3.8+ (for Workato CLI)
- curl and tar (for Salesforce CLI)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database

```bash
npm run db:init
```

### 3. Seed Demo Data

```bash
npm run db:seed
```

### 4. Configure Mock Devices (Optional)

The application supports mixing real and mock Home Assistant devices. By default, all devices attempt to connect to Home Assistant.

```bash
# View device configuration
npm run devices:list
npm run devices:stats

# Configure specific devices as mock
node scripts/configure-mock-devices.js set-name-mock "Bedside Light"
node scripts/configure-mock-devices.js set-room-mock 102

# See all options
npm run devices:help
```

See [MOCK_DEVICE_QUICKSTART.md](./docs/MOCK_DEVICE_QUICKSTART.md) for detailed configuration options.

### 5. Set Up Vendor CLIs (If not already installed)

This project integrates with Workato and Salesforce. Install the CLIs to manage metadata and enviroments related to live integrations:

#### Option A: Install All CLIs (Workato & Salesforce)

```bash
make setup
```

#### Option B: Install Specific CLIs

```bash
# Workato only
make setup tool=workato

# Salesforce only
make setup tool=salesforce
```

#### Verify Installation

```bash
make status              # Check all CLIs
make status tool=salesforce  # Check specific CLI
```

#### Configure Credentials

Copy `.env.example` to `.env` and configure

```bash
WORKATO_API_TOKEN=your_api_key_here
WORKATO_API_EMAIL=your_email@example.com
```

**For Salesforce:**
Authenticate to your org:

```bash
bin/sf org login web --alias myDevOrg
bin/sf org list  # Verify authentication
```

### 6. Deploy Salesforce Metadata

**IMPORTANT:** Deploy Salesforce metadata before configuring Workato recipes, as recipes depend on Salesforce objects.

```bash
# Deploy all metadata, assign permissions, and import seed data
make sf-deploy org=myDevOrg
```

This deploys custom objects (Booking**c, Hotel_Room**c, etc.), the Lightning app, and seed data to your Salesforce org.

**Verify deployment:**

```bash
# Open Salesforce org
bin/sf org open --target-org myDevOrg

# Navigate to App Launcher → Dewy Hotel Management
# Verify seed data appears in Hotel Rooms, Bookings, Contacts tabs
```

See [Salesforce Setup](#salesforce-setup) section below for detailed deployment information.

### 7. Deploy Workato Recipes

After Salesforce is deployed, deploy all Workato recipes and configure connections:

```bash
# Deploy all recipes to Workato sandbox
make workato-init
```

This command initializes Workato projects and pushes all recipes (atomic Salesforce recipes, Stripe recipes, and orchestrators) to your Workato sandbox.

**Configure connections in Workato:**

1. Log in to your Workato account
2. Navigate to Projects → Workspace-Connections
3. Authenticate each connection by clicking on it and logging into your accounts:
   - Salesforce - Connect to the org you deployed to (myDevOrg)
   - Stripe - Connect to your Stripe test account (if using)
   - Twilio - Connect to your Twilio account (if using)
4. **⚠️ CRITICAL:** Do NOT rename the connections during authentication
   - Keep the default connection names exactly as they appear
   - Recipes reference connections by name and will fail if renamed

**Note:** Recipes require active connections to work. If you prefer to develop without live integrations, the app supports mock mode (set `WORKATO_MOCK_MODE=true` in `.env`).

### 8. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Vendor CLI Commands

### Unified Commands (All Vendors)

```bash
make setup [tool=<name>]   # Install CLI(s). Options: workato, salesforce, all (default)
make status [tool=<name>]  # Check CLI status
make clean [tool=<name>]   # Remove CLI(s)
make help                  # Show all available commands
```

### Workato Commands

```bash
make workato-init          # Deploy all recipes to Workato sandbox
make validate              # Validate recipes locally
make push                  # Push recipes to developer sandbox
make pull                  # Pull recipes from developer sandbox
```

### Salesforce Commands

```bash
make sf-deploy org=<alias>     # Deploy Salesforce metadata to org
```

### Direct CLI Usage

After installation, use CLIs directly via wrapper scripts:

```bash
bin/workato recipes pull
bin/sf project deploy start --source-dir salesforce/force-app
```

## Salesforce Setup

This project includes Salesforce metadata for hotel operations, including custom objects, a Lightning application, and seed data.

### Account Prerequisites

1. **Salesforce CLI** - Installed via project's isolated CLI setup (see step 1 above)
2. **Salesforce Org** - Developer Edition org (free at https://developer.salesforce.com/signup)
3. **Stripe Developer Account** (optional) - For payment integration (https://dashboard.stripe.com/register)

### Quick Salesforce Setup

**1. Authenticate to Salesforce**

```bash
# Login to your Salesforce org (opens browser)
bin/sf org login web --alias myDevOrg

# Verify connectionw
bin/sf org display --target-org myDevOrg
```

**2. Deploy All Metadata and Seed Data**

```bash
# Deploy metadata, assign permissions, and import seed data
make sf-deploy org=myDevOrg
```

This single command will:

- Deploy 4 custom objects (Booking**c, Hotel_Room**c, Payment_Transaction**c, SMS_Notification**c)
- Deploy Lightning application with custom tabs and logo
- Deploy custom fields on Case, Contact, and Opportunity
- Assign the Hotel_Management_Admin permission set to your user
- Import seed data (23 Accounts, 24 Contacts, 10 Hotel Rooms)

**3. Verify Deployment**

```bash
# Open the org in browser
bin/sf org open --target-org myDevOrg

# Navigate to App Launcher → Dewy Hotel Management
# Verify tabs: Hotel Rooms, Bookings, Contacts, Cases, Opportunities, Accounts
# Check that seed data appears in each tab
```

### What Gets Deployed

**Custom Objects:**

- **Booking\_\_c** - Junction object for room reservations (links Contacts, Opportunities, Rooms)
- **Hotel_Room\_\_c** - Master data for room inventory (10 rooms: 101-105, 201-205)
- **Payment_Transaction\_\_c** - Payment records via Stripe integration
- **SMS_Notification\_\_c** - SMS communication logs via Twilio integration

**Standard Object Customizations:**

- **Case** - Added fields: External_ID**c, Room**c, Booking\_\_c
- **Contact** - Added fields: Contact_Type**c, Employee_ID**c, Loyalty_Number\_\_c
- **Opportunity** - Added fields: Total_Nights**c, Arrival_Date**c, Departure_Date\_\_c

**Lightning Application:**

- Dewy Hotel Management app with custom tabs, logo, and utility bar

**Seed Data:**

- 23 Accounts (1 hotel + 11 guest households + 11 vendor companies)
- 24 Contacts (1 manager + 12 guests + 11 vendors)
- 10 Hotel Rooms (rooms 101-105, 201-205)

### Manual Deployment Steps (Optional)

If you prefer to deploy step-by-step or troubleshoot:

```bash
# Deploy metadata only
cd salesforce
../bin/sf project deploy start --source-dir force-app --target-org myDevOrg

# Assign permission set
../bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg

# Import seed data only
../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
```

### Troubleshooting Salesforce Deployment

**Error: "Cannot delete this object because it is referenced by..."**

- Objects are deployed in correct order automatically by the script
- If manual deployment, deploy standalone objects first, then parents, then children

**Error: "Field integrity exception"**

- Ensure all required fields are included (Booking**c requires Opportunity**c)
- Check that parent objects exist before deploying child objects

**Error: "Picklist value not found"**

- For Case.Type picklist, add custom values in Setup:
  - Setup → Object Manager → Case → Fields & Relationships → Type
  - Add values: "Facilities", "Service Request"

**Error: "Authentication expired"**

- Re-authenticate: `bin/sf org login web --alias myDevOrg`

For detailed documentation, troubleshooting, and advanced scenarios, see [salesforce/README.md](./salesforce/README.md).

## Project Structure

```
dewy-resort/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── guest/             # Guest portal pages
│   ├── manager/           # Manager portal pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── guest/            # Guest-specific components
│   ├── manager/          # Manager-specific components
│   └── shared/           # Shared components
├── lib/                   # Utility libraries
│   ├── db/               # Database client and queries
│   ├── auth/             # Authentication utilities
│   └── api/              # API clients
├── types/                 # TypeScript type definitions
├── contexts/              # React contexts
├── database/              # SQLite database files
└── scripts/               # Database scripts
```

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Authentication**: Multiple providers - Amazon Cognito or local mock mode
- **Integrations**: Workato API Collections (Salesforce, Stripe, Twilio)

## Configuration

### Environment Variables

The application uses environment variables for configuration:

#### Authentication Provider Selection

The `AUTH_PROVIDER` environment variable controls which authentication system the application uses:

```bash
# Use local mock authentication (no external auth service)
AUTH_PROVIDER=mock

# Use Amazon Cognito authentication
AUTH_PROVIDER=cognito
```

**Backward Compatibility**: The legacy `WORKATO_MOCK_MODE` variable is still supported. When `WORKATO_MOCK_MODE=true`, it's equivalent to `AUTH_PROVIDER=mock`. If neither variable is set, the application defaults to Cognito authentication.

**⚠️ IMPORTANT**: After changing `AUTH_PROVIDER`, you MUST restart the Next.js development server for the change to take effect.

#### Mock Mode vs Real Mode

The `WORKATO_MOCK_MODE` environment variable (or `AUTH_PROVIDER=mock`) controls whether the application uses mock data and local authentication or real integrations:

```bash
# Enable mock mode (local authentication, mock API responses)
WORKATO_MOCK_MODE=true

# Disable mock mode (Cognito authentication, real API calls)
WORKATO_MOCK_MODE=false
```

**⚠️ IMPORTANT**: After changing `WORKATO_MOCK_MODE`, you MUST restart the Next.js development server for the change to take effect. Environment variables are loaded at server startup.

**Verify your configuration:**

```bash
npm run verify:mock
```

**Troubleshooting:** If mock mode isn't working as expected, see [MOCK_MODE_GUIDE.md](./docs/MOCK_MODE_GUIDE.md) for detailed troubleshooting steps.

**Mock Mode (`AUTH_PROVIDER=mock` or `WORKATO_MOCK_MODE=true`)**:

- Uses local email/password authentication
- All Workato API calls return simulated responses
- No external API requests are made
- External auth provider configuration is optional and ignored
- Useful for development, testing, and demos without API credentials

**Real Mode with Cognito (`AUTH_PROVIDER=cognito`)**:

- Uses Amazon Cognito for user authentication (direct in-app login)
- Makes real API calls to Workato and other services
- Requires AWS Cognito User Pool configuration
- User registration and email verification supported
- No AWS credentials needed for users (backend handles all AWS operations)

#### Workato Integration

- `WORKATO_API_AUTH_TOKEN`: Authentication token for Workato API
- `WORKATO_API_COLLECTION_URL`: Base URL for Workato API Collection

#### Optional Workato Configuration

- `WORKATO_CACHE_ENABLED`: Enable/disable response caching (default: `true`)
- `WORKATO_CACHE_TTL`: Cache time-to-live in milliseconds (default: `30000`)
- `WORKATO_MAX_RETRIES`: Maximum retry attempts for failed requests (default: `3`)
- `WORKATO_TIMEOUT`: Request timeout in milliseconds (default: `10000`)
- `WORKATO_LOGGING_ENABLED`: Enable/disable API logging (default: `true`)
- `WORKATO_LOG_LEVEL`: Logging level: `debug`, `info`, `warn`, `error` (default: `info`)

### Amazon Cognito Setup Guide

The application supports Amazon Cognito for user authentication with direct in-app login (no external redirects).

#### Current Configuration

The application is currently configured with:

- **User Pool ID**: `us-west-2_l1yPytMyD`
- **Region**: `us-west-2`
- **Authentication Flow**: USER_PASSWORD_AUTH (direct login)
- **Features**: User registration, email verification, custom role attribute

#### Required Environment Variables

```bash
# Set authentication provider to Cognito
AUTH_PROVIDER=cognito

# Amazon Cognito Configuration
COGNITO_USER_POOL_ID=us-west-2_l1yPytMyD
COGNITO_CLIENT_ID=1ss0ehv8du1d14398rioaurp0h
COGNITO_CLIENT_SECRET=5n0pvdc621a6t2spe7p1djhma2ll04c35r6m10vmtkcjakg9l4r
COGNITO_REGION=us-west-2
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito/callback

# Application URL
APP_URL=http://localhost:3000
```

#### How It Works

1. **User Registration**: Users can register directly in the app at `/register`
2. **Email Verification**: After registration, users receive a verification code via email
3. **Direct Login**: Users enter email/password directly in the app (no redirect to Cognito Hosted UI)
4. **Role Management**: User roles (guest/manager) are stored in Cognito's `custom:role` attribute
5. **Session Management**: Sessions are managed locally after Cognito authentication

#### Creating a New Cognito User Pool (Optional)

If you need to create your own Cognito User Pool, use the provided CloudFormation template:

```bash
cd aws/cloudformation
./deploy.sh dev http://localhost:3000/api/auth/cognito/callback http://localhost:3000 your-domain-prefix
```

The deployment script will:

- Create a Cognito User Pool with email verification
- Configure an App Client with USER_PASSWORD_AUTH enabled
- Set up custom `role` attribute for guest/manager roles
- Output the configuration values for your `.env` file

**Important**: After deployment, update your `.env` file with the new User Pool ID, Client ID, and Client Secret.

#### User Registration Flow

1. Navigate to `/register`
2. Fill in email, password, name, and role (guest or manager)
3. Submit the form
4. Check email for verification code
5. Enter code at `/verify-email`
6. Login at `/login` with email and password

#### Cognito Environment Variables

When `AUTH_PROVIDER=cognito`, configure these environment variables:

**Required Variables**:

```bash
AUTH_PROVIDER=cognito                                    # Enable Cognito authentication
COGNITO_USER_POOL_ID=us-east-1_ABC123                   # Your Cognito User Pool ID
COGNITO_CLIENT_ID=your_client_id                        # OAuth 2.0 App Client ID
COGNITO_CLIENT_SECRET=your_client_secret                # OAuth 2.0 App Client Secret
COGNITO_REGION=us-east-1                                # AWS region where User Pool is located
APP_URL=http://localhost:3000                           # Application base URL
```

**Optional Variables**:

```bash
# OAuth callback URL (defaults to {APP_URL}/api/auth/cognito/callback if not provided)
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito/callback

# Cognito domain (defaults to computed value if not provided)
COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com

# AWS credentials for user management operations (optional, can use IAM roles instead)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

#### Setting Up Cognito Infrastructure

The easiest way to set up Cognito for this application is using the provided CloudFormation templates.

**Prerequisites**:

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Basic understanding of AWS CloudFormation

**Quick Setup**:

1. Navigate to the CloudFormation directory:

```bash
cd aws/cloudformation
```

2. Deploy the Cognito User Pool:

```bash
./deploy.sh dev http://localhost:3000/api/auth/cognito/callback http://localhost:3000/login
```

3. The script will output the configuration values. Copy them to your `.env` file:

```bash
COGNITO_USER_POOL_ID=us-east-1_ABC123
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_REGION=us-east-1
```

4. Set the authentication provider:

```bash
AUTH_PROVIDER=cognito
```

5. Restart your development server:

```bash
npm run dev
```

**Detailed Setup Instructions**:

For complete deployment instructions, troubleshooting, and advanced configuration options, see the [CloudFormation Deployment Guide](./aws/cloudformation/README.md).

#### Cognito User Pool Configuration

The CloudFormation template creates a User Pool with the following configuration:

**Authentication Settings**:

- Username attribute: Email address
- Password policy: Minimum 8 characters, requires uppercase, lowercase, numbers, and symbols
- Auto-verified attributes: Email
- MFA: Optional (can be enabled per-user)

**Custom Attributes**:

- `custom:role` (string): User role with allowed values `guest` or `manager`

**OAuth 2.0 Settings**:

- Flows: Authorization Code Grant with PKCE
- Scopes: `openid`, `email`, `profile`
- Token validity: ID token 60 minutes, access token 60 minutes, refresh token 30 days

#### Creating Cognito Users

**Option 1: Via AWS Console**

1. Log in to AWS Console
2. Navigate to Amazon Cognito > User Pools
3. Select your User Pool
4. Go to **Users** tab
5. Click **Create user**
6. Fill in:
   - Email address (username)
   - Temporary password (user will be prompted to change)
   - Name
   - Custom attribute `custom:role`: `guest` or `manager`
7. Click **Create user**

**Option 2: Via Application Registration**

When `AUTH_PROVIDER=cognito`, the application provides a registration page at `/register` that creates users directly in Cognito.

**Option 3: Via AWS CLI**

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_ABC123 \
  --username user@example.com \
  --user-attributes \
    Name=email,Value=user@example.com \
    Name=name,Value="John Doe" \
    Name=custom:role,Value=guest \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

#### Switching Between Authentication Providers

You can easily switch between authentication providers by changing the `AUTH_PROVIDER` environment variable:

**Switch to Mock Mode**:

```bash
# In .env file
AUTH_PROVIDER=mock
# or
WORKATO_MOCK_MODE=true
```

**Switch to Cognito**:

```bash
# In .env file
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us-east-1_ABC123
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_REGION=us-east-1
```

**Important**: Always restart the development server after changing `AUTH_PROVIDER`:

```bash
# Stop the server (Ctrl+C), then restart
npm run dev
```

#### Troubleshooting Cognito Integration

**"USER_PASSWORD_AUTH flow not enabled" error**:

- Ensure the App Client has USER_PASSWORD_AUTH enabled in AWS Console
- Go to Cognito → User Pools → App clients → Edit → Enable "ALLOW_USER_PASSWORD_AUTH"

**"Authentication service not configured" error**:

- Ensure `AUTH_PROVIDER=cognito` in your `.env` file
- Verify all required Cognito environment variables are set
- Check that `COGNITO_REGION` format is correct (e.g., `us-east-1`)
- Restart the development server

**Environment variable caching**:

- If changes to `.env` aren't taking effect, check for shell environment variables: `env | grep COGNITO`
- Unset any conflicting shell variables or restart your terminal
- Clear Next.js cache: `rm -rf .next && npm run dev`

**"Email not verified" error**:

- Complete the email verification flow at `/verify-email`
- Check spam folder for verification email
- Use "Resend Code" button if needed

**"Your account is not properly configured" error**:

- Ensure the user has a `custom:role` attribute set in Cognito
- Verify the role value is either `guest` or `manager`
- Check that the User Pool includes the custom attribute definition

**"Authentication failed" error**:

- Verify the callback URL in Cognito matches your `COGNITO_REDIRECT_URI` or `{APP_URL}/api/auth/cognito/callback`
- Check that the App Client secret is correct
- Ensure the App Client has Authorization Code Grant flow enabled

**"Invalid AWS region format" error**:

- Verify `COGNITO_REGION` uses the correct format (e.g., `us-east-1`, `eu-west-1`)
- Check for typos or extra spaces in the region value

**User registration not working**:

- Verify AWS credentials are configured (environment variables or IAM role)
- Ensure the credentials have `cognito-idp:AdminCreateUser` permission
- Check that the password meets the User Pool password policy

**CloudFormation deployment fails**:

- Verify AWS CLI is installed and configured
- Check that your AWS account has CloudFormation and Cognito permissions
- Ensure the domain prefix is unique (not already in use)
- See the [CloudFormation Deployment Guide](./aws/cloudformation/README.md) for detailed troubleshooting

**Session issues**:

- Clear browser cookies and try again
- Check that cookies are enabled in your browser
- Verify the session hasn't expired (24-hour default)

### Amazon Bedrock AI Chat Integration (Optional)

The application supports Amazon Bedrock for AI-powered chat agents with streaming responses and role-specific tools via MCP (Model Context Protocol).

#### Prerequisites

1. **AUTH_PROVIDER must be set to "cognito"**
2. **Cognito Identity Pool deployed and configured**
3. **Bedrock model access enabled in AWS account**
4. **IAM roles configured for each user role**

#### Quick Setup

**1. Verify Current Configuration**

```bash
npm run verify:bedrock
```

This will check your Bedrock configuration and provide setup recommendations.

**2. Deploy Identity Pool**

```bash
cd aws/cloudformation
./deploy-identity-pool.sh dev <user-pool-id> <client-id>
```

Replace `<user-pool-id>` and `<client-id>` with your Cognito User Pool values from `.env`.

**3. Enable Bedrock Model Access**

Visit the AWS Bedrock console and request access to Claude 3 models:
https://console.aws.amazon.com/bedrock/home#/modelaccess

**4. Update Environment Variables**

Add the Identity Pool ID from CloudFormation outputs to your `.env` file:

```bash
# Required for Bedrock
COGNITO_IDENTITY_POOL_ID=us-west-2:12345678-1234-1234-1234-123456789012

# Optional: Customize model settings
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.7
AWS_REGION=us-west-2
```

**5. Restart Development Server**

```bash
npm run dev
```

**6. Test Chat Functionality**

Navigate to:

- Guest chat: http://localhost:3000/guest/chat
- Manager chat: http://localhost:3000/manager/chat
- Housekeeping chat: http://localhost:3000/housekeeping/chat
- Maintenance chat: http://localhost:3000/maintenance/chat

#### Configuration Validation

The application validates Bedrock configuration on startup. If configuration is invalid, you'll see clear error messages indicating what needs to be fixed.

**Manual Validation**:

```bash
npm run verify:bedrock
```

**Validation Checks**:

- ✓ AUTH_PROVIDER is set to "cognito"
- ✓ COGNITO_IDENTITY_POOL_ID is configured and valid format
- ✓ AWS_REGION or COGNITO_REGION is set
- ✓ COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are configured
- ✓ BEDROCK_MODEL_ID is valid format (if specified)
- ✓ BEDROCK_MAX_TOKENS is within valid range (if specified)
- ✓ BEDROCK_TEMPERATURE is between 0.0 and 1.0 (if specified)
- ✓ MCP configuration files exist for all roles

#### Environment Variables Reference

| Variable                   | Required | Default                                   | Description                              |
| -------------------------- | -------- | ----------------------------------------- | ---------------------------------------- |
| `COGNITO_IDENTITY_POOL_ID` | Yes      | -                                         | Identity Pool ID (format: region:uuid)   |
| `AWS_REGION`               | Yes\*    | `COGNITO_REGION`                          | AWS region for Bedrock and Identity Pool |
| `BEDROCK_MODEL_ID`         | No       | `anthropic.claude-3-sonnet-20240229-v1:0` | Bedrock model to use                     |
| `BEDROCK_MAX_TOKENS`       | No       | `4096`                                    | Maximum tokens to generate (1-200000)    |
| `BEDROCK_TEMPERATURE`      | No       | `0.7`                                     | Response randomness (0.0-1.0)            |
| `MCP_CONFIG_PATH`          | No       | `config/mcp`                              | Path to MCP configuration files          |

\*Required if `COGNITO_REGION` is not set

#### Supported Models

- `anthropic.claude-3-sonnet-20240229-v1:0` (default, balanced performance)
- `anthropic.claude-3-haiku-20240307-v1:0` (faster, lower cost)
- `anthropic.claude-3-opus-20240229-v1:0` (most capable, higher cost)
- `anthropic.claude-3-5-sonnet-20240620-v1:0` (latest, improved performance)

#### MCP Server Configuration

Each user role has independent MCP configuration defining available tools:

- `config/mcp/guest.json` - Guest tools (service requests, room controls, billing)
- `config/mcp/manager.json` - Manager tools (analytics, operations, bookings)
- `config/mcp/housekeeping.json` - Housekeeping tools (tasks, room status, supplies)
- `config/mcp/maintenance.json` - Maintenance tools (work orders, equipment, parts)

See `config/mcp/README.md` for detailed MCP configuration documentation.

#### System Prompts

Role-specific system prompts define AI agent behavior:

- `config/prompts/guest.txt` - Guest assistant prompt
- `config/prompts/manager.txt` - Manager assistant prompt
- `config/prompts/housekeeping.txt` - Housekeeping assistant prompt
- `config/prompts/maintenance.txt` - Maintenance assistant prompt

Prompts support variable interpolation using `{{variable}}` syntax.

#### Troubleshooting

For detailed troubleshooting information, see the [Bedrock Troubleshooting Guide](./docs/BEDROCK_TROUBLESHOOTING.md).

**Quick Fixes**:

**"Bedrock integration requires AUTH_PROVIDER=cognito"**

- Set `AUTH_PROVIDER=cognito` in `.env`
- Restart the development server

**"Bedrock integration requires COGNITO_IDENTITY_POOL_ID to be configured"**

- Deploy Identity Pool using CloudFormation
- Add `COGNITO_IDENTITY_POOL_ID` to `.env`
- Restart the development server

**"Unable to authenticate with AI service"**

- Verify Identity Pool is linked to User Pool
- Check IAM role mappings in Identity Pool
- Ensure user has valid `custom:role` attribute

**"AI service temporarily unavailable"**

- Verify Bedrock model access is enabled
- Check AWS region matches Identity Pool region
- Verify IAM roles have Bedrock invoke permissions

**Configuration validation fails**

- Run `npm run verify:bedrock` for detailed diagnostics
- Check all required environment variables are set
- Verify MCP configuration files exist and are valid JSON

#### Additional Resources

**Deployment & Testing**:

- [Testing Quick Start](./docs/testing/TESTING_COMPLETE.md) - Start here for testing!
- [Manual Test Guide](./docs/testing/MANUAL_TEST_GUIDE.md) - Step-by-step testing instructions
- [Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [Deployment Success Summary](./docs/deployment/DEPLOYMENT_SUCCESS.md) - What was deployed
- [Claude 4.5 Upgrade Details](./docs/deployment/CLAUDE_4.5_UPGRADE.md) - Model upgrade information

**Configuration & Setup**:

- [Bedrock Configuration Guide](./docs/BEDROCK_CONFIGURATION.md) - Comprehensive configuration reference
- [Bedrock Troubleshooting Guide](./docs/BEDROCK_TROUBLESHOOTING.md) - Solutions to common issues
- [Identity Pool Deployment Guide](./aws/cloudformation/README-IDENTITY-POOL.md) - CloudFormation deployment
- [Identity Pool Quick Start](./aws/cloudformation/QUICKSTART-IDENTITY-POOL.md) - Quick setup guide
- [MCP Configuration Guide](./config/mcp/README.md) - MCP server configuration
- [MCP Server Development Guide](./docs/MCP_SERVER_DEVELOPMENT.md) - Building custom MCP servers

**Technical Documentation**:

- [Bedrock Services Documentation](./lib/bedrock/README.md) - Service implementation details
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/) - Official AWS docs
- [Cognito Identity Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html) - Official AWS docs

**Testing Scripts**:

- `./scripts/test-bedrock-chat.sh` - Automated test script

## Development

This is a demo application designed for workshop purposes. It includes mock API endpoints and simplified authentication.

## License

MIT
