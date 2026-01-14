# Salesforce Setup Guide

This guide covers the Salesforce deployment required **before** setting up Workato recipes. Salesforce provides the data layer for the hotel management system.

## Table of Contents

- [Overview](#overview)
- [Why Salesforce First](#why-salesforce-first)
- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [What Gets Deployed](#what-gets-deployed)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Dewy Resort hotel application uses **Salesforce** as the system of record for:

- **Hotel Rooms** (Hotel_Room__c) - Room inventory and availability
- **Bookings** (Booking__c) - Reservations and check-ins
- **Contacts** - Guests, managers, and vendor contacts
- **Opportunities** - Guest stays and revenue tracking
- **Cases** - Service and maintenance requests
- **Payment Transactions** (Payment_Transaction__c) - Stripe payment records
- **SMS Notifications** (SMS_Notification__c) - Twilio message logs

---

## Why Salesforce First

**⚠️ CRITICAL**: Salesforce metadata must be deployed **before** Workato recipes.

**Why?**
- Workato recipes reference Salesforce custom objects (`Booking__c`, `Hotel_Room__c`, etc.)
- Recipe SOQL queries validate against your Salesforce schema
- Connection configuration requires objects to exist
- Seed data provides test data for recipe validation

**Setup Order:**
1. ✅ **Deploy Salesforce metadata** (this guide)
2. ➡️ **Deploy Workato recipes** (see [WORKATO_SETUP.md](./WORKATO_SETUP.md))
3. ➡️ **Configure hotel app** (main README)

---

## Prerequisites

### 1. Salesforce Account

You need one of the following (free options available):

- **Developer Edition org** (recommended) - Free at https://developer.salesforce.com/signup
- **Developer Sandbox** - If you have access to a production org
- **Scratch org** - For temporary testing (requires DevHub)

### 2. Salesforce CLI

Install the Salesforce CLI using the project's isolated CLI setup:

```bash
# From project root
make setup tool=salesforce

# Verify installation
make status tool=salesforce
```

This installs the Salesforce CLI in `bin/sf` without affecting your global environment.

### 3. Authentication

Log in to your Salesforce org:

```bash
# Opens browser for authentication
bin/sf org login web --alias myDevOrg

# Verify connection
bin/sf org display --target-org myDevOrg
```

---

## Quick Setup

### One-Command Deployment

The fastest way to deploy everything:

```bash
# From project root
make sf-deploy org=myDevOrg
```

**What this does:**
1. Deploys all Salesforce metadata (objects, fields, app, tabs, permissions)
2. Assigns the Hotel_Management_Admin permission set to your user
3. Imports seed data (23 Accounts, 24 Contacts, 10 Hotel Rooms)

**Expected output:**
```
Deploying Salesforce metadata to myDevOrg...
✓ Deployed 4 custom objects
✓ Deployed Lightning application
✓ Deployed custom fields
✓ Assigned permission set
✓ Imported seed data
```

---

### Manual Step-by-Step Deployment

If you prefer manual control or need to troubleshoot:

#### Step 1: Deploy Metadata

```bash
cd salesforce
../bin/sf project deploy start --source-dir force-app --target-org myDevOrg
```

This deploys:
- 4 custom objects (Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c)
- Lightning application (Dewy Hotel Management)
- Custom tabs (Hotel Rooms, Bookings, Payment Transactions, SMS Notifications)
- Custom fields on standard objects (Case, Contact, Opportunity)
- Permission set (Hotel_Management_Admin)

#### Step 2: Assign Permission Set

```bash
../bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg
```

This grants you access to:
- All custom objects
- Lightning application
- Custom fields and tabs

#### Step 3: Import Seed Data

```bash
../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
```

This imports:
- **23 Accounts:** Dewy Resort Hotel + 11 guest households + 11 vendor companies
- **24 Contacts:** 1 manager + 12 guests + 11 vendors
- **10 Hotel Rooms:** Rooms 101-105 (floor 1), 201-205 (floor 2)

---

## What Gets Deployed

### Custom Objects

#### 1. Booking__c
**Purpose:** Junction object for room reservations

**Key Fields:**
- `Opportunity__c` (Master-Detail, Required) - Links to guest stay
- `Primary_Guest__c` (Lookup to Contact) - Guest information
- `Room__c` (Lookup to Hotel_Room__c) - Room assignment
- `Check_In_Date__c`, `Check_Out_Date__c` (Date) - Stay dates
- `Status__c` (Picklist) - Reserved, Checked In, Checked Out, Cancelled, No Show
- `Total_Nights__c` (Formula) - Auto-calculated
- `Number_of_Guests__c` (Number) - Party size

**Used by Workato recipes:**
- Create/update booking workflows
- Room availability searches
- Check-in/checkout processes

#### 2. Hotel_Room__c
**Purpose:** Master data for room inventory

**Key Fields:**
- `Name` (Text, Required) - Room number (e.g., "101", "205")
- `Room_Type__c` (Picklist) - Standard, Deluxe, Suite
- `Status__c` (Picklist) - Vacant, Occupied, Cleaning, Maintenance, Out of Service
- `Floor__c` (Number) - Floor number
- `Max_Occupancy__c` (Number) - Maximum guests
- `Nightly_Rate__c` (Currency) - Base rate
- `View_Type__c` (Picklist) - Garden, Ocean, City
- `Bed_Configuration__c` (Picklist) - King, Queen, Twin, etc.

**Used by Workato recipes:**
- Room availability searches
- Room status updates
- Booking assignment

#### 3. Payment_Transaction__c
**Purpose:** Record all payment transactions via Stripe

**Key Fields:**
- `Opportunity__c` (Master-Detail, Required) - Links to guest stay
- `Stripe_Transaction_ID__c` (Text, External ID) - Stripe charge/refund ID
- `Amount__c` (Currency) - Transaction amount
- `Transaction_Type__c` (Picklist) - Payment, Refund
- `Status__c` (Picklist) - Pending, Completed, Failed
- `Transaction_Date__c` (DateTime) - When processed
- `Payment_Method__c` (Text) - Card type
- `Last_4_Digits__c` (Text) - Card last 4 digits

**Used by Workato recipes:**
- Stripe payment integration
- Payment status tracking
- Refund processing

#### 4. SMS_Notification__c
**Purpose:** Log all SMS communications via Twilio

**Key Fields:**
- `Case__c` (Lookup to Case) - Related service request
- `Opportunity__c` (Lookup to Opportunity) - Related guest stay
- `Twilio_Message_SID__c` (Text, External ID) - Twilio message ID
- `To_Phone_Number__c` (Phone) - Recipient number
- `Message_Body__c` (Long Text Area) - SMS content
- `Status__c` (Picklist) - Sent, Delivered, Failed
- `Sent_Date__c` (DateTime) - When sent
- `Error_Message__c` (Text) - Failure reason

**Used by Workato recipes:**
- SMS notification logging
- Twilio integration

### Standard Object Customizations

#### Case
**New Fields:**
- `External_ID__c` (Text, Unique) - Links to hotel app service requests
- `Room__c` (Lookup to Hotel_Room__c) - Room needing service
- `Booking__c` (Lookup to Booking__c) - Related booking

**Used by Workato recipes:**
- Service request creation
- Maintenance request tracking

#### Contact
**New Fields:**
- `Contact_Type__c` (Picklist) - Guest, Manager, Vendor
- `Employee_ID__c` (Text) - For staff contacts
- `Loyalty_Number__c` (Text) - For repeat guests
- `Preferred_Contact_Method__c` (Picklist) - SMS, Email, Phone

**Used by Workato recipes:**
- Guest lookup
- Contact creation/update

#### Opportunity
**New Fields:**
- `Total_Nights__c` (Rollup Summary) - Sum of nights from bookings
- `Arrival_Date__c` (Date) - Earliest check-in date
- `Departure_Date__c` (Date) - Latest check-out date

**Used by Workato recipes:**
- Guest stay tracking
- Revenue reporting

### Lightning Application

**Dewy Hotel Management** - Custom Lightning app with:
- Custom tabs (Hotel Rooms, Bookings, Contacts, Cases, Opportunities, Accounts)
- Logo (Dewy mascot with clipboard)
- Utility bar configuration

### Seed Data

**23 Accounts:**
- 1 Dewy Resort Hotel (parent account)
- 11 Guest households (Carl Smith, Kay Wilson, etc.)
- 11 Vendor companies (Electrician, Plumber, HVAC, etc.)

**24 Contacts:**
- 1 Manager (hotel staff)
- 12 Guests (for testing bookings)
- 11 Vendors (for maintenance requests)

**10 Hotel Rooms:**
- Floor 1: Rooms 101-105
- Floor 2: Rooms 201-205
- Mix of room types (Standard, Deluxe, Suite)
- All initially in "Vacant" status

---

## Verification

### Step 1: Open Salesforce Org

```bash
bin/sf org open --target-org myDevOrg
```

### Step 2: Verify Lightning Application

1. Click **App Launcher** (grid icon, top left)
2. Search for **"Dewy Hotel Management"**
3. Click to open the app
4. Verify tabs appear: Hotel Rooms, Bookings, Contacts, Cases, Opportunities, Accounts

### Step 3: Verify Custom Objects

Navigate to each tab and verify seed data:

**Hotel Rooms tab:**
- Should show 10 rooms (101-105, 201-205)
- All rooms should have Room Type, Status, Floor, Rate

**Contacts tab:**
- Should show 24 contacts
- Filter by Contact Type to see Guests, Manager, Vendors

**Accounts tab:**
- Should show 23 accounts
- Filter by Type to see Hotel, Households, Vendors

### Step 4: Verify Custom Fields

1. Open any **Case** record
2. Check for custom fields: External ID, Room, Booking
3. Open any **Contact** record
4. Check for custom fields: Contact Type, Loyalty Number
5. Open any **Opportunity** record
6. Check for custom fields: Total Nights, Arrival Date, Departure Date

### Step 5: Run Test SOQL Query

```bash
# List all hotel rooms
bin/sf data query --query "SELECT Name, Room_Type__c, Status__c, Nightly_Rate__c FROM Hotel_Room__c ORDER BY Name" --target-org myDevOrg
```

**Expected output:** 10 rows with room details

---

## Troubleshooting

### Deployment fails: "Cannot delete this object because it is referenced by..."

**Cause:** Master-Detail relationships require parent objects to exist first.

**Solution:** The deployment script handles object order automatically. If manual deployment:
1. Deploy standalone objects first: `Hotel_Room__c`, `SMS_Notification__c`
2. Deploy standard object customizations: Case, Contact, Opportunity
3. Deploy child objects last: `Booking__c`, `Payment_Transaction__c`

---

### Error: "Field integrity exception"

**Cause:** Required fields are missing or parent records don't exist.

**Solution:**
- Ensure Opportunity exists before creating Booking (Master-Detail relationship)
- Check that all required fields have values

---

### Error: "Picklist value not found: Facilities"

**Cause:** Standard Case.Type picklist doesn't include custom values.

**Solution:**
1. Go to **Setup** → **Object Manager** → **Case** → **Fields & Relationships** → **Type**
2. Add picklist values: "Facilities", "Service Request"
3. Re-run deployment

---

### Seed data import fails: "Required fields are missing"

**Cause:** Data relationships are out of order or objects not deployed.

**Solution:**
1. Ensure metadata is deployed first (`make sf-deploy` or manual deployment)
2. Check `salesforce/data/data-plan.json` for correct import order
3. Re-run seed data import:
   ```bash
   cd salesforce
   ../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
   ```

---

### Permission denied: "You don't have access to this object"

**Cause:** Permission set not assigned to your user.

**Solution:**
```bash
bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg
```

Verify assignment:
```bash
bin/sf org display --target-org myDevOrg
```

---

### Authentication expired

**Cause:** Salesforce session timed out.

**Solution:**
```bash
# Re-authenticate
bin/sf org login web --alias myDevOrg
```

---

## Next Steps

After completing Salesforce setup:

1. ✅ **Verify deployment** - Use verification steps above
2. ➡️ **Deploy Workato recipes** - See [WORKATO_SETUP.md](./WORKATO_SETUP.md)
3. ➡️ **Configure hotel app** - Add Workato API Collection URL to `.env`
4. ➡️ **Start development server** - Run `npm run dev`

---

## Additional Resources

- [Salesforce Metadata Details](../salesforce/README.md) - Comprehensive field definitions
- [Workato Setup Guide](./WORKATO_SETUP.md) - Next setup step
- [Salesforce Developer Docs](https://developer.salesforce.com/docs) - Official documentation
- [Project README](../README.md) - Main project documentation
