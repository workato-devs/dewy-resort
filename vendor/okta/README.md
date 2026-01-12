# Okta Integration

This directory contains documentation and configuration for integrating Okta OAuth 2.0 authentication into the application.

This integration is not fully tested. Issues occured in Okta when atempting to resolve variables in API claims.

## Overview

Okta provides enterprise-grade identity and access management with OAuth 2.0 and OpenID Connect support. This integration enables:

- Single Sign-On (SSO) authentication
- OAuth 2.0 authorization code flow with PKCE
- User profile management
- Multi-factor authentication (MFA)
- Role-based access control

## Prerequisites

1. **Okta Account**: Sign up at [okta.com](https://www.okta.com/) or [developer.okta.com](https://developer.okta.com/)
2. **Okta Application**: Create an OAuth 2.0 application in your Okta admin console

## Setup Instructions

### 1. Create Okta Application

1. Log in to your Okta admin console
2. Navigate to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method**: OIDC - OpenID Connect
   - **Application type**: Web Application
5. Click **Next**

### 2. Configure Application Settings

**General Settings:**
- **App integration name**: Your application name (e.g., "Hotel Management System")
- **Logo**: Upload your application logo (optional)

**Sign-in redirect URIs:**
```
http://localhost:3000/api/auth/okta/callback
https://your-production-domain.com/api/auth/okta/callback
```

**Sign-out redirect URIs:**
```
http://localhost:3000
https://your-production-domain.com
```

**Assignments:**
- Choose who can access this application:
  - **Allow everyone in your organization to access**
  - **Limit access to selected groups**

### 3. Get Client Credentials

After creating the application:

1. Navigate to **Applications** > **[Your App]** > **General**
2. Scroll to **Client Credentials**
3. Copy the following values:
   - **Client ID**
   - **Client secret** (click "Show" to reveal)

### 4. Configure Environment Variables

Copy the `.env.example` file to your application's `.env` file:

```bash
cp vendor/okta/.env.example app/.env
```

Update the following variables in `app/.env`:

```bash
# Required
OKTA_DOMAIN=your-tenant.okta.com
OKTA_CLIENT_ID=0oa1234567890abcdef
OKTA_CLIENT_SECRET=your_secret_here_keep_this_secure

# Optional
OKTA_AUTH_SERVER=default
APP_URL=http://localhost:3000
```

### 5. Configure Authorization Server (Optional)

By default, Okta uses the "default" custom authorization server. To use a different server:

**Option 1: Org Authorization Server**
```bash
OKTA_AUTH_SERVER=org
```

**Option 2: Custom Authorization Server**
1. Navigate to **Security** > **API** > **Authorization Servers**
2. Create or select an authorization server
3. Copy the **Issuer URI** (e.g., `https://your-tenant.okta.com/oauth2/aus1234567890abcdef`)
4. Extract the server ID (the part after `/oauth2/`)
5. Set in `.env`:
```bash
OKTA_AUTH_SERVER=aus1234567890abcdef
```

### 6. Create API Token (Optional)

Required only for user management features:

1. Navigate to **Security** > **API** > **Tokens**
2. Click **Create Token**
3. Enter a name (e.g., "Hotel Management API")
4. Click **Create Token**
5. Copy the token value (you won't be able to see it again)
6. Add to `.env`:
```bash
OKTA_API_TOKEN=00abc123def456ghi789jkl012mno345pqr678stu
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OKTA_DOMAIN` | Yes | - | Your Okta organization domain (without https://) |
| `OKTA_CLIENT_ID` | Yes | - | OAuth 2.0 client ID from your Okta application |
| `OKTA_CLIENT_SECRET` | Yes | - | OAuth 2.0 client secret (keep secure!) |
| `OKTA_AUTH_SERVER` | No | `default` | Authorization server: 'default', 'org', or custom ID |
| `OKTA_REDIRECT_URI` | No | `{APP_URL}/api/auth/okta/callback` | OAuth callback URL |
| `OKTA_API_TOKEN` | No | - | API token for user management features |
| `APP_URL` | Yes | - | Base URL of your application |

## Authentication Flow

### OAuth 2.0 Authorization Code Flow with PKCE

1. **User initiates login**: User clicks "Sign in with Okta"
2. **Redirect to Okta**: Application redirects to Okta authorization endpoint
3. **User authenticates**: User enters credentials (and MFA if enabled)
4. **Authorization code**: Okta redirects back with authorization code
5. **Token exchange**: Application exchanges code for access token and ID token
6. **User session**: Application creates session with user profile data

### Endpoints

**Authorization Endpoint:**
```
https://{OKTA_DOMAIN}/oauth2/{AUTH_SERVER}/v1/authorize
```

**Token Endpoint:**
```
https://{OKTA_DOMAIN}/oauth2/{AUTH_SERVER}/v1/token
```

**UserInfo Endpoint:**
```
https://{OKTA_DOMAIN}/oauth2/{AUTH_SERVER}/v1/userinfo
```

**Logout Endpoint:**
```
https://{OKTA_DOMAIN}/oauth2/{AUTH_SERVER}/v1/logout
```

## User Profile Mapping

Okta provides standard OIDC claims in the ID token:

| Okta Claim | Application Field | Description |
|------------|-------------------|-------------|
| `sub` | `id` | Unique user identifier |
| `email` | `email` | User email address |
| `given_name` | `firstName` | User first name |
| `family_name` | `lastName` | User last name |
| `name` | `displayName` | Full name |
| `picture` | `avatar` | Profile picture URL |

### Custom Attributes

To add custom attributes (e.g., user role):

1. Navigate to **Directory** > **Profile Editor**
2. Select your application's user profile
3. Click **Add Attribute**
4. Configure attribute (e.g., `role` with type `string`)
5. Map attribute in **Applications** > **[Your App]** > **Sign On** > **OpenID Connect ID Token**

## Role-Based Access Control

### Option 1: Custom User Attribute

Add a `role` attribute to user profiles:

```javascript
// In ID token claims
{
  "sub": "00u1234567890abcdef",
  "email": "user@example.com",
  "role": "manager"
}
```

### Option 2: Okta Groups

Use Okta groups for role management:

1. Create groups: **Directory** > **Groups** > **Add Group**
2. Assign users to groups
3. Add group claim to ID token:
   - Navigate to **Security** > **API** > **Authorization Servers** > **[Your Server]**
   - Click **Claims** > **Add Claim**
   - Configure:
     - **Name**: `groups`
     - **Include in token type**: ID Token
     - **Value type**: Groups
     - **Filter**: Matches regex `.*` (or specific pattern)

```javascript
// In ID token claims
{
  "sub": "00u1234567890abcdef",
  "email": "user@example.com",
  "groups": ["managers", "staff"]
}
```

## Security Best Practices

1. **Keep secrets secure**: Never commit `OKTA_CLIENT_SECRET` or `OKTA_API_TOKEN` to version control
2. **Use HTTPS in production**: Always use HTTPS for redirect URIs in production
3. **Rotate secrets regularly**: Periodically rotate client secrets and API tokens
4. **Enable MFA**: Require multi-factor authentication for all users
5. **Limit token scope**: Request only the OAuth scopes your application needs
6. **Validate tokens**: Always validate ID tokens and access tokens server-side
7. **Use PKCE**: Authorization code flow with PKCE prevents authorization code interception
8. **Set token expiration**: Configure appropriate token lifetimes in Okta

## Troubleshooting

### Common Issues

**"Invalid client" error:**
- Verify `OKTA_CLIENT_ID` and `OKTA_CLIENT_SECRET` are correct
- Ensure client secret hasn't been rotated in Okta

**"Redirect URI mismatch" error:**
- Verify redirect URI in `.env` matches exactly what's configured in Okta
- Check for trailing slashes and protocol (http vs https)

**"User not assigned to application" error:**
- Assign user to application in Okta admin console
- Check application assignment rules

**"Invalid authorization server" error:**
- Verify `OKTA_AUTH_SERVER` value is correct
- Ensure authorization server is active in Okta

### Debug Mode

Enable authentication debug logging:

```bash
NEXT_PUBLIC_DEBUG_AUTH=true
```

This will log authentication events to the browser console.

## Testing

### Test Users

Create test users in Okta:

1. Navigate to **Directory** > **People**
2. Click **Add Person**
3. Fill in user details
4. Assign to your application

### Test Authentication Flow

1. Start your application: `npm run dev`
2. Navigate to login page
3. Click "Sign in with Okta"
4. Enter test user credentials
5. Verify successful authentication and redirect

## Migration from Other Providers

### From Auth0

Key differences:
- Domain format: `your-tenant.okta.com` vs `your-tenant.auth0.com`
- Authorization server concept (Okta) vs API audience (Auth0)
- User profile structure may differ

### From AWS Cognito

Key differences:
- Okta uses standard OIDC endpoints
- No user pool concept (organization-level)
- Different user attribute naming conventions

## Resources

- [Okta Developer Documentation](https://developer.okta.com/docs/)
- [OAuth 2.0 and OIDC Overview](https://developer.okta.com/docs/concepts/oauth-openid/)
- [Okta Node.js SDK](https://github.com/okta/okta-sdk-nodejs)
- [OIDC Debugger Tool](https://oidcdebugger.com/)

## Support

- **Okta Developer Forums**: [devforum.okta.com](https://devforum.okta.com/)
- **Okta Support**: Available for paid accounts
- **Application Issues**: Contact your development team

## License

This integration documentation is part of the main application. See the root LICENSE file for details.
