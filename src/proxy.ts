import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { safeNext } from "@/domain/query"

/**
 * Next 16's request gate (the convention formerly called middleware.ts): refreshes the Supabase session
 * cookies and sends anyone without a verified session to /login (and a signed-in visitor away from it).
 * Whether the account is an admin is the API's call (GET /v1/admin/me), checked by the panel layout.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const { pathname, search } = request.nextUrl
  const onLogin = pathname === "/login"

  // Not set up: the sign-in page explains what is missing.
  if (!url || !key) return onLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url))

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value)
      },
    },
  })

  // Verifies the token (JWKS) and refreshes it when it is about to expire. Nothing may run in between.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  if (signedIn === !onLogin) return response

  const target = signedIn
    ? new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url)
    : new URL(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname + search)}`, request.url)
  const redirect = NextResponse.redirect(target)
  // The refreshed session must reach the browser on the redirect too.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header)
    if (value) redirect.headers.set(header, value)
  }
  return redirect
}

export const config = {
  // Everything but Next's assets, static files and /v1 (the dev proxy to the API: large bodies, own auth).
  matcher: ["/((?!_next/static|_next/image|v1/|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
}
