# Job Application Tracker

A REST API for tracking job applications through their hiring stages, with a
full status history for every application.

**Live API:** https://job-application-tracker-wbky.onrender.com/api/health

> The API is on a free tier and sleeps when idle — the first request after a
> quiet period can take up to 50 seconds.

## What it does

Track applications you've sent, move them through stages as things progress,
and keep the complete history rather than overwriting the current state.

Each move writes an immutable `StatusEvent`, so an application's timeline shows
exactly what happened and when — not just where it ended up.

## Stack

Java 21 · Spring Boot 4.1 · Spring Security 7 (JWT) · Spring Data JPA ·
PostgreSQL 18 (Neon) · Maven · Docker · deployed on Render

## Design decisions

**The event log is the source of truth.** `StatusEvent` rows are append-only.
`Application.currentStatus` duplicates the latest event, but only as a read
optimization so the list view doesn't need a correlated subquery per row. Both
writes happen in one `@Transactional` method in `StatusService.transition()`,
which is the only code allowed to touch that column — so the two can't drift
apart.

**Transitions are validated against a table, not scattered `if` statements.**
`APPLIED → OFFER` is rejected with a 409. `INTERVIEW → INTERVIEW` is allowed,
because multiple rounds are normal. `REJECTED` and `WITHDRAWN` are terminal.

**Ownership is enforced in the query, not after it.** Every repository method
that touches user data takes a `userId`: `findByIdAndUserId`,
`findAllByUserId`. There is no bare `findById` on `Application`. A request for
another user's application returns 404 rather than revealing that it exists.

**Stateless auth.** JWTs signed with HMAC-SHA, no server-side session, so the
API survives the container restarting and scales horizontally.

**DTOs at the boundary.** Entities are never serialized, which keeps
`passwordHash` out of responses and avoids lazy-loading surprises.

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

```bash
createdb jobtracker
./mvnw spring-boot:run
```

Configure via environment variables (defaults suit local development):
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`,
`SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`.

## Tests

```bash
./mvnw test
```

Unit tests cover `StatusService`: valid transitions write both the event and the
status column, invalid transitions write nothing at all, terminal statuses can't
move, and one user cannot transition another user's application.

## Author

Jidnesh Chavan — [github.com/Jidxesh](https://github.com/Jidxesh)
