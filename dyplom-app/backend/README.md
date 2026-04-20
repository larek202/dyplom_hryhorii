# Backend API (dyplom-app)

Express + MongoDB API for the events app.

## Requirements

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

## Quick start

```bash
cd backend
npm install
```

Create `.env` from the example (do not commit `.env`):

```bash
# Windows (PowerShell), from backend/
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env`: set **`MONGODB_URI`** and **`JWT_SECRET`** at minimum.

Start the server:

```bash
npm run dev
# or
npm start
```

API base URL: `http://localhost:3000` (or the port from `PORT` in `.env`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT |
| `PORT` | No | Default `3000` |
| `NODE_ENV` | No | Use `development` for request logging and detailed 500 errors |
| `CORS_ORIGIN` | No | Extra allowed origins (comma-separated). Dev always allows `http://localhost:5173` and `http://127.0.0.1:5173`. In **production**, only `CORS_ORIGIN` entries are allowed — set your HTTPS domain(s) |
| `RUN_FAV_MIGRATION` | No | Set `true` once to migrate legacy `favorites` into `likes` |
| `AWS_*` | For uploads | S3 credentials and bucket (see `.env.example`) |
| `SENDGRID_*` | For email | SendGrid API key and verified sender |

Full template: **`.env.example`**.

## Verify the API

**Health (no auth):**

```bash
curl http://localhost:3000/api/health
```

**Public events list:**

```bash
curl http://localhost:3000/api/events
```

**PowerShell:**

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/events
```

Example health response:

```json
{
  "status": "OK",
  "message": "Serwer działa",
  "database": "Połączono z MongoDB Atlas"
}
```

## Useful routes

- `GET /api/health` — liveness
- `GET /api/events` — list events (`city`, `search`, `organizerId`, `page`, `limit`)
- `GET /api/events/:id` — event details
- `POST /api/auth/register`, `POST /api/auth/login` — auth (see `routes/auth.js`)

## Project layout

```
backend/
├── config/       database, S3
├── models/
├── routes/
├── middleware/
├── server.js
├── .env          (local only)
└── .env.example  (template)
```

## Security

- Never commit `.env`
- Use a strong `JWT_SECRET` in production
- In production, set `CORS_ORIGIN` to your real HTTPS origins (see `config/cors.js`)
- Use HTTPS in production

## Troubleshooting

- **MongoDB connection error** — check URI, Atlas IP allowlist, and DB user password.
- **Port in use** — change `PORT` in `.env`.

### `querySrv ENOTFOUND` on Windows (nslookup works, Node fails)

`nslookup` uses the system resolver; Node’s MongoDB driver resolves **SRV** separately. If SRV fails only in Node, **do not use `mongodb+srv://`**. In Atlas: **Connect → Drivers**, open the connection string options and copy the **standard** URI (`mongodb://` with **three** `shard-00-xx....mongodb.net:27017` hosts, `tls=true`, `replicaSet=...`, `authSource=admin`).

Put that full string into `MONGODB_URI` in `.env`. Special characters in the password must be **URL-encoded** (e.g. `@` → `%40`).

For cluster hostnames like `ac-pg2zo9f-shard-00-00.jbeoa4o.mongodb.net`, the replica set name is usually `atlas-ac-pg2zo9f-shard-0` — if connection fails, copy the exact `replicaSet` value from Atlas (never guess in production).
