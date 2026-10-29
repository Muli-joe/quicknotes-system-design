# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts:

1. **A front-end API client** (`index.html`, `api.js`, `style.css`) that proves the browser can load, create and delete notes over HTTP, using the [JSONPlaceholder](https://jsonplaceholder.typicode.com) practice API.
2. **Design documents** that the backend team will build from: the REST API, the database model and the system architecture.

## How to run the API client

No install or build step is needed.

1. Clone the repository: `git clone https://github.com/<muli-joe>/quicknotes-system-design.git`
2. Open `index.html` in a browser (double-click it), or run a local server: `python3 -m http.server 8000` and visit <http://localhost:8000>.
3. Click **Load notes** to fetch 10 notes (GET).
4. Fill in the form and click **Create note** (POST). The title is required, up to 100 characters.
5. Click **Delete** on any note (DELETE).

Note: JSONPlaceholder does not really store changes, so created notes get id 101 but disappear on reload and deleted notes come back. This is explained in a code comment in `api.js`.

## Project files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: load button, status line, note form, notes list |
| `api.js` | `request()` helper plus GET, POST and DELETE, validation and UI states |
| `style.css` | Styling, including distinct success, error and loading messages |

## Design documents

- [API design](docs/api-design.md): endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, index and SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows and trade-offs

## What I learned

1. **HTTP calls fail in more ways than they succeed.** `fetch` only rejects on network errors, so I must check `response.ok` myself and throw, then handle everything with `try / catch / finally`.
2. **Good UIs show every state.** Loading, success, error and empty states, plus disabled buttons during requests, prevent double submits and confusion.
3. **Never put user text into `innerHTML`.** Using `textContent` stops cross-site scripting (XSS) attacks.
4. **REST design is about consistent nouns, methods and status codes.** For example, 201 for create, 204 for delete and a standard error body make the API easy to use.
5. **Estimating load first drives the architecture.** About 70 reads and 17 writes per second means read replicas and a cache are enough, so we avoid over-engineering.
6. **Every component exists to solve a problem, and every one adds a trade-off.** Caches and replicas add speed but stale data; queues add speed but complexity.