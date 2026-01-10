/**
 * Database client wrapper for better-sqlite3
 * Provides connection management and error handling
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'var', 'hotel.db');

let db: Database.Database | null = null;

/**
 * Get database connection (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      
      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');
      
    } catch (error) {
      throw new DatabaseError('Failed to connect to database', error);
    }
  }
  
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a query with error handling
 */
export function executeQuery<T>(
  query: string,
  params?: any[]
): T[] {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.all(params) as T[];
  } catch (error) {
    throw new DatabaseError('Query execution failed', error);
  }
}

/**
 * Execute a single row query
 */
export function executeQueryOne<T>(
  query: string,
  params?: any[]
): T | undefined {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.get(params) as T | undefined;
  } catch (error) {
    throw new DatabaseError('Query execution failed', error);
  }
}

/**
 * Execute an insert/update/delete query
 */
export function executeUpdate(
  query: string,
  params?: any[]
): Database.RunResult {
  try {
    const database = getDatabase();
    const stmt = database.prepare(query);
    return stmt.run(params);
  } catch (error) {
    throw new DatabaseError('Update execution failed', error);
  }
}

/**
 * Execute multiple statements in a transaction
 */
export function executeTransaction(
  callback: (db: Database.Database) => void
): void {
  const database = getDatabase();
  const transaction = database.transaction(callback);
  
  try {
    transaction(database);
  } catch (error) {
    throw new DatabaseError('Transaction failed', error);
  }
}

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
  public originalError?: unknown;
  
  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    
    if (originalError instanceof Error) {
      this.message = `${message}: ${originalError.message}`;
    }
  }
}

/**
 * Check if database exists and is initialized
 */
export function isDatabaseInitialized(): boolean {
  try {
    const database = getDatabase();
    const result = database.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).get();
    
    return !!result;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a unique ID (simple UUID v4 implementation)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Convert SQLite datetime string to Date object
 */
export function parseDate(dateString: string | null): Date | undefined {
  if (!dateString) return undefined;
  return new Date(dateString);
}

/**
 * Convert Date object to SQLite datetime string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert boolean to SQLite integer
 */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite integer to boolean
 */
export function intToBool(value: number): boolean {
  return value === 1;
}
