const COOKIE_NAME = "stamtree-auth";

function getRequiredEnv(name: "STAMTREE_SESSION_SECRET") {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPasswordHashEnv() {
  return import.meta.env.FAMILY_TREE_PASSWORD_HASH;
}

function getLegacyPasswordEnv() {
  return import.meta.env.STAMTREE_PASSWORD;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getAuthCookieName() {
  return COOKIE_NAME;
}

export async function hashPassword(password: string) {
  return sha256(password);
}

export async function verifyPassword(password: string) {
  const configuredHash = getPasswordHashEnv();

  if (configuredHash) {
    return configuredHash === (await hashPassword(password));
  }

  const legacyPassword = getLegacyPasswordEnv();

  if (legacyPassword) {
    return legacyPassword === password;
  }

  throw new Error(
    "Missing required environment variable: FAMILY_TREE_PASSWORD_HASH or STAMTREE_PASSWORD",
  );
}

export async function getExpectedAuthToken() {
  const configuredHash = getPasswordHashEnv();
  const passwordHash = configuredHash
    ? configuredHash
    : getLegacyPasswordEnv()
      ? await hashPassword(getLegacyPasswordEnv()!)
      : null;
  const secret = getRequiredEnv("STAMTREE_SESSION_SECRET");

  if (!passwordHash) {
    throw new Error(
      "Missing required environment variable: FAMILY_TREE_PASSWORD_HASH or STAMTREE_PASSWORD",
    );
  }

  return sha256(`${passwordHash}:${secret}`);
}

export async function isAuthenticated(cookies: AstroCookies) {
  const currentToken = cookies.get(COOKIE_NAME)?.value;

  if (!currentToken) {
    return false;
  }

  return currentToken === (await getExpectedAuthToken());
}

export async function createAuthCookieValue() {
  return getExpectedAuthToken();
}

export function getCookieOptions(url: URL) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
