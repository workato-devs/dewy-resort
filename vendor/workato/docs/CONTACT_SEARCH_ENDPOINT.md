# Contact Search Endpoint Specification

## Overview
This document specifies the `/search-contacts` endpoint that needs to be created in the Workato API Collection to support the contact search feature on the manager homepage.

## Endpoint Details

**Method:** `POST`  
**Path:** `/search-contacts`  
**Authentication:** API Token (required)

## Request Schema

```json
{
  "query": "string (optional)",
  "email": "string (optional)",
  "contact_type": "string (optional, enum: Guest|Manager|Vendor)",
  "limit": "number (optional, default: 10, max: 100)"
}
```

### Validation Rules
- **At least one filter required**: Must provide `query`, `email`, OR `contact_type`
- If no filters provided, return 400 error with message: "At least one filter parameter is required for searchContacts: query, email, contact_type"

### Filter Behavior
- `query`: Performs SOSL search on FirstName, LastName, and Email fields (case-insensitive, partial match)
- `email`: Exact match on Email field (case-insensitive)
- `contact_type`: Exact match on Contact_Type__c custom field
- `limit`: Maximum number of results to return (default: 10, max: 100)

## Response Schema

### Success Response (200)
```json
{
  "contacts": [
    {
      "Id": "003XXXXXXXXXXXXXXX",
      "FirstName": "John",
      "LastName": "Doe",
      "Email": "john.doe@example.com",
      "Phone": "+1-555-0101",
      "Contact_Type__c": "Guest",
      "Loyalty_Number__c": "LOYAL123",
      "AccountId": "001XXXXXXXXXXXXXXX",
      "Account": {
        "Name": "Doe Family"
      },
      "CreatedDate": "2026-01-15T10:30:00.000Z",
      "LastModifiedDate": "2026-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "found": true
}
```

### Error Response (400 - Validation Error)
```json
{
  "error": "At least one filter parameter is required for searchContacts: query, email, contact_type",
  "statusCode": 400
}
```

### Error Response (500 - Salesforce Error)
```json
{
  "error": "Salesforce API error message",
  "statusCode": 500
}
```

## Salesforce SOQL Query

### When using `query` parameter:
```sql
FIND {query*} IN ALL FIELDS 
RETURNING Contact(
  Id, FirstName, LastName, Email, Phone, 
  Contact_Type__c, Loyalty_Number__c, AccountId, Account.Name,
  CreatedDate, LastModifiedDate
  WHERE Contact_Type__c IN ('Guest', 'Manager', 'Vendor')
  ORDER BY LastName ASC
  LIMIT :limit
)
```

### When using `email` parameter:
```sql
SELECT 
  Id, FirstName, LastName, Email, Phone, 
  Contact_Type__c, Loyalty_Number__c, AccountId, Account.Name,
  CreatedDate, LastModifiedDate
FROM Contact
WHERE Email = :email
AND Contact_Type__c IN ('Guest', 'Manager', 'Vendor')
LIMIT :limit
```

### When using `contact_type` parameter:
```sql
SELECT 
  Id, FirstName, LastName, Email, Phone, 
  Contact_Type__c, Loyalty_Number__c, AccountId, Account.Name,
  CreatedDate, LastModifiedDate
FROM Contact
WHERE Contact_Type__c = :contact_type
ORDER BY LastName ASC
LIMIT :limit
```

### When combining filters:
Apply all provided filters with AND logic.

## Implementation Notes

1. **SOSL vs SOQL**: Use SOSL (FIND) for `query` parameter to enable fuzzy search across multiple fields. Use SOQL (SELECT) for exact matches.

2. **Field Mapping**: The app expects both Salesforce field names (PascalCase) and snake_case versions. The SalesforceClient handles the transformation.

3. **Account Relationship**: Include Account.Name in the query to display the account name in the UI.

4. **Contact Types**: Only return contacts with Contact_Type__c in ('Guest', 'Manager', 'Vendor'). Filter out any other contact types.

5. **Caching**: The SalesforceClient caches results for 60 seconds. No server-side caching needed.

6. **Rate Limiting**: Consider Salesforce API limits. The app limits results to 10 by default.

## Testing

### Test Case 1: Search by Name
```bash
curl -X POST "https://apim.workato.com/your-collection/search-contacts" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_token" \
  -d '{
    "query": "John",
    "limit": 10
  }'
```

Expected: Returns all contacts with "John" in FirstName, LastName, or Email

### Test Case 2: Search by Email
```bash
curl -X POST "https://apim.workato.com/your-collection/search-contacts" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_token" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

Expected: Returns exact match for the email address

### Test Case 3: Search by Contact Type
```bash
curl -X POST "https://apim.workato.com/your-collection/search-contacts" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_token" \
  -d '{
    "contact_type": "Guest",
    "limit": 20
  }'
```

Expected: Returns all Guest contacts

### Test Case 4: No Filters (Should Fail)
```bash
curl -X POST "https://apim.workato.com/your-collection/search-contacts" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_token" \
  -d '{
    "limit": 10
  }'
```

Expected: 400 error with validation message

### Test Case 5: Combined Filters
```bash
curl -X POST "https://apim.workato.com/your-collection/search-contacts" \
  -H "Content-Type: application/json" \
  -H "API-TOKEN: your_token" \
  -d '{
    "query": "Smith",
    "contact_type": "Guest"
  }'
```

Expected: Returns Guest contacts with "Smith" in name or email

## Recipe File Location

Create the recipe at:
```
workato/recipes/api-collection/search-contacts.recipe.json
```

## Related Files

- **Type Definitions**: `app/src/types/salesforce.ts` (Contact, ContactSearchCriteria)
- **Client Implementation**: `app/src/lib/workato/salesforce-client.ts` (searchContacts method)
- **API Route**: `app/src/app/api/manager/contacts/search/route.ts`
- **UI Component**: `app/src/components/manager/ContactSearchCard.tsx`

## Migration Checklist

- [ ] Create Workato recipe for `/search-contacts` endpoint
- [ ] Test endpoint with sample requests
- [ ] Verify validation errors work correctly
- [ ] Test with various filter combinations
- [ ] Deploy to development environment
- [ ] Update `.env` to enable Salesforce integration
- [ ] Test contact search on manager dashboard
- [ ] Deploy to production

## Notes

- This endpoint follows the same pattern as `/search-rooms` and `/search-cases`
- Uses business identifiers (email) instead of Salesforce IDs
- Requires at least one filter to prevent unbounded queries
- Returns standardized response format with `contacts`, `count`, and `found` fields
