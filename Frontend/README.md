# Secure Notes - Frontend Application

A lightweight, modern, and scalable Vanilla JavaScript Single Page Application (SPA) for managing notes, posts, and user administration. Built with **Tailwind CSS**, modular **ES6 JavaScript Modules**, and a custom **REST API client**.

---

## 🛠️ Tech Stack

- **JavaScript (ES6+)**: Native ES Modules for clean component separation.
- **HTML5 & CSS3**: Semantic UI structure.
- **Tailwind CSS**: Modern utility-first styling (Dark Theme / Neon Emerald scheme).
- **Fetch API**: Interfacing with the backend microservices/REST API.

---

## 📁 Project Structure

```text
frontend/
│
├── index.html              # Main HTML entry point (SPA container)
├── js/
│   ├── app.js              # Application entry, state management & routing
│   ├── api.js              # Centralized API service layer
│   └── modules/            # Isolated Feature Modules
│       ├── admin/          # Admin panel & grouped interest management
│       ├── notes/          # Personal notes CRUD logic
│       ├── profile/        # Profile logic
│       └── posts/          # Public feed/posts logic
└── README.md

```

---

## Getting Started & Setup

Follow these simple steps to set up and run the frontend application on your local machine.

### Prerequisites

Make sure you have one of the following installed:

* [Node.js](https://nodejs.org/) (Recommended v18+) **OR**
* Any local static web server (e.g., Live Server extension in VS Code)

---

### Installation & Running

#### Option 1: Using VS Code Live Server (Fastest)

1. Clone the repository to your local directory:
```bash
git clone <your-repository-url>
cd frontend

```


2. Open the project directory in **VS Code**.
3. Install the **Live Server** extension (`ms-vscode.live-server`) if you haven't already.
4. Right-click on `index.html` and click **"Open with Live Server"**.
5. The app will open automatically at `http://127.0.0.1:5500`.

---

#### Option 2: Using Node.js (`npx serve` / `http-server`)

Since the project uses native ES6 Modules (`import`/`export`), serving the file via the `file://` protocol in browsers will cause CORS issues. You need a local server.

1. Navigate to the project folder:
```bash
cd frontend

```


2. Run a simple static file server:
```bash
npx serve .

```


*or using `http-server`:*
```bash
npx http-server -p 3000

```


3. Open your browser and go to `http://localhost:3000`.

---

## ⚙️ Backend Integration Configuration

Ensure the backend server is running before interacting with dynamic features (Notes, Posts, Admin panel).

* By default, API requests are routed via `js/api.js`.
* Update the `BASE_URL` in `js/api.js` if your backend server runs on a custom port or domain:

```javascript
// frontend/js/api.js
const BASE_URL = 'http://localhost:5000/api';

```

---

## Features Included

* **Authentication**: Token-based user login & registration.
* **Notes Management**: Create, edit, list, and delete personal notes with tags.
* **Posts Feed**: Public dynamic feed with user attribution.
* **Admin Dashboard**:
* User list management with role assignment.
* Grouping and searching users by specific interests with custom pagination.
