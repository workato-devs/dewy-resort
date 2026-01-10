# Deprecated Code Preserved

All code that used deprecated API methods has been preserved with comments and @todo annotations for future restoration.

## Files with Commented Code

### 1. app/src/app/api/manager/contacts/search/route.ts
**Status:** Original code preserved in block comment  
**Issue:** Uses `WorkatoClient.searchContacts()` which was removed  
**@todo:** Reimplement using new SalesforceClient API  

**Current behavior:** Returns HTTP 501 with message indicating temporary unavailability

**Original functionality:**
- Validated search query parameter
- Called Workato to search contacts in Salesforce
- Returned paginated search results
- Handled errors with correlation IDs

### 2. app/src/app/api/manager/contacts/sync/route.ts
**Status:** Original code preserved in block comment  
**Issue:** Uses `WorkatoClient.upsertContact()` which was removed  
**@todo:** Reimplement using new SalesforceClient API  

**Current behavior:** Returns HTTP 501 with message indicating temporary unavailability

**Original functionality:**
- Fetched user from local database
- Split name into first/last name
- Called Workato to upsert contact in Salesforce
- Stored Salesforce Contact ID back to local database
- Returned sync status with correlation ID

### 3. app/src/app/api/test/config-check/route.ts
**Status:** Original code preserved in block comment  
**Issue:** Uses `WorkatoClient.searchContacts()` which was removed  
**@todo:** Reimplement using new SalesforceClient API  

**Current behavior:** Returns HTTP 501 with message indicating temporary unavailability

**Original functionality:**
- Loaded Workato configuration
- Created WorkatoClient instance
- Made test call to searchContacts
- Verified mock mode vs real API behavior
- Returned detailed configuration analysis
- Provided recommendations for configuration issues

### 4. app/src/lib/workato/verify-mock-mode.ts
**Status:** Original code preserved in block comments  
**Issue:** Uses multiple deprecated methods:
  - `WorkatoClient.createCase()`
  - `WorkatoClient.searchContacts()`
  - `WorkatoClient.upsertContact()`
**@todo:** Reimplement using new SalesforceClient API  

**Current behavior:** Functions throw errors indicating temporary unavailability

**Original functionality:**
- `verifyMockMode()`: Demonstrated mock mode usage with all three deprecated methods
- `createClient()`: Factory function to create client with mock or real mode
- Example test patterns for using mock mode

## Deprecated Methods Reference

The following methods were removed from `WorkatoClient` in Dec 2025:

| Method | Purpose | Used In |
|--------|---------|---------|
| `searchContacts()` | Search for contacts in Salesforce | contacts/search, config-check |
| `upsertContact()` | Create or update contact in Salesforce | contacts/sync, verify-mock-mode |
| `createCase()` | Create a case in Salesforce | verify-mock-mode |
| `getCase()` | Retrieve a case from Salesforce | (not found in active code) |
| `getContact()` | Retrieve a contact from Salesforce | (not found in active code) |
| `searchCases()` | Search for cases in Salesforce | (not found in active code) |

## New API Reference

The new `SalesforceClient` (in `app/src/lib/workato/salesforce-client.ts`) provides:

**Available methods:**
- `searchRooms()` - Search for rooms
- `createServiceRequest()` - Create service requests
- `searchServiceRequests()` - Search service requests
- `updateServiceRequest()` - Update service requests
- `createMaintenanceTask()` - Create maintenance tasks
- `searchMaintenanceTasks()` - Search maintenance tasks
- `updateMaintenanceTask()` - Update maintenance tasks
- `getMaintenanceTask()` - Get maintenance task by ID
- `createCharge()` - Create charges
- `searchCharges()` - Search charges
- `getCharge()` - Get charge by ID
- `updateCharge()` - Update charges

**Not yet implemented:**
- Contact management (search, create, update)
- Case management (create, search, update)

## Restoration Plan

To restore the commented code:

### Step 1: Implement Contact Methods in SalesforceClient
Add to `app/src/lib/workato/salesforce-client.ts`:
```typescript
async searchContacts(criteria: ContactSearchCriteria): Promise<Contact[]>
async upsertContact(data: ContactCreate): Promise<Contact>
async getContact(id: string): Promise<Contact>
```

### Step 2: Implement Case Methods in SalesforceClient
Add to `app/src/lib/workato/salesforce-client.ts`:
```typescript
async createCase(data: CaseCreate): Promise<Case>
async searchCases(criteria: CaseSearchCriteria): Promise<Case[]>
async getCase(id: string): Promise<Case>
async updateCase(id: string, data: CaseUpdate): Promise<Case>
```

### Step 3: Update Type Definitions
Add to `app/src/types/salesforce.ts`:
```typescript
export interface Contact { ... }
export interface ContactSearchCriteria { ... }
export interface ContactCreate { ... }
export interface Case { ... }
export interface CaseCreate { ... }
export interface CaseSearchCriteria { ... }
export interface CaseUpdate { ... }
```

### Step 4: Restore Each File
For each file with commented code:
1. Uncomment the imports
2. Replace `WorkatoClient` with `SalesforceClient`
3. Update method calls to use new API
4. Uncomment the implementation
5. Remove the 501 stub response
6. Test thoroughly

### Step 5: Update Tests
Update or create tests for:
- Contact search functionality
- Contact sync functionality
- Configuration check endpoint
- Mock mode verification

## Build Status

✅ **Build succeeds** with all deprecated code commented out  
✅ **All original code preserved** in block comments  
✅ **@todo annotations added** for future work  
✅ **Temporary 501 responses** inform users of unavailability  

## Notes

- All commented code is syntactically correct and can be uncommented
- Import statements are also commented to prevent TypeScript errors
- Each file has clear @todo annotations explaining what needs to be done
- The 501 responses provide helpful error messages to API consumers
- No functionality was permanently removed - everything can be restored
