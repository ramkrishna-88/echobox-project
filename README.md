# 📣 EchoBox

EchoBox is a campus community platform for sharing feedback, ideas, discussions, and campus moments. Students and staff can react to and discuss posts, while administrators can respond to feedback and review reports.

## ✨ What you can do

- 👤 Create an account with campus details and choose how each post is attributed: anonymously, with a campus alias, or with your profile.
- 📝 Publish feedback, ideas, discussions, and campus moments, with optional images, topics, and polls.
- 💬 Vote, comment, save posts, follow topics, and receive in-app notifications.
- 📈 Track progress and public updates on actionable feedback and ideas.
- 🛡️ Use admin tools to manage posts, respond to feedback, view activity, and review reports.
- 🎨 Browse a responsive interface with feed filters, sorting, and light or dark themes.

## 🧰 Tech stack

| Area | Technologies |
| --- | --- |
| 🖥️ Frontend | React, Vite, React Router, Axios |
| ⚙️ Backend | Node.js, Express, Mongoose |
| 🗄️ Database | MongoDB |
| 🚀 Deployment | Docker Compose, Nginx |

## 🐳 Run with Docker Compose

Docker Compose starts MongoDB, the API, and the production frontend. From the project root:

1. 📄 Create the environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. 🔐 Edit `.env`. Set `JWT_SECRET` to a private random value of at least 32 bytes and choose a strong `ADMIN_PASSWORD` (at least 8 characters).
3. ▶️ Build and start the app:

   ```bash
   docker compose up --build
   ```

🌐 Open [http://localhost:8080](http://localhost:8080). The API is available at `http://localhost:5000/api`, and its health check is `http://localhost:5000/api/health`.

⏹️ Stop the services with `docker compose down`. MongoDB data remains in the `mongo_data` volume. To remove the database volume as well, run `docker compose down --volumes`.

The admin account is created on the first backend startup. Changing `ADMIN_PASSWORD` later does not change an existing account's password. Starter feedback is inserted only when the posts collection is empty.

## 💻 Run locally

### 📋 Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running locally or a MongoDB connection string

### 🔧 Configure and install

In PowerShell, create the backend environment file and install dependencies:

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
npm install
```

Edit `backend/.env` and set `MONGO_URI`, `JWT_SECRET` (a private random value of at least 32 bytes), and `ADMIN_PASSWORD` (at least 8 characters). The example URI points to a local MongoDB database.

Install the frontend dependencies in a second terminal, from the project root:

```powershell
cd frontend
npm install
```

### ▶️ Start the app

Start the backend from the `backend` directory:

```bash
npm start
```

Then, in another terminal, start the frontend from the `frontend` directory:

```bash
npm run dev
```

🌐 Open the URL printed by Vite, usually [http://localhost:5173](http://localhost:5173). Vite forwards `/api` requests to `http://localhost:5000` by default. Set `VITE_BACKEND_URL` in `frontend/.env` to use a different backend for the Vite proxy. For a separately hosted API, set `VITE_API_URL` to its API base URL and include the frontend origin in the backend's `CORS_ORIGINS`.

On startup, the backend connects to MongoDB, applies legacy data migrations, creates the admin account if needed, and seeds starter feedback if there are no posts. In local development only, if `ADMIN_PASSWORD` is unset, the admin password defaults to `password`; set your own value before using the app. If `JWT_SECRET` is unset, a temporary secret is generated and existing sessions expire when the backend restarts. Production requires `JWT_SECRET` and `ADMIN_PASSWORD`.

## 🧪 Useful commands

Run each command from its package directory.

| Directory | Command | Purpose |
| --- | --- | --- |
| `frontend` | `npm run dev` | ▶️ Start the Vite development server |
| `frontend` | `npm run build` | 📦 Create a production build |
| `frontend` | `npm run preview` | 🔍 Preview the production build |
| `frontend` | `npm run lint` | ✅ Run ESLint |
| `backend` | `npm start` | 🚀 Start the API server |
| `backend` | `npm test` | 🧪 Run backend validation tests |

## 🗂️ Project layout

```text
EchoBox/
├── backend/
│   ├── models/          # Mongoose models
│   ├── middleware/      # Authentication and authorization
│   ├── routes/          # API routes
│   ├── test/            # Backend tests
│   └── server.js        # Express entry point
├── frontend/
│   └── src/             # React application
├── compose.yaml
└── README.md
```
