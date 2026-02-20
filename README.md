# ChatDB - Conversational_Database_Assistant

ChatDB-Conversational_Database_Assistant is an intelligent database management and visualization tool that empowers you to interact with your data using natural language. Powered by Google's Gemini AI, it simplifies complex database operations, making data management accessible and efficient.

## 🚀 Features

-   **Natural Language to SQL**: Create, query, update, and delete database records using plain English commands.
-   **AI-Driven Data Extraction**: Automatically extract tabular data from **PDFs, Excel, CSVs, and Images** and convert them into database tables.
-   **Interactive Dashboard**:
    -   **Chat Interface**: Conversational UI for database interactions.
    -   **Database Explorer**: Browse and manage your databases and tables visually.
    -   **ER Diagrams**: Automatically generate Entity-Relationship diagrams to visualize your database schema.
    -   **Data Visualization**: Generate charts and graphs to gain insights from your data.
-   **Real-time Updates**: Live feedback on database changes via WebSockets.
-   **Chat History**: Review past interactions and commands.

## 🛠️ Tech Stack

-   **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/)
-   **Backend**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/)), [Drizzle ORM](https://orm.drizzle.team/)
-   **AI**: [Google Gemini API](https://ai.google.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chatdb-studio-ai.git
    cd chatdb-studio-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    DATABASE_URL=postgresql://user:password@host/dbname
    GEMINI_API_KEY=your_google_gemini_api_key
    ```

4.  **Push database schema:**
    ```bash
    npm run db:push
    ```

## 🏃‍♂️ Running the App

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## 📝 Usage Examples

### Natural Language Commands
-   **Create a table**: "Create a table named students with columns id, name, and email."
-   **Insert data**: "Insert into students values 1, John Doe, john@example.com."
-   **Query data**: "Show all students."
-   **Update data**: "Update students set name = 'Jane Doe' where id = 1."
-   **Delete data**: "Delete from students where id = 1."

### File Upload
Navigate to the upload section to drag and drop files (PDF, Excel, CSV, Images). The AI will process the file, identify tabular data, and propose a new table schema for import.

## 📜 Scripts

-   `npm run build`: Build the frontend and backend for production.
-   `npm run check`: Run TypeScript type checking.
-   `npm run start`: Start the production server.

## 📄 License

This project is licensed under the MIT License.
