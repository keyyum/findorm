# Requirements

Source of truth for what FINDorm must do. Every pull request should reference the requirement ID it implements.

## Functional requirements

| ID | Requirement | Module |
|---|---|---|
| FR-01 | The system shall allow users to register an account as an accommodation seeker or property owner. | Accounts |
| FR-02 | The system shall allow registered users to log in and log out securely. | Accounts |
| FR-03 | The system shall allow users to view and update their account information. | Accounts |
| FR-04 | The system shall allow property owners to create, edit, and delete dormitory or boarding house listings. | Listings |
| FR-05 | The system shall allow property owners to provide listing details such as property name, property type, address or location, monthly rental price, amenities, photos, capacity, available slots, and basic house rules. | Listings |
| FR-06 | The system shall allow property owners to update room or bed availability. | Listings |
| FR-07 | The system shall allow accommodation seekers to search for listings by location. | Search |
| FR-08 | The system shall allow accommodation seekers to filter listings by price range, property type, gender category (Male, Female, or Any), and availability. | Search |
| FR-09 | The system shall display listings that match the selected search and filter criteria. | Search |
| FR-10 | The system shall allow users to view complete property listing details. | Listings |
| FR-11 | The system shall allow accommodation seekers to send inquiries about a property through a simple in-platform messaging feature. | Inquiries |
| FR-12 | The system shall allow property owners to receive and reply to inquiries about their listings. | Inquiries |
| FR-13 | The system shall allow accommodation seekers to submit reservation requests for available rooms or bed slots. | Reservations |
| FR-14 | The system shall allow property owners to view incoming reservation requests and accept or reject them. | Reservations |
| FR-15 | The system shall allow accommodation seekers to view the status of their reservation requests as Pending, Accepted, or Rejected. | Reservations |
| FR-16 | The system shall update the available slots when a reservation is accepted, display the property as "Full" when no slots remain, and prevent owners from accepting further reservation requests once no slots remain. | Reservations |
| FR-17 | The system shall allow the system administrator to manage user accounts and property listings. | Administration |

## Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | User passwords shall be securely hashed and protected. |
| NFR-02 | Users shall only be able to access features permitted for their assigned role. |
| NFR-03 | The system shall accurately save property listings, availability, reservation requests, and messages. |
| NFR-04 | Personal information and messages shall only be accessible to authorized users. |
| NFR-05 | The system shall validate required user inputs before saving data. |
| NFR-06 | The source code shall be organized into separate front end, back end, and database components. |

## Evaluation criteria

- **Functional correctness** — the main system functions operate according to the corresponding functional requirements.
- **Usability** — the interface is clear and understandable for its main functions.
- **Security** — authentication, authorization, password protection, and access control are enforced.
- **Maintainability** — the source code is organized and modular for easier modification.

## Roles and permissions

| Capability | Seeker | Owner | Admin |
|---|:---:|:---:|:---:|
| Register / log in / manage own account | ✅ | ✅ | ✅ |
| Create, edit, delete listings | — | ✅ (own) | ✅ (any) |
| Update room/bed availability | — | ✅ (own) | — |
| Search and filter listings | ✅ | ✅ | ✅ |
| Send inquiries | ✅ | — | — |
| Reply to inquiries | — | ✅ (own listings) | — |
| Submit reservation requests | ✅ | — | — |
| Accept / reject reservation requests | — | ✅ (own listings) | — |
| Manage user accounts | — | — | ✅ |

## Reservation status flow

```
Seeker submits request  ──▶  Pending
                              │
              Owner accepts ──┴── Owner rejects
                    │                  │
                 Accepted           Rejected
                    │
        available slots − 1
                    │
     slots == 0  ──▶  listing shows "Full";
                      further accepts are blocked
```
