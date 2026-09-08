# Job Application Tracker

A full-stack app for tracking job applications through their hiring stages, with
a complete, immutable status history for every application.

**Live app:** https://job-application-tracker-beta-rust.vercel.app
**API health:** https://job-application-tracker-wbky.onrender.com/api/health

Demo login — `demo@jobtracker.app` / `demopassword`

> Hosted on free tiers. The API sleeps when idle, so the first request after a
> quiet period can take up to 50 seconds.

## Screenshots

<!-- Add images here:
![Dashboard](docs/dashboard.png)
![Timeline](docs/timeline.png)
-->

## What it does

Track applications you've sent, move them through stages as things progress, and
keep the full history instead of overwriting the current state.


Each move writes an immutable `StatusEvent`, so an application's timeline shows
what happened and when, not just where it ended up.

## Stack

**Backend** — Java 21, Spring Boot 4.1, Spring Security 7 (JWT), Spring Data JPA,
PostgreSQL 18, Maven, Docker. Deployed on Render.

**Frontend** — React 18, Vite, React Router, axios. Deployed on Vercel.

**Database** — PostgreSQL on Neon.

## Design decisions

**The event log is the source of truth.** `StatusEvent` rows are append-only.
`Application.currentStatus` duplicates the latest event, but only as a read
optimization so the list view doesn't need a correlated subquery per row. Both
writes happen in one `@Transactional` method in `StatusService.transition()`,
which is the only code allowed to touch that column — so the two can't drift.

**Transitions are validated against a table, not scattered `if` statements.**
`APPLIED → OFFER` is rejected with a 409. `INTERVIEW → INTERVIEW` is allowed,
because multiple rounds are normal. `REJECTED` and `WITHDRAWN` are terminal.

**Ownership is enforced in the query, not after it.** Every repository method
that touches user data takes a `userId`: `findByIdAndUserId`, `findAllByUserId`.
There is no bare `findById` on `Application`. A request for another user's
application returns 404 rather than revealing that it exists.

**Stateless auth.** JWTs signed with HMAC-SHA, no server-side session, so the
API survives container restarts and scales horizontally.

**DTOs at the boundary.** Entities are never serialized, keeping `passwordHash`
out of responses and avoiding lazy-loading surprises.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Authenticate, returns a JWT |
| GET | `/api/applications` | List (optional `?status=` filter) |
| POST | `/api/applications` | Create |
| GET | `/api/applications/{id}` | Fetch one |
| PUT | `/api/applications/{id}` | Update |
| DELETE | `/api/applications/{id}` | Delete |
| POST | `/api/applications/{id}/status` | Move to a new status |
| GET | `/api/applications/{id}/timeline` | Full status history |
| GET | `/api/applications/summary` | Counts by status |

All endpoints except `/api/auth/**` and `/api/health` require
`Authorization: Bearer <token>`.

## Running locally

Backend:

```bash
createdb jobtracker
./mvnw spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend config via environment variables (defaults suit local development):
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`,
`SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`.
Frontend config: `VITE_API_URL`.

## Tests

```bash
./mvnw test
```

Unit tests cover `StatusService`: valid transitions write both the event and the
status column, invalid transitions write nothing at all, terminal statuses can't
move, and one user cannot transition another user's application.

## Author

Jidnesh Chavan — [github.com/Jidxesh](https://github.com/Jidxesh)
