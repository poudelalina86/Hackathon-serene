/**
 * Lightweight session helpers.
 * The logged-in user is stored as JSON in localStorage under the key "serene_user".
 * Shape: { username, name, email, level, xp }
 */

const KEY = "serene_user"

/** Return the stored user object, or null if not logged in. */
export function getUser() {
    try {
        const raw = localStorage.getItem(KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

/** Return just the username string (most callers only need this). */
export function getUsername() {
    return getUser()?.username ?? null
}

/** Persist the user object returned by /login or /register. */
export function setUser(user) {
    localStorage.setItem(KEY, JSON.stringify(user))
}

/** Clear the session (logout). */
export function clearUser() {
    localStorage.removeItem(KEY)
}

/** True when a user is logged in. */
export function isLoggedIn() {
    return Boolean(getUser())
}

