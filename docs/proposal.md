# Project Topic Proposal

**CCSFEN1L – Introduction to Software Engineering**
Section: COM243 · Group Name: SOCIA

**Proposed Project Title:** FINDorm: A Web-Based Dormitory and Boarding House Listing and Reservation Platform for Metro Manila

**Project Leader:** Tala, Edrian B.

**Members:**
1. David, Marc Lawrence T.
2. De Castro, Karl Gab C.
3. Sigue, Cedric Kristoff R.
4. Verdeflor, Harry C.

## Project overview

Finding an available dormitory or boarding house in Metro Manila can be time-consuming because listings are spread across social media, word of mouth, and physical signs. Important details such as rental price, amenities, room availability, and house rules may also be incomplete or outdated. Property owners also have to manage vacancies, inquiries, and reservation requests through different channels.

FINDorm is a web-based platform that centralizes dormitory and boarding house listings within Metro Manila. Accommodation seekers can search and filter listings, view property details and available slots, send inquiries, and submit reservation requests. Property owners can create and manage listings, update room availability, and accept or reject reservation requests. A system administrator manages users and property listings.

The project is limited to account management, property listings, search and filtering, room availability, reservation requests, simple in-platform inquiries, and basic administration. The system will not process online payments or deposits, generate lease contracts, verify property ownership or user identity, or connect to external property databases. An accepted reservation only means that the property owner has approved the request within FINDorm; payment and final rental arrangements will be handled outside the system.

## Objectives

1. To develop a centralized web-based platform for dormitory and boarding house listings within Metro Manila.
2. To provide role-based accounts for accommodation seekers, property owners or landlords, and system administrators.
3. To allow property owners to create, edit, delete, and update property listings, including rental details and available room or bed slots.
4. To allow accommodation seekers to search and filter listings by location, price range, property type, gender category, and availability, and to view complete listing details.
5. To provide a simple reservation-request and inquiry process where seekers can contact owners and owners can accept or reject reservation requests.
6. To verify that the main system functions operate according to the defined requirements.

## Stakeholders and target users

- **Accommodation seekers** — students, young professionals, workers, and other renters who will search for available dormitories or boarding houses, view property details, send inquiries, and submit reservation requests.
- **Property owners / landlords** — owners who will create and manage property listings, update room or bed availability, and respond to inquiries and reservation requests.
- **System administrator** — manages user accounts and property listings, and removes or updates listings when necessary to maintain the platform.

## Proposed system features

See [requirements.md](requirements.md) for the full list of functional requirements (FR-01 to FR-17) and non-functional requirements (NFR-01 to NFR-06).

## Proposed technology stack

- **Programming Language:** JavaScript
- **Framework / Platform:** React for the front end; Node.js and Express.js for the back end
- **Database:** MongoDB with Mongoose
- **IDE / Development Environment:** Visual Studio Code
- **Version Control System:** Git with GitHub
- **Additional Libraries / Tools:** Tailwind CSS, React Router, Axios, bcrypt, JSON Web Token (JWT), Multer with Cloudinary for listing images, and Postman for API development and endpoint checking

## Proposed software development approach

The project will use the Agile software development approach with Scrum. The main modules will be developed in stages: account and role management, property listings, search and filtering, reservation requests and availability, and inquiries. This approach allows the group to divide the work, monitor progress, and adjust requirements when needed. Completed features will be checked against the functional requirements before moving to the next set of features.

## Proposed evaluation

- **Functional Correctness** — the main system functions shall operate according to the corresponding functional requirements.
- **Usability** — the system shall provide a clear and understandable interface for its main functions.
- **Security** — the system shall enforce authentication, authorization, password protection, and access control.
- **Maintainability** — the source code shall be organized and modular for easier modification.

## Expected benefits and impact

- **For accommodation seekers** — FINDorm provides one place to search and compare dormitories and boarding houses, check availability, send inquiries, and submit reservation requests without relying only on scattered posts or physical visits.
- **For property owners / landlords** — the platform provides an organized way to advertise vacancies, maintain listing information, update available slots, and manage inquiries and reservation requests.
- **For system administrators** — the platform provides tools for managing users and listings in one system.

## Conclusion

FINDorm is a proposed web-based platform for dormitory and boarding house listings and reservation requests within Metro Manila. It addresses the difficulty of finding organized and updated accommodation information by bringing listings, availability, inquiries, and reservation requests into one system. Accommodation seekers, property owners, and system administrators will each have role-based functions. By keeping the scope focused on listing, search, availability, reservation requests, simple inquiries, and administration, the project remains practical for development while providing a complete and useful software solution.
