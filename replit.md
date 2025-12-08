# ChatDB Studio

## Overview

ChatDB Studio is a chat-driven database management system that allows users to create, manage, and visualize databases using natural language commands. The application combines conversational AI with traditional database management tools, enabling users to interact with databases through a chat interface while also providing visual tools for data exploration, ER diagrams, and charting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React-based single-page application (SPA) with TypeScript for type safety
- Wouter for lightweight client-side routing
- Vite as the build tool and development server with custom Replit plugins
- TanStack Query (React Query) for server state management with aggressive caching strategy

**UI Component System**
- Radix UI primitives providing accessible, unstyled component foundation
- shadcn/ui component library following the "New York" style variant
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for managing component variants
- Custom color system with CSS variables for light/dark mode support

**Design Philosophy**
- Professional minimalism inspired by Linear, Supabase, and ChatGPT interfaces
- Clean, distraction-free interface optimized for technical users
- Typography: Inter for UI elements, JetBrains Mono/Geist Mono for code and data
- Responsive layout with persistent sidebar navigation pattern
- Real-time feedback through WebSocket-driven updates

**State Management Strategy**
- Server state managed through React Query with no refetching on window focus
- WebSocket subscriptions for real-time database changes and chat updates
- Local component state for UI interactions (forms, modals, expand/collapse)
- No global client-side state management library required

### Backend Architecture

**Server Framework & Runtime**
- Express.js HTTP server with TypeScript
- WebSocket server (ws library) for bidirectional real-time communication
- File-based storage implementation using JSON persistence in `data/` directory
- Data persists across app restarts and redeployments

**API Design Pattern**
- RESTful HTTP endpoints for CRUD operations on sessions, databases, tables, and rows
- WebSocket broadcasting for real-time updates to all connected clients
- Multer middleware for file upload handling (PDFs, Excel, CSV, images)
- Structured error handling with meaningful HTTP status codes

**Data Storage Architecture**
- JSON file-based storage with separate files for each entity type:
  - `sessions.json` - Chat sessions
  - `messages.json` - Chat message history
  - `databases.json` - Database metadata
  - `tables.json` - Table schemas with column definitions
  - `rows.json` - Table row data
  - `documents.json` - Uploaded document metadata
- FileStorage class implementing IStorage interface for abstraction
- In-memory caching with periodic file system writes
- UUID-based primary keys for all entities

**Natural Language Processing**
- Google Generative AI (Gemini) integration for natural language command interpretation
- Custom prompt engineering for database operation extraction
- Pattern matching for common database commands (create table, insert row, etc.)
- Context-aware responses with markdown formatting

**Document Processing Pipeline**
- Excel/CSV parsing using xlsx library with automatic column type inference
- PDF text extraction using pdf-parse library
- Image analysis through Gemini Vision API
- Automatic table structure detection and schema generation
- Type inference: integer, text, date based on content analysis

### Database Schema Design

**Schema-Agnostic Storage**
- Dynamic table schemas stored as JSON column definitions
- Column metadata includes: name, type, nullable, isPrimaryKey, foreign key references
- Support for basic data types: text, integer, date, boolean
- Foreign key relationships tracked for ER diagram generation
- Position data for visual ER diagram layout persistence

**Entity Relationship Structure**
- Databases contain multiple tables
- Tables contain column definitions and reference parent database
- Rows store arbitrary JSON data matching table schema
- Chat sessions can be associated with specific databases
- Documents link to extracted table structures

## External Dependencies

### Third-Party Services

**Google Generative AI (Gemini)**
- Purpose: Natural language processing and command interpretation
- API Key: Required via `GEMINI_API_KEY` environment variable
- Usage: Chat responses, SQL generation, document analysis, image understanding
- Integration: `@google/genai` npm package

**Neon Database (PostgreSQL)**
- Purpose: Production database backend (configured but optional with FileStorage)
- Connection: Required via `DATABASE_URL` environment variable
- Driver: `@neondatabase/serverless` with WebSocket support for serverless environments
- ORM: Drizzle ORM for type-safe database operations
- Note: Application currently uses FileStorage, but PostgreSQL schema is defined and ready

### Core Libraries

**Data Processing**
- `xlsx` - Excel and CSV file parsing with sheet extraction
- `pdf-parse` - PDF text extraction and content analysis
- `multer` - Multipart form data handling for file uploads

**Real-Time Communication**
- `ws` - WebSocket server implementation
- Custom broadcasting mechanism to all connected clients

**UI Framework**
- React 18 with hooks-based architecture
- Extensive Radix UI component library for accessibility
- Recharts for data visualization (bar, line, pie charts)
- date-fns for date formatting and manipulation

**Development Tools**
- Drizzle Kit for database migrations and schema management
- ESBuild for server bundle optimization
- TypeScript compiler for type checking
- Replit-specific plugins for development environment integration

### Database Configuration

**Drizzle ORM Setup**
- Schema definition in `shared/schema.ts` with Zod validation
- PostgreSQL dialect configuration
- Migration output directory: `./migrations`
- Connection pooling via Neon serverless driver

**Dual Storage Strategy**
- FileStorage: Current active implementation using JSON files
- PostgreSQL: Schema defined and ready for production deployment
- Storage abstraction through IStorage interface allows seamless switching