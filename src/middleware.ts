import { defineMiddleware } from "astro:middleware";
import { getAuthCookieName, isAuthenticated } from "./lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/logout"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const authenticated = await isAuthenticated(context.cookies);

  context.locals.isAuthenticated = authenticated;

  if (!pathname.startsWith("/tree")) {
    return next();
  }

  if (PUBLIC_PATHS.has(pathname) || authenticated) {
    return next();
  }

  const redirectTarget = encodeURIComponent(`${pathname}${search}`);
  const loginUrl = new URL(`/login?next=${redirectTarget}`, context.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: loginUrl.toString(),
      "Set-Cookie": `${getAuthCookieName()}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
    },
  });
});
