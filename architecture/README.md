---
layout: default
title: Architecture Diagrams
nav_order: 3
---

# Architecture Diagrams

Visual documentation of the Dewy Resort MCP compositional architecture.

---

## System Architecture Overview

The overall system architecture showing how the Next.js frontend connects to Workato orchestrators, which coordinate Salesforce and Stripe operations.

![System Architecture]({{ site.baseurl }}/assets/images/system-architecture.png)

---

## Workflow Diagrams

### Guest Check-In Flow

The check-in orchestrator validates the guest and booking, then performs atomic state transitions across booking, room, and opportunity records.

![Guest Check-In Flow]({{ site.baseurl }}/assets/images/guest-checkin-flow.png)

**Key patterns:**
- Validation before mutation
- Sequential atomic operations
- Structured error responses (404, 409)

---

### Guest Checkout Flow

The checkout orchestrator handles billing finalization, room status updates, and opportunity closure.

![Guest Checkout Flow]({{ site.baseurl }}/assets/images/guest-checkout-flow.png)

**Key patterns:**
- Cross-system coordination (Salesforce + Stripe)
- Idempotency tokens for payment safety
- Saga pattern for failure recovery

---

### Guest Service Request Flow

Handles guest requests for amenities, housekeeping, and other services.

![Guest Service Request Flow]({{ site.baseurl }}/assets/images/guest-service-request-flow.png)

**Key patterns:**
- Guest context validation
- Case creation with proper categorization
- Automatic routing based on request type

---

### Maintenance Request Flow

Processes maintenance requests from staff, creating work orders and updating room status.

![Maintenance Request Flow]({{ site.baseurl }}/assets/images/maintenance-request-flow.png)

**Key patterns:**
- Staff authorization validation
- Work order lifecycle management
- Room status coordination

---

### Checkout Failure Compensation (Saga Pattern)

Demonstrates the saga pattern for handling distributed transaction failures during checkout.

![Checkout Failure Compensation]({{ site.baseurl }}/assets/images/compensate-checkout-failure-flow.png)

**Key patterns:**
- Compensating transactions for rollback
- Partial failure handling
- Audit trail maintenance

---

## Pattern Summary

| Pattern | Purpose | Example |
|---------|---------|---------|
| **Validation First** | Check prerequisites before mutations | Verify guest exists before check-in |
| **Atomic Composition** | Build workflows from single-purpose operations | Orchestrator calls atomic recipes |
| **Structured Errors** | Return specific HTTP codes with error details | 404 for not found, 409 for conflicts |
| **Idempotency** | Safe retry behavior | External_ID__c fields, Stripe Idempotency-Key |
| **Saga Pattern** | Coordinate distributed transactions | Compensation flow on payment failure |
