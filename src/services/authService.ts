// Local accounts: username + password stored ONLY on this device (no server yet).
// Passwords are never stored in plain text: PBKDF2-SHA256 with a random salt.
// The real backend will replace the internals; the function signatures stay.
// Imported first so an old-data wipe runs before any account is read.
import "@/lib/freshStart";

export type AuthUser = { id: string; name: string; createdAt: number };

type StoredAccount = AuthUser & { salt: string; hash: string };

const ACCOUNTS_KEY = "mrhrhr.accounts";
const SESSION_KEY = "mrhrhr.session";
const ITERATIONS = 150_000;

export class AuthError extends Error {}

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(list: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function validateUsername(name: string): string | null {
  if (name.length < 3 || name.length > 20) return "Username must be 3–20 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(name)) return "Use letters, numbers and underscores only.";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 6) return "Password must be at least 6 characters.";
  return null;
}

/** The signed-in user (synchronous — used to key per-user storage). */
export function currentUserSync(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const acc = readAccounts().find((a) => a.id === id);
  return acc ? { id: acc.id, name: acc.name, createdAt: acc.createdAt } : null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return currentUserSync();
}

export function hasAnyAccount(): boolean {
  return readAccounts().length > 0;
}

export async function register(username: string, password: string): Promise<AuthUser> {
  const name = username.trim();
  const err = validateUsername(name) ?? validatePassword(password);
  if (err) throw new AuthError(err);
  const accounts = readAccounts();
  const id = name.toLowerCase();
  if (accounts.some((a) => a.id === id)) throw new AuthError("That username is already used on this device.");
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const acc: StoredAccount = { id, name, createdAt: Date.now(), salt, hash: await hashPassword(password, salt) };
  writeAccounts([...accounts, acc]);
  localStorage.setItem(SESSION_KEY, id);
  return { id, name, createdAt: acc.createdAt };
}

export async function signIn(username: string, password: string): Promise<AuthUser> {
  const id = username.trim().toLowerCase();
  const acc = readAccounts().find((a) => a.id === id);
  if (!acc || (await hashPassword(password, acc.salt)) !== acc.hash) {
    throw new AuthError("Wrong username or password.");
  }
  localStorage.setItem(SESSION_KEY, id);
  return { id: acc.id, name: acc.name, createdAt: acc.createdAt };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}

export async function changePassword(current: string, next: string): Promise<void> {
  const me = currentUserSync();
  if (!me) throw new AuthError("Not signed in.");
  const err = validatePassword(next);
  if (err) throw new AuthError(err);
  const accounts = readAccounts();
  const acc = accounts.find((a) => a.id === me.id)!;
  if ((await hashPassword(current, acc.salt)) !== acc.hash) throw new AuthError("Current password is wrong.");
  acc.salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  acc.hash = await hashPassword(next, acc.salt);
  writeAccounts(accounts);
}

/** Removes the account from this device and returns its id (the caller deletes its progress). */
export async function deleteAccount(password: string): Promise<string> {
  const me = currentUserSync();
  if (!me) throw new AuthError("Not signed in.");
  const accounts = readAccounts();
  const acc = accounts.find((a) => a.id === me.id)!;
  if ((await hashPassword(password, acc.salt)) !== acc.hash) throw new AuthError("Password is wrong.");
  writeAccounts(accounts.filter((a) => a.id !== me.id));
  localStorage.removeItem(SESSION_KEY);
  return me.id;
}

/** Public info for every profile on this device (for local leaderboards). */
export function listAccounts(): AuthUser[] {
  return readAccounts().map(({ id, name, createdAt }) => ({ id, name, createdAt }));
}
