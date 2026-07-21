// src/proxy.ts

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Corre en cada request a una ruta protegida. Dos responsabilidades,
 * ambas obligatorias:
 *
 * 1. Refrescar la sesión de Supabase y persistir las cookies renovadas
 *    en la response. Este es el ÚNICO lugar donde esto puede pasar de
 *    verdad — los Server Components pueden leer cookies pero no
 *    escribirlas, así que si este paso no ocurre aquí, los tokens
 *    renovados se pierden en silencio y la sesión muere sola aunque
 *    el usuario siga activo.
 * 2. Redirigir requests no autenticados a /login ANTES de que lleguen
 *    a un Server Component, para que las páginas no necesiten su
 *    propio auth check por seguridad — solo lo necesitan para leer
 *    `user.id` (ver getUser() en src/lib/supabase/server.ts, que
 *    dedupe esa llamada por request).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // No borrar esta llamada: es la que dispara el refresh del token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/apartments/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/billing/:path*",
  ],
};
