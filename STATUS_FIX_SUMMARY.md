# Case Status Fix Summary

## Problem
The maintenance and housekeeping screens were sending invalid status values to the Salesforce API Collection, causing search requests to fail.

## Root Cause
After the Salesforce API migration (commit 29e13bf on Jan 15, 2026), the application was sending **application-level status values** (`pending`, `in_progress`, `assigned`, `completed`) instead of **Salesforce status values** (`New`, `Working`, `Escalated`, `Closed`).

## Valid Salesforce Case Status Values
According to the SF API Collection and the status mapping in `salesforce-client.ts`:

- **New** - Maps to application status `pending`
- **Working** - Maps to application status `in_progress`
- **Escalated** - Maps to application status `in_progress`
- **Closed** - Maps to application status `completed`

## Files Fixed

### 1. `app/src/app/api/manager/maintenance/route.ts` (Line 28)
**Before:**
```javascript
criteria.status = 'pending,in_progress,assigned,completed';
```

**After:**
```javascript
criteria.status = 'New,Working,Escalated';
```

**Reason:** When no filters are provided, the API defaults to showing active maintenance tasks. We exclude `Closed` to show only open tasks.

### 2. `app/src/app/api/manager/dashboard/route.ts` (Line 48)
**Before:**
```typescript
status: 'pending' as any, // Will match pending, assigned, in_progress
```

**After:**
```typescript
status: 'New' as any, // Salesforce status for new/pending tasks
```

**Reason:** Dashboard should show new/pending maintenance tasks using the correct Salesforce status value.

## Status Mapping Reference
The `SalesforceClient` class in `app/src/lib/workato/salesforce-client.ts` contains the mapping functions:

```typescript
private mapMaintenanceStatus(sfStatus: string): any {
  const mapping: Record<string, string> = {
    'New': 'pending',
    'Working': 'in_progress',
    'Escalated': 'in_progress',
    'Closed': 'completed',
  };
  return mapping[sfStatus] || 'pending';
}

private mapServiceRequestStatus(sfStatus: string): any {
  const mapping: Record<string, string> = {
    'New': 'pending',
    'Working': 'in_progress',
    'Escalated': 'in_progress',
    'Closed': 'completed',
  };
  return mapping[sfStatus] || 'pending';
}
```

## Testing
To verify the fix:

1. **Manager Dashboard**: Should load maintenance tasks without errors
2. **Maintenance Screen**: Should display maintenance tasks when searching
3. **Service Requests**: Should work with the correct status values

## Related Commits
- **29e13bf** - "feat: Migrate app to new Salesforce API endpoints with required filters" (Jan 15, 2026)
  - This commit introduced the new search endpoints and status mapping
- **466a783** - "aligning boolean syntax, remapping case status" (Jan 16, 2026)
  - This commit fixed status mapping in the upsert_case recipe

## Notes
- The Salesforce API Collection requires at least one filter parameter for all search operations
- Status values sent to the API must match Salesforce's picklist values exactly (case-sensitive)
- The client automatically maps Salesforce statuses to application statuses in the response
