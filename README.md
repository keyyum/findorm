# FINDorm

**A Web-Based Dormitory and Boarding House Listing and Reservation Platform for Metro Manila**

CCSFEN1L – Introduction to Software Engineering · Section COM243 · Group **SOCIA**

---

## Overview

Finding an available dormitory or boarding house in Metro Manila is time-consuming because listings are scattered across social media, word of mouth, and physical signs, and details like price, amenities, and availability are often incomplete or outdated. Property owners, in turn, juggle vacancies, inquiries, and reservation requests across different channels.

FINDorm centralizes dormitory and boarding house listings for Metro Manila. Seekers can search and filter listings, view property details and available slots, send inquiries, and submit reservation requests. Owners can create and manage listings, update availability, and accept or reject requests. An administrator manages users and listings.

### Out of scope

The system does **not** process online payments or deposits, generate lease contracts, verify property ownership or user identity, or connect to external property databases. An accepted reservation only means the owner approved the request inside FINDorm — payment and final rental arrangements happen outside the system.

## Objectives

1. Develop a centralized web-based platform for dormitory and boarding house listings within Metro Manila.
2. Provide role-based accounts for accommodation seekers, property owners/landlords, and system administrators.
3. Allow owners to create, edit, delete, and update listings, including rental details and available room or bed slots.
4. Allow seekers to search and filter listings by location, price range, property type, gender category, and availability, and to view complete listing details.
5. Provide a simple reservation-request and inquiry process where seekers contact owners and owners accept or reject requests.
6. Verify that the main system functions operate according to the defined requirements.

## Team

| Role | Name |
|---|---|
| Project Leader | Tala, Edrian B. |
| Member | David, Marc Lawrence T. |
| Member | De Castro, Karl Gab C. |
| Member | Sigue, Cedric Kristoff R. |
| Member | Verdeflor, Harry C. |

## Stakeholders and target users

- **Accommodation seekers** — students, young professionals, workers, and other renters searching for available dorms or boarding houses.
- **Property owners / landlords** — owners who create and manage listings, update availability, and respond to inquiries and reservation requests.
- **System administrator** — manages user accounts and property listings to maintain the platform.

## Tech stack

| Layer | Choice |
|---|---|
| Language | JavaScript |
| Front end | React, React Router, Tailwind CSS, Axios |
| Back end | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | bcrypt, JSON Web Token (JWT) |
| Image uploads | Multer with Cloudinary |
| Tooling | Visual Studio Code, Git + GitHub, Postman |

## Repository layout

```
findorm/
├── client/     # React front end
├── server/     # Node.js + Express API
├── docs/       # Requirements, proposal, and planning documents
└── README.md
```

The separation of front end, back end, and database layers is a stated non-functional requirement (NFR-06).

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer and a MongoDB database — either [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier, nothing to install) or a local `mongod`.

```bash
git clone https://github.com/keyyum/findorm.git
cd findorm
```

**Back end** (terminal 1):

```bash
cd server
npm install
cp .env.example .env    # then fill in MONGO_URI and JWT_SECRET
npm run dev             # http://localhost:5000
```

**Front end** (terminal 2):

```bash
cd client
npm install
npm run dev             # http://localhost:5173
```

Open http://localhost:5173. The page reports whether it can reach the API — if it says connected, your setup works.

Requests to `/api/...` from the front end are proxied to port 5000 by Vite, so there is no CORS setup to do in development.

Never commit a real `.env` file — only `.env.example` with placeholder values.

## Current state

Scaffolding only. Both halves build and run, and the front end can talk to the API, but **no functional requirement is implemented yet**. Each FR is an open GitHub issue — pick one up, branch from `main`, and open a pull request.

Where things go:

```
server/
├── config/      database connection
├── models/      Mongoose schemas
├── routes/      URL → controller mapping
├── controllers/ request handlers
└── middleware/  auth, validation, error handling

client/src/
├── pages/       one component per screen
├── components/  shared UI pieces
└── lib/         api.js — the shared axios client
```

## Development approach

Agile with Scrum. Modules are built in stages: account and role management → property listings → search and filtering → reservation requests and availability → inquiries. Completed features are checked against the functional requirements before moving to the next set.

## Documentation

- [Functional and non-functional requirements](docs/requirements.md)
- [Design decisions](docs/decisions.md) — answers to questions the requirements leave open
- [Data model](docs/data-model.md) — collections, fields, and validation rules
- [API specification](docs/api-spec.md) — every endpoint, who can call it, and what it returns
- [Acceptance criteria](docs/acceptance-criteria.md) — how to check each requirement is done
- [Project proposal](docs/proposal.md)
- [Contributing guide](CONTRIBUTING.md)
