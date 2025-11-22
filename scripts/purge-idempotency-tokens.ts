#!/usr/bin/env tsx
/**
 * Purge Idempotency Records Script
 * 
 * This script deletes all records with idempotency tokens from the SQLite database.
 * Useful for testing and development to clean up test data.
 * 
 * Usage:
 *   npm run purge-idempotency           # Delete all records with tokens
 *   npm run purge-idempotency -- --dry-run  # Preview what would be deleted
 *   npm run purge-idempotency -- --table service_requests  # Delete from specific table
 * 
 * Tables affected:
 *   - service_requests
 *   - maintenance_tasks
 *   - transactions
 */

import { getDatabase, executeQuery, executeUpdate } from '../lib/db/client.js';

interface IdempotencyRecord {
  id: string;
  idempotency_token: string;
  created_at?: string;
}

interface PurgeStats {
  table: string;
  recordsFound: number;
  recordsPurged: number;
}

const TABLES_WITH_IDEMPOTENCY = [
  'service_requests',
  'maintenance_tasks',
  'transactions'
];

/**
 * Get all records with idempotency tokens from a table
 */
function getIdempotencyRecords(tableName: string): IdempotencyRecord[] {
  const query = `
    SELECT id, idempotency_token, created_at
    FROM ${tableName}
    WHERE idempotency_token IS NOT NULL
    ORDER BY created_at DESC
  `;
  
  return executeQuery<IdempotencyRecord>(query, []);
}

/**
 * Delete rows with idempotency tokens from a table
 */
function deleteIdempotencyRecords(tableName: string): number {
  const query = `
    DELETE FROM ${tableName}
    WHERE idempotency_token IS NOT NULL
  `;
  
  const result = executeUpdate(query, []);
  return result.changes;
}

/**
 * Display records that will be affected
 */
function displayRecords(tableName: string, records: IdempotencyRecord[]): void {
  if (records.length === 0) {
    console.log(`  No records found in ${tableName}`);
    return;
  }

  console.log(`\n  ${tableName} (${records.length} records):`);
  records.forEach((record, index) => {
    const date = record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A';
    console.log(`    ${index + 1}. ID: ${record.id.substring(0, 20)}... | Token: ${record.idempotency_token} | Created: ${date}`);
  });
}

/**
 * Main purge function
 */
async function purgeIdempotencyRecords(options: {
  dryRun: boolean;
  table?: string;
}): Promise<void> {
  const { dryRun, table } = options;
  
  console.log('🔍 Idempotency Records Purge Script');
  console.log('====================================\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Determine which tables to process
  const tablesToProcess = table 
    ? [table]
    : TABLES_WITH_IDEMPOTENCY;
  
  // Validate table names
  for (const tableName of tablesToProcess) {
    if (!TABLES_WITH_IDEMPOTENCY.includes(tableName)) {
      console.error(`❌ Error: Invalid table name "${tableName}"`);
      console.error(`   Valid tables: ${TABLES_WITH_IDEMPOTENCY.join(', ')}`);
      process.exit(1);
    }
  }
  
  const stats: PurgeStats[] = [];
  
  // Process each table
  for (const tableName of tablesToProcess) {
    console.log(`📋 Processing table: ${tableName}`);
    
    // Get records with idempotency tokens
    const records = getIdempotencyRecords(tableName);
    
    if (dryRun) {
      displayRecords(tableName, records);
    }
    
    // Delete records if not dry run
    let purgedCount = 0;
    if (!dryRun && records.length > 0) {
      purgedCount = deleteIdempotencyRecords(tableName);
      console.log(`  ✅ Deleted ${purgedCount} records`);
    }
    
    stats.push({
      table: tableName,
      recordsFound: records.length,
      recordsPurged: purgedCount
    });
    
    console.log('');
  }
  
  // Display summary
  console.log('📊 Summary');
  console.log('==========');
  
  const totalFound = stats.reduce((sum, s) => sum + s.recordsFound, 0);
  const totalPurged = stats.reduce((sum, s) => sum + s.recordsPurged, 0);
  
  stats.forEach(stat => {
    const status = dryRun ? `${stat.recordsFound} found` : `${stat.recordsPurged} purged`;
    console.log(`  ${stat.table}: ${status}`);
  });
  
  console.log(`\n  Total: ${dryRun ? `${totalFound} records found` : `${totalPurged} records deleted`}`);
  
  if (dryRun && totalFound > 0) {
    console.log('\n💡 Run without --dry-run to actually delete these records');
  } else if (!dryRun && totalPurged > 0) {
    console.log('\n✨ Records successfully deleted!');
  } else if (totalFound === 0) {
    console.log('\n✨ No records with idempotency tokens found - database is clean!');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const tableIndex = args.indexOf('--table');
const table = tableIndex !== -1 && args[tableIndex + 1] 
  ? args[tableIndex + 1] 
  : undefined;

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Purge Idempotency Records Script

Usage:
  npm run purge-idempotency                           # Delete all records with tokens
  npm run purge-idempotency -- --dry-run              # Preview without changes
  npm run purge-idempotency -- --table <table_name>   # Delete from specific table

Options:
  --dry-run              Preview what would be deleted without making changes
  --table <table_name>   Only delete records from specified table
  --help, -h             Show this help message

Available tables:
  - service_requests
  - maintenance_tasks
  - transactions

Examples:
  npm run purge-idempotency -- --dry-run
  npm run purge-idempotency -- --table service_requests
  npm run purge-idempotency -- --table maintenance_tasks --dry-run
  `);
  process.exit(0);
}

// Run the purge
purgeIdempotencyRecords({ dryRun, table })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (error.originalError) {
      console.error('   Details:', error.originalError);
    }
    process.exit(1);
  });
