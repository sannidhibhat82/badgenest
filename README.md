# BadgeNest

A local-first digital badge platform: admins create and issue badges, learners view and share them, and anyone can verify badges via public URLs.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes (Node.js)
- **Database**: Microsoft SQL Server (MSSQL)
- **Auth**: JWT (email/password, no cloud auth)

## Prerequisites

- Node.js 18+
- Microsoft SQL Server (local or remote instance)
- npm or yarn

## Setup

### 1. Install dependencies

From the project root (badgenest folder):

```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure environment

**Frontend** (optional; defaults work for local dev):

- Copy `.env.example` to `.env` if you need to change the API URL.
- Default: `VITE_API_URL=http://localhost:3001`

**Backend**:

- Copy `backend/.env.example` to `backend/.env`.
- Set your SQL Server connection and JWT secret:

```env
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=yourpassword
DB_DATABASE=badgenest
JWT_SECRET=your-random-secret-at-least-32-chars
```

### 3. Local database (MSSQL)

Install **Microsoft SQL Server** locally (e.g. [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) on Windows, or SQL Server for Linux/macOS). Ensure the server is running and reachable at `DB_SERVER` / `DB_PORT` (default `localhost:1433`).

Then from the `badgenest` folder:

```bash
cd backend
cp .env.example .env   # edit .env with your DB password
npm run db:setup       # creates database and runs schema
```

`db:setup` creates the `badgenest` database if it doesn’t exist and applies `database/schema.sql`. Alternatively, create the database yourself and run `backend/database/schema.sql` in sqlcmd or SSMS.

### 4. Run the project

**Option A – Frontend and backend together (recommended for local dev):**

```bash
npm run dev:all
```

- Frontend: http://localhost:8080  
- Backend API: http://localhost:3001  

**Option B – Run separately:**

- Terminal 1 (frontend): `npm run dev`
- Terminal 2 (backend): `npm run dev:backend`

### 5. First admin user

1. Sign up a user via the app (http://localhost:8080/signup).
2. Promote them to admin by inserting into the database:

```sql
INSERT INTO user_roles (user_id, role) VALUES ('<your-user-id>', 'admin');
```

(Get the user id from the `users` table after signup.)

## Project structure

```
badgenest/
├── src/                 # React frontend (Vite)
├── public/
├── backend/             # Next.js API
│   ├── pages/api/        # API routes (auth, data, admin, etc.)
│   ├── database/         # DB connection + schema.sql
│   └── lib/              # Auth helpers
├── .env                  # Frontend env (VITE_API_URL)
├── backend/.env          # Backend env (DB_*, JWT_SECRET)
└── package.json
```

## API overview

- `POST /api/auth/login` – Login (email/password)
- `POST /api/auth/signup` – Sign up
- `GET /api/auth/session` – Current user + profile + roles (Bearer token)
- `PATCH /api/auth/update-password` – Change password
- `GET /api/users/me`, `PATCH /api/users/me` – Profile
- `GET /api/data/assertions` – My assertions (learner)
- `GET/POST /api/data/issuers`, `PATCH/DELETE /api/data/issuers/[id]`
- `GET/POST /api/data/badge-classes`, `PATCH/DELETE /api/data/badge-classes/[id]`
- `GET /api/verify/[assertionId]` – Public verification
- `GET /api/invites/[token]`, `POST /api/invites/claim`
- `GET /api/notifications`, `PATCH /api/notifications`
- Admin: `/api/admin/dashboard-stats`, `/api/admin/assertions`, `/api/admin/learners`, `/api/admin/audit-logs`, `/api/admin/webhooks`, `/api/admin/api-keys`
- `POST /api/upload?bucket=avatars|badge-images|issuer-logos` – File upload (base64 in body)

## Build

```bash
npm run build
```

Backend (optional standalone):

```bash
cd backend && npm run build && npm run start
```

## License

Private / use as needed.
