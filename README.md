# Registrar — Student Search & Filtering Portal

A full-stack web app for searching, filtering, sorting, and managing student
records, with sign-in and role-based access control.

## Tech Stack
- **Backend:** Node.js + Express
- **Database:** SQLite via Node's **built-in `node:sqlite` module** (no external DB driver, no native compilation required) — file-based, zero-config, auto-seeds 120 sample students on first run
- **Auth:** JWT (`jsonwebtoken`) + password hashing (`bcryptjs`) — both pure JS, no native compilation
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework/build step required)

> **Requires Node.js 22.5+** (for the built-in `node:sqlite` module). Node 24+ recommended.

## What's new in this version
- Redesigned UI: navy/brass "registrar office" visual identity, serif+sans
  type pairing (Source Serif 4 / IBM Plex Sans), a ledger-style table instead
  of a generic card grid.
- Real access control: every `/api/students*` route requires a signed-in
  session. Write actions (create/edit/delete) are restricted to the **admin**
  role; the **viewer** role gets read-only search and filtering.

## Default accounts (seeded automatically)

| Username | Password    | Role   | Can do                        |
|----------|-------------|--------|--------------------------------|
| `admin`  | `Admin@123` | admin  | Search, filter, add, edit, delete |
| `viewer` | `Viewer@123`| viewer | Search and filter only         |

**Change these before deploying anywhere beyond your own machine.** They're
meant to get you started locally, not for production use. See "Security
notes" below.

## Project Structure
```
student-portal/
├── backend/
│   ├── server.js      # Express app, API routes, auth wiring
│   ├── auth.js         # JWT signing/verification, role middleware
│   ├── db.js            # SQLite connection, auto-seed (students + users)
│   ├── package.json
│   └── students.db     # created automatically on first run
├── frontend/
│   ├── login.html / login.js   # sign-in screen
│   ├── index.html               # main portal shell
│   ├── script.js                 # search/filter/sort + admin CRUD UI
│   └── style.css
└── README.md
```

## Setup & Run

```bash
cd backend
npm install
npm start
```

The server starts on **http://localhost:4000**. Visit that URL, sign in with
one of the accounts above, and you'll land on the student register.

Optional: set a stable JWT secret so sessions survive server restarts consistently:

```bash
# macOS/Linux
JWT_SECRET=some-long-random-string npm start

# Windows PowerShell
$env:JWT_SECRET="some-long-random-string"; npm start
```

If `JWT_SECRET` isn't set, the server generates a random one at startup —
this works fine for local use, but existing sessions won't survive a restart.

## API Endpoints

| Method | Endpoint                  | Auth required | Description                              |
|--------|-----------------------------|----------------|--------------------------------------------|
| POST   | `/api/auth/login`           | No             | Exchange username/password for a JWT      |
| GET    | `/api/auth/me`               | Yes            | Verify current token, return user info    |
| GET    | `/api/students`             | Yes            | List/search/filter/sort/paginate students |
| GET    | `/api/students/filters`     | Yes            | Distinct values for filter dropdowns      |
| GET    | `/api/students/:id`         | Yes            | Get one student                           |
| POST   | `/api/students`             | Yes (admin)    | Create a student                          |
| PUT    | `/api/students/:id`         | Yes (admin)    | Update a student                          |
| DELETE | `/api/students/:id`         | Yes (admin)    | Delete a student                          |

### Query params for `GET /api/students`
`q`, `class`, `section`, `grade`, `gender`, `status`, `sortBy`, `sortDir`, `page`, `pageSize`

## Security notes

This is a solid starting point, not a hardened production system. Before
using it beyond your own machine, you'd want to:
- Change the default account passwords (or remove those seed accounts and
  add your own via direct DB inserts / a signup flow).
- Set `JWT_SECRET` to a real secret, kept out of source control.
- Serve over HTTPS — tokens are sent as plain Bearer headers.
- Add rate limiting on `/api/auth/login` to slow down password guessing.
- Consider shorter token expiry plus a refresh-token flow for longer sessions.
- Session tokens are kept in `sessionStorage` (cleared when the tab closes) rather than `localStorage`, which limits — but doesn't eliminate — exposure if the page is vulnerable to XSS.

## Notes
- To reset all data (students and user accounts), delete `backend/students.db`
  (and any `-shm`/`-wal` files) and restart the server.
- Swap `node:sqlite` for `pg` or `mysql2` in `db.js` if you need a networked
  DB instead of SQLite.
