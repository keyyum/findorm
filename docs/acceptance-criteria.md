# Acceptance criteria

A requirement is **done** when every box under it can be checked by someone other than the person who built it. Use this list when reviewing a PR, and again at the end of the term to verify the system (Objective 6).

Each item is written so it can be tested by clicking through the app or sending a request in Postman. Behavior rules marked **D-xx** are in [decisions.md](decisions.md); endpoints are in [api-spec.md](api-spec.md).

**Test accounts to create first:** one seeker (Seeker A), a second seeker (Seeker B), two owners (Owner A, Owner B), and one admin from the seed script.

---

## Accounts

### FR-01 · Register as seeker or owner

- [ ] A new user can register as a seeker and is logged in afterwards.
- [ ] A new user can register as an owner and is logged in afterwards.
- [ ] The form does not offer "admin", and sending `role: "admin"` to the API returns 400 (D-09).
- [ ] Registering with an email that's already used shows an error (409), including the same email with different capital letters.
- [ ] Missing first name, last name, email, or password shows an error for that field and nothing is saved.
- [ ] A password shorter than 8 characters is rejected.

### FR-02 · Log in and log out

- [ ] A registered user can log in with the right email and password.
- [ ] A wrong password and an unknown email show the same error message.
- [ ] After logging in, refreshing the page keeps the user logged in.
- [ ] After logging out, refreshing the page shows the user as logged out, and pages that need an account send them to login.
- [ ] A deactivated user cannot log in and sees a message saying the account is deactivated (D-08).

### FR-03 · View and update account

- [ ] A logged-in user can see their name, email, phone, and role.
- [ ] They can change their name and phone, and the change is still there after logging out and back in.
- [ ] Changing email to one another account uses is rejected.
- [ ] They can change their password by entering the current one; the old password stops working.
- [ ] A wrong current password is rejected.
- [ ] The role cannot be changed — sending `role` in the update has no effect.

---

## Listings

### FR-04 · Create, edit, delete listings

- [ ] An owner can create a listing and it appears in "my listings" and in search.
- [ ] An owner can edit their own listing and the change appears on the details page.
- [ ] An owner can delete their own listing after confirming; it disappears from search and its details page returns not found.
- [ ] Deleting a listing also removes its reservation requests from the seeker's list and its inquiry threads (D-11).
- [ ] Owner B cannot edit or delete Owner A's listing (API returns 404).
- [ ] A seeker cannot create, edit, or delete listings (API returns 403).

### FR-05 · Listing details

- [ ] Creating a listing requires name, property type, city, address, monthly rent, gender category, capacity, and available slots; leaving any out shows an error for that field.
- [ ] Property type only offers Dormitory and Boarding House (D-02).
- [ ] City only offers the 17 Metro Manila cities (D-01).
- [ ] Amenities can be picked from the fixed list; house rules and description can be typed in.
- [ ] Monthly rent of 0 or a negative number is rejected.
- [ ] Available slots higher than capacity is rejected.
- [ ] An owner can upload up to 10 photos (JPEG, PNG, or WebP, up to 5 MB each) and they show on the listing.
- [ ] An 11th photo, a PDF, or a file over 5 MB is rejected.
- [ ] An owner can remove a photo.

### FR-06 · Update availability

- [ ] An owner can change the available slots on their own listing, and the new number shows everywhere the listing appears.
- [ ] Setting slots below 0 or above capacity is rejected.
- [ ] Setting slots to 0 makes the listing show "Full"; raising it again removes "Full".
- [ ] Owner B cannot change Owner A's availability.

### FR-10 · View listing details

- [ ] Anyone, logged in or not, can open a listing and see every field from FR-05, the photos, and the owner's name (D-10).
- [ ] The owner's email and phone are **not** shown (NFR-04).
- [ ] A full listing shows "Full".
- [ ] Opening a listing that doesn't exist shows a not-found message, not a blank page or crash.

---

## Search and filtering

Set up a few listings in different cities, prices, types, and gender categories before testing.

### FR-07 · Search by location

- [ ] Choosing a city shows only listings in that city.
- [ ] Typing a keyword like "Sampaloc" shows listings with that word in the name or address, regardless of capital letters.
- [ ] Search works without logging in (D-10).

### FR-08 · Filters

- [ ] Min and max price show only listings within that range (inclusive).
- [ ] Property type shows only that type.
- [ ] Gender "Female" shows Female and Any listings; "Male" shows Male and Any; "Any" shows only Any (D-12).
- [ ] "Available only" hides full listings.
- [ ] Several filters together show only listings that match **all** of them.

### FR-09 · Show matching results

- [ ] Every result matches the chosen filters, and no matching listing is missing.
- [ ] When nothing matches, a clear "no listings found" message shows instead of an empty page.
- [ ] Results can be sorted newest first, price low to high, and price high to low.
- [ ] With more than 12 results, the rest are reachable on the next page.
- [ ] Each result shows at least name, type, city, monthly rent, gender category, slots left, and "Full" when full.

---

## Inquiries

### FR-11 · Send inquiries

- [ ] A logged-in seeker can send a message from a listing's page.
- [ ] Sending a second message about the same listing adds to the same thread, not a new one (D-07).
- [ ] An empty message, or one over 1000 characters, is rejected.
- [ ] A visitor who isn't logged in is asked to log in first.
- [ ] Owners and admins cannot start an inquiry.

### FR-12 · Receive and reply

- [ ] The owner sees the new thread in their inquiries list, newest activity first.
- [ ] The owner can reply, and the seeker sees the reply after refreshing.
- [ ] The seeker can reply back; the conversation shows in order with who sent each message.
- [ ] Owner B cannot see or reply to threads about Owner A's listings (404).
- [ ] Seeker B cannot see Seeker A's threads (404).

---

## Reservations

### FR-13 · Submit reservation requests

- [ ] A seeker can request a slot on a listing that has slots, and it shows as Pending.
- [ ] Sending a second request for the same listing while the first is Pending or Accepted is refused (D-03).
- [ ] After a request is Rejected, the seeker can request the same listing again.
- [ ] Requesting a full listing is refused, and the button/form makes that clear (D-04).
- [ ] A move-in date in the past is rejected.
- [ ] Owners and admins cannot submit requests.

### FR-14 · Accept or reject

- [ ] The owner sees incoming requests for their listings, with the seeker's name, the listing, move-in date, and note.
- [ ] The owner can filter incoming requests by status and by listing.
- [ ] Accepting changes the status to Accepted; rejecting changes it to Rejected.
- [ ] An Accepted or Rejected request cannot be accepted or rejected again (D-06).
- [ ] Owner B cannot see, accept, or reject requests for Owner A's listings.

### FR-15 · View request status

- [ ] The seeker sees all their requests with the listing name and status: Pending, Accepted, or Rejected.
- [ ] A status change by the owner shows after the seeker refreshes.
- [ ] The seeker can withdraw a Pending request and it disappears from both lists (D-05).
- [ ] Accepted and Rejected requests cannot be withdrawn.
- [ ] Seeker B cannot see Seeker A's requests.

### FR-16 · Slots and "Full"

- [ ] Accepting a request lowers the listing's available slots by exactly 1.
- [ ] Rejecting does not change the slots.
- [ ] When the last slot is taken, the listing shows "Full" in search, on its details page, and in the owner's list.
- [ ] When a listing is full, the owner cannot accept any remaining Pending requests — the API returns 409 — but can still reject them (D-04).
- [ ] If the owner raises available slots again, those Pending requests can be accepted.
- [ ] **Race test:** on a listing with 1 slot and 2 Pending requests, sending both accepts at the same moment (two Postman tabs, or a small script) results in exactly one Accepted, one refused, and slots at 0 — never −1.

---

## Administration

### FR-17 · Manage users and listings

- [ ] The admin can see all users and filter by role, active status, or name/email.
- [ ] The admin can deactivate a seeker or owner. That user is logged out on their next request and cannot log back in (D-08).
- [ ] The admin can reactivate them, and they can log in again.
- [ ] The admin cannot deactivate an admin account, including their own.
- [ ] The admin can see all listings, and edit or delete any of them.
- [ ] Seekers and owners get 403 on every `/api/admin/...` endpoint.

---

## Non-functional requirements

### NFR-01 · Passwords hashed

- [ ] In the database (MongoDB Atlas or Compass), the `password` field is a bcrypt hash starting with `$2`, never the real password.
- [ ] No API response ever includes `password`.

### NFR-02 · Role-based access

- [ ] Every endpoint marked with a role in the API spec rejects the other roles with 403.
- [ ] Every endpoint that needs an account returns 401 with no token, a made-up token, or an expired token.
- [ ] The front end hides links and buttons a role can't use (e.g. seekers don't see "Create listing").

### NFR-03 · Data saved accurately

- [ ] After restarting the server, all listings, availability numbers, reservation statuses, and messages are unchanged.

### NFR-04 · Personal data protected

- [ ] Another user's email and phone are only visible to admins.
- [ ] Inquiry threads are only visible to their seeker and owner.
- [ ] Reservation requests are only visible to their seeker and the listing's owner.

### NFR-05 · Input validated on the server

- [ ] Sending invalid data straight to the API with Postman (skipping the front-end form) is rejected with 400 and nothing is saved — test at least register, create listing, update availability, reservation, and inquiry.

### NFR-06 · Separate components

- [ ] Front-end code is only in `client/`, back-end code only in `server/`, and the database is only accessed from `server/`.
