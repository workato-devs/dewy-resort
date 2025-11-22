/**
 * Okta Authentication Logger
 * 
 * Provides structured logging for authentication events with security considerations.
 * Never logs sensitive data (tokens, passwords, code verifiers).
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  userId?: string;
  email?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Redacts email addresses in production to show only domain
 * Example: user@example.com -> ***@example.com
 */
function redactEmail(email: string): string {
  if (process.env.NODE_ENV === 'production') {
    const [, domain] = email.split('@');
    return `***@${domain}`;
  }
  return email;
}

/**
 * Formats and outputs a log entry
 */
function log(entry: LogEntry): void {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    email: entry.email ? redactEmail(entry.email) : undefined,
  };

  // Use appropriate console method based on level
  switch (entry.level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'info':
    default:
      console.log(JSON.stringify(logEntry));
      break;
  }
}

/**
 * Log successful authentication events
 */
export function logInfo(event: string, data?: { userId?: string; email?: string; metadata?: Record<string, any> }): void {
  log({
    timestamp: new Date().toISOString(),
    level: 'info',
    event,
    userId: data?.userId,
    email: data?.email,
    metadata: data?.metadata,
  });
}

/**
 * Log recoverable errors (e.g., expired tokens)
 */
export function logWarn(event: string, data?: { userId?: string; email?: string; error?: string; metadata?: Record<string, any> }): void {
  log({
    timestamp: new Date().toISOString(),
    level: 'warn',
    event,
    userId: data?.userId,
    email: data?.email,
    error: data?.error,
    metadata: data?.metadata,
  });
}

/**
 * Log authentication failures and configuration errors
 */
export function logError(event: string, data?: { userId?: string; email?: string; error?: string; metadata?: Record<string, any> }): void {
  log({
    timestamp: new Date().toISOString(),
    level: 'error',
    event,
    userId: data?.userId,
    email: data?.email,
    error: data?.error,
    metadata: data?.metadata,
  });
}

// Convenience functions for specific authentication events

/**
 * Log when user initiates Okta login
 */
export function logLoginInitiated(metadata?: Record<string, any>): void {
  logInfo('okta.login.initiated', { metadata });
}

/**
 * Log when callback is received from Okta
 */
export function logCallbackReceived(metadata?: Record<string, any>): void {
  logInfo('okta.callback.received', { metadata });
}

/**
 * Log when authorization code is successfully exchanged for tokens
 */
export function logTokenExchanged(userId: string, email: string): void {
  logInfo('okta.token.exchanged', { userId, email });
}

/**
 * Log when ID token is validated successfully
 */
export function logTokenValidated(userId: string, email: string): void {
  logInfo('okta.token.validated', { userId, email });
}

/**
 * Log when a new user is created from Okta
 */
export function logUserCreated(userId: string, email: string, role: string): void {
  logInfo('okta.user.created', { userId, email, metadata: { role } });
}

/**
 * Log when an existing user is updated from Okta
 */
export function logUserUpdated(userId: string, email: string): void {
  logInfo('okta.user.updated', { userId, email });
}

/**
 * Log when a session is created after Okta authentication
 */
export function logSessionCreated(userId: string, sessionId: string, isOktaSession: boolean): void {
  logInfo('okta.session.created', { 
    userId, 
    metadata: { sessionId, isOktaSession } 
  });
}

/**
 * Log configuration errors
 */
export function logConfigError(error: string, metadata?: Record<string, any>): void {
  logError('okta.error.config', { error, metadata });
}

/**
 * Log authentication errors
 */
export function logAuthError(error: string, userId?: string, metadata?: Record<string, any>): void {
  logError('okta.error.auth', { userId, error, metadata });
}

/**
 * Log token exchange errors
 */
export function logTokenError(error: string, metadata?: Record<string, any>): void {
  logError('okta.error.token', { error, metadata });
}

/**
 * Log token validation errors
 */
export function logValidationError(error: string, metadata?: Record<string, any>): void {
  logError('okta.error.validation', { error, metadata });
}
