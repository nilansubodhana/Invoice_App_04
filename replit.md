# NS Photography Invoice

## Overview

NS Photography Invoice is a React Native/Expo mobile application for creating, managing, and sharing photography invoices. It allows photographers to create professional invoices with client details, event information, line items, advance payments, and balance calculations. Invoices can be previewed and exported as PDFs for sharing.

The app runs on iOS, Android, and web via Expo, with a backend Express server for potential API functionality and serving the web build in production.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54 with expo-router for file-based navigation
- **Routing**: File-based routing via `expo-router` with screens at `app/index.tsx` (dashboard), `app/create.tsx` (new invoice), `app/edit/[id].tsx` (edit invoice), and `app/preview/[id].tsx` (preview/PDF export)
- **State Management**: React Query (`@tanstack/react-query`) is set up for server-state management, though current data storage is local via AsyncStorage
- **Styling**: Plain React Native `StyleSheet` with a custom color palette defined in `constants/colors.ts` — uses a warm, luxury aesthetic (browns, golds, cream tones)
- **Fonts**: Playfair Display (headings) and Inter (body text) loaded via `@expo-google-fonts`
- **Key Libraries**: expo-print and expo-sharing for PDF generation/export, expo-haptics for tactile feedback, expo-image-picker for potential image support

### Data Storage
- **Primary Storage (Current)**: AsyncStorage (`@react-native-async-storage/async-storage`) — all invoice data is stored locally on-device in `lib/storage.ts`. Invoices are stored as JSON arrays under specific keys (`ns_invoices`, `ns_invoice_counter`)
- **Database Schema (Prepared but not actively used for invoices)**: PostgreSQL via Drizzle ORM. The schema in `shared/schema.ts` currently only defines a `users` table. Drizzle config points to a `DATABASE_URL` environment variable
- **Server Storage**: `server/storage.ts` has an in-memory storage implementation (`MemStorage`) for users — this is a placeholder pattern ready to be replaced with database-backed storage

### Backend (Express)
- **Framework**: Express 5 running on the server side
- **Purpose**: Currently minimal — serves as a CORS-configured API server and serves static web builds in production. No invoice-related API routes are registered yet
- **Routes**: Defined in `server/routes.ts` — currently empty, ready for `/api` prefixed routes
- **CORS**: Configured to allow Replit domains and localhost origins for development
- **Build**: Server is built with esbuild for production (`server:build` script)

### Invoice Data Model
The core data type (`Invoice` in `lib/storage.ts`) includes:
- Invoice number (auto-incrementing, zero-padded to 4 digits)
- Invoice date, customer names, event date, event location, phone number
- Line items (description, quantity, price)
- Advance payment tracking with balance calculation

### PDF Generation
- `lib/pdf-generator.ts` generates styled HTML for invoices
- Uses `expo-print` to convert HTML to PDF
- Uses `expo-sharing` to share the generated PDF file
- HTML template includes Google Fonts for consistent styling in exported documents

### Build & Deployment
- Development: Expo dev server + Express server running concurrently
- Production: Static Expo web build served by Express (`scripts/build.js` handles the build process)
- The build script handles Replit-specific domain configuration

## External Dependencies

### Runtime Services
- **PostgreSQL Database**: Configured via `DATABASE_URL` environment variable, managed with Drizzle ORM and drizzle-kit for migrations. Currently only has a users table schema — invoice data lives in AsyncStorage
- **AsyncStorage**: Local device storage for all invoice data (no cloud sync)

### Key NPM Packages
- **expo** (~54.0.27): Core framework
- **expo-router** (~6.0.17): File-based navigation
- **expo-print** / **expo-sharing**: PDF generation and sharing
- **drizzle-orm** / **drizzle-zod**: Database ORM and validation (prepared for future use)
- **express** (^5.0.1): Backend API server
- **@tanstack/react-query**: Server-state management (configured but minimally used)
- **pg** (^8.16.3): PostgreSQL client

### Development Tools
- **drizzle-kit**: Database migration management (`db:push` script)
- **tsx**: TypeScript execution for development server
- **esbuild**: Server bundling for production
- **patch-package**: Post-install patching