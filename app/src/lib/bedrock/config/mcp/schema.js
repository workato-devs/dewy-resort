"use strict";
/**
 * MCP Configuration Schema
 *
 * This file defines the TypeScript types for MCP (Model Context Protocol) configurations.
 * Each role (guest, manager, housekeeping, maintenance) has its own configuration file
 * that specifies which MCP servers and tools are available for that role.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMCPConfig = validateMCPConfig;
/**
 * Validates that a configuration object matches the MCPRoleConfig schema
 */
function validateMCPConfig(config) {
    if (!config || typeof config !== 'object') {
        return false;
    }
    if (!['guest', 'manager', 'housekeeping', 'maintenance'].includes(config.role)) {
        return false;
    }
    if (!Array.isArray(config.servers)) {
        return false;
    }
    for (const server of config.servers) {
        if (!server.name || typeof server.name !== 'string') {
            return false;
        }
        if (!server.command || typeof server.command !== 'string') {
            return false;
        }
        if (!Array.isArray(server.args)) {
            return false;
        }
        if (!Array.isArray(server.tools)) {
            return false;
        }
    }
    return true;
}
