# Employee Management System — Full Stack

A complete HR tool: Node/Express API + JSON file database on the backend, React (Vite + Tailwind) on the frontend.

## What's new vs. the front-end-only version

- **Real backend** — Express API with a JSON file database (`lowdb`), no external DB server needed.
- **Authentication** — JWT login with two roles: `admin` (full access) and `viewer` (read-only).
- **Departments module** — create, rename, recolor, and delete departments; employee counts per department.
- **Dashboard** — headcount stats, a bar chart by department, a status pie chart, and a hiring-trend line chart (via Recharts).
- **Search, filter, sort & pagination** — all handled server-side.
- **Avatar upload** — attach a photo to an employee record (stored on disk, served statically).
- **CSV export** — download the full roster as a `.csv`.
- **Activity log** — an audit trail of every add/update/delete, who did it, and when.
- **Auto-generated employee codes** per department (e.g. `ENG-0007`), same as before.

## Project structure

```
ems-fullstack/
├── server/                  Express API
│   ├── server.js
│   ├── db.js                 JSON-file DB + seed data
│   ├── middleware/auth.js    JWT auth + role checks
│   ├── routes/                auth, employees, departments, dashboard
│   └── uploads/               employee avatar images (created at runtime)
└── client/                  React (Vite) app
    └── src/
        ├── api/client.js     fetch wrapper (auth headers, JSON, errors)
        ├── context/           AuthContext, ToastContext
        ├── components/        Layout, EmployeeModal, DeleteModal
        └── pages/              Login, Dashboard, Employees, Departments, Activity
```

## Running it locally

You need two terminals (or run them in the background).

**1. Start the API:**
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The API runs at `http://localhost:4000`. Data is stored in `server/data.json`, created automatically on first run with seed data.

**2. Start the frontend:**
```bash
cd client
npm install
npm run dev
```
The app runs at `http://localhost:5173` and proxies `/api` and `/uploads` requests to the backend (see `client/vite.config.js`).

## Demo accounts

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Admin  | admin@corvid.io    | admin123   |
| Viewer | viewer@corvid.io   | viewer123  |

Admins can add/edit/delete employees and departments and upload avatars. Viewers can browse, search, and export, but can't make changes.

## Building for production

```bash
cd client && npm run build   # outputs client/dist
cd server && npm start        # serve the API; point a static host or Express at client/dist if you want one deployable unit
```

For a single deployable app, you can add `app.use(express.static("../client/dist"))` to `server/server.js` and serve the built frontend from the same Express process.

## Notes & next steps

- The database is a single JSON file (`server/data.json`) — fine for demos and small teams, but swap in Postgres/MongoDB for production use.
- `JWT_SECRET` in `server/.env` is a placeholder — replace it with a long random string before deploying anywhere real.
- Passwords are hashed with bcrypt; there's no self-service signup, since HR tools are normally provisioned by an admin.
