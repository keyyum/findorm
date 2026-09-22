# Contributing

How the SOCIA team works on FINDorm. Keep it simple and consistent so the repo stays readable for the whole term.

## Branching

`main` is protected by convention — no one pushes to it directly. Work on a branch, open a pull request, get one review, then merge.

Name branches after the requirement you're implementing:

```
feat/fr-04-create-listing
feat/fr-13-reservation-request
fix/fr-16-slot-count-off-by-one
docs/update-requirements
```

## Commits

Use short, present-tense messages with the requirement ID when one applies:

```
feat(listings): add create listing form (FR-04)
fix(reservations): block accept when slots are 0 (FR-16)
docs: add ERD to requirements
```

Prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## Pull requests

Every PR should say:

1. **What** it does, in one or two sentences.
2. **Which requirement** it implements (e.g. FR-08).
3. **How to test it** — the steps a reviewer follows to see it work.

Keep PRs small. One requirement per PR is the goal; a large feature can be split across several.

## Module owners

Work is divided by module so two people rarely touch the same files:

| Module | Requirements |
|---|---|
| Accounts and roles | FR-01, FR-02, FR-03, NFR-01, NFR-02 |
| Property listings | FR-04, FR-05, FR-06, FR-10 |
| Search and filtering | FR-07, FR-08, FR-09 |
| Reservations and availability | FR-13, FR-14, FR-15, FR-16 |
| Inquiries | FR-11, FR-12 |
| Administration | FR-17 |

Assignments are tracked in GitHub Issues — one issue per requirement.

## Code conventions

- JavaScript throughout, front end and back end.
- Front end lives in `client/`, back end in `server/`. Do not mix them (NFR-06).
- Back end structure: `routes/` → `controllers/` → `models/`, with `middleware/` for auth and validation.
- Validate input on the server before saving, not only in the browser (NFR-05).
- Never commit secrets. `.env` is gitignored; commit `.env.example` with placeholder values instead.

## Before you push

- The app runs without console errors.
- Your feature matches the wording of its requirement in [docs/requirements.md](docs/requirements.md).
- No `.env`, `node_modules/`, or stray debug logs in the diff.
