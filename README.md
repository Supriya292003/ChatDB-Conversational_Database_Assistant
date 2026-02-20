<div align="center">

# 🤖 ChatDB-Conversational_Database_Assistant
### Natural Language Database Management & Visualization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.0-339933.svg)](https://nodejs.org/)

**ChatDB-Conversational_Database_Assistant** empowers you to interact with your data using *natural language*. Powered by **Google Gemini AI**, it transforms complex database operations into simple conversational commands.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage-examples)

</div>

---

## ✨ Features

<table>
<tr>
<td>

### 🗣️ Natural Language to SQL
Interact with your database like a human. Create, query, update, and delete records using plain English.
*   _"Create table table_name"_
*   _"Show all table"_

</td>
<td>

### 📄 AI Document Processing
Automatically extract tabular data from various formats and convert them into database tables instantly.
*   **Supported:** PDF, Excel, CSV, Images

</td>
</tr>
<tr>
<td>

### 📊 Interactive Dashboard
A rich visual interface to manage your data:
*   **Database Explorer**: Browse tables & schemas.
*   **ER Diagrams**: Auto-generated schema visualizations.
*   **Charts**: Instant data visualization.

</td>
<td>

### ⚡ Real-time & WebSocket
Experience live feedback. Changes are reflected instantly across all connected clients via WebSockets.

</td>
</tr>
</table>

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) | Interactive UI with Shadcn & Radix UI |
| **Backend** | ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) | Robust Express server |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-336791?logo=postgresql&logoColor=white) | Scalable data storage via Neon & Drizzle ORM |
| **AI Engine** | ![Gemini](https://img.shields.io/badge/-Google%20Gemini-8E75B2?logo=google&logoColor=white) | Intelligent query processing |
| **Styling** | ![Tailwind](https://img.shields.io/badge/-Tailwind-38B2AC?logo=tailwindcss&logoColor=white) | Modern, responsive design |

## 📦 Installation

Get up and running in minutes!

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/chatdb-studio-ai.git
    cd chatdb-studio-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL=postgresql://user:password@host/dbname
    GEMINI_API_KEY=your_google_gemini_api_key
    ```
    > **Note:** Get your API key from [Google AI Studio](https://aistudio.google.com/).

4.  **Sync Database**
    ```bash
    npm run db:push
    ```

## 🚀 Running the App

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5000` to start chatting with your database!

## 📝 Usage Examples

<details>
<summary><b>Click to see Natural Language Commands</b></summary>

| Action | Command Example |
| :--- | :--- |
| **Create Table** | _"Create table student with id, name, email, department in database college."_ |
| **Insert Data** | _"Insert into student values 1, John Doe, john@example.com."_ |
| **Query** | _"Show student table"_ |
| **Update** | _"Update student set name = 'Jane' where id = 1."_ |
| **Delete** | _"Delete from student where id = 1."_ |

</details>

<details>
<summary><b>Click to see File Upload Instructions</b></summary>

1.  Navigate to the **Upload** tab in the dashboard.
2.  Drag and drop your file (** Excel or CSV**).
3.  The AI will analyze the file and propose a table schema.
4.  Confirm to import the data directly into your database.

</details>

## 📜 Scripts

| Script | Description |
| :--- | :--- |
| `npm run build` | Build for production |
| `npm run check` | Run TypeScript validation |
| `npm run start` | Start production server |

---

<div align="center">

Made with ❤️ using **TypeScript** and **Generative AI**

</div>
