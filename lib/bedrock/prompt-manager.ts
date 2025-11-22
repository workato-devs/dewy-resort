/**
 * Prompt Manager
 * 
 * Manages role-specific system prompts for Bedrock chat agents.
 * Supports loading prompts from files and variable interpolation.
 */

import fs from 'fs/promises';
import path from 'path';
import { BedrockLogger } from './logger';
import { BedrockConfigurationError } from './errors';

export interface SystemPromptConfig {
  role: string;
  prompt: string;
  variables?: Record<string, string>;
}

export type UserRole = 'guest' | 'manager' | 'housekeeping' | 'maintenance';

/**
 * Default fallback prompts for each role
 */
const DEFAULT_PROMPTS: Record<UserRole, string> = {
  guest: 'You are a helpful AI assistant for hotel guests. Assist with service requests and answer questions about the hotel.',
  manager: 'You are an AI assistant for hotel managers. Provide operational insights and help manage hotel operations.',
  housekeeping: 'You are an AI assistant for housekeeping staff. Help manage cleaning tasks and report issues.',
  maintenance: 'You are an AI assistant for maintenance staff. Help manage work orders and provide technical guidance.',
};

/**
 * Prompt Manager class
 * 
 * Loads and manages system prompts for different user roles.
 * Supports variable interpolation and hot-reloading.
 */
export class PromptManager {
  private promptCache: Map<UserRole, string> = new Map();
  private promptsDirectory: string;
  private cacheEnabled: boolean;

  constructor(promptsDirectory: string = 'config/prompts', cacheEnabled: boolean = true) {
    this.promptsDirectory = path.resolve(process.cwd(), promptsDirectory);
    this.cacheEnabled = cacheEnabled;
  }

  /**
   * Get system prompt for a specific role
   * 
   * @param role - User role (guest, manager, housekeeping, maintenance)
   * @returns System prompt text
   */
  async getPromptForRole(role: UserRole): Promise<string> {
    // Check cache first
    if (this.cacheEnabled && this.promptCache.has(role)) {
      return this.promptCache.get(role)!;
    }

    try {
      // Load prompt from file
      const promptPath = path.join(this.promptsDirectory, `${role}.txt`);
      const prompt = await fs.readFile(promptPath, 'utf-8');
      
      // Cache the prompt
      if (this.cacheEnabled) {
        this.promptCache.set(role, prompt);
      }
      
      BedrockLogger.logConfigLoad('prompt', role, true);
      return prompt;
    } catch (error) {
      // Log error and return fallback prompt
      BedrockLogger.logConfigLoad('prompt', role, false);
      BedrockLogger.warn(
        'bedrock.prompt.fallback',
        `Failed to load prompt for role ${role}, using fallback`,
        { role, error }
      );
      return DEFAULT_PROMPTS[role];
    }
  }

  /**
   * Get system prompt with variable interpolation
   * 
   * @param role - User role
   * @param variables - Variables to interpolate (e.g., {tools: 'tool1, tool2', userName: 'John Doe'})
   * @returns System prompt with interpolated variables
   */
  async getPromptWithVariables(
    role: UserRole,
    variables: Record<string, string>
  ): Promise<string> {
    const prompt = await this.getPromptForRole(role);
    
    // Add default empty string for tools if not provided
    const varsWithDefaults = {
      tools: 'None available',
      ...variables,
    };
    
    return this.interpolateVariables(prompt, varsWithDefaults);
  }

  /**
   * Interpolate variables in a prompt template
   * 
   * Replaces {{variable}} placeholders with actual values.
   * 
   * @param prompt - Prompt template with {{variable}} placeholders
   * @param variables - Variable values to interpolate
   * @returns Prompt with interpolated variables
   */
  private interpolateVariables(
    prompt: string,
    variables: Record<string, string>
  ): string {
    let result = prompt;
    
    // Replace each {{variable}} with its value
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Reload prompts from disk
   * 
   * Clears the cache and forces prompts to be reloaded on next access.
   * Useful for hot-reloading during development.
   */
  async reloadPrompts(): Promise<void> {
    this.promptCache.clear();
    BedrockLogger.info('bedrock.prompt.reload', 'Prompt cache cleared. Prompts will be reloaded on next access.');
  }

  /**
   * Validate that all prompt files exist
   * 
   * @returns Array of missing role prompts
   */
  async validatePrompts(): Promise<UserRole[]> {
    const roles: UserRole[] = ['guest', 'manager', 'housekeeping', 'maintenance'];
    const missing: UserRole[] = [];

    for (const role of roles) {
      try {
        const promptPath = path.join(this.promptsDirectory, `${role}.txt`);
        await fs.access(promptPath);
      } catch {
        missing.push(role);
      }
    }

    return missing;
  }

  /**
   * Preload all prompts into cache
   * 
   * Useful for warming up the cache on application startup.
   */
  async preloadPrompts(): Promise<void> {
    const roles: UserRole[] = ['guest', 'manager', 'housekeeping', 'maintenance'];
    
    await Promise.all(
      roles.map(role => this.getPromptForRole(role))
    );
    
    BedrockLogger.info('bedrock.prompt.preload', `Preloaded ${roles.length} system prompts`, { count: roles.length });
  }

  /**
   * Get cache statistics
   * 
   * @returns Number of cached prompts
   */
  getCacheSize(): number {
    return this.promptCache.size;
  }

  /**
   * Check if a role is supported
   * 
   * @param role - Role to check
   * @returns True if role is supported
   */
  isSupportedRole(role: string): role is UserRole {
    return ['guest', 'manager', 'housekeeping', 'maintenance'].includes(role);
  }
}

/**
 * Singleton instance for application-wide use
 */
let promptManagerInstance: PromptManager | null = null;

/**
 * Get or create the singleton PromptManager instance
 * 
 * @returns PromptManager instance
 */
export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager();
  }
  return promptManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPromptManager(): void {
  promptManagerInstance = null;
}
