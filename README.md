# BadgeNest

Production-oriented monorepo: **React + Vite** (`client/`), **Node + Express + Prisma** (`server/`), **Microsoft SQL Server**.

## Stack (verified)

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite 5, TypeScript        |
| Backend  | Node.js, Express 4, Prisma ORM      |
| Database | Microsoft SQL Server                |

**Previous state:** the backend lived under `backend/` as **Next.js API routes** with the **`mssql`** driver (no Prisma). That stack has been **migrated** to Express + Prisma while keeping the same REST paths under `/api/*` and the same SQL schema (see `server/database/schema.sql`).

## Repository layout

```
├── client/                 # React + Vite SPA
├── server/                 # Express API + Prisma
│   ├── prisma/schema.prisma
│   ├── database/schema.sql # Canonical T-SQL (optional if using prisma db push)
│   ├── src/                # routes, controllers, services, middleware, config
│   └── web.config          # IIS reverse-proxy example
├── .env.example            # All configuration (root)
├── package.json            # npm workspaces + root scripts
└── README.md
```

## Prerequisites

- Node.js 20+
- SQL Server (local or remote) reachable from the API host
- npm 9+

## Local development with SQL Server in Docker (step by step)

1. **Run SQL Server** (example — one container named `badgenest-mssql` on port `1433`):

   ```bash
   docker run -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=YourStrong!Password" -p 1433:1433 --name badgenest-mssql -d mcr.microsoft.com/mssql/server:2019-latest
   ```

   Use a strong password and remember it for `DATABASE_URL`. To read the password from an existing container:

   ```bash
   docker inspect badgenest-mssql --format '{{range .Config.Env}}{{println .}}{{end}}' | grep MSSQL_SA_PASSWORD
   ```

2. **Create the database** (once):

   ```bash
   docker exec badgenest-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Password' -C \
     -Q "IF DB_ID('badgenest') IS NULL CREATE DATABASE badgenest"
   ```

   (If `sqlcmd` is under `/opt/mssql-tools/bin/` in your image, use that path instead.)

3. **Configure `.env` at the repo root** — copy `.env.example` → `.env` and set:

   - **`DATABASE_URL`** — use the **semicolon** form and wrap the **entire** value in **double quotes** so `;` inside the URL is not treated as multiple variables by dotenv:

     ```env
     DATABASE_URL="sqlserver://localhost:1433;database=badgenest;user=sa;password=YourStrong!Password;encrypt=true;trustServerCertificate=true"
     ```

     Special characters (e.g. `!`) are fine **inside** the quoted string.

   - **`JWT_SECRET`**, **`FRONTEND_URL`**, **`BACKEND_URL`**, **`VITE_API_URL`**, **`ADMIN_BOOTSTRAP_SECRET`** — see `.env.example`.

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Apply schema** (pick one):

   - **Prisma (recommended for an empty DB):** from repo root:

     ```bash
     npm run db:push
     ```

     If you previously applied `server/database/schema.sql` and Prisma warns about `NVarChar(Max)` vs `NVarChar(4000)`, run:

     ```bash
     cd server && npx dotenv -e ../.env --override -- prisma db push --accept-data-loss
     ```

   - **SQL script only:** run `server/database/schema.sql` in SSMS / `sqlcmd`, then run `npm run prisma:generate -w badgenest-server`.

6. **Start app:**

   ```bash
   npm run dev
   ```

7. **Open in the browser:**

   - App: [http://localhost:8080](http://localhost:8080)
   - API docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
   - Health: [http://localhost:3001/health](http://localhost:3001/health)

## Quick start (development)

1. Copy `.env.example` to `.env` at the **repository root** and set at least:

   - `DATABASE_URL` (quoted semicolon form — see above)
   - `JWT_SECRET` (use 32+ random characters; enforced in production)
   - `FRONTEND_URL` (e.g. `http://localhost:8080`)
   - `BACKEND_URL` (e.g. `http://localhost:3001`)
   - `VITE_API_URL` (same origin as the API for the browser, e.g. `http://localhost:3001`)

2. Create the database and schema (pick one):

   - **Option A — SQL script:** run `server/database/schema.sql` in SSMS or `sqlcmd` against your database.
   - **Option B — Prisma:** from repo root, `npm run db:push` (empty database; Prisma creates tables from `schema.prisma`).

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   - Client: `http://localhost:8080` (Vite)
   - API: `http://localhost:3001` (Express)

4. OpenAPI UI: `http://localhost:3001/api/docs` (or via the API host you configured).

## Environment variables

All configuration is driven from **root** `.env` (Vite loads `VITE_*` from the parent folder via `client/vite.config.ts`; the server loads `../.env` from `server/` when started with cwd `server/`).

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | no (default `3001`) | API listen port |
| `DATABASE_URL` | yes | Prisma SQL Server connection string |
| `JWT_SECRET` | yes | JWT signing secret (min 32 chars in `NODE_ENV=production`) |
| `FRONTEND_URL` | yes | CORS origin (exact URL) |
| `BACKEND_URL` | yes | Public API base URL (email verification links) |
| `ADMIN_BOOTSTRAP_SECRET` | for first admin | Bootstrap header `x-bootstrap-secret` when no admin exists |
| `UPLOAD_DIR` | no | Absolute path for uploads (default `server/public/uploads`) |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | no | SMTP; if incomplete, email verification is disabled |
| `EMAIL_SECURE` | no | `true` for TLS-only SMTP |
| `VITE_API_URL` | prod build | Browser-facing API origin (no trailing path) |

Example `DATABASE_URL` (quoted semicolon form — avoids dotenv splitting on `;`):

```text
DATABASE_URL="sqlserver://localhost:1433;database=badgenest;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true"
```

Alternate URL form (`user:password@host`) also works; URL-encode special characters in the password if you use that style.

## Admin setup

1. Register a normal user via the UI (signup).
2. **First admin (no admin in DB yet):**  
   `POST /api/admin/promote` with JSON `{ "email": "you@example.com" }` and header `x-bootstrap-secret: <ADMIN_BOOTSTRAP_SECRET>`.
3. **Further admins:** same endpoint with a valid **admin** JWT (Bearer).

CLI alternative (uses root `.env`):

```bash
npm run seed:admin -- you@example.com
```

## Production build

```bash
# Set VITE_API_URL in .env to your public API URL before building the client
npm run build
npm run start
```

`start` runs `node server/dist/server.js` (build `server` first via the same `npm run build`).

## Linux server install + domain + Certbot (HTTPS)

Use this when deploying to a Linux VM (Ubuntu/Debian) with your own domain.

1. **Install system packages**

   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx git curl
   ```

2. **Install Node.js 20 LTS**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   node -v
   npm -v
   ```

3. **Deploy app code**

   ```bash
   sudo mkdir -p /var/www/badgenest
   sudo chown -R $USER:$USER /var/www/badgenest
   git clone <your-repo-url> /var/www/badgenest
   cd /var/www/badgenest
   npm install
   ```

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env and set:
   # DATABASE_URL, JWT_SECRET, FRONTEND_URL, BACKEND_URL, VITE_API_URL, ADMIN_BOOTSTRAP_SECRET
   ```

5. **Build app and prepare database**

   ```bash
   npm run db:push
   npm run build
   ```

6. **Run API as a service (systemd)**

   Create `/etc/systemd/system/badgenest-api.service`:

   ```ini
   [Unit]
   Description=BadgeNest API
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/badgenest
   ExecStart=/usr/bin/npm run start
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

   Then enable/start:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable badgenest-api
   sudo systemctl start badgenest-api
   sudo systemctl status badgenest-api
   ```

7. **Point domain DNS**

   Create `A` records at your DNS provider, e.g.:
   - `@` -> `<your-server-public-ip>`
   - `www` -> `<your-server-public-ip>`

8. **Configure Nginx reverse proxy + static frontend**

   Create `/etc/nginx/sites-available/badgenest`:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       root /var/www/badgenest/client/dist;
       index index.html;

       # Frontend SPA
       location / {
           try_files $uri /index.html;
       }

       # Backend API
       location /api/ {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Uploaded files
       location /uploads/ {
           proxy_pass http://127.0.0.1:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable site:

   ```bash
   sudo ln -s /etc/nginx/sites-available/badgenest /etc/nginx/sites-enabled/badgenest
   sudo nginx -t
   sudo systemctl reload nginx
   ```

9. **Enable HTTPS with Certbot**

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

   Certbot will edit Nginx config for TLS and create auto-renew timers.
   Verify renew task:

   ```bash
   systemctl list-timers | grep certbot
   sudo certbot renew --dry-run
   ```

10. **Post-deploy checks**

   ```bash
   curl -I https://yourdomain.com
   curl https://yourdomain.com/api/docs
   curl https://yourdomain.com/health
   ```

Notes:
- Set `FRONTEND_URL` and `BACKEND_URL` in `.env` to your HTTPS domain (for example `https://yourdomain.com`).
- Open firewall ports `80` and `443`.
- If API docs are exposed publicly and you do not want that, restrict `/api/docs` in Nginx.

## IIS deployment (Windows)

Typical split:

1. **Static site (client):** build the client (`npm run build -w badgenest-client`), deploy `client/dist/` to an IIS site. Use `client/public/web.config` (copied into `dist` by `copy:iis`) so client-side routing works.
2. **API (server):** run Node as a Windows service or with **PM2 / NSSM**, listening on `127.0.0.1:3001` (or your `PORT`). Expose it through IIS with **URL Rewrite + Application Request Routing** as a reverse proxy. See `server/web.config` for a sample rule; adjust the port and enable “Application Request Routing” proxy.

Uploaded files are served from `/uploads/*` relative to `BACKEND_URL`; ensure `UPLOAD_DIR` is on persistent storage and backed up.

## Troubleshooting

- **`Invalid environment` on startup:** required vars failed Zod validation; compare with `.env.example`.
- **`DATABASE_URL` truncated / `P1013` invalid connection string:** Unquoted values are split at `;` by dotenv (e.g. you only get `sqlserver://localhost:1433`). **Wrap the full URL in double quotes** as in `.env.example`. If your shell still exports an old `DATABASE_URL`, either `unset DATABASE_URL` or rely on the server’s `dotenv` **`override: true`** (already set in `server/src/config/env.ts`). `npm run db:push` uses `dotenv-cli --override` so `.env` wins over the shell.
- **Prisma `P1000` authentication failed:** `sa` password in `DATABASE_URL` must match `MSSQL_SA_PASSWORD` in the container; check for typos and quoting.
- **Prisma warns about `NVarChar(Max)` vs `NVarChar(4000)` on `db push`:** You applied `schema.sql` earlier; run `prisma db push --accept-data-loss` once to align with `schema.prisma`, or treat the SQL script as source of truth and only run `prisma generate`.
- **Prisma / DB errors:** verify `DATABASE_URL`, firewall, SQL auth, and that `encrypt` / `trustServerCertificate` match your server policy.
- **CORS errors:** `FRONTEND_URL` must exactly match the browser origin (scheme + host + port).
- **401 on admin routes:** promote your user or pass bootstrap secret for the first admin.
- **Production client calls wrong host:** set `VITE_API_URL` before `npm run build -w badgenest-client` (or in root `.env` with `envDir`).

## Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Client + server in watch mode |
| `npm run build` | Client production build + server `tsc` |
| `npm run start` | Start compiled API |
| `npm run db:push` | `prisma db push` with root `.env` (`--override` so shell vars don’t win) |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run seed:admin -- <email>` | Promote user to admin |
| `npm run generate:secrets` | Print new `JWT_SECRET` and `ADMIN_BOOTSTRAP_SECRET` (pipe into `.env`) |
| `npm run generate:jwt -- --email=user@x.com [--admin]` | Issue a 7-day Bearer JWT (needs DB + same `JWT_SECRET` as API) |
| `npm run smoke:health` | Quick Express `/health` check (no database) |
| `npm test` | Client Vitest |

## License

Private / as per your project.
