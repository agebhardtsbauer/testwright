import { readFile, writeFile, mkdir, rm, readdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import type { TestUser, Environment, SessionOptions } from "../types/index.js";

/** Default cache directory for session files */
const DEFAULT_CACHE_DIR = ".auth";

/** Default session TTL: 24 hours in milliseconds */
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

/**
 * Session metadata stored alongside Playwright storage state
 */
interface SessionMetadata {
  userId: string;
  domain: string;
  environment: Environment;
  createdAt: string;
  expiresAt: string;
}

/**
 * Complete session file structure
 */
interface SessionFile {
  metadata: SessionMetadata;
  storageState: StorageState;
}

/**
 * Playwright storage state structure
 */
interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

/**
 * Build the session file path for a user/domain/environment combination
 *
 * @param userId - User ID
 * @param domain - Domain name
 * @param environment - Environment
 * @param cacheDir - Cache directory (defaults to .auth/)
 * @returns Full path to session file
 *
 * @example
 * ```typescript
 * const path = getSessionFilePath('user-1', 'domain-alpha', 'dev');
 * // Returns: '.auth/user-1_domain-alpha_dev.json'
 * ```
 */
export function getSessionFilePath(
  userId: string,
  domain: string,
  environment: Environment,
  cacheDir: string = DEFAULT_CACHE_DIR
): string {
  const filename = `${userId}_${domain}_${environment}.json`;
  return join(cacheDir, filename);
}

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(cacheDir: string): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
}

/**
 * Read session file and parse it
 */
async function readSessionFile(
  sessionPath: string
): Promise<SessionFile | null> {
  try {
    const content = await readFile(sessionPath, "utf-8");
    return JSON.parse(content) as SessionFile;
  } catch {
    return null;
  }
}

/**
 * Check if a cached session exists and is still valid
 *
 * @param userId - User ID
 * @param domain - Domain name
 * @param environment - Environment
 * @param options - Session options
 * @returns True if a valid session exists
 */
export async function isSessionValid(
  userId: string,
  domain: string,
  environment: Environment,
  options?: SessionOptions
): Promise<boolean> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const sessionPath = getSessionFilePath(userId, domain, environment, cacheDir);

  const sessionFile = await readSessionFile(sessionPath);
  if (!sessionFile) {
    return false;
  }

  const expiresAt = new Date(sessionFile.metadata.expiresAt);
  return expiresAt > new Date();
}

/**
 * Get the storage state path for an existing valid session
 *
 * Returns the path to the session file if it exists and is valid,
 * or null if no valid session exists.
 *
 * @param userId - User ID
 * @param domain - Domain name
 * @param environment - Environment
 * @param options - Session options
 * @returns Path to session file or null
 */
export async function getSessionPath(
  userId: string,
  domain: string,
  environment: Environment,
  options?: SessionOptions
): Promise<string | null> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const sessionPath = getSessionFilePath(userId, domain, environment, cacheDir);

  const isValid = await isSessionValid(userId, domain, environment, options);
  if (isValid) {
    return sessionPath;
  }

  return null;
}

/**
 * Get the Playwright storage state from a session file
 *
 * @param sessionPath - Path to the session file
 * @returns Storage state object or null if file doesn't exist
 */
export async function getStorageState(
  sessionPath: string
): Promise<StorageState | null> {
  const sessionFile = await readSessionFile(sessionPath);
  return sessionFile?.storageState ?? null;
}

/**
 * Save a session after successful authentication
 *
 * Stores both the Playwright storage state and custom metadata
 * with TTL information.
 *
 * @param user - Test user the session belongs to
 * @param domain - Domain the session is valid for
 * @param environment - Environment the session is valid for
 * @param storageState - Playwright storage state to save
 * @param options - Session options (TTL, cache directory)
 * @returns Path to the saved session file
 */
export async function saveSession(
  user: TestUser,
  domain: string,
  environment: Environment,
  storageState: StorageState,
  options?: SessionOptions
): Promise<string> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const ttl = options?.ttl ?? DEFAULT_TTL;

  await ensureCacheDir(cacheDir);

  const sessionPath = getSessionFilePath(user.id, domain, environment, cacheDir);
  const now = new Date();

  const sessionFile: SessionFile = {
    metadata: {
      userId: user.id,
      domain,
      environment,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttl).toISOString(),
    },
    storageState,
  };

  // Write to temp file first, then rename for atomic operation
  const tempPath = `${sessionPath}.tmp`;
  await writeFile(tempPath, JSON.stringify(sessionFile, null, 2), "utf-8");

  // Rename is atomic on most file systems
  const { rename } = await import("fs/promises");
  await rename(tempPath, sessionPath);

  return sessionPath;
}

/**
 * Clear a specific cached session
 *
 * @param userId - User ID
 * @param domain - Domain name
 * @param environment - Environment
 * @param options - Session options
 */
export async function clearSession(
  userId: string,
  domain: string,
  environment: Environment,
  options?: SessionOptions
): Promise<void> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const sessionPath = getSessionFilePath(userId, domain, environment, cacheDir);

  try {
    await unlink(sessionPath);
  } catch (error) {
    // Ignore error if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Clear all cached sessions
 *
 * Removes all session files from the cache directory.
 *
 * @param options - Session options
 */
export async function clearSessionCache(options?: SessionOptions): Promise<void> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;

  try {
    const files = await readdir(cacheDir);
    const sessionFiles = files.filter((f) => f.endsWith(".json"));

    await Promise.all(
      sessionFiles.map((file) => unlink(join(cacheDir, file)))
    );
  } catch (error) {
    // Ignore error if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Get session metadata without the storage state
 *
 * Useful for checking session info without loading full state.
 *
 * @param sessionPath - Path to session file
 * @returns Session metadata or null
 */
export async function getSessionMetadata(
  sessionPath: string
): Promise<SessionMetadata | null> {
  const sessionFile = await readSessionFile(sessionPath);
  return sessionFile?.metadata ?? null;
}

/**
 * List all cached sessions
 *
 * @param options - Session options
 * @returns Array of session metadata for all cached sessions
 */
export async function listSessions(
  options?: SessionOptions
): Promise<SessionMetadata[]> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;

  try {
    const files = await readdir(cacheDir);
    const sessionFiles = files.filter((f) => f.endsWith(".json"));

    const sessions: SessionMetadata[] = [];
    for (const file of sessionFiles) {
      const metadata = await getSessionMetadata(join(cacheDir, file));
      if (metadata) {
        sessions.push(metadata);
      }
    }

    return sessions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Clear expired sessions from the cache
 *
 * @param options - Session options
 * @returns Number of sessions cleared
 */
export async function clearExpiredSessions(
  options?: SessionOptions
): Promise<number> {
  const cacheDir = options?.cacheDir ?? DEFAULT_CACHE_DIR;
  const now = new Date();
  let cleared = 0;

  try {
    const files = await readdir(cacheDir);
    const sessionFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of sessionFiles) {
      const sessionPath = join(cacheDir, file);
      const metadata = await getSessionMetadata(sessionPath);

      if (metadata && new Date(metadata.expiresAt) <= now) {
        await unlink(sessionPath);
        cleared++;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return cleared;
}
