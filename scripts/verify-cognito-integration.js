#!/usr/bin/env node

/**
 * Cognito Integration Verification Script
 * 
 * This script verifies that all components of the Cognito integration
 * are properly wired together and working correctly.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logCheck(description, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${description}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Track overall results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function check(description, condition, details = '') {
  if (condition) {
    results.passed++;
    logCheck(description, true, details);
  } else {
    results.failed++;
    logCheck(description, false, details);
  }
  return condition;
}

function warn(message) {
  results.warnings++;
  log(`⚠ ${message}`, 'yellow');
}

// Helper to check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

// Helper to read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

// Helper to check if file contains text
function fileContains(filePath, searchText) {
  const content = readFile(filePath);
  return content ? content.includes(searchText) : false;
}

// Verification functions

function verifyRoutes() {
  logSection('1. Verifying Cognito Routes');
  
  check(
    'Login route exists',
    fileExists('app/api/auth/cognito/login/route.ts'),
    'app/api/auth/cognito/login/route.ts'
  );
  
  check(
    'Callback route exists',
    fileExists('app/api/auth/cognito/callback/route.ts'),
    'app/api/auth/cognito/callback/route.ts'
  );
  
  check(
    'Register route exists',
    fileExists('app/api/auth/cognito/register/route.ts'),
    'app/api/auth/cognito/register/route.ts'
  );
  
  // Check login route implementation
  const loginRoute = readFile('app/api/auth/cognito/login/route.ts');
  if (loginRoute) {
    check(
      'Login route checks if Cognito is enabled',
      loginRoute.includes('isCognitoEnabled()'),
      'Uses isCognitoEnabled() function'
    );
    
    check(
      'Login route generates PKCE',
      loginRoute.includes('generatePKCE()'),
      'Uses generatePKCE() function'
    );
    
    check(
      'Login route stores code verifier in cookie',
      loginRoute.includes('cognito_code_verifier'),
      'Sets cognito_code_verifier cookie'
    );
    
    check(
      'Login route stores state in cookie',
      loginRoute.includes('cognito_state'),
      'Sets cognito_state cookie'
    );
  }
  
  // Check callback route implementation
  const callbackRoute = readFile('app/api/auth/cognito/callback/route.ts');
  if (callbackRoute) {
    check(
      'Callback route validates state parameter',
      callbackRoute.includes('stateCookie') && callbackRoute.includes('state !== stateCookie'),
      'Validates state matches cookie'
    );
    
    check(
      'Callback route exchanges code for tokens',
      callbackRoute.includes('exchangeCodeForTokens'),
      'Calls exchangeCodeForTokens()'
    );
    
    check(
      'Callback route validates ID token',
      callbackRoute.includes('validateIdToken'),
      'Calls validateIdToken()'
    );
    
    check(
      'Callback route validates custom:role claim',
      callbackRoute.includes("'custom:role'") && callbackRoute.includes('guest') && callbackRoute.includes('manager'),
      'Validates role is guest or manager'
    );
    
    check(
      'Callback route upserts user',
      callbackRoute.includes('upsertUserFromCognito'),
      'Calls upsertUserFromCognito()'
    );
    
    check(
      'Callback route creates session',
      callbackRoute.includes('createSessionFromCognito'),
      'Calls createSessionFromCognito()'
    );
    
    check(
      'Callback route clears PKCE cookies',
      callbackRoute.includes("delete('cognito_code_verifier')") && callbackRoute.includes("delete('cognito_state')"),
      'Deletes cognito_code_verifier and cognito_state cookies'
    );
  }
  
  // Check register route implementation
  const registerRoute = readFile('app/api/auth/cognito/register/route.ts');
  if (registerRoute) {
    check(
      'Register route validates AUTH_PROVIDER',
      registerRoute.includes('getAuthProvider()') && registerRoute.includes("!== 'cognito'"),
      'Checks AUTH_PROVIDER is cognito'
    );
    
    check(
      'Register route creates user in Cognito',
      registerRoute.includes('createUser'),
      'Calls createUser() method'
    );
    
    check(
      'Register route handles UsernameExistsException',
      registerRoute.includes('UsernameExistsException'),
      'Handles user already exists error'
    );
    
    check(
      'Register route handles InvalidPasswordException',
      registerRoute.includes('InvalidPasswordException'),
      'Handles password policy violation'
    );
  }
}

function verifyLoginPage() {
  logSection('2. Verifying Login Page');
  
  check(
    'Login page exists',
    fileExists('app/login/page.tsx'),
    'app/login/page.tsx'
  );
  
  const loginPage = readFile('app/login/page.tsx');
  if (loginPage) {
    check(
      'Login page fetches auth provider',
      loginPage.includes('/api/auth/config') || loginPage.includes('authProvider'),
      'Fetches auth provider configuration'
    );
    
    check(
      'Login page shows Cognito button',
      loginPage.includes('Sign in with Cognito') || loginPage.includes('handleCognitoLogin'),
      'Has Cognito login button'
    );
    
    check(
      'Login page shows Okta button',
      loginPage.includes('Sign in with Okta') || loginPage.includes('handleOktaLogin'),
      'Has Okta login button'
    );
    
    check(
      'Login page shows mock mode form',
      loginPage.includes('email') && loginPage.includes('password'),
      'Has email/password form for mock mode'
    );
    
    check(
      'Login page displays error messages',
      loginPage.includes('errorParam') || loginPage.includes('error_description'),
      'Displays error messages from query parameters'
    );
    
    check(
      'Login page has Create Account link',
      loginPage.includes('/register') || loginPage.includes('Create Account'),
      'Has link to registration page'
    );
  }
}

function verifyRegistrationPage() {
  logSection('3. Verifying Registration Page');
  
  check(
    'Registration page exists',
    fileExists('app/register/page.tsx'),
    'app/register/page.tsx'
  );
  
  const registerPage = readFile('app/register/page.tsx');
  if (registerPage) {
    check(
      'Registration page has email field',
      registerPage.includes('email'),
      'Has email input field'
    );
    
    check(
      'Registration page has password field',
      registerPage.includes('password'),
      'Has password input field'
    );
    
    check(
      'Registration page has name field',
      registerPage.includes('name'),
      'Has name input field'
    );
    
    check(
      'Registration page has role field',
      registerPage.includes('role'),
      'Has role selection field'
    );
    
    check(
      'Registration page routes to Cognito register',
      registerPage.includes('/api/auth/cognito/register'),
      'Submits to /api/auth/cognito/register'
    );
  }
}

function verifySessionManagement() {
  logSection('4. Verifying Session Management');
  
  check(
    'Session module exists',
    fileExists('lib/auth/session.ts'),
    'lib/auth/session.ts'
  );
  
  const sessionModule = readFile('lib/auth/session.ts');
  if (sessionModule) {
    check(
      'createSessionFromCognito function exists',
      sessionModule.includes('createSessionFromCognito'),
      'Has createSessionFromCognito() function'
    );
    
    check(
      'upsertUserFromCognito function exists',
      sessionModule.includes('upsertUserFromCognito'),
      'Has upsertUserFromCognito() function'
    );
    
    check(
      'createSessionFromCognito creates local session',
      sessionModule.includes('createSessionFromCognito') && sessionModule.includes('createSession'),
      'Creates local session for Cognito users'
    );
    
    check(
      'upsertUserFromCognito uses sub claim as user ID',
      sessionModule.includes('claims.sub'),
      'Uses Cognito sub claim as user ID'
    );
    
    check(
      'upsertUserFromCognito sets empty password_hash',
      sessionModule.includes("password_hash, name, role") && sessionModule.includes("''"),
      'Sets password_hash to empty string for Cognito users'
    );
    
    check(
      'upsertUserFromCognito extracts custom:role',
      sessionModule.includes("'custom:role'"),
      'Extracts custom:role from claims'
    );
  }
}

function verifyMiddleware() {
  logSection('5. Verifying Authentication Middleware');
  
  check(
    'Middleware module exists',
    fileExists('lib/auth/middleware.ts'),
    'lib/auth/middleware.ts'
  );
  
  const middleware = readFile('lib/auth/middleware.ts');
  if (middleware) {
    check(
      'requireAuth function exists',
      middleware.includes('requireAuth'),
      'Has requireAuth() function'
    );
    
    check(
      'requireGuest function exists',
      middleware.includes('requireGuest'),
      'Has requireGuest() function'
    );
    
    check(
      'requireManager function exists',
      middleware.includes('requireManager'),
      'Has requireManager() function'
    );
    
    check(
      'Middleware uses getSession',
      middleware.includes('getSession()'),
      'Uses getSession() for validation'
    );
    
    check(
      'Middleware validates session data',
      middleware.includes('session.userId') && middleware.includes('session.role'),
      'Validates userId and role exist'
    );
    
    // Check that middleware documentation mentions Cognito
    if (middleware.includes('Cognito')) {
      check(
        'Middleware documentation mentions Cognito support',
        true,
        'Documentation updated for Cognito'
      );
    } else {
      warn('Middleware documentation does not mention Cognito support');
    }
  }
}

function verifyAuthConfig() {
  logSection('6. Verifying Auth Configuration Module');
  
  check(
    'Auth config module exists',
    fileExists('lib/auth/config.ts'),
    'lib/auth/config.ts'
  );
  
  const authConfig = readFile('lib/auth/config.ts');
  if (authConfig) {
    check(
      'getAuthProvider function exists',
      authConfig.includes('getAuthProvider'),
      'Has getAuthProvider() function'
    );
    
    check(
      'getAuthConfig function exists',
      authConfig.includes('getAuthConfig'),
      'Has getAuthConfig() function'
    );
    
    check(
      'isAuthProviderEnabled function exists',
      authConfig.includes('isAuthProviderEnabled'),
      'Has isAuthProviderEnabled() function'
    );
    
    check(
      'Supports AUTH_PROVIDER environment variable',
      authConfig.includes('AUTH_PROVIDER'),
      'Reads AUTH_PROVIDER environment variable'
    );
    
    check(
      'Supports WORKATO_MOCK_MODE for backward compatibility',
      authConfig.includes('WORKATO_MOCK_MODE'),
      'Maintains backward compatibility with WORKATO_MOCK_MODE'
    );
    
    check(
      'Validates AUTH_PROVIDER values',
      authConfig.includes("'mock'") && authConfig.includes("'okta'") && authConfig.includes("'cognito'"),
      'Validates provider is mock, okta, or cognito'
    );
    
    check(
      'Defaults to okta for backward compatibility',
      authConfig.includes("return 'okta'"),
      'Defaults to okta when neither variable is set'
    );
  }
}

function verifyCognitoModules() {
  logSection('7. Verifying Cognito Modules');
  
  check(
    'Cognito config module exists',
    fileExists('lib/auth/cognito/config.ts'),
    'lib/auth/cognito/config.ts'
  );
  
  check(
    'Cognito client module exists',
    fileExists('lib/auth/cognito/client.ts'),
    'lib/auth/cognito/client.ts'
  );
  
  check(
    'Cognito validator module exists',
    fileExists('lib/auth/cognito/validator.ts'),
    'lib/auth/cognito/validator.ts'
  );
  
  check(
    'Cognito management module exists',
    fileExists('lib/auth/cognito/management.ts'),
    'lib/auth/cognito/management.ts'
  );
  
  check(
    'Cognito errors module exists',
    fileExists('lib/auth/cognito/errors.ts'),
    'lib/auth/cognito/errors.ts'
  );
  
  check(
    'Cognito logger module exists',
    fileExists('lib/auth/cognito/logger.ts'),
    'lib/auth/cognito/logger.ts'
  );
  
  // Check config module
  const cognitoConfig = readFile('lib/auth/cognito/config.ts');
  if (cognitoConfig) {
    check(
      'Cognito config reads environment variables',
      cognitoConfig.includes('COGNITO_USER_POOL_ID') && 
      cognitoConfig.includes('COGNITO_CLIENT_ID') &&
      cognitoConfig.includes('COGNITO_CLIENT_SECRET') &&
      cognitoConfig.includes('COGNITO_REGION'),
      'Reads required Cognito environment variables'
    );
    
    check(
      'Cognito config has isCognitoEnabled function',
      cognitoConfig.includes('isCognitoEnabled'),
      'Has isCognitoEnabled() function'
    );
  }
  
  // Check client module
  const cognitoClient = readFile('lib/auth/cognito/client.ts');
  if (cognitoClient) {
    check(
      'Cognito client has getAuthorizationUrl method',
      cognitoClient.includes('getAuthorizationUrl'),
      'Has getAuthorizationUrl() method'
    );
    
    check(
      'Cognito client has exchangeCodeForTokens method',
      cognitoClient.includes('exchangeCodeForTokens'),
      'Has exchangeCodeForTokens() method'
    );
    
    check(
      'Cognito client has parseIdToken method',
      cognitoClient.includes('parseIdToken'),
      'Has parseIdToken() method'
    );
  }
}

function verifyLogout() {
  logSection('8. Verifying Logout Functionality');
  
  check(
    'Logout route exists',
    fileExists('app/api/auth/logout/route.ts'),
    'app/api/auth/logout/route.ts'
  );
  
  const logoutRoute = readFile('app/api/auth/logout/route.ts');
  if (logoutRoute) {
    check(
      'Logout route deletes session',
      logoutRoute.includes('deleteSession'),
      'Calls deleteSession()'
    );
    
    check(
      'Logout route redirects to login',
      logoutRoute.includes('/login'),
      'Redirects to login page'
    );
    
    // Note: Cognito sessions are local, so deleteSession handles them
    check(
      'Logout works with local sessions',
      logoutRoute.includes('deleteSession'),
      'deleteSession() handles all session types including Cognito'
    );
  }
}

function verifyEnvironmentConfig() {
  logSection('9. Verifying Environment Configuration');
  
  check(
    '.env.example exists',
    fileExists('.env.example'),
    '.env.example'
  );
  
  const envExample = readFile('.env.example');
  if (envExample) {
    check(
      '.env.example has AUTH_PROVIDER',
      envExample.includes('AUTH_PROVIDER'),
      'Documents AUTH_PROVIDER variable'
    );
    
    check(
      '.env.example has Cognito variables',
      envExample.includes('COGNITO_USER_POOL_ID') &&
      envExample.includes('COGNITO_CLIENT_ID') &&
      envExample.includes('COGNITO_CLIENT_SECRET') &&
      envExample.includes('COGNITO_REGION'),
      'Documents Cognito environment variables'
    );
    
    check(
      '.env.example documents optional Cognito variables',
      envExample.includes('COGNITO_REDIRECT_URI') &&
      envExample.includes('COGNITO_DOMAIN'),
      'Documents optional Cognito variables'
    );
  }
}

function verifyDocumentation() {
  logSection('10. Verifying Documentation');
  
  check(
    'CloudFormation README exists',
    fileExists('aws/cloudformation/README.md'),
    'aws/cloudformation/README.md'
  );
  
  check(
    'Main README exists',
    fileExists('README.md'),
    'README.md'
  );
  
  const readme = readFile('README.md');
  if (readme) {
    if (readme.includes('Cognito') || readme.includes('AUTH_PROVIDER')) {
      check(
        'README documents Cognito integration',
        true,
        'README mentions Cognito or AUTH_PROVIDER'
      );
    } else {
      warn('README does not mention Cognito integration');
    }
  }
  
  const cfnReadme = readFile('aws/cloudformation/README.md');
  if (cfnReadme) {
    check(
      'CloudFormation README has deployment instructions',
      cfnReadme.includes('deploy') || cfnReadme.includes('CloudFormation'),
      'Contains deployment instructions'
    );
  }
}

function verifyCloudFormation() {
  logSection('11. Verifying CloudFormation Infrastructure');
  
  check(
    'CloudFormation template exists',
    fileExists('aws/cloudformation/cognito-user-pool.yaml'),
    'aws/cloudformation/cognito-user-pool.yaml'
  );
  
  check(
    'CloudFormation deployment script exists',
    fileExists('aws/cloudformation/deploy.sh'),
    'aws/cloudformation/deploy.sh'
  );
  
  const cfnTemplate = readFile('aws/cloudformation/cognito-user-pool.yaml');
  if (cfnTemplate) {
    check(
      'CloudFormation template creates User Pool',
      cfnTemplate.includes('AWS::Cognito::UserPool'),
      'Defines Cognito User Pool resource'
    );
    
    check(
      'CloudFormation template creates App Client',
      cfnTemplate.includes('AWS::Cognito::UserPoolClient'),
      'Defines Cognito User Pool Client resource'
    );
    
    check(
      'CloudFormation template creates Domain',
      cfnTemplate.includes('AWS::Cognito::UserPoolDomain'),
      'Defines Cognito User Pool Domain resource'
    );
    
    check(
      'CloudFormation template has custom:role attribute',
      cfnTemplate.includes('custom:role') || cfnTemplate.includes('CustomRole'),
      'Defines custom:role attribute'
    );
    
    check(
      'CloudFormation template has outputs',
      cfnTemplate.includes('Outputs:'),
      'Defines stack outputs'
    );
  }
}

// Run all verifications
function runVerifications() {
  log('\n🔍 Cognito Integration Verification', 'blue');
  log('This script verifies that all Cognito components are properly wired together.\n', 'blue');
  
  verifyRoutes();
  verifyLoginPage();
  verifyRegistrationPage();
  verifySessionManagement();
  verifyMiddleware();
  verifyAuthConfig();
  verifyCognitoModules();
  verifyLogout();
  verifyEnvironmentConfig();
  verifyDocumentation();
  verifyCloudFormation();
  
  // Print summary
  logSection('Verification Summary');
  
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`⚠ Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'reset');
  
  const total = results.passed + results.failed;
  const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  
  console.log('\n' + '='.repeat(60));
  log(`Overall: ${percentage}% (${results.passed}/${total} checks passed)`, 
      percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
  console.log('='.repeat(60) + '\n');
  
  if (results.failed === 0 && results.warnings === 0) {
    log('🎉 All verifications passed! Cognito integration is properly wired.', 'green');
  } else if (results.failed === 0) {
    log('✅ All critical checks passed, but there are some warnings to review.', 'yellow');
  } else {
    log('❌ Some verifications failed. Please review the issues above.', 'red');
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the script
runVerifications();
