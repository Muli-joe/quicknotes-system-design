"use strict";

// ---------------------------------------------------------------
// QuickNotes API client (talks to the JSONPlaceholder practice API)
// ---------------------------------------------------------------
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("notes-list");

// Count of requests in flight, so buttons are re-enabled only when all finish.
let pendingRequests = 0;

/** Show a message. type: "loading" | "success" | "error" | "info". Uses textContent only. */
function setStatus(message, type = "info") {
    statusEl.textContent = message;
    statusEl.className = type;
}

/** Disable (or re-enable) every button while a request is running. */
function setBusy(isBusy) {
    pendingRequests += isBusy ? 1 : -1;
    const disabled = pendingRequests > 0;
    document.querySelectorAll("button").forEach((btn) => {
        btn.disabled = disabled;
    });
}

/**
 * Reusable request helper: calls fetch, checks response.ok and throws on errors.
 * Returns { status, data } so callers can show the status code.
 */
async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
    }
    // Some responses (e.g. DELETE) may have an empty body.
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
}

/** Turn a technical error into a friendly message. */
function friendlyError(error, action) {
    if (error.status) {
        return `Sorry, we couldn't ${action} (server responded with status ${error.status}). Please try again.`;
    }
    return `Sorry, we couldn't ${action}. Check your internet connection and try again.`;
}

/** Show or hide the empty-state message depending on whether notes exist. */
function refreshEmptyState() {
    const hasNotes = listEl.querySelector(".note") !== null;
    const empty = listEl.querySelector(".empty-state");
    if (hasNotes && empty) {
        empty.remove();
    } else if (!hasNotes && !empty) {
        const li = document.createElement("li");
        li.className = "empty-state";
        li.textContent = "No notes to show. Load notes or create one above.";
        listEl.append(li);
    }
}

/** Build one <li> for a note. User text is inserted with textContent only. */
function renderNote(note) {
    const li = document.createElement("li");
    li.className = "note";
    li.dataset.id = note.id;

    const title = document.createElement("h3");
    title.textContent = note.title;
    li.append(title);

    if (note.body) {
        const body = document.createElement("p");
        body.textContent = note.body;
        li.append(body);
    }
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`);
    deleteBtn.addEventListener("click", () => deleteNote(note.id, li));
    li.append(deleteBtn);
    return li;
}

// ---------------------------------------------------------------
// GET: load 10 notes
// ---------------------------------------------------------------
async function loadNotes() {
    setBusy(true);
    setStatus("Loading notes...", "loading");
    try {
        const { data } = await request(`${API_URL}?_limit=10`);
        listEl.replaceChildren();

        if (!Array.isArray(data) || data.length === 0) {
            refreshEmptyState();
            setStatus("The server has no notes yet.", "info");
            return;
        }

        data.forEach((note) => listEl.append(renderNote(note)));
        setStatus(`Loaded ${data.length} notes from the server.`, "success");
    } catch (error) {
        console.error(error);
        setStatus(friendlyError(error, "load your notes"), "error");
    } finally {
        setBusy(false);
    }
}

loadBtn.addEventListener("click", loadNotes);

// ---------------------------------------------------------------
// POST: create a note
// ---------------------------------------------------------------
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");

/** Returns an error message, or "" when the title is valid. */
function validateTitle(title) {
    if (title.length === 0) {
        return "Please enter a title for your note.";
    }
    if (title.length > MAX_TITLE_LENGTH) {
        return `The title must be ${MAX_TITLE_LENGTH} characters or fewer (it is ${title.length}).`;
    }
    return "";
}

async function createNote(title, body) {
    setBusy(true);
    setStatus("Saving note...", "loading");
    try {
        const { status, data } = await request(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ title, body, userId: 1 }),
        });
        listEl.prepend(renderNote(data));
        refreshEmptyState();
        form.reset(); // clear the form only after a successful save
        setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    } catch (error) {
        console.error(error);
        setStatus(friendlyError(error, "save your note"), "error");
    } finally {
        setBusy(false);
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    const problem = validateTitle(title);
    if (problem) {
        setStatus(problem, "error");
        titleInput.focus();
        return;
    }
    createNote(title, body);
});

// ---------------------------------------------------------------
// DELETE: remove a note
// ---------------------------------------------------------------
// NOTE ABOUT JSONPLACEHOLDER: it is a fake API. It accepts POST and DELETE
// requests and answers as a real server would (201 for POST, 200 for DELETE),
// but it never saves anything. So a note we "created" (id 101) does not truly
// exist on the server, and a "deleted" note will come back when the list is
// reloaded.
// Our approach: we still send a real DELETE /posts/{id} for every note, because
// that is the behaviour we want to prove. When the server confirms with a 2xx
// status we trust it and remove the note from the page (the UI mirrors the
// server's answer). We never remove a note if the request fails.
async function deleteNote(id, noteElement) {
    setBusy(true);
    setStatus(`Deleting note ${id}...`, "loading");
    try {
        const { status } = await request(`${API_URL}/${id}`, { method: "DELETE" });
        noteElement.remove();
        refreshEmptyState();
        setStatus(`Note ${id} deleted (status ${status}).`, "success");
    } catch (error) {
        console.error(error);
        setStatus(friendlyError(error, `delete note ${id}`), "error");
    } finally {
        setBusy(false);
    }
}