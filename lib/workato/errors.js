"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkatoSalesforceError = void 0;
exports.isRetryableError = isRetryableError;
exports.createWorkatoError = createWorkatoError;
/**
 * Custom error class for Workato Salesforce API errors
 *
 * This error class encapsulates all error information from Workato API calls,
 * including HTTP status codes, endpoint information, correlation IDs for tracking,
 * and whether the error is retryable.
 */
var WorkatoSalesforceError = /** @class */ (function (_super) {
    __extends(WorkatoSalesforceError, _super);
    /**
     * Creates a new WorkatoSalesforceError
     *
     * @param message - Human-readable error message
     * @param statusCode - HTTP status code from the API response
     * @param endpoint - The API endpoint that was called
     * @param correlationId - Unique identifier for tracking this error across logs
     * @param retryable - Whether this error should trigger a retry attempt
     */
    function WorkatoSalesforceError(message, statusCode, endpoint, correlationId, retryable) {
        if (retryable === void 0) { retryable = false; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.endpoint = endpoint;
        _this.correlationId = correlationId;
        _this.retryable = retryable;
        _this.name = 'WorkatoSalesforceError';
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, WorkatoSalesforceError);
        }
        return _this;
    }
    /**
     * Serializes the error to a JSON-compatible object
     * Useful for logging and API responses
     *
     * @returns Object containing all error properties
     */
    WorkatoSalesforceError.prototype.toJSON = function () {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            endpoint: this.endpoint,
            correlationId: this.correlationId,
            retryable: this.retryable,
        };
    };
    return WorkatoSalesforceError;
}(Error));
exports.WorkatoSalesforceError = WorkatoSalesforceError;
/**
 * Determines if an error should trigger a retry attempt
 *
 * Retryable errors include:
 * - 429 (Rate Limit): Too many requests, should retry with backoff
 * - 500 (Internal Server Error): Server error, may be transient
 * - 503 (Service Unavailable): Service temporarily down
 * - Network errors: Connection failures, timeouts
 *
 * Non-retryable errors include:
 * - 400 (Bad Request): Validation error, won't succeed on retry
 * - 401 (Unauthorized): Authentication failure, needs credential fix
 * - 404 (Not Found): Resource doesn't exist, won't appear on retry
 *
 * @param error - The error to classify
 * @returns true if the error is retryable, false otherwise
 */
function isRetryableError(error) {
    var _a;
    // If it's our custom error, use the retryable flag
    if (error instanceof WorkatoSalesforceError) {
        return error.retryable;
    }
    // Check for network-level errors (axios error codes)
    if (error.code) {
        var retryableNetworkErrors = [
            'ECONNRESET', // Connection reset by peer
            'ETIMEDOUT', // Request timeout
            'ENOTFOUND', // DNS lookup failed
            'ECONNREFUSED', // Connection refused
            'ENETUNREACH', // Network unreachable
        ];
        return retryableNetworkErrors.includes(error.code);
    }
    // Check HTTP status codes if available
    if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) {
        var status_1 = error.response.status;
        // Retryable status codes: 429, 500, 502, 503, 504
        return status_1 === 429 || (status_1 >= 500 && status_1 <= 504);
    }
    // Default to not retryable for unknown errors
    return false;
}
/**
 * Creates a WorkatoSalesforceError from an HTTP response or network error
 *
 * @param error - The original error from axios or other HTTP client
 * @param endpoint - The API endpoint that was called
 * @param correlationId - Unique identifier for tracking
 * @returns A properly formatted WorkatoSalesforceError
 */
function createWorkatoError(error, endpoint, correlationId) {
    var _a, _b, _c;
    // Extract status code
    var statusCode = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || error.statusCode || 500;
    // Determine if retryable based on status code
    var retryable = isRetryableError(error);
    // Create appropriate error message
    var message;
    if ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) {
        // Use API error message if available
        message = error.response.data.message;
    }
    else if (error.code) {
        // Network errors take precedence over status code messages
        message = "Network Error: ".concat(error.code, " - ").concat(error.message);
    }
    else if (statusCode === 400) {
        message = 'Bad Request: Invalid request parameters';
    }
    else if (statusCode === 401) {
        message = 'Unauthorized: Authentication failed';
    }
    else if (statusCode === 404) {
        message = 'Not Found: Resource does not exist';
    }
    else if (statusCode === 429) {
        message = 'Rate Limit Exceeded: Too many requests';
    }
    else if (statusCode === 500) {
        message = 'Internal Server Error: Server encountered an error';
    }
    else if (statusCode === 503) {
        message = 'Service Unavailable: Service temporarily unavailable';
    }
    else {
        message = error.message || 'Unknown error occurred';
    }
    return new WorkatoSalesforceError(message, statusCode, endpoint, correlationId, retryable);
}
/**
 * Handles errors from Workato API calls by creating a properly formatted error
 * and logging it with context information
 *
 * @param error - The original error
 * @param context - Context string describing where the error occurred
 * @param correlationId - Unique identifier for tracking
 * @param endpoint - The API endpoint that was called
 * @returns A properly formatted WorkatoSalesforceError
 */
function handleWorkatoError(error, context, correlationId, endpoint) {
    // If it's already a WorkatoSalesforceError, return it
    if (error instanceof WorkatoSalesforceError) {
        return error;
    }
    // Create a new WorkatoSalesforceError
    return createWorkatoError(error, endpoint, correlationId);
}
exports.handleWorkatoError = handleWorkatoError;
/**
 * Alias for backward compatibility
 * Use WorkatoSalesforceError for new code
 */
exports.WorkatoError = WorkatoSalesforceError;
