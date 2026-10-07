# Testing

## Automated API tests

`server/tests/api.test.mjs` runs the 46 test cases from the project documentation (Section 12.2) against a running server. It sends real requests and prints each actual result.

1. Point `MONGO_URI` in `server/.env` at an **empty** database (the tests create their own users and listings).
2. Start the server: `npm run dev`
3. In another terminal, from `server/`:
   ```bash
   ADMIN_EMAIL=admin@findorm.test ADMIN_PASSWORD='AdminPass2026!' npm run create-admin
   npm run test:api
   ```

Use the same `ADMIN_EMAIL` / `ADMIN_PASSWORD` for both commands if you change them. The run exits with an error if any case fails.

Last run (2 Oct 2026, local MongoDB-compatible database): 43 Pass, 0 Fail, 3 Pending. Re-run on MongoDB Atlas to settle the pending ones:

- **Photo upload:** needs Cloudinary keys in `.env`.
- **Inbox list and simultaneous accepts:** need real MongoDB.

## Demo data

For presentations, start the server on an empty database and run `npm run seed-demo`. It creates 3 owners, 3 seekers, 7 listings, requests in every status, and one conversation. All demo accounts use the password `Password123` (e.g. `maria@findorm.test` owner, `juan@findorm.test` seeker).

To fill search with more places, also run `npm run seed-dorms` (after `seed-demo`, since `seed-demo` needs an empty database). It loads real dorm listings from `server/scripts/seed-data/*.json`, one demo owner per file (`owner.<file>@findorm.test`, password saved to `seed-data/owners.txt`). The folder is in the repository. The dorm details and photos come from public listing sites and belong to their owners, so they are for this class project's demo only. Add your own Cloudinary keys to `server/.env` to upload the photos there; without them the server serves the photos itself. Re-running adds only missing listings, and `npm run seed-dorms -- --reset` removes them all.

## Diagrams

`docs/diagrams/` holds the UML diagrams used in the documentation as PlantUML sources (`.puml`) and rendered images (`.png`). To re-render after editing: `plantuml -tpng docs/diagrams/*.puml`.
