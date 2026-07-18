// src/lib/supabase/server.ts

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Silenciado intencionalmente — setAll se invoca desde
            // Server Components donde escribir cookies no está permitido.
            // El refresh real de la sesión ahora ocurre en proxy.ts.
          }
        },
      },
    }
  );
}

/**
 * Retorna el usuario autenticado actual, o null.
 *
 * Envuelto en cache() de React para que varias llamadas dentro del
 * mismo request (ej. el layout de (app) Y la page que renderiza)
 * peguen a la Auth API de Supabase una sola vez, no una por caller.
 * Usar siempre esto en vez de llamar supabase.auth.getUser() directo
 * en Server Components.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
