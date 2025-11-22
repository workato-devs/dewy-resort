# Database Setup

This directory contains the SQLite database and related files for the Hotel Management Demo application.

## Files

- `schema.sql` - Database schema definition with all tables and indexes
- `hotel.db` - SQLite database file (created after running init script)

## Setup Commands

### Initialize Database
Creates the database and applies the schema:
```bash
npm run db:init
```

### Seed Database
Populates the database with demo data:
```bash
npm run db:seed
```

### Verify Database
Checks that the database is properly set up:
```bash
node scripts/verify-db.js
```

## Demo Credentials

### Managers
- Email: `manager1@hotel.com` / Password: `password123`
- Email: `manager2@hotel.com` / Password: `password123`

### Guests
- Email: `guest1@email.com` / Password: `password123` (Room 101)
- Email: `guest2@email.com` / Password: `password123` (Room 102)
- Email: `guest3@email.com` / Password: `password123` (Room 103)
- ... (guest4-10@email.com, Rooms 104-105, 201-205)

## Database Schema

The database includes the following tables:

- **users** - Guest and manager accounts
- **rooms** - Hotel room information
- **room_devices** - IoT devices in rooms (lights, thermostats)
- **service_requests** - Guest service requests
- **maintenance_tasks** - Facility maintenance tasks
- **charges** - Guest billing charges
- **transactions** - Payment transactions
- **chat_messages** - AI assistant chat history
- **sessions** - User authentication sessions

## Seed Data Summary

The seed script creates:
- 2 managers
- 10 guests (Rooms 101-105, 201-205)
- 20 rooms across 2 floors
- 60 room devices (3 per room)
- 8 service requests with various statuses
- 6 maintenance tasks
- Multiple charges and transactions
- Sample chat conversations

## Database Client

The application uses a custom database client wrapper located at `lib/db/client.ts` that provides:
- Connection management (singleton pattern)
- Error handling
- Query execution helpers
- Transaction support
- Type-safe mappers for converting database rows to TypeScript types

## Type Definitions

All database types are defined in `types/index.ts` with both:
- Application types (camelCase)
- Database row types (snake_case)

Mappers in `lib/db/mappers.ts` handle conversion between the two formats.
