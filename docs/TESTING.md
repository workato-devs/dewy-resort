# Testing Strategy

This document outlines the current testing approach for the Dewy Resort sample application and the roadmap for future test automation when MCP server deployment capabilities become available.

---

## Current Testing Approach

### **Manual Testing** (Primary)

This sample application is designed for **workshop and teaching purposes**. The primary testing approach is **manual testing** of the MCP orchestration patterns.

**Manual Test Scenarios:**

1. **Guest Service Requests** (`SALESFORCE_ENABLED=true`)
   - Login as guest@example.com
   - Create housekeeping, maintenance, room service requests
   - Verify requests appear in manager portal
   - Check Salesforce Cases are created with correct metadata

2. **Room Management** (`SALESFORCE_ENABLED=true`)
   - Login as manager@example.com
   - View room inventory from Salesforce
   - Verify room status (Vacant, Occupied, Cleaning, Maintenance)
   - Check room assignments sync correctly

3. **Maintenance Workflows** (`SALESFORCE_ENABLED=true`)
   - Create maintenance tasks
   - Assign to technicians
   - Verify Salesforce Case creation
   - Test SMS notifications (if Twilio enabled)

4. **Billing/Charges** (`SALESFORCE_ENABLED=true`)
   - View guest billing
   - Verify charges from Salesforce
   - Test Stripe payment processing (if enabled)

### **Unit Tests** (Existing)

Located in `lib/workato/__tests__/`:
- `config.test.ts` - Configuration loading and validation
- `errors.test.ts` - Error handling and retry logic
- `mock-data-store.test.ts` - Mock data store functionality
- `mock-mode.test.ts` - Mock mode integration
- `salesforce-client-request.test.ts` - SalesforceClient HTTP requests
- `salesforce-client-rooms.test.ts` - Room management operations

**Run unit tests:**
```bash
npm run test
```

### **Integration Scripts** (Existing)

Located in `scripts/`:
- `test-salesforce-endpoints.ts` - Test Salesforce recipe endpoints
- `test-workato-rest-api.ts` - Test Workato REST API integration
- `test-case-search-integration.ts` - Test Case search functionality
- `test-room-management-salesforce.ts` - Test room management via Salesforce

**Run integration scripts:**
```bash
# Requires real Workato credentials in .env
npm run test:integration
```

---

## Current MCP Integration

The application uses **SalesforceClient** (`lib/workato/salesforce-client.ts`) which integrates with:

**34 Workato Recipes:**
- 15 Atomic Salesforce recipes (`atomic-salesforce-recipes/`)
- 6 Atomic Stripe recipes (`atomic-stripe-recipes/`)
- 12 Orchestrator recipes (`orchestrator-recipes/`)

**Key Operations:**
- Room management via `searchRooms()`
- Service requests via `createServiceRequest()`, `searchServiceRequests()`
- Maintenance tasks via `createMaintenanceTask()`, `searchMaintenanceTasks()`
- Billing/charges via `searchCharges()`

When exposed via Workato Enterprise MCP (or as API Collection endpoints, for non-AI application uses).

---

## Future Testing Plans

### **When Enterprise MCP Server Deployment is Available via Workato Platform CLI**

Currently, the Workato recipes are deployed via **scripts** using Workato CLI:
```bash
make workato-init     # Deploy recipes
make start-recipes    # Start recipes sequentially
```
And final Enterprise MCP configurations (and recipe activation edge cases) are completed **manually** in Workato.

**Future capability:** With **programmatic MCP server deployment via Workato Platform CLI**, this will allow:
1. Scripted deployment in sample app setup
2. Automated deployment in CI/CD scenarios

### **Test Suite to Implement**

Once programmatic MCP server deployment is available, the sample app will implement:

#### **1. End-to-End MCP Orchestrator Tests**

Test the **compositional MCP architecture** (the core teaching point):

```typescript
// Test: Guest Check-In Orchestrator
describe('MCP Orchestrator: check_in_guest', () => {
  it('should complete check-in in < 3 seconds with 6 API calls', async () => {
    // Setup: Create guest, booking, room in Salesforce
    // Execute: Call check_in_guest orchestrator
    // Assert: Booking status = Checked_In, Room status = Occupied, < 3s latency
  });

  it('should validate prerequisites (guest exists, booking reserved, room vacant)', async () => {
    // Execute: Call check_in_guest with invalid prerequisites
    // Assert: Returns clear error messages, no partial state changes
  });

  it('should be idempotent (duplicate check-in returns existing data)', async () => {
    // Execute: Call check_in_guest twice with same guest/booking
    // Assert: Second call succeeds, no duplicate records, returns existing check-in
  });
});

// Test: Orchestrator vs Atomic Skills Performance
describe('MCP Performance: Orchestrator vs Atomic Composition', () => {
  it('orchestrator should be 3-4x faster than atomic composition', async () => {
    // Test 1: Use check_in_guest orchestrator
    const orchestratorStart = Date.now();
    await client.checkInGuest({ guestEmail, checkInDate });
    const orchestratorTime = Date.now() - orchestratorStart;

    // Test 2: Manually compose atomic skills (search_contact, search_booking, etc.)
    const atomicStart = Date.now();
    await client.searchContactByEmail({ email: guestEmail });
    await client.searchBookingByContactAndDate({ contactId, date: checkInDate });
    await client.searchRoomByNumber({ roomNumber });
    await client.updateBookingStatus({ bookingId, status: 'Checked_In' });
    await client.updateRoomStatus({ roomId, status: 'Occupied' });
    const atomicTime = Date.now() - atomicStart;

    // Assert: Orchestrator is 3-4x faster
    expect(orchestratorTime).toBeLessThan(3000); // < 3s
    expect(atomicTime / orchestratorTime).toBeGreaterThanOrEqual(3);
  });
});
```

#### **2. Atomic Skill Tests**

Test individual **building blocks**:

```typescript
describe('MCP Atomic Skills: Salesforce Operations', () => {
  it('search_contact_by_email should return contact when exists', async () => {
    // Execute: Call search_contact_by_email recipe
    // Assert: Returns contact with correct email
  });

  it('upsert_booking should create booking when not exists', async () => {
    // Execute: Call upsert_booking recipe
    // Assert: Booking created in Salesforce
  });

  it('upsert_booking should update booking when exists', async () => {
    // Execute: Call upsert_booking twice with same external_id
    // Assert: Single booking record, second call updates first
  });
});
```

#### **3. Edge Case & Flexibility Tests**

Test the **atomic skill composition for edge cases** (demonstrating why atomic skills matter):

```typescript
describe('MCP Edge Cases: Atomic Skill Composition', () => {
  it('should handle missing contact gracefully', async () => {
    // Scenario: Guest says "I need towels in room 101" but contact doesn't exist
    // Execute: Agent detects missing contact
    // Execute: Agent composes create_contact → upsert_case
    // Assert: Contact created, Case created, no errors
  });

  it('should handle double check-in without error', async () => {
    // Execute: check_in_guest (succeeds)
    // Execute: check_in_guest again (should detect already checked in)
    // Assert: Returns existing check-in data, no duplicate records
  });
});
```

#### **4. API Collection & MCP Server Tests**

Test the **MCP server configuration** (when declarative MCP setup is available):

```typescript
describe('MCP Server Configuration', () => {
  it('should expose orchestrators as MCP tools with correct schemas', async () => {
    // Execute: Query MCP server for available tools
    // Assert: check_in_guest tool exists with correct input schema
  });

  it('should enforce tool authorization by persona', async () => {
    // Execute: Guest persona tries to call manager-only tool
    // Assert: Returns authorization error
  });
});
```

#### **5. Performance & Reliability Tests**

Test **enterprise MCP patterns**:

```typescript
describe('MCP Enterprise Patterns', () => {
  it('should cache read operations with 60s TTL', async () => {
    // Execute: Call search_rooms twice within 60s
    // Assert: Second call is < 10ms (cache hit)
  });

  it('should retry on transient failures (429, 503)', async () => {
    // Setup: Mock Salesforce to return 503 on first call, 200 on second
    // Execute: Call any recipe
    // Assert: Recipe retries and succeeds
  });

  it('should handle Salesforce API limits gracefully', async () => {
    // Setup: Make many concurrent requests to trigger rate limits
    // Execute: Observe retry behavior
    // Assert: All requests eventually succeed, no data loss
  });
});
```

---

## How to Add Tests

### **Step 1: Set Up Test Environment**

When MCP deployment becomes available:

```bash
# Deploy test environment Workato workspace
export WORKATO_TEST_ENV=test
make workato-deploy-test

# Configure test environment variables
cp .env.test .env
```

### **Step 2: Write Tests**

Create test files in `tests/e2e/`:

```
tests/
├── e2e/
│   ├── orchestrators/
│   │   ├── check-in-guest.test.ts
│   │   ├── checkout-guest.test.ts
│   │   ├── submit-service-request.test.ts
│   │   └── submit-maintenance-request.test.ts
│   ├── atomic-skills/
│   │   ├── salesforce-operations.test.ts
│   │   └── stripe-operations.test.ts
│   ├── edge-cases/
│   │   └── atomic-composition.test.ts
│   └── performance/
│       └── orchestrator-vs-atomic.test.ts
└── unit/
    └── (existing unit tests in lib/workato/__tests__/)
```

### **Step 3: Run Tests**

```bash
# Run all tests
npm run test

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## Key Testing Principles

### **1. Test the Architecture, Not Just the Code**

This sample app teaches **compositional MCP architecture**. Competent tests should challenge & validate whether:
- ✅ **Orchestrators are faster** than manual atomic composition (3-4x)
- ✅ **Orchestrators validate prerequisites** and ensure correct state transitions
- ✅ **Atomic skills enable flexibility** for edge cases
- ✅ **Idempotency** prevents duplicate operations

### **2. Use Real Integrations When Possible**

Prefer tests against **real Workato + Salesforce + Stripe** over mocks:
- ✅ Validates the entire integration chain
- ✅ Catches API contract mismatches
- ✅ Tests retry/error handling with real failures
- ⚠️ Requires test data cleanup (use unique identifiers, delete after tests)

### **3. Performance Benchmarks Matter**

The **key value proposition** of orchestrators is performance. Include benchmarks:
```typescript
expect(orchestratorTime).toBeLessThan(3000); // < 3s
expect(apiCallCount).toBeLessThanOrEqual(6);  // ≤ 6 calls
```

### **4. Document Edge Cases**

When tests fail, document:
- What edge case was encountered
- How atomic skills were composed to handle it
- Why orchestrators alone weren't sufficient

---

## Questions?

For questions about:
- **Current manual testing:** See workshop materials in `docs/`
- **Unit tests:** See test files in `lib/workato/__tests__/`
- **Future test automation:** Wait for Workato MCP programmatic deployment capability (TBD)

**Maintainers:** Dewy Resort Team & Workato Developer Advocacy (Zayne Turner, zayne.turner@workato.com) <br/>
**Last Updated:** December 2025 <br/>
**Next Review:** When MCP deployment automation is available
