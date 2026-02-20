# Design Guidelines: Chat-Driven Database Management System

## Design Approach
**Reference-Based Approach** inspired by modern technical tools: Linear (clean interface), Supabase (database UI), Retool (data manipulation), and ChatGPT (chat interface). Focus on clarity, efficiency, and data-first design.

## Core Design Principles
1. **Data Clarity**: Information hierarchy prioritizes database content and operations
2. **Professional Minimalism**: Clean, distraction-free interface for technical users
3. **Real-time Feedback**: Clear visual indicators for live updates and processing states
4. **Technical Precision**: Monospace fonts for code/data, clean tables, precise diagrams

---

## Typography

**Primary Font**: Inter (via Google Fonts CDN)
- Headers: 600 weight, sizes: text-3xl (h1), text-2xl (h2), text-xl (h3)
- Body: 400 weight, text-base
- UI Labels: 500 weight, text-sm

**Monospace Font**: JetBrains Mono (via Google Fonts CDN)
- SQL queries, code snippets, table names: text-sm
- Data values in tables: text-xs to text-sm
- ER diagram labels: text-xs

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 or p-6
- Section gaps: gap-4 or gap-6
- Page margins: p-6 or p-8
- Tight spacing (table cells): p-2

**Container Strategy**:
- Main content area: max-w-7xl mx-auto
- Chat interface: max-w-4xl
- Modals/forms: max-w-2xl

---

## Component Library

### Navigation
**Sidebar Navigation** (fixed left, 240px width):
- Logo/app name at top (h-16)
- Main nav items with icons: Database Explorer, Chat, ER Diagram, Charts, History
- Active state: subtle background, left border accent
- Icons: Heroicons outline (20px)

### Chat Interface
**Chat Container** (center-aligned, max-w-4xl):
- Message bubbles: User messages right-aligned, AI responses left-aligned with subtle background
- Input area: Fixed bottom, textarea with rounded-lg border, h-20 min-height
- Auto-expand on input, max-h-48
- Send button: Icon button (paper airplane) right-aligned
- Typing indicator: Three animated dots for AI processing

### Database Explorer
**Table View**:
- Data table: Full-width with alternating row backgrounds
- Headers: Sticky top, medium weight, border-bottom
- Cell padding: px-4 py-2
- Row hover state: subtle background change
- Action buttons per row: Edit, Delete icons (16px)

**Schema Selector**:
- Dropdown in top-right: w-64, rounded border
- Shows current database/schema name

### ER Diagram Page
**Canvas Area** (full-width, min-h-screen):
- Database selector: Top-right corner, w-56, absolute positioning
- Diagram canvas: SVG-based, pannable/zoomable
- Table nodes: Rounded rectangles with header (table name) and rows (columns)
- Relationship lines: Curved paths with cardinality labels
- Legend: Bottom-left corner, small reference for relationship types

### Chart Generation Page
**Two-Column Layout** (grid-cols-3):
- **Left Panel** (col-span-1): Configuration
  - Table selector dropdown
  - Column selectors (multi-select)
  - Chart type buttons: Bar, Line, Pie (icon + label)
  - Generate button: Primary, full-width
- **Right Panel** (col-span-2): Chart display
  - Canvas area with responsive chart
  - Export/download button top-right

### Document Upload
**Upload Zone** (drag-and-drop):
- Dashed border area, min-h-48, rounded-lg
- Center-aligned icon (cloud upload, 48px) and text
- File input hidden, click to browse
- Processing state: Progress bar, percentage, file name
- Success state: Preview of extracted tables, confirm button

### Forms & Inputs
- Text inputs: h-10, rounded border, px-4
- Textareas: min-h-24, rounded border, p-4
- Buttons: h-10, px-6, rounded, medium weight
- Primary buttons: Prominent for main actions
- Secondary buttons: Subtle for alternative actions
- Danger buttons: For delete operations

### Status Indicators
**Real-time Update Badge**: 
- Top-right of affected sections
- Small pulse animation when update occurs
- "Live" text with green dot indicator

**Loading States**:
- Skeleton loaders for tables (shimmer effect)
- Spinner for chat AI processing
- Progress bars for document upload/processing

### Modals & Overlays
- Backdrop: Semi-transparent overlay
- Modal container: max-w-2xl, rounded-lg, centered
- Header: Close button (X) top-right
- Content: p-6
- Footer: Action buttons right-aligned, gap-4

---

## Page Layouts

### Chat Interface (Main Page)
- Full-height layout with sidebar
- Chat messages: Scrollable area (flex-1)
- Input fixed at bottom
- Chat history accessible via sidebar link

### Database Explorer
- Sidebar + main content area
- Top bar: Database selector, search, filter controls
- Table grid below with pagination

### ER Diagram Viewer
- Full-screen canvas
- Database selector: Floating top-right (z-index high)
- Zoom controls: Bottom-right
- Minimal chrome, focus on diagram

### Chart Generator
- Sidebar + two-column content
- Configuration panel persistent left
- Chart display responsive right

---

## Interactions & States

**Hover States**:
- Table rows: Subtle background shift
- Buttons: Slight opacity or background change
- Nav items: Background highlight

**Active States**:
- Selected nav item: Background + border indicator
- Active input: Border emphasis
- Selected database: Checkmark in dropdown

**Disabled States**:
- Reduced opacity (opacity-50)
- Cursor not-allowed

**Real-time Updates**:
- Subtle flash animation on affected elements
- Toast notifications: Top-right, slide-in, auto-dismiss (5s)

---

## Icons
**Heroicons** (via CDN, outline style):
- Database: database icon
- Chat: chat-bubble-left-right
- Diagram: squares-2x2
- Charts: chart-bar
- Upload: cloud-arrow-up
- Edit: pencil
- Delete: trash
- Settings: cog-6-tooth

---

## Images
**No hero images** - this is a utility application focused on data and functionality. Interface is chrome-free where possible to maximize workspace for database content, diagrams, and charts.