/**
 * Feature flags for external integrations
 */

/**
 * Check if Salesforce should be used for data operations
 * Uses SALESFORCE_ENABLED environment variable (defaults to true)
 * 
 * @returns true if SALESFORCE_ENABLED is not explicitly set to 'false'
 */
export function isSalesforceEnabled(): boolean {
  return process.env.SALESFORCE_ENABLED !== 'false';
}

/**
 * Check if Stripe should be used for payment processing
 * Uses STRIPE_ENABLED environment variable (defaults to true)
 * 
 * @returns true if STRIPE_ENABLED is not explicitly set to 'false'
 */
export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED !== 'false';
}

/**
 * Check if Twilio should be used for SMS notifications
 * Uses TWILIO_ENABLED environment variable (defaults to true)
 * 
 * @returns true if TWILIO_ENABLED is not explicitly set to 'false'
 */
export function isTwilioEnabled(): boolean {
  return process.env.TWILIO_ENABLED !== 'false';
}

/**
 * Check if Home Assistant should be used for room controls
 * Uses HOME_ASSISTANT_ENABLED environment variable (defaults to true)
 * 
 * @returns true if HOME_ASSISTANT_ENABLED is not explicitly set to 'false'
 */
export function isHomeAssistantEnabled(): boolean {
  return process.env.HOME_ASSISTANT_ENABLED !== 'false';
}

/**
 * Check if mock mode is enabled for Workato API calls
 * @returns true if WORKATO_MOCK_MODE environment variable is set to 'true'
 */
export function isMockModeEnabled(): boolean {
  return process.env.WORKATO_MOCK_MODE === 'true';
}
