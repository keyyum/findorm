# API specification

The agreement between the front end and the back end. The back end implements these endpoints exactly. The front end can build against them before they exist by using fake data in the same shape.

Field rules and value lists are in [data-model.md](data-model.md). Behavior rules marked **D-xx** are in [decisions.md](decisions.md).

## Conventions

**Base URL:** `/api` (the Vite dev server proxies it to port 5050). Request and response bodies are JSON, except photo uploads.

**Auth:** Send the token as `Authorization: Bearer <token>`. `client/src/lib/api.js` already does this when a token is in `localStorage` under `findorm_token`.

**Who can call it** is listed on every endpoint:
- **Public** — no token needed.
- **Logged in** — any active user.
- **Seeker / Owner / Admin** — only that role. Other roles get `403`.
- **(own)** — only the owner of that record. Admins are allowed only where noted.

**Errors** always have this shape (matches `server/middleware/errorHandler.js`):

```json
{ "message": "Monthly rent must be at least 1." }
```

Validation errors (`400`) also list each bad field, so forms can show the message next to the right input:

```json
{
  "message": "Please fix the highlighted fields.",
  "errors": {
    "monthlyRent": "Monthly rent must be at least 1.",
    "city": "Choose a city in Metro Manila."
  }
}
```

| Status | Meaning |
|---|---|
| `400` | Invalid input (NFR-05) |
| `401` | No token, bad or expired token, account deactivated, or password changed since the token was issued. The front end should clear the token and go to login. Login itself also uses 401 for wrong credentials |
| `403` | Logged in, but this role or user isn't allowed (NFR-02) |
| `404` | Not found — also used when the record exists but belongs to someone else and the caller shouldn't know it exists |
| `409` | Conflicts with current state: email taken, listing full, duplicate request, request no longer Pending |
| `429` | Too many attempts (D-15). Wait and try again |

**Error codes.** Errors the front end has to tell apart also carry a stable `code`, so it never matches on the wording of `message`:

```json
{ "message": "This listing is full.", "code": "LISTING_FULL" }
```

| Code | Status | When |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Login with a wrong email or password |
| `ACCOUNT_DEACTIVATED` | 401 | Login, or any request, by a deactivated account (D-08) |
| `PASSWORD_CHANGED` | 401 | Token issued before the user's last password change (D-14) |
| `SESSION_EXPIRED` / `NOT_LOGGED_IN` | 401 | Expired or bad token / no token |
| `WRONG_PASSWORD` | 400 | `currentPassword` is wrong (also sets `errors.currentPassword`) |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `LISTING_FULL` | 409 | Request or accept on a full listing (D-04) |
| `DUPLICATE_REQUEST` | 409 | Seeker already has a Pending or Accepted request here (D-03) |
| `NOT_PENDING` | 409 | Request already answered or withdrawn (D-06) |
| `REQUEST_COOLDOWN` | 409 | Re-request within 24 hours of a rejection (D-18) |
| `OWNER_INACTIVE` | 409 | Request or inquiry on a deactivated owner's listing (D-16) |
| `LISTING_HAS_ACCEPTED` | 409 | Owner deletes a listing that has accepted reservations (D-17) |
| `RATE_LIMITED` | 429 | Too many attempts (D-15) |

**Paged lists** return:

```json
{ "items": [ ... ], "page": 1, "limit": 12, "total": 40, "totalPages": 4 }
```

Query `page` (default 1) and `limit` (default 12, max 50).

**Objects returned** — the same shapes are reused below:

- **User** — `{ _id, firstName, lastName, email, phone, role, isActive, createdAt }`. Never includes `password`.
- **PublicUser** — `{ _id, firstName, lastName }`. Used when showing another person (e.g. listing owner, message sender).
- **Listing** — every listing field from the data model, plus `isFull`, with `owner` as a PublicUser.
- **ListingSummary** — `{ _id, name, propertyType, city, monthlyRent, genderCategory, availableSlots, capacity, isFull, photo }` where `photo` is the first photo's `url` or `null`. Used in search results and lists.

---

## Accounts — FR-01, FR-02, FR-03

### `POST /api/auth/register` — Public

Create a seeker or owner account (FR-01). Logs the user in straight away.

```json
{
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "email": "juan@example.com",
  "password": "at-least-8-chars",
  "role": "seeker",
  "phone": "09171234567"
}
```

`role` must be `seeker` or `owner` (D-09). `phone` is optional.

**201** → `{ "token": "...", "user": User }`
**400** invalid fields or `role: "admin"` · **409** email already registered · **429** too many sign-ups from one network (D-15)

### `POST /api/auth/login` — Public

```json
{ "email": "juan@example.com", "password": "..." }
```

**200** → `{ "token": "...", "user": User }`
**401** `INVALID_CREDENTIALS` wrong email or password — use the same message for both so attackers can't find which emails exist · **401** `ACCOUNT_DEACTIVATED` · **429** too many failed logins (D-15)

**Logout** has no endpoint. The front end deletes `findorm_token` (D-13).

### `GET /api/users/me` — Logged in

Current user. The front end calls this on page load to check a saved token is still valid.

**200** → `User`

### `PATCH /api/users/me` — Logged in

Update own details (FR-03). Send only the fields to change: `firstName`, `lastName`, `email`, `phone`. Any other field (like `role` or `isActive`) is ignored. An empty `phone` removes it.

Changing `email` also needs `currentPassword` (D-14), since the email is what the user logs in with:

```json
{ "email": "juan.new@example.com", "currentPassword": "..." }
```

**200** → `User` · **400** (missing or wrong `currentPassword` → `errors.currentPassword`, code `WRONG_PASSWORD` when wrong) · **409** `EMAIL_TAKEN`

### `PATCH /api/users/me/password` — Logged in

```json
{ "currentPassword": "...", "newPassword": "..." }
```

Every token issued before the change stops working, so other devices are signed out (D-14). The response carries a fresh token for this device; the front end stores it in place of the old one.

**200** → `{ "token": "..." }` · **400** new password too short, or `currentPassword` missing or wrong (`errors.currentPassword`, code `WRONG_PASSWORD`)

---

## Listings — FR-04 to FR-10

### `GET /api/listings` — Public

Search and filter (FR-07, FR-08, FR-09). All filters are optional and combine with AND. With no filters, returns every listing, full ones included.

| Query | Example | Effect |
|---|---|---|
| `city` | `Manila` | Exact city (D-01) |
| `q` | `sampaloc` | Keyword, case-insensitive, matches `name` or `address` |
| `minPrice` | `3000` | `monthlyRent` ≥ this |
| `maxPrice` | `6000` | `monthlyRent` ≤ this |
| `propertyType` | `Dormitory` | Exact type |
| `gender` | `Female` | See D-12 — `Female` returns `Female` and `Any` |
| `available` | `true` | Only listings with `availableSlots > 0` |
| `sort` | `price_asc` | `newest` (default), `price_asc`, `price_desc` |
| `page`, `limit` | | Paging |

Unknown values (e.g. `city=Cebu`) return **400**, not an empty list, so typos are caught early.

**200** → paged list of `ListingSummary`

Listings whose owner is deactivated are left out (D-16).

### `GET /api/listings/mine` — Owner

The logged-in owner's own listings, newest first. Includes full listings.

**200** → paged list of `ListingSummary`

### `GET /api/listings/:id` — Public

Full details (FR-10).

**200** → `Listing` · **404** · also `ownerInactive: true` when the owner is deactivated, so the page can explain why requests are closed (D-16)

### `POST /api/listings` — Owner

Create a listing (FR-04, FR-05). Photos are added afterwards with the photo endpoint.

```json
{
  "name": "Casa Verde Dormitory",
  "propertyType": "Dormitory",
  "city": "Manila",
  "address": "123 P. Noval St., Sampaloc",
  "description": "5 minutes walk to UST.",
  "monthlyRent": 4500,
  "genderCategory": "Female",
  "amenities": ["WiFi", "Study Area", "CCTV"],
  "houseRules": "Curfew 10 PM. No visitors in rooms.",
  "capacity": 20,
  "availableSlots": 6
}
```

`owner` comes from the token, never the body.

**201** → `Listing` · **400**

### `PATCH /api/listings/:id` — Owner (own) or Admin

Edit a listing (FR-04, FR-17). Send only the fields to change — same fields as create. If `capacity` is lowered below the current `availableSlots`, return **400**.

**200** → `Listing` · **400** · **404**

### `PATCH /api/listings/:id/availability` — Owner (own)

Update available slots (FR-06). A separate endpoint so the owner's dashboard can change it quickly.

```json
{ "availableSlots": 3 }
```

Must be 0 to `capacity`.

**200** → `Listing` · **400** · **404**

### `DELETE /api/listings/:id` — Owner (own) or Admin

Deletes the listing, its reservations, its inquiries, and its photos (D-11). An owner can't delete a listing that has Accepted reservations; an admin can (D-17).

**204** · **404** · **409** `LISTING_HAS_ACCEPTED` (owner only)

### `POST /api/listings/:id/photos` — Owner (own)

`multipart/form-data` with one or more files in the field `photos`. JPEG, PNG, or WebP, 5 MB each, 10 photos per listing in total.

**200** → `Listing` · **400** wrong type, too big, or over 10 · **404**

### `DELETE /api/listings/:id/photos/:photoId` — Owner (own) or Admin

`photoId` is the photo's `_id` inside the listing. Also deletes it from Cloudinary. Admins use this to remove one photo that breaks the rules without deleting the listing (D-20); only owners can add photos.

**200** → `Listing` · **404**

---

## Reservations — FR-13 to FR-16

### `POST /api/reservations` — Seeker

Request one slot (FR-13, D-03).

```json
{ "listingId": "...", "moveInDate": "2026-11-01", "message": "Hi, I'm a 2nd year student at UST." }
```

`moveInDate` and `message` are optional.

**201** → `Reservation` (see below)
**400** · **404** listing not found · **409** `LISTING_FULL` (D-04) · **409** `DUPLICATE_REQUEST`: you already have a Pending or Accepted request for this listing · **409** `REQUEST_COOLDOWN`: the owner rejected your request less than 24 hours ago (D-18) · **409** `OWNER_INACTIVE`: the owner is deactivated (D-16)

### `GET /api/reservations/mine` — Seeker

The seeker's own requests with their status (FR-15), newest first. Optional `status` filter.

**200** → paged list of `Reservation`

### `GET /api/reservations/incoming` — Owner

Requests for the owner's listings (FR-14), newest first. Optional filters: `status`, `listingId`.

**200** → paged list of `Reservation`

### `PATCH /api/reservations/:id/accept` — Owner (own listing)

Accept a Pending request (FR-14). Decreases the listing's `availableSlots` by 1 (FR-16).

**200** → `Reservation`
**404** · **409** not Pending anymore · **409** listing is full — no slots left (FR-16, D-04)

### `PATCH /api/reservations/:id/reject` — Owner (own listing)

Reject a Pending request (FR-14). Works even when the listing is full. Slots are unchanged.

**200** → `Reservation` · **404** · **409** not Pending anymore

### `DELETE /api/reservations/:id` — Seeker (own)

Withdraw a Pending request (D-05).

**204** · **404** · **409** not Pending anymore

**Reservation object:**

```json
{
  "_id": "...",
  "listing": { "_id": "...", "name": "Casa Verde Dormitory", "city": "Manila", "monthlyRent": 4500, "availableSlots": 5, "isFull": false },
  "seeker": { "_id": "...", "firstName": "Juan", "lastName": "Dela Cruz" },
  "status": "Pending",
  "moveInDate": "2026-11-01T00:00:00.000Z",
  "message": "Hi, I'm a 2nd year student at UST.",
  "respondedAt": null,
  "createdAt": "2026-10-02T08:15:00.000Z"
}
```

---

## Inquiries — FR-11, FR-12

### `POST /api/inquiries` — Seeker or Owner

Start a conversation (FR-11). There is one thread per seeker and listing; if it already exists, the message is added to it instead (D-07).

A **seeker** asks about a listing:

```json
{ "listingId": "...", "body": "Is water included in the rent?" }
```

An **owner** writes first to someone who sent them a reservation request, naming that request (D-19):

```json
{ "reservationId": "...", "body": "Hi! Can you visit on Saturday?" }
```

**201** new thread / **200** added to existing thread → `Inquiry` · **400** · **404** listing (or, for an owner, request) not found · **409** `OWNER_INACTIVE` (D-16) · **429** sending too fast (D-15)

### `GET /api/inquiries` — Seeker or Owner

The user's threads, most recent activity first. A seeker sees threads they started; an owner sees threads about their listings (FR-12). Messages are not included — just the latest one as a preview.

**200** → paged list of `{ _id, listing: { _id, name }, seeker: PublicUser, owner: PublicUser, lastMessage: { body, sender, createdAt }, lastMessageAt }`

### `GET /api/inquiries/:id` — the thread's seeker or owner

The full thread.

**200** → `Inquiry` · **404** (also when the caller isn't part of the thread — NFR-04)

### `POST /api/inquiries/:id/messages` — the thread's seeker or owner

Reply in a thread (FR-12). Either side can post.

```json
{ "body": "Yes, water is included." }
```

**201** → `Inquiry` · **400** · **404** · **429** sending too fast (D-15)

**Inquiry object:**

```json
{
  "_id": "...",
  "listing": { "_id": "...", "name": "Casa Verde Dormitory" },
  "seeker": { "_id": "...", "firstName": "Juan", "lastName": "Dela Cruz" },
  "owner": { "_id": "...", "firstName": "Maria", "lastName": "Santos" },
  "messages": [
    { "_id": "...", "sender": "<seeker id>", "body": "Is water included in the rent?", "createdAt": "..." },
    { "_id": "...", "sender": "<owner id>", "body": "Yes, water is included.", "createdAt": "..." }
  ],
  "lastMessageAt": "..."
}
```

---

## Administration — FR-17

All endpoints here are **Admin** only.

### `GET /api/admin/users`

All users, newest first. Filters: `role`, `isActive`, `q` (matches name or email).

**200** → paged list of `User`

### `PATCH /api/admin/users/:id/status`

Deactivate or reactivate a user (D-08).

```json
{ "isActive": false }
```

**200** → `User` · **400** trying to change an admin account (including your own) · **404**

### `GET /api/admin/listings`

All listings, newest first. Same filters as `GET /api/listings`, plus `ownerId`.

**200** → paged list of `ListingSummary` with `owner` as a PublicUser

To edit or delete a listing, admins use the normal `PATCH /api/listings/:id` and `DELETE /api/listings/:id`.

---

## All endpoints at a glance

| Method | Path | Who | FR |
|---|---|---|---|
| POST | `/api/auth/register` | Public | FR-01 |
| POST | `/api/auth/login` | Public | FR-02 |
| GET | `/api/users/me` | Logged in | FR-03 |
| PATCH | `/api/users/me` | Logged in | FR-03 |
| PATCH | `/api/users/me/password` | Logged in | FR-03 |
| GET | `/api/listings` | Public | FR-07–09 |
| GET | `/api/listings/mine` | Owner | FR-04 |
| GET | `/api/listings/:id` | Public | FR-10 |
| POST | `/api/listings` | Owner | FR-04, 05 |
| PATCH | `/api/listings/:id` | Owner (own), Admin | FR-04, 17 |
| PATCH | `/api/listings/:id/availability` | Owner (own) | FR-06 |
| DELETE | `/api/listings/:id` | Owner (own), Admin | FR-04, 17 |
| POST | `/api/listings/:id/photos` | Owner (own) | FR-05 |
| DELETE | `/api/listings/:id/photos/:photoId` | Owner (own), Admin | FR-05, 17 |
| POST | `/api/reservations` | Seeker | FR-13 |
| GET | `/api/reservations/mine` | Seeker | FR-15 |
| GET | `/api/reservations/incoming` | Owner | FR-14 |
| PATCH | `/api/reservations/:id/accept` | Owner (own) | FR-14, 16 |
| PATCH | `/api/reservations/:id/reject` | Owner (own) | FR-14 |
| DELETE | `/api/reservations/:id` | Seeker (own) | FR-15 |
| POST | `/api/inquiries` | Seeker, Owner (from a request) | FR-11 |
| GET | `/api/inquiries` | Seeker, Owner | FR-11, 12 |
| GET | `/api/inquiries/:id` | Thread members | FR-11, 12 |
| POST | `/api/inquiries/:id/messages` | Thread members | FR-12 |
| GET | `/api/admin/users` | Admin | FR-17 |
| PATCH | `/api/admin/users/:id/status` | Admin | FR-17 |
| GET | `/api/admin/listings` | Admin | FR-17 |

**Route order note for the back end:** mount `/api/listings/mine` before `/api/listings/:id`, or Express will treat `mine` as an id.
