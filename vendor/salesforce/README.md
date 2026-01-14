# Salesforce Metadata - Dewy Resort Hotel

This directory contains all Salesforce metadata for the Dewy Resort Hotel demo project, organized using Salesforce DX (Developer Experience) format.

## Overview

This Salesforce implementation includes:
- **4 custom objects** for managing hotel operations (Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c)
- **Lightning application** (Dewy Hotel Management) with custom tabs, logo, and utility bar
- **Permission set** (Hotel_Management_Admin) for access control
- **Custom fields** on standard objects (Case, Contact, Opportunity)
- **Expanded seed data** for realistic workshops (23 Accounts, 24 Contacts, 10 Hotel Rooms)

**Status:** ✅ Successfully deployed to developer sandbox and validated in scratch orgs

## Prerequisites

1. **Salesforce CLI** - Installed via project's isolated CLI setup
   ```bash
   # Install Salesforce CLI (from project root)
   make setup tool=salesforce

   # Verify installation
   bin/sf --version

   # Check CLI status
   make status tool=salesforce
   ```

   See [CLAUDE.md](../CLAUDE.md#multi-vendor-cli-architecture) for details on the isolated CLI architecture.

2. **Salesforce Org Access**
   - Developer Edition org (free at https://developer.salesforce.com/signup)
   - OR Developer Sandbox (recommended for this project)
   - OR Scratch org (for isolated testing)

3. **Git** (for version control)

## Quick Start

### 1. Authenticate to Salesforce

```bash
# From project root, login to your Salesforce org (opens browser)
bin/sf org login web --alias myDevOrg

# Verify connection
bin/sf org display --target-org myDevOrg
```

### 2. Deploy Metadata

```bash
# Deploy all metadata to your org
cd salesforce
../bin/sf project deploy start --source-dir force-app --target-org myDevOrg

# Assign permission set to your user
../bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg
```

This will deploy:
- 4 custom objects (Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c)
- Lightning application with custom tabs, logo, and utility bar
- Custom fields on Case, Contact, and Opportunity
- Permission set for access control

### 3. Import Seed Data

```bash
# Import sample data for workshops
../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
```

This imports:
- **23 Accounts:** Dewy Resort Hotel + 11 guest households + 11 vendor companies
- **24 Contacts:** 1 manager + 12 guests (including Carl Smith and Kay Wilson) + 11 vendors (electrician, painter, general contractor, catering, roofer, concrete, drywall, garage doors, carpentry, HVAC, plumbing)
- **10 Hotel Rooms:** Rooms 101-105, 201-205

### 4. Verify Deployment

```bash
# Open the org in browser
../bin/sf org open --target-org myDevOrg

# Navigate to App Launcher → Dewy Hotel Management
# Verify tabs: Hotel Rooms, Bookings, Contacts, Cases, Opportunities, Accounts
# Check that seed data appears in each tab
```

## Project Structure

```
salesforce/
├── sfdx-project.json              # Project configuration
├── config/
│   └── project-scratch-def.json   # Scratch org definition
├── force-app/main/default/
│   ├── applications/              # Lightning applications
│   │   └── Dewy_Hotel_Management.app-meta.xml
│   ├── tabs/                      # Custom tabs
│   │   ├── Hotel_Room__c.tab-meta.xml
│   │   ├── Booking__c.tab-meta.xml
│   │   ├── Payment_Transaction__c.tab-meta.xml
│   │   └── SMS_Notification__c.tab-meta.xml
│   ├── contentassets/             # Static resources (logo)
│   │   ├── dewyglassesclipboard.asset
│   │   └── dewyglassesclipboard.asset-meta.xml
│   ├── flexipages/                # Lightning pages
│   │   └── Dewy_Hotel_Management_UtilityBar.flexipage-meta.xml
│   ├── permissionsets/            # Permission sets
│   │   └── Hotel_Management_Admin.permissionset-meta.xml
│   └── objects/                   # All object metadata
│       ├── Booking__c/            # Custom object: Booking
│       │   ├── Booking__c.object-meta.xml
│       │   └── fields/            # All field definitions
│       ├── Hotel_Room__c/         # Custom object: Hotel Room
│       ├── Payment_Transaction__c/ # Custom object: Payment Transaction
│       ├── SMS_Notification__c/   # Custom object: SMS Notification
│       ├── Case/                  # Standard object customizations
│       │   └── fields/
│       ├── Contact/               # Standard object customizations
│       │   └── fields/
│       └── Opportunity/           # Standard object customizations
│           └── fields/
├── data/                          # Seed data for workshops
│   ├── data-plan.json             # Import order definition
│   ├── Accounts.json              # 23 Accounts (hotel + guests + vendors)
│   ├── Contacts.json              # 24 Contacts (manager + guests + vendors)
│   └── Hotel_Rooms.json           # 10 Hotel Rooms
└── README.md                      # This file
```

**Note:** Validation rules have been removed for easier initial deployment. They can be re-added later with proper test data coverage.

## Custom Objects

### 1. Booking__c
**Purpose:** Junction object managing room reservations. Links Contacts, Opportunities, and Rooms.

**Key Fields:**
- `Opportunity__c` - Master-Detail to Opportunity (Required)
- `Primary_Guest__c` - Lookup to Contact (Optional for easier data entry)
- `Room__c` - Lookup to Hotel Room (Optional for easier data entry)
- `Check_In_Date__c`, `Check_Out_Date__c` - Date range (Optional)
- `Status__c` - Picklist (Reserved, Checked In, Checked Out, Cancelled, No Show)
- `Total_Nights__c` - Formula (auto-calculated)
- `Number_of_Guests__c` - Number field (Optional)

**Note:** Most fields are optional to simplify initial deployments and workshops. Add validation rules as needed for production use.

### 2. Hotel_Room__c
**Purpose:** Master data for room inventory.

**Key Fields:**
- `Name` - Room Number (e.g., "101", "205") - Required
- `Floor__c`, `Room_Type__c`, `Status__c` - Optional for flexibility
- `Max_Occupancy__c`, `Nightly_Rate__c` - Optional for flexibility
- `View_Type__c`, `Bed_Configuration__c`, `Accessible__c` - Optional

**Status Values:** Vacant, Occupied, Cleaning, Maintenance, Out of Service

**Note:** Only Name is required. Other fields are optional for workshop simplicity.

### 3. Payment_Transaction__c
**Purpose:** Record all payment transactions via Stripe.

**Key Fields:**
- `Opportunity__c` - Master-Detail to Opportunity (Required)
- `Stripe_Transaction_ID__c` - External ID for Stripe (Optional)
- `Amount__c`, `Transaction_Type__c`, `Status__c` - Optional for flexibility
- `Transaction_Date__c` - DateTime (Optional)
- `Payment_Method__c`, `Last_4_Digits__c`, `Receipt_URL__c` - Optional

**Note:** Validation rules removed for initial deployment. Fields are optional for workshop flexibility.

### 4. SMS_Notification__c
**Purpose:** Log all SMS communications via Twilio.

**Key Fields:**
- `Case__c` - Lookup to Case (Optional - polymorphic relationship)
- `Opportunity__c` - Lookup to Opportunity (Optional - polymorphic relationship)
- `Twilio_Message_SID__c` - External ID (Optional)
- `To_Phone_Number__c`, `Message_Body__c`, `Status__c` - Optional
- `Sent_Date__c`, `Delivered_Date__c`, `Error_Message__c` - Optional

**Note:** Validation rules removed for initial deployment. All fields are optional for workshop flexibility.

## Standard Object Customizations

### Case
**New Fields:**
- `External_ID__c` - Text(50), Unique - Hotel DB service request UUID (Optional)
- `Room__c` - Lookup(Hotel_Room__c) - Room where service needed (Optional)
- `Booking__c` - Lookup(Booking__c) - Associated booking (Optional)

### Contact
**New Fields:**
- `Contact_Type__c` - Picklist (Guest, Manager, Vendor) - Optional for flexibility
- `Employee_ID__c` - Text(20) - For manager contacts (Optional)
- `Loyalty_Number__c` - Text(20) - For repeat guests (Optional)
- `Preferred_Contact_Method__c` - Picklist (SMS, Email, Phone) - Optional

### Opportunity
**New Fields:**
- `Total_Nights__c` - Rollup Summary - Sum of nights from related Bookings
- `Arrival_Date__c` - Date - Earliest check-in (populated by automation)
- `Departure_Date__c` - Date - Latest check-out (populated by automation)

**Note:** `Arrival_Date__c` and `Departure_Date__c` require Flow or Trigger to populate (MIN/MAX aggregation not supported in formulas).

## Manual Deployment Steps

If you prefer to deploy manually or troubleshoot:

### Deploy Metadata Only
```bash
cd salesforce
../bin/sf project deploy start --source-dir force-app --target-org myDevOrg
```

### Assign Permission Set
```bash
../bin/sf org assign permset --name Hotel_Management_Admin --target-org myDevOrg
```

### Import Seed Data Only
```bash
../bin/sf data import tree --plan data/data-plan.json --target-org myDevOrg
```

### Deploy Specific Objects
```bash
# Deploy just Booking object
../bin/sf project deploy start --source-dir force-app/main/default/objects/Booking__c --target-org myDevOrg

# Deploy just Lightning application
../bin/sf project deploy start --source-dir force-app/main/default/applications --target-org myDevOrg
```

## Creating a Scratch Org (Optional)

For workshop facilitators who want isolated test environments:

```bash
# From project root, set up DevHub authentication first
bin/sf org login web --alias myDevHub --set-default-dev-hub

# Create scratch org (from salesforce directory)
cd salesforce
../bin/sf org create scratch --definition-file config/project-scratch-def.json \
  --alias dewyhotel --duration-days 7 --target-dev-hub myDevHub

# Deploy metadata
../bin/sf project deploy start --source-dir force-app --target-org dewyhotel

# Assign permission set
../bin/sf org assign permset --name Hotel_Management_Admin --target-org dewyhotel

# Import seed data
../bin/sf data import tree --plan data/data-plan.json --target-org dewyhotel

# Open scratch org in browser
../bin/sf org open --target-org dewyhotel

# Delete scratch org when done
../bin/sf org delete scratch --target-org dewyhotel --no-prompt
```

## Testing Queries (SOQL)

After deployment, test with these SOQL queries:

### List All Hotel Rooms
```sql
SELECT Name, Room_Type__c, Status__c, Nightly_Rate__c, Floor__c
FROM Hotel_Room__c
ORDER BY Name
```

### List All Accounts
```sql
SELECT Name, Type
FROM Account
ORDER BY Name
```

### List All Contacts
```sql
SELECT FirstName, LastName, Email, Contact_Type__c, Account.Name
FROM Contact
ORDER BY LastName
```

## Troubleshooting

### Error: "Cannot delete this object because it is referenced by..."
**Solution:** Objects with Master-Detail relationships must be deployed in correct order:
1. Deploy standalone objects first (Hotel_Room__c, SMS_Notification__c)
2. Deploy parent objects (Opportunity, Case, Contact)
3. Deploy child objects last (Booking__c, Payment_Transaction__c)

The deployment script handles this automatically.

### Error: "Field integrity exception"
**Solution:** Ensure all required fields are included in deployment:
- Booking__c requires Opportunity__c (Master-Detail)
- SMS_Notification__c requires Twilio_Message_SID__c

### Error: "Custom field limit exceeded"
**Solution:** Developer Edition orgs have limits:
- 50 custom fields per object
- 400 custom fields total across all objects

This project uses well within these limits.

### Error: "Picklist value not found"
**Solution:** For Case.Type picklist, add custom values in Setup:
1. Setup → Object Manager → Case → Fields & Relationships → Type
2. Add picklist values: "Facilities", "Service Request"

## Integration with Workato

After deploying metadata:

1. **Create Workato Connection:**
   - Connection Type: Salesforce
   - Auth: OAuth 2.0
   - Use org credentials from `sf org display --target-org myDevOrg`

2. **Configure External IDs:**
   - Workato recipes use External IDs for idempotency:
     - `Case.External_ID__c` → Hotel DB service_requests.id
     - `Booking__c.External_ID__c` → Hotel DB bookings.id
     - `Payment_Transaction__c.Stripe_Transaction_ID__c` → Stripe charge ID
     - `SMS_Notification__c.Twilio_Message_SID__c` → Twilio message SID

3. **Test with Sample Recipe:**
   ```
   # Example: Create Case from service request
   POST /services/data/v58.0/sobjects/Case/External_ID__c/abc-123-def
   {
     "Subject": "Room service request",
     "Description": "Extra towels needed",
     "Type": "Service Request",
     "Status": "New",
     "Priority": "Medium",
     "Room__c": "<Hotel_Room_Id>"
   }
   ```

## Version Control

**Important:** Always commit Salesforce metadata changes:

```bash
# After making changes in Salesforce UI, pull them down
cd salesforce
../bin/sf project retrieve start --source-dir force-app/main/default/objects --target-org myDevOrg

# Commit changes
cd ..
git add salesforce/
git commit -m "Update Salesforce metadata: add new field to Booking"
git push
```

**Tip:** Follow the Git Workflow guidelines in [CLAUDE.md](../CLAUDE.md#git-workflow-and-branching-strategy) for proper branch management.

## Workshop Preparation

For instructors preparing workshops:

1. **Pre-deploy to sandbox or scratch org:**
   ```bash
   # Deploy to sandbox
   cd salesforce
   ../bin/sf project deploy start --source-dir force-app --target-org workshopSandbox
   ../bin/sf org assign permset --name Hotel_Management_Admin --target-org workshopSandbox
   ../bin/sf data import tree --plan data/data-plan.json --target-org workshopSandbox
   ```

2. **Verify seed data loaded:**
   - 23 Accounts (1 hotel + 11 guest households + 11 vendors)
   - 24 Contacts (1 manager + 12 guests + 11 vendors)
   - 10 Hotel Rooms

3. **Optionally create additional demo data:**
   - 1-2 sample Opportunities (in Salesforce UI)
   - 2-3 sample Bookings linked to Opportunities
   - 1-2 sample Cases for service requests

4. **Test Workato recipes:**
   - Service request → Case creation
   - Checkout → Payment transaction
   - SMS notification logging

5. **Backup credentials:**
   - Export connection details from Workato
   - Document org URL and credentials
   - Keep `.workatoenv` file secure

## Related Documentation

- [Salesforce Metadata Specification](/workato/docs/salesforce-metadata.md) - Complete field definitions
- [System Landscape](/workato/docs/system-landscape.md) - All systems and connections
- [Recipe Architecture Template](/workato/docs/recipe-architecture-template.md) - Recipe docs standard
- [Workato Connections](/workato/connections/README.md) - Connection setup guide

## Support

For issues with:
- **Salesforce CLI:** https://developer.salesforce.com/tools/salesforcecli
- **Salesforce DX:** https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/
- **This project:** Create issue in GitHub repo

---

**Last Updated:** 2025-11-12
**API Version:** 58.0
**Status:** ✅ Successfully deployed to developer sandbox (dewyHotelDevHub)
**Validated In:** Scratch orgs (dewy-scratch-20251112-164419) and Developer Sandbox
