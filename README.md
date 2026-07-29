# Secure-Notes & Content API

A high-performance, containerized RESTful API built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**. It features secure JWT authentication, Role-Based Access Control (RBAC), interest-based query filtering, custom pagination, and complete Docker Compose containerization.

---

## Features

- **Authentication & RBAC**: JWT Bearer token authentication with role-based access (`requireAuth`, `requireRole('admin')`).
- **Performance Optimized**: Optimized MongoDB queries and aggregation pipelines (`$lookup`, `$facet`) with paginated responses (`page`, `limit`).
- **Note Management**: Complete CRUD operations for private user notes.
- **User & Interest Aggregation**: Admin-only endpoints to manage users and filter/group users by specific technical interests.
- **Post Feed**: Feed operations linked to author profiles.
- **Dockerized Architecture**: One-command local development setup using Docker Compose with persistent MongoDB storage.

---

## Tech Stack

- **Runtime Environment**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ORM
- **Containerization**: Docker & Docker Compose
- **Authentication**: JSON Web Tokens (JWT) & bcrypt

---

## Project Structure

```text

├── src/
│   ├── config/          # Database & environment configurations
│   ├── controllers/     # Request handlers & route logic
│   │   ├── authController.js
│   │   ├── noteController.js
│   │   ├── postController.js
│   │   └── userController.js
│   ├── middleware/      # JWT Auth & Role verification middlewares
│   │   ├── auth.js
│   │   └── role.js
│   ├── models/          # Schemas & database indexes
│   │   ├── userModel.js
│   │   ├── noteModel.js
│   │   └── postModel.js
│   ├── routes/          # Express route definitions
│   │   ├── authRoutes.js
│   │   ├── noteRoutes.js
│   │   ├── postRoutes.js
│   │   └── userRoutes.js
│   └── server.js        # Application entry point
├── .env                 # Environment template           
└── docker-compose.yml   # Multi-container orchestrator

```

---

## Environment Variables

Create a `.env` file in the root directory and add the following configuration:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://mongo:27017/secure_notes_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS = 10

```

---

## How to Run the Project

### Running with Docker Compose (Recommended)

1. **Clone the repository:**
```bash
git clone [https://github.com/mirajHossen99/Secure-note-taking-app.git](https://github.com/mirajHossen99/Secure-note-taking-app.git)
cd Secure-note-taking-app

```


2. **Setup environment file:**
```bash
cp .env

```


3. **Build and start containers:**
```bash
docker-compose up -d --build

```

**or**

**Start containers:**
```bash
docker-compose up -d

```

The API will be available at `http://localhost:5000`.

---

### Running Locally

1. **Install dependencies:**
```bash
npm install

```


2. **Configure `.env` for local MongoDB:**
Update `MONGO_URI` in `.env` to point to your local MongoDB instance:
```env
MONGO_URI=mongodb://localhost:27017/secure_notes_db

```


3. **Start the development server:**
```bash
npm run dev

```


---

## 📌 API Reference & Endpoints

All protected endpoints require a Bearer token in the header:

`Authorization: Bearer <your_jwt_token>`

### 🏥 System Health

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Verify server health status |

---

### 🔑 Auth Module (`/api/auth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Login and receive JWT token |
| `GET` | `/api/auth/me` | Protected | Get logged-in user profile |

**Register Sample Payload:**

```json
{
  "name": "Miraj Hossen",
  "email": "miraj@example.com",
  "password": "password123",
  "interests": ["Node.js", "NestJS", "MongoDB", "System Design"]
}

```

---

### 📝 Notes Module (`/api/notes`)

> Requires Authentication (`requireAuth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/notes` | Protected | Create a new note |
| `GET` | `/api/notes` | Protected | Fetch paginated notes (`?page=1&limit=5`) |
| `GET` | `/api/notes/:id` | Protected | Get note details by ID |
| `PATCH` | `/api/notes/:id` | Protected | Update note fields |
| `DELETE` | `/api/notes/:id` | Protected | Remove a note |

---

### 👥 User Management Module (`/api/users`)

> Requires Admin Privileges (`requireRole('admin')`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/users` | Admin | Get list of all registered users |
| `GET` | `/api/users/grouped-by-interest` | Admin | Filter users by interest (`?interest=backend&interest=mongodb`) |
| `GET` | `/api/users/:id` | Admin | Get specific user by ID |
| `POST` | `/api/users` | Admin | Directly create a user |
| `PATCH` | `/api/users/:id` | Admin | Update user information |
| `DELETE` | `/api/users/:id` | Admin | Delete a user |

---

### 📰 Posts Module (`/api/posts`)

> Requires Authentication (`requireAuth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/posts` | Protected | List all posts |
| `GET` | `/api/posts/user/:userId` | Protected | Get posts created by a specific user |
| `POST` | `/api/posts` | Protected | Create a new post |
| `DELETE` | `/api/posts/:id` | Protected | Delete post (Author or Admin) |

---

## 📜 Docker Management Commands

* **Stream Live Logs:**
```bash
docker-compose logs -f app

```


* **Stop Containers:**
```bash
docker-compose stop

```


* **Down Containers & Networks:**
```bash
docker-compose down

```


* **Purge Containers & Database Volumes:**
```bash
docker-compose down -v

```

---
---

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
