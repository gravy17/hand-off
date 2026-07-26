const USER_ID_KEY = 'handoff:userId';

/** Stable per-browser user id used as the JWT `sub` / signaling `userId`. */
export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_ID_KEY, id);
    return id;
  } catch {
    return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
