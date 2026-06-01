# Dewy Resort Hotel - Sample Application

**Enterprise MCP Design Patterns for LLM Productivity**

A demonstration of how to design Model Context Protocol (MCP) servers that maximize AI agent productivity while maintaining backend system integrity, performance, security, and scale.

---

## What This Demonstrates

This sample application showcases **enterprise-grade MCP architecture patterns** that solve real-world challenges when integrating LLMs with backend systems:

### The Problem
Most MCP implementations give AI agents direct database access or expose raw APIs, leading to:
- ❌ **Poor performance** - Agents make 10+ API calls for simple tasks
- ❌ **Data integrity issues** - Agents create invalid state transitions
- ❌ **Security vulnerabilities** - Overly permissive tool access
- ❌ **Scalability bottlenecks** - No caching, retries, or rate limiting
- ❌ **Poor user experience** - Slow responses, frequent failures

### The Solution: Compositional MCP Architecture

This project demonstrates a **two-tier tool design** that balances LLM flexibility with enterprise requirements:

**🎯 Orchestrators (High-level tools)** - Optimized for common scenarios
- Encode business rules and prerequisites
- Execute multi-step workflows in < 3 seconds
- Handle state transitions in correct dependency order
- Provide great UX for 80% of use cases

**🧩 Atomic Skills (Building blocks)** - For edge cases and flexibility
- Single-responsibility operations
- Composable by AI agents at runtime
- Enable handling of unexpected scenarios
- Maintain proper authorization boundaries

**Key Result:** AI agents get fast, validated workflows for common tasks AND the flexibility to handle edge cases intelligently.

---

## Why This Matters

![System Architecture](./app/docs/architecture/system-architecture.png)<br/>
*Enterprise MCP Architecture - Persona-based servers with orchestrators and atomic skills*

### Real-World Example: Guest Check-In

![Guest Check-In Flow](./app/docs/architecture/guest-checkin-flow.png)<br/>
*Check-in orchestrator: < 3 seconds, 6 API calls, validates prerequisites, ensures correct state transitions*

**Traditional Approach (LLM with raw Salesforce access):**
```
Agent makes 15+ separate API calls:
1. Search for guest → 400ms
2. Validate guest exists → 200ms
3. Search for booking → 400ms
4. Check booking status → 200ms
5. Validate room number → 200ms
6. Search for room → 400ms
7. Check room status → 200ms
8. Update booking status → 300ms
9. Update room status → 300ms
10. Update opportunity → 300ms
... error handling, retries ...

Total time: 8-12 seconds
Failure rate: 15-20% (race conditions, validation errors)
```

**Enterprise MCP Approach (Orchestrator):**
```
Agent calls one orchestrator:
POST /check-in-guest {guest_email, check_in_date}

Orchestrator internally:
- Validates prerequisites in parallel (3 reads)
- Executes state transitions in order (3 updates)
- Handles errors gracefully
- Ensures data integrity

Total time: < 3 seconds
Failure rate: < 2% (only fails on legitimate business rule violations)
```

**Result:** 3-4x faster, 90% fewer errors, better user experience.

### Edge Case Handling with Atomic Skills

**Scenario:** Guest says "I need towels in room 101" but contact doesn't exist in system

**Orchestrator-only approach:**
- ❌ Fails with "Contact not found" error
- ❌ Agent can't proceed
- ❌ Poor user experience

**Compositional approach (Orchestrator + Atomic Skills):**
- ✅ Agent detects missing contact
- ✅ Agent composes: `create_contact` → `upsert_case`
- ✅ Handles edge case with proper approval authority
- ✅ Great user experience

**Key Insight:** Give agents *both* optimized workflows AND building blocks for flexibility.

---

## Architecture Principles

### 1. Zero Direct System Integrations

**All data movement flows through Workato integration hub**

```
❌ DON'T: Hotel App → Salesforce (tight coupling)
❌ DON'T: Hotel App → Stripe (security risk)
❌ DON'T: LLM → Salesforce (no validation)

✅ DO: Hotel App → Workato → Salesforce (orchestrated)
✅ DO: LLM Agent → MCP Server → Workato → Backends (validated, secure)
```

**Benefits:**
- **Performance**: Workato handles caching, connection pooling, retries
- **Security**: Single integration layer with centralized auth
- **Maintainability**: Backend changes don't break frontend
- **Observability**: All integration traffic in one place

### 2. Persona-Based MCP Servers

**Organize tools by user role and "jobs to be done"**

```
Guest MCP Server:
├── Orchestrators: check_in_guest, checkout_guest, service_request
└── Atomic Skills: search_contact, search_booking, upsert_case

Staff MCP Server:
├── Orchestrators: maintenance_request, assign_room, update_case_status
└── Atomic Skills: create_contact, search_room, update_room_status
```

**Benefits:**
- **Security**: Users only access tools appropriate for their role
- **Performance**: Smaller tool context = better LLM reasoning
- **Usability**: Relevant tools for each persona
- **Scale**: Independent servers can be optimized separately

### 3. Idempotency and State Validation

**Every orchestrator validates prerequisites and checks for duplicate operations**

Example: Check-in orchestrator validates:
- ✅ Guest exists (Contact.id)
- ✅ Reservation exists (Booking.status = Reserved)
- ✅ Room is available (Hotel_Room.status = Vacant)
- ✅ No existing check-in for this booking (idempotency)

**Benefits:**
- **Data integrity**: No invalid state transitions
- **Reliability**: Retry-safe operations
- **Error handling**: Clear, actionable error messages
- **Audit trail**: All validation logged

### 4. Performance Optimization

**Orchestrators minimize API calls and latency**

Techniques demonstrated:
- **Parallel execution**: Read operations execute concurrently
- **Dependency ordering**: Updates execute in correct sequence
- **Batch operations**: Multiple updates in single transaction where possible
- **Caching**: Workato caches connection pools and reference data
- **Circuit breakers**: Fail fast on downstream outages

**Result:** Typical orchestrators complete in < 3 seconds with 4-6 API calls.

---

## What's Included

### MCP Server Implementation (Workato)

**33 Recipes organized as MCP tools:**

**12 Orchestrators** (High-level workflows):
- `check_in_guest` - Multi-object state transition (< 3s, 6 API calls)
- `checkout_guest` - Payment processing + room release
- `service_request` - Guest service case creation
- `maintenance_request` - Staff maintenance workflow
- `create_booking_orchestrator` - Full booking with availability check
- Additional orchestrators for case management, search workflows

**21 Atomic Skills** (Building blocks):
- **Salesforce (15)**: search_contact, search_booking, search_room, create_contact, update_booking_status, upsert_case, etc.
- **Stripe (6)**: create_customer, create_payment_intent, confirm_payment, retrieve_status, create_refund

### Hotel Management Application (Next.js)

- **Guest Portal**: Service requests, room controls, billing, AI assistant
- **Manager Portal**: Dashboard, maintenance management, room operations
- **MCP Integration**: Demonstrates how to call enterprise MCP servers from application code
- **Local Database**: SQLite for app-specific data (sessions, UI state)

### Backend Systems

- **Salesforce**: System of record (Bookings, Rooms, Cases, Contacts, Opportunities)
- **Stripe**: Payment processing (optional)
- **Twilio**: SMS notifications (optional)

---

## Quick Start

### One-Line Install (Recommended)

**Mac/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.sh | bash
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-Expression (curl https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.ps1 -UseBasicParsing)"
```

The bootstrap script automatically installs all dependencies (Node.js v20, Git) and sets up the project.

Then change into the project directory:
```bash
cd dewy-resort
```

### Manual Setup

**Prerequisites:**
- Node.js 20+
- [Workato Developer sandbox](https://www.workato.com/sandbox) (free Developer sandbox)
- [Salesforce Developer org](https://developer.salesforce.com/signup) (free Developer Edition)
- [Stripe Developer account](https://dashboard.stripe.com/register) (Stripe Developer sign up)
- Workato CLI (`wk`) — macOS/Linux: `brew install workato-devs/tap/wk` / Windows: `scoop bucket add workato-devs https://github.com/workato-devs/scoop-bucket && scoop install wk`

### 1. Initialize Project

```bash
# Copy env template
cp .env.example app/.env

# Install app dependencies and initialize local database
cd app
npm install
npm run db:setup
cd ..
```

### 2. Deploy Salesforce Metadata ⭐

Salesforce is the system of record — deploy it first.

```bash
# Verify CLIs are installed
make setup

# Authenticate to Salesforce (opens browser)
sf org login web --alias myDevOrg

# Deploy metadata and seed data
make sf-deploy org=myDevOrg
```

**📚 See:** [Salesforce Setup](./vendor/salesforce/docs/SALESFORCE_SETUP.md)

### 3. Deploy Workato MCP Server ⭐

Workato implements the enterprise MCP architecture.

```bash
# Authenticate with your Workato workspace
make workato-login

# Initialize Workato project and push recipes
make workato-init
make push
```

Next, configure connections in the Workato UI:
1. Go to **Projects → Workspace Connections** and connect your **Salesforce** org
2. Optionally connect **Stripe** (Sandbox mode, `sk_test_` key)

```bash
# Start all recipes
make start-recipes
```

**⚠️ IMPORTANT:** 4 recipes with dynamic SOQL queries may need their Salesforce connection linked manually before they'll start. See the detailed guide for steps.

**📚 See:** [Workato Setup](./vendor/workato/docs/WORKATO_SETUP.md)

### 4. Configure API & MCP

Set up API collections, endpoints, and MCP servers:

```bash
# Create API collections, endpoints, and API client (writes credentials to app/.env)
make setup-api

# Enable all API endpoints
make enable-api-endpoints

# Create MCP servers and write URLs/tokens to app/.env
make setup-mcp
```

### 5. Start Application

```bash
app/scripts/dev-tools/server.sh start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Learning Path

### For Workshop Participants

**Goal:** Understand enterprise MCP design patterns

1. **Start here:** Review architecture diagrams in [`app/docs/architecture/`](./app/docs/architecture/)
2. **Explore:** Compare orchestrator vs atomic skill patterns
3. **Observe:** Check-in orchestrator flow (prerequisites, state transitions, error handling)
4. **Experiment:** Try edge cases (missing contact, double check-in, invalid room)
5. **Reflect:** Why are orchestrators faster? Why do atomic skills matter?

### For Developers Building MCP Servers

**Goal:** Apply these patterns to your own projects

1. **Architecture:** Study [system-architecture.png](./app/docs/architecture/system-architecture.png)
2. **Implementation:** Review Workato recipes in `workato/` directory
3. **Patterns:** Read [WORKATO_SETUP.md](./vendor/workato/docs/WORKATO_SETUP.md) for detailed pattern explanations
4. **Adaptation:** Consider how to apply orchestrator + atomic skill pattern to your domain

### Key Takeaways

✅ **Orchestrators for common scenarios** - Fast, validated, great UX </br>
✅ **Atomic skills for flexibility** - Handle edge cases intelligently </br>
✅ **Zero direct integrations** - All through central hub </br>
✅ **Persona-based servers** - Security, performance, usability </br>
✅ **Idempotency and validation** - Data integrity, reliability </br>
✅ **Performance optimization** - Parallel reads, dependency ordering </br>

---

## Additional Resources

### Setup Guides
- **[Salesforce Setup](./vendor/salesforce/docs/SALESFORCE_SETUP.md)** - Deploy custom objects and seed data
- **[Workato Setup](./vendor/workato/docs/WORKATO_SETUP.md)** - Deploy MCP server recipes
- **[Architecture Diagrams](./app/docs/architecture/README.md)** - Visual documentation of all workflows

### Optional Features
- **[Stripe Integration](./vendor/workato/docs/WORKATO_SETUP.md#stripe-recipe-activation-optional)** - Payment processing
- **[Cognito Authentication](#cognito-authentication-workshop-convenience)** - User auth (workshop convenience)
- **[Bedrock AI Chat](#bedrock-ai-chat-optional)** - AI assistants (optional)

### Technical Details
- **[Salesforce Metadata](./vendor/salesforce/README.md)** - Complete object and field documentation
- **[Project Structure](#project-structure)** - Codebase organization
- **[CLI Commands](#cli-commands)** - Automation scripts

---

## Project Structure

```
dewy-resort/
├── workato/                      # ⭐ MCP SERVER IMPLEMENTATION
│   ├── recipes/
│   │   ├── atomic-salesforce-recipes/  # 15 atomic skills
│   │   ├── atomic-stripe-recipes/      # 6 payment atomic skills
│   │   ├── orchestrator-recipes/       # 13 high-level orchestrators
│   │   ├── home-assistant/             # Home Assistant integration
│   │   ├── sf-api-collection/          # API Collection definitions
│   │   └── Workspace Connections/      # Connection configs
├── app/                          # Next.js application
│   ├── src/                      # Application source
│   ├── docs/
│   │   └── architecture/         # ⭐ ARCHITECTURE DIAGRAMS
│   │       ├── system-architecture.png
│   │       ├── guest-checkin-flow.png
│   │       ├── guest-checkout-flow.png
│   │       ├── guest-service-request-flow.png
│   │       └── maintenance-request-flow.png
│   └── public/                   # Static assets
├── vendor/
│   ├── workato/                  # Workato docs & scripts
│   │   ├── docs/
│   │   │   └── WORKATO_SETUP.md
│   │   └── scripts/
│   ├── salesforce/               # Salesforce metadata & deployment
│   │   ├── force-app/            # Custom objects, fields, app
│   │   ├── data/                 # Seed data
│   │   ├── docs/
│   │   │   └── SALESFORCE_SETUP.md
│   │   └── scripts/
│   │       └── deploy.sh
│   ├── aws/                      # CloudFormation templates
│   └── okta/                     # Okta auth config
```

---

## CLI Commands

```bash
# Setup
make setup                        # Verify CLI installations
make workato-login                # Authenticate wk CLI with API token

# Workato (MCP Server) — requires wk CLI (brew install workato-devs/tap/wk)
make workato-init                 # Initialize wk project & pull recipes
make validate                     # Lint all recipes
make push                         # Push recipes to workspace
make pull                         # Pull recipes from workspace
make start-recipes                # Start all recipes
make stop-recipes                 # Stop all recipes
make setup-api                    # Create API collections, endpoints & client
make enable-api-endpoints         # Enable API endpoints
make setup-mcp                    # Create MCP servers & write config to app/.env

# Salesforce (Backend)
make sf-deploy org=<alias>        # Deploy metadata and seed data

# Diagnostics
make status                       # Check all CLI status
make doctor                       # Verify CLI installations
```

---

## Mock Mode (Development Only)

For frontend development without backend setup:

```bash
# In .env
WORKATO_MOCK_MODE=true

# Restart server
npm run dev
```

**⚠️ Note:** Mock mode simulates MCP responses. Use for frontend work only, not for learning MCP architecture patterns.

---

## Optional Features

### Cognito Authentication (Workshop Convenience)

For workshops where participants don't have their own auth:

```bash
AUTH_PROVIDER=cognito
# Deploy Cognito User Pool
cd aws/cloudformation
./deploy.sh dev http://localhost:3000/api/auth/cognito/callback http://localhost:3000 dewy-hotel
```

### Bedrock AI Chat (Optional)

AI-powered chat assistants (demonstrates LLM + MCP integration):

```bash
# Deploy Identity Pool
cd aws/cloudformation
./deploy-identity-pool.sh dev <user-pool-id> <client-id>

# Configure in .env
COGNITO_IDENTITY_POOL_ID=your_pool_id
```

---

## Technology Stack

- **MCP Server**: Workato (33 recipes organized as orchestrators and atomic skills)
- **Backend Systems**: Salesforce (CRM), Stripe (payments), Twilio (SMS)
- **Application**: Next.js 14, React, TypeScript, Tailwind CSS
- **Database**: SQLite (local app data only)
- **Auth**: Amazon Cognito (optional) or mock mode
- **AI**: Amazon Bedrock (optional chat assistants)

---

## Why Workato?

This sample uses **Workato** as the MCP server implementation, but the architectural patterns apply to any integration platform:

✅ **Visual recipe builder** - Easy to understand workflows </br>
✅ **Built-in connectors** - Salesforce, Stripe, Twilio out of the box </br>
✅ **API Collections** - Native REST API exposure </br>
✅ **Enterprise features** - Error handling, retries, logging, monitoring </br>
✅ **Workshop-friendly** - Visual representation aids learning</br>

**The patterns work with:** Custom APIs, serverless functions, other orchestration systems, etc.

---

## License

MIT

---

## Questions?

This is a **sample application for teaching enterprise MCP design patterns**. The goal is to demonstrate how to build MCP servers that maximize LLM productivity while maintaining backend integrity, performance, security, and scale.

**Focus areas:**
- Why orchestrators matter for performance and UX
- When to use atomic skills vs orchestrators
- How to design persona-based MCP servers
- Patterns for idempotency and state validation
- Zero direct system integrations architecture

For implementation details, see the setup guides in [`vendor/workato/docs/`](./vendor/workato/docs/) and [`vendor/salesforce/docs/`](./vendor/salesforce/docs/).
