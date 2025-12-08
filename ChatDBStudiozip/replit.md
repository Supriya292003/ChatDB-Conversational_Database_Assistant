# ChatDB Studio

## Overview

ChatDB Studio is a chat-driven database management system that allows users to create, manage, and visualize databases using natural language commands. The application combines a conversational AI interface (powered by Google Gemini) with traditional database management tools, including an ER diagram editor, data explorer, and chart generator.

The system interprets natural language commands like "create a table student with id, name, email" and translates them into database operations. It provides real-time feedback through WebSocket connections and maintains a complete chat history for audit and reference purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**
- React-based SPA with Wouter for client-side routing
- TypeScript for type safety across the entire codebase
- Vite as the build tool and development server
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library following the "New York" style variant
- Tailwind CSS for styling with custom design tokens
- Class Variance Authority (CVA) for component variant management

**Design Principles**
- Professional minimalism inspired by Linear, Supabase, and ChatGPT
- Clean, distraction-free interface for technical users
- Real-time feedback with WebSocket-driven updates
- Inter font for UI elements, JetBrains Mono for code/data
- Responsive layout with sidebar navigation pattern

**State Management Strategy**
- Server state managed through React Query with aggressive caching
- WebSocket subscriptions for real-time database changes
- Local component state for UI interactions (forms, modals, expanding/collapsing sections)
- No global client-side state management library needed

### Backend Architecture

**Server Framework**
- Express.js for HTTP API and middleware
- WebSocket server for real-time bidirectional communication
- FileStorage implementation with JSON-based persistence (saves to data/ directory)
- Data survives app restarts and deployments

**API Design**
- RESTful endpoints for CRUD operations on databases, tables, and rows
- POST /api/chat/message for natural language command processing
- WebSocket broadcasts for real-time updates to all connected clients
- Structured JSON responses with consistent error handling

**Natural Language Processing**
- Google Gemini AI for parsing user commands into database operations
- Pattern matching for greetings and conversational responses
- Command extraction for: CREATE DATABASE, CREATE TABLE, INSERT, UPDATE, DELETE, SHOW operations
- Fallback to AI-powered interpretation for complex queries

**Database Layer**
- Drizzle ORM with PostgreSQL dialect (Neon serverless driver)
- Schema-first approach with Zod validation
- Five core tables: chat_messages, databases, database_tables, table_rows, uploaded_documents
- JSON columns for flexible schema storage (table columns, positions, row data)

### Data Storage Solutions

**Database Schema Design**
- `databases`: Container entities for logical grouping of tables
- `database_tables`: Stores table metadata including dynamic column definitions as JSON
- `tableRows`: Stores actual row data as JSON objects for schema flexibility
- `chatMessages`: Complete conversation history with role-based messages
- `uploadedDocuments`: Document storage with extracted table metadata

**Schema Flexibility Rationale**
- JSON-based column definitions allow users to create arbitrary table structures at runtime
- Avoids DDL operations for user-defined tables (no actual table creation)
- Simplifies permissions and security model
- Enables easy export/import and version control of schemas

**Drizzle Configuration**
- Configured for PostgreSQL with Neon's serverless driver
- WebSocket support for serverless environments
- Migrations stored in `/migrations` directory
- Connection pooling through Neon's Pool implementation

### External Dependencies

**AI Services**
- **Google Gemini API**: Natural language understanding and command parsing
  - API key required via `GEMINI_API_KEY` environment variable
  - Processes user chat messages into structured database operations
  - Generates conversational responses

**Database Services**
- **Neon Serverless PostgreSQL**: Primary database
  - Connection string via `DATABASE_URL` environment variable
  - Serverless architecture with WebSocket support
  - Connection pooling for efficient resource usage

**Third-Party Libraries**
- **Radix UI**: Accessible component primitives (@radix-ui/* packages)
- **Recharts**: Chart visualization library for data analytics
- **date-fns**: Date manipulation and formatting
- **Zod**: Runtime type validation and schema definition
- **ws**: WebSocket implementation for Node.js
- **wouter**: Lightweight routing for React

**Development Tools**
- **Replit Integration**: Development environment plugins for error overlay, cartographer, and dev banner
- **TypeScript**: Full type coverage across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Vite**: Development server with HMR

**Design Resources**
- **Google Fonts CDN**: Inter (UI), JetBrains Mono (code), DM Sans, Fira Code, Geist Mono
- Custom design tokens defined in Tailwind configuration
- shadcn/ui component patterns