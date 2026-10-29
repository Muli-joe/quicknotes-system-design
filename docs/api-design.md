# QuickNotes API Design

This is the **real** REST API the backend team should build (not JSONPlaceholder). It is versioned under `/v1`, uses JSON for every request and response, and authenticates with a bearer token: `Authorization: Bearer <token>`.

Design rules: nouns in URLs (never verbs), the HTTP method carries the action, plural resource names, and every list is paginated.

## 1. Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | POST | `/v1/auth/login` | Exchange email and password for an access token | 200 OK |
| 2 | GET | `/v1/notes` | List the current user's notes (paginated, filter by `tag`) | 200 OK |
| 3 | POST | `/v1/notes` | Create a note | 201 Created |
| 4 | GET | `/v1/notes/{id}` | Get one note | 200 OK |
| 5 | PUT | `/v1/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| 6 | DELETE | `/v1/notes/{id}` | Delete a note | 204 No Content |
| 7 | GET | `/v1/tags` | List the current user's tags | 200 OK |
| 8 | PUT | `/v1/notes/{id}/tags/{tagId}` | Attach a tag to a note (idempotent) | 204 No Content |
| 9 | DELETE | `/v1/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

Query parameters for `GET /v1/notes`: `limit` (default 20, max 100), `cursor` (opaque value from the previous page) and `tag` (filter by tag name).

## 2. Examples

### Create a note: `POST /v1/notes`

Request:

```json
{
  "title": "Buy milk",
  "body": "2 litres, semi-skimmed",
  "tags": ["shopping", "home"]
}
```

Rules: `title` is required, 1 to 100 characters; `body` is optional; `tags` is optional.

Response: `201 Created` with header `Location: /v1/notes/4821`

```json
{
  "id": 4821,
  "title": "Buy milk",
  "body": "2 litres, semi-skimmed",
  "tags": ["shopping", "home"],
  "userId": 17,
  "createdAt": "2026-10-29T09:14:03Z",
  "updatedAt": "2026-10-29T09:14:03Z"
}
```

### List notes: `GET /v1/notes?limit=2&tag=shopping`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 4821,
      "title": "Buy milk",
      "body": "2 litres, semi-skimmed",
      "tags": ["shopping", "home"],
      "createdAt": "2026-10-29T09:14:03Z",
      "updatedAt": "2026-10-29T09:14:03Z"
    },
    {
      "id": 4790,
      "title": "Birthday gift ideas",
      "body": "Book, headphones",
      "tags": ["shopping"],
      "createdAt": "2026-10-27T18:40:55Z",
      "updatedAt": "2026-10-28T07:02:11Z"
    }
  ],
  "page": {
    "limit": 2,
    "nextCursor": "eyJpZCI6NDc5MH0",
    "hasMore": true
  }
}
```

An empty result is still `200 OK` with `"data": []` (not 404).

## 3. Error status codes

| Status | Meaning | When the API returns it |
|--------|---------|-------------------------|
| 400 Bad Request | Invalid input | Missing title, title over 100 characters, malformed JSON, bad `limit` |
| 401 Unauthorized | Not authenticated | Missing, expired or invalid token; wrong login credentials |
| 403 Forbidden | Authenticated but not allowed | Trying to read, edit or delete another user's note |
| 404 Not Found | Resource does not exist | Unknown note id or tag id |
| 409 Conflict | State conflict | Duplicate tag name for the same user |
| 429 Too Many Requests | Rate limit exceeded | More than 100 requests per minute per user (includes `Retry-After` header) |
| 500 Internal Server Error | Unexpected server fault | Unhandled exception; details are logged, never sent to the client |
| 503 Service Unavailable | Temporarily overloaded or in maintenance | Database failover in progress |

All errors use one consistent body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be 100 characters or fewer.",
    "details": [
      { "field": "title", "issue": "max_length_exceeded", "max": 100 }
    ],
    "requestId": "req_8f3a2c1d"
  }
}
```

Other examples of the same shape: `{"error": {"code": "NOT_FOUND", "message": "Note 9999 was not found.", "requestId": "req_1b7e90aa"}}` for 404, and `{"error": {"code": "INTERNAL_ERROR", "message": "Something went wrong. Please try again.", "requestId": "req_5d02f6b3"}}` for 500.

## 4. Design notes

- **Idempotency:** GET, PUT and DELETE are idempotent. For safe retries of POST, clients may send an `Idempotency-Key` header and the server returns the original response for repeated keys.
- **Ownership:** every query is filtered by the token's user id, so users only see their own notes. Accessing someone else's note returns 403 (or 404 if we prefer not to reveal that it exists).
- **Pagination:** cursor-based, because offset pagination gets slow and inconsistent on large, changing tables.
- **Versioning:** the `/v1` prefix lets us make breaking changes later under `/v2`.