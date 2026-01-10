/**
 * GET /api/debug/mcp-tools
 * Debug endpoint to test MCP tool discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { MCPManager } from '@/lib/bedrock/mcp-manager';

export async function GET(request: NextRequest) {
  try {
    // Validate session and get user info
    const session = await requireAuth(request);
    const { role } = session;

    // Create MCP manager with debug enabled
    const mcpManager = new MCPManager({ debug: true });

    // Load configuration
    const config = await mcpManager.loadConfigForRole(role);
    
    // Get tools
    const tools = await mcpManager.getToolsForRole(role);

    return NextResponse.json({
      success: true,
      role,
      config: {
        servers: config.servers.map(s => ({
          name: s.name,
          type: s.type,
          url: s.url,
          hasAuth: !!s.auth,
          toolsConfigured: s.tools || [],
        })),
      },
      toolsDiscovered: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: Object.keys(t.input_schema?.properties || {}),
      })),
      toolCount: tools.length,
    });
  } catch (error) {
    console.error('MCP Debug Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
