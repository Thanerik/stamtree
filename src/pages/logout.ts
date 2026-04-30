import type { APIRoute } from "astro";
import { getAuthCookieName } from "../lib/auth";

export const GET: APIRoute = ({ cookies, redirect, url }) => {
  cookies.delete(getAuthCookieName(), {
    path: "/",
  });

  return redirect(new URL("/login", url).toString(), 302);
};
