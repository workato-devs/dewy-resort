# System Prompts Configuration

This directory contains role-specific system prompts for the Bedrock chat agents.

## Overview

Each user role in the Hotel Management System has a dedicated system prompt that defines the AI assistant's behavior, capabilities, and guidelines. The prompts are loaded by the Prompt Manager and can include variable interpolation for dynamic content.

## Prompt Files

- `guest.txt` - System prompt for hotel guests
- `manager.txt` - System prompt for hotel managers
- `housekeeping.txt` - System prompt for housekeeping staff
- `maintenance.txt` - System prompt for maintenance staff

## Variable Interpolation

Prompts support variable interpolation using the `{{variable}}` syntax. Variables are replaced at runtime with actual values.

### Available Variables

- `{{tools}}` - List of available MCP tools for the role

### Example

```
Available tools: {{tools}}
```

When rendered with tools:
```
Available tools: create_service_request, view_charges, control_lights
```

## Usage

### Loading a Prompt

```typescript
import { getPromptManager } from '@/lib/bedrock/prompt-manager';

const promptManager = getPromptManager();
const prompt = await promptManager.getPromptForRole('guest');
```

### Loading with Variables

```typescript
const prompt = await promptManager.getPromptWithVariables('guest', {
  tools: 'create_service_request, view_charges, control_lights',
});
```

### Preloading Prompts

For better performance, preload all prompts on application startup:

```typescript
await promptManager.preloadPrompts();
```

### Hot Reloading

During development, you can reload prompts without restarting the application:

```typescript
await promptManager.reloadPrompts();
```

## Prompt Guidelines

When creating or modifying prompts, follow these guidelines:

### Structure

1. **Introduction** - Define the AI's role and purpose
2. **Capabilities** - List what the AI can help with
3. **Guidelines** - Provide behavioral guidelines
4. **Tools Reference** - Include `{{tools}}` placeholder

### Best Practices

- **Be Specific** - Clearly define the role and scope
- **Set Boundaries** - Explain what the AI should and shouldn't do
- **Be Professional** - Maintain appropriate tone for the role
- **Include Context** - Reference the hotel name and relevant details
- **Security** - Emphasize privacy and data access restrictions

### Example Structure

```
You are a helpful AI assistant for [role] at the Dewy Hotel. Your role is to:

1. [Primary capability]
2. [Secondary capability]
3. [Additional capabilities...]

Guidelines:
- [Behavioral guideline 1]
- [Behavioral guideline 2]
- [Security/privacy guideline]

Available tools: {{tools}}
```

## Adding New Roles

To add a new role:

1. Create a new prompt file: `config/prompts/{role}.txt`
2. Update the `UserRole` type in `lib/bedrock/prompt-manager.ts`
3. Add a default fallback prompt in `DEFAULT_PROMPTS`
4. Update the MCP configuration for the role
5. Update the CloudFormation template with the new IAM role

## Testing

Run the prompt manager tests:

```bash
npx tsx lib/bedrock/__tests__/prompt-manager.test.ts
```

## Validation

Validate that all prompt files exist:

```typescript
const missing = await promptManager.validatePrompts();
if (missing.length > 0) {
  console.error('Missing prompts for roles:', missing);
}
```

## Performance

- Prompts are cached in memory after first load
- Cache can be disabled for development: `new PromptManager('config/prompts', false)`
- Preloading prompts on startup improves first-request latency
- Typical prompt size: 500-800 characters

## Security Considerations

- Never include sensitive information in prompts
- Emphasize data access restrictions in guidelines
- Remind AI to respect user privacy
- Include appropriate scope limitations for each role

## Troubleshooting

### Prompt Not Loading

If a prompt fails to load:
1. Check that the file exists in `config/prompts/`
2. Verify file permissions are readable
3. Check for syntax errors in the prompt text
4. Review console logs for error messages

The system will automatically fall back to a default prompt if the file cannot be loaded.

### Variable Not Interpolating

If variables aren't being replaced:
1. Ensure you're using `getPromptWithVariables()` not `getPromptForRole()`
2. Check that the variable name matches exactly (case-sensitive)
3. Verify the variable is passed in the variables object
4. Use double curly braces: `{{variable}}` not `{variable}`

## Related Documentation

- [Bedrock Integration Design](../../.kiro/specs/bedrock-chat-integration/design.md)
- [MCP Configuration](../mcp/README.md)
- [Prompt Manager API](../../lib/bedrock/prompt-manager.ts)
