/**
 * Workato Type Definitions
 * Type definitions for Workato API requests and responses
 */

/**
 * Generic Workato API response wrapper
 */
export interface WorkatoResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId: string;
}

/**
 * Salesforce Case Types
 */
export interface SalesforceCase {
  Id?: string;
  Subject: string;
  Description: string;
  Priority: 'Low' | 'Medium' | 'High';
  Status: 'New' | 'In Progress' | 'Closed';
  Type: string;
  ContactId?: string;
  Origin: string;
}

export interface CreateCaseRequest {
  type: string;
  guestName: string;
  roomNumber: string;
  priority: string;
  description: string;
  contactId?: string;
}

export interface CaseResponse {
  id: string;
  caseNumber: string;
  status: string;
  createdDate: string;
  priority?: string;
  type?: string;
  description?: string;
  subject?: string;
  contactId?: string;
  updatedDate?: string;
}

export interface SearchCasesRequest {
  status?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Salesforce Contact Types
 */
export interface SalesforceContact {
  Id?: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  Description?: string;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roomNumber?: string;
}

export interface ContactResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

/**
 * Search Types
 */
export interface SearchCriteria {
  query: string;
  fields?: string[];
  limit?: number;
}

/**
 * Request Options
 */
export interface RequestOptions {
  timeout?: number;
  skipCache?: boolean;
  skipRetry?: boolean;
}
