/**
 * Workato API Logger
 * Handles logging of API requests, responses, and errors with PII redaction
 */

export interface ApiLogEntry {
  timestamp: string;
  correlationId: string;
  method: string;
  endpoint: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  requestData?: any;
  responseData?: any;
}

export interface ApiMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Workato API Logger class
 */
export class WorkatoLogger {
  private logs: ApiLogEntry[] = [];
  private enabled: boolean;
  private level: LogLevel;
  private maxLogs: number = 1000;

  constructor(enabled: boolean = true, level: LogLevel = 'info') {
    this.enabled = enabled;
    this.level = level;
  }

  /**
   * Log an API request
   */
  logRequest(entry: ApiLogEntry): void {
    if (!this.enabled) return;

    const sanitizedEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      requestData: this.redactPII(entry.requestData),
    };

    this.addLog(sanitizedEntry);

    if (this.shouldLog('info')) {
      console.log(`[Workato Request] ${entry.method} ${entry.endpoint}`, {
        correlationId: entry.correlationId,
      });
    }

    if (this.shouldLog('debug') && entry.requestData) {
      console.debug('[Workato Request Data]', sanitizedEntry.requestData);
    }
  }

  /**
   * Log an API response
   */
  logResponse(entry: ApiLogEntry): void {
    if (!this.enabled) return;

    const sanitizedEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      responseData: this.redactPII(entry.responseData),
    };

    this.addLog(sanitizedEntry);

    if (this.shouldLog('info')) {
      console.log(
        `[Workato Response] ${entry.method} ${entry.endpoint} - ${entry.statusCode} (${entry.duration}ms)`,
        {
          correlationId: entry.correlationId,
        }
      );
    }

    if (this.shouldLog('debug') && entry.responseData) {
      console.debug('[Workato Response Data]', sanitizedEntry.responseData);
    }
  }

  /**
   * Log an API error
   */
  logError(entry: ApiLogEntry): void {
    if (!this.enabled) return;

    const sanitizedEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      requestData: this.redactPII(entry.requestData),
      responseData: this.redactPII(entry.responseData),
    };

    this.addLog(sanitizedEntry);

    if (this.shouldLog('error')) {
      console.error(
        `[Workato Error] ${entry.method} ${entry.endpoint} - ${entry.statusCode || 'N/A'}`,
        {
          correlationId: entry.correlationId,
          error: entry.error,
        }
      );
    }
  }

  /**
   * Get aggregated API metrics
   */
  getMetrics(): ApiMetrics {
    const totalRequests = this.logs.length;
    const successfulRequests = this.logs.filter(
      (log) => log.statusCode && log.statusCode >= 200 && log.statusCode < 300
    ).length;

    const responseTimes = this.logs
      .filter((log) => log.duration !== undefined)
      .map((log) => log.duration!);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const errorsByType: Record<string, number> = {};
    const requestsByEndpoint: Record<string, number> = {};

    this.logs.forEach((log) => {
      // Count errors by status code
      if (log.statusCode && (log.statusCode < 200 || log.statusCode >= 300)) {
        const errorType = `${log.statusCode}`;
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }

      // Count requests by endpoint
      requestsByEndpoint[log.endpoint] = (requestsByEndpoint[log.endpoint] || 0) + 1;
    });

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageResponseTime: Math.round(averageResponseTime),
      errorsByType,
      requestsByEndpoint,
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get all logs (for testing/debugging)
   */
  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  /**
   * Add log entry and maintain max logs limit
   */
  private addLog(entry: ApiLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Check if current log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Redact PII from data
   */
  private redactPII(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    const sensitiveFields = [
      'email',
      'phone',
      'firstName',
      'lastName',
      'name',
      'password',
      'token',
      'apiToken',
      'authorization',
      'Email',
      'Phone',
      'FirstName',
      'LastName',
      'Name',
    ];

    const redact = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(redact);
      }

      if (obj && typeof obj === 'object') {
        const redacted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.includes(key)) {
            redacted[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            redacted[key] = redact(value);
          } else {
            redacted[key] = value;
          }
        }
        return redacted;
      }

      return obj;
    };

    return redact(data);
  }
}
