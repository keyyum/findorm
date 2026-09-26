# Design decisions

Questions the requirements leave open, answered once so the front end and back end build the same thing. [data-model.md](data-model.md), [api-spec.md](api-spec.md), and [acceptance-criteria.md](acceptance-criteria.md) all follow these answers.

If you want to change a decision, open a PR that edits this file **and** the docs it affects, and get the team to agree before anyone codes against the new version.

These cover data and behavior only. Screens, layout, colors, and component structure are up to the front-end team.

---

## D-01 · Location is a city picked from a fixed list, plus a free-text address

**Affects:** FR-05, FR-07

Every listing stores a `city` chosen from the 17 Metro Manila local government units, plus a free-text `address` (street, barangay, landmarks).

Search by location means: filter by `city` (exact match), and optionally a keyword `q` that matches the listing name or address.

**Why:** Free-text cities break search ("QC", "Quezon City", "Q.C."). A fixed list makes filtering exact and doubles as a dropdown. The free-text address still lets owners describe exactly where the place is. Maps and coordinates are left out to keep scope small.

The 17 values: Caloocan, Las Piñas, Makati, Malabon, Mandaluyong, Manila, Marikina, Muntinlupa, Navotas, Parañaque, Pasay, Pasig, Pateros, Quezon City, San Juan, Taguig, Valenzuela.

## D-02 · Two property types: Dormitory and Boarding House

**Affects:** FR-05, FR-08

`propertyType` is either `Dormitory` or `Boarding House`.

**Why:** The project title and proposal only cover these two. Adding apartments or condos would widen the scope past what the proposal promises.

## D-03 · One reservation request reserves one slot

**Affects:** FR-13, FR-14, FR-16

A reservation request is for exactly one room or bed slot. Accepting it reduces `availableSlots` by 1. A seeker can have only one *open* request (Pending or Accepted) per listing at a time.

**Why:** It keeps slot math simple and makes FR-16 easy to test. A group of friends can each send their own request.

## D-04 · When a listing becomes full, pending requests stay Pending

**Affects:** FR-16

When `availableSlots` reaches 0, pending requests are **not** auto-rejected. The owner can still reject them, but the server refuses to accept any of them. If the owner later raises `availableSlots` (FR-06), accepting works again.

New requests cannot be submitted while the listing is full.

**Why:** This is exactly what FR-16 asks for ("prevent owners from accepting further reservation requests"), nothing more. Auto-rejecting would throw away requests that could still be accepted if a slot opens up.

## D-05 · Seekers can withdraw a Pending request

**Affects:** FR-13, FR-15

A seeker can withdraw their own request while it is still Pending. Withdrawing deletes it. Accepted and Rejected requests are final and cannot be withdrawn or changed.

**Why:** Without this, a seeker who changes their mind leaves stale requests in the owner's list. Deleting (instead of adding a "Cancelled" status) keeps the statuses to the three FR-15 names: Pending, Accepted, Rejected.

## D-06 · An accepted reservation cannot be undone in the system

**Affects:** FR-14, FR-16

Once accepted, a request stays Accepted. If the arrangement falls through outside FINDorm, the owner fixes the count by raising `availableSlots` manually (FR-06).

**Why:** Undoing acceptances would need rules about restoring slots and notifying seekers. That's not in the requirements, and the manual availability update already covers the real-world case.

## D-07 · Inquiries are a conversation thread per seeker and listing

**Affects:** FR-11, FR-12

There is one inquiry thread for each seeker–listing pair. The seeker starts it, then both the seeker and the listing's owner can add messages. Sending a new inquiry about a listing you already asked about adds to the existing thread.

No read receipts, attachments, or real-time updates — the page shows new messages when it loads or refreshes.

**Why:** "Simple in-platform messaging" (FR-11) needs a back-and-forth; a single question and answer can't handle follow-ups. One thread per pair keeps owners from getting duplicate conversations.

## D-08 · Admins deactivate users instead of deleting them

**Affects:** FR-17, NFR-03

An admin can deactivate or reactivate any non-admin account. A deactivated user cannot log in, and any token they already hold stops working. Their listings, reservations, and messages stay in the database.

Admins can edit or delete **any** listing.

**Why:** Deleting a user would leave reservations and inquiries pointing at nobody, or force deleting other users' history. Deactivating is reversible and keeps records accurate (NFR-03).

## D-09 · Admin accounts are not created through sign-up

**Affects:** FR-01, NFR-02

The public register form only offers Seeker and Owner. Admin accounts are created with a seed script on the server (a back-end task). The API rejects `role: "admin"` on registration.

**Why:** If sign-up allowed choosing admin, anyone could become one.

## D-10 · Browsing listings does not need an account

**Affects:** FR-07 to FR-10

Search, filter, and listing details are public. Sending inquiries and reservation requests needs a seeker account.

**Why:** Seekers can see what's available before bothering to register, which is how people actually look for places. Nothing on a listing page is personal data (owner contact details are not shown — contact goes through inquiries).

## D-11 · Deleting a listing also deletes its reservations and inquiries

**Affects:** FR-04, FR-17

When an owner or admin deletes a listing, its reservation requests and inquiry threads are deleted with it.

**Why:** Keeping them would leave requests pointing at a listing that no longer exists, and every screen would need to handle that case. The front end should ask for confirmation before deleting.

## D-12 · Gender filter shows listings that accept that gender

**Affects:** FR-08

A listing's `genderCategory` is `Male`, `Female`, or `Any` (mixed). The search filter works like this:

| Filter chosen | Listings shown |
|---|---|
| Male | `Male` and `Any` |
| Female | `Female` and `Any` |
| Any | only `Any` |
| (none) | all |

**Why:** A male seeker filtering for "Male" can also live in a mixed dorm, so hiding `Any` listings would hide real options.

## D-13 · Logout happens on the client

**Affects:** FR-02

Tokens are JWTs stored in `localStorage` under `findorm_token` (already set up in `client/src/lib/api.js`). Logging out means deleting the token from the browser. There is no server logout endpoint. Tokens expire after `JWT_EXPIRES_IN` (7 days by default).

**Why:** It matches the existing client code and needs no token blacklist on the server. D-08 still lets an admin cut off a user immediately, because the server checks `isActive` on every request.
