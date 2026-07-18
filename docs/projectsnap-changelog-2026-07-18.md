# ProjectSnap — Changelog de auditoría y optimización (Jul 2026)

**Repo:** github.com/jdevshington/projectsnap (renombrado de `worklog`)
**Stack:** Next.js 16.2.x (App Router, Turbopack) / React 19 / Supabase (`@supabase/ssr`) / Tailwind v4
**Deploy:** Vercel (projectsnap.online)
**Versión en `package.json` al iniciar esta ronda:** `1.5.0`

Este documento resume todo lo auditado y corregido en esta sesión, para dar contexto a
cualquier chat nuevo (Claude o Claude Code) que retome el proyecto.

---

## 1. Seguridad

| Item                                                       | Estado        | Detalle                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deletePhoto` borraba storage antes de verificar ownership | ✅ Corregido  | Ahora verifica en `photos` (`id` + `user_id`) que el archivo pertenece al usuario **antes** de tocar Supabase Storage.                                                                                                                                                            |
| `proxy.ts` (middleware) era un no-op                       | ✅ Corregido  | Ahora refresca la sesión de Supabase de verdad (antes el refresh se perdía en silencio) y redirige a `/login` a nivel de Edge para rutas protegidas.                                                                                                                              |
| Validación de inputs manual y dispersa en Server Actions   | ✅ Corregido  | Migrado a **Zod** (`apartments/schema.ts`, `auth/schema.ts`, `profile/schema.ts`). Cambio de comportamiento notado: `signUp` ahora exige password de 8+ caracteres (antes dependía del mínimo de Supabase), y `signIn`/`signUp` validan formato de email antes de golpear la API. |
| RLS en Supabase                                            | ✅ Verificado | Confirmado con captura del dashboard: políticas activas en `apartment_records`, `photos`, `profiles`, `work_sessions`, todas filtradas por usuario.                                                                                                                               |
| Fila en `profiles` al hacer signUp                         | ✅ Confirmado | Existe trigger `on_auth_user_created` → función `handle_new_user` sobre `auth.users` (schema `auth`). También hay `on_auth_user_updated` → `sync_user_display_name`. Confirmado en Supabase Dashboard → Database → Triggers (schema `auth`).                                      |

## 2. Performance

| Item                                                                                                                        | Estado        | Detalle                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth check duplicado (layout + cada page)                                                                                   | ✅ Corregido  | `getUser()` envuelto en `cache()` de React (`lib/supabase/server.ts`) — una sola llamada real a Supabase por request, compartida entre el layout y la page.                                                                                                                                                                       |
| Uploads de fotos secuenciales                                                                                               | ✅ Corregido  | `createApartment`/`updateApartment` usan `Promise.allSettled` en vez de `for...of` con `await`.                                                                                                                                                                                                                                   |
| `PhotoUpload` con hidden inputs + `DataTransfer`                                                                            | ✅ Rediseñado | Ahora es un componente controlado (`files: File[]` + `onChange`); el `FormData` se arma a mano en `apartment-form.tsx` con `startTransition(() => dispatch(formData))`.                                                                                                                                                           |
| `<img>` sin `next/image` en fotos reales                                                                                    | ✅ Corregido  | `apartments/[id]/page.tsx` y `photo-manager.tsx` migrados a `next/image` (`fill` + `sizes`). `photo-upload.tsx` se dejó con `<img>` a propósito — son previews `blob:` locales, no remotas, `next/image` no aplica ahí.                                                                                                           |
| `images.qualities` sin configurar                                                                                           | ✅ Corregido  | `next.config.ts` → `qualities: [50, 75]`; `photo-manager.tsx` usa `quality={50}` en los thumbnails.                                                                                                                                                                                                                               |
| `queries.ts` con `select("*")`                                                                                              | ✅ Corregido  | `apartments/queries.ts` (lista) y `work-sessions/queries.ts` seleccionan solo las columnas que la UI usa. `getApartmentById` y `getProfile` se dejaron igual (ya necesitaban todo / ya estaban óptimos).                                                                                                                          |
| `format.ts` con locale hardcodeado en `en-US`                                                                               | ✅ Corregido  | Recibe `Locale` (`en`/`es`) como parámetro, mapea a `en-US`/`es-DO`. Actualizado en los 4 call sites (`apartments/[id]/page.tsx`, `apartments/page.tsx`, `session-history.tsx`, `active-session-card.tsx`).                                                                                                                       |
| Fuente `Geist_Mono` cargándose sin usarse                                                                                   | ✅ Corregido  | Eliminada de `app/layout.tsx` — no estaba referenciada en `globals.css`, era peso muerto en cada carga.                                                                                                                                                                                                                           |
| `/` hacía doble redirect para usuarios sin sesión                                                                           | ✅ Corregido  | `app/page.tsx` ahora chequea `getUser()` y decide `/dashboard` o `/login` directo, en vez de rebotar por `(app)/layout.tsx`.                                                                                                                                                                                                      |
| 5 tipos distintos de estado en Server Actions (`FormState`, `ActionState`, `ActionResult`, `BasicState`, `AuthActionState`) | ✅ Unificado  | Un solo tipo genérico `ActionState<T>` en `lib/action-state.ts`.                                                                                                                                                                                                                                                                  |
| `metadataBase` vs `NEXT_PUBLIC_SITE_URL`                                                                                    | ✅ Confirmado | Coinciden en Vercel → Environment Variables.                                                                                                                                                                                                                                                                                      |
| `js-cookie` (cliente) + `next/headers` (servidor) leyendo el locale por separado                                            | ✅ Corregido  | Se extrajo `getLocale()` en `lib/i18n/server.ts` como única fuente de lectura en servidor; `getT()` y `(app)/layout.tsx` ahora la reusan en vez de leer la cookie cada uno por su lado. El lado cliente (`i18n/context.tsx` con `js-cookie`) se dejó igual — es el mecanismo correcto para escribir el cookie desde el navegador. |

## 3. Housekeeping / dependencias

| Item                                                         | Estado                                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@phosphor-icons/react` sin uso                              | ✅ Eliminado                                                                                                                                                                             |
| `tsconfig.json` target ES2017                                | ✅ Subido a ES2022                                                                                                                                                                       |
| `lucide-react@1.17.0` reportado como "viejo"                 | ✅ Aclarado — el reporte previo estaba mal, lucide-react reinició su versionado hacia 1.x en 2026; no era un problema real                                                               |
| `react-hook-form` + `@hookform/resolvers` instalados sin uso | ✅ Eliminados de `package.json` — se decidió no implementarlos, Zod ya cubre la validación.                                                                                              |
| `zod` instalado sin uso                                      | ✅ Resuelto — migrado a uso real en las 3 Server Actions principales                                                                                                                     |
| `reactCompiler: true` / `cacheComponents: true`              | ⏸️ Evaluado, no aplicado — requieren testing manual propio (navegar la app completa buscando regresiones) antes de activarse; no se activan a ciegas. Queda como mejora futura opcional. |

## 4. Archivos nuevos creados en esta ronda

- `src/lib/action-state.ts`
- `src/features/apartments/schema.ts`
- `src/features/auth/schema.ts`
- `src/features/profile/schema.ts`
- `src/app/(app)/error.tsx`
- `src/app/(auth)/error.tsx`

## 5. Archivos modificados en esta ronda

`src/proxy.ts`, `src/lib/supabase/server.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`,
`src/app/(app)/apartments/page.tsx`, `src/app/(app)/apartments/[id]/page.tsx`,
`src/app/(app)/apartments/[id]/edit/page.tsx`, `src/app/(app)/history/page.tsx`,
`src/app/(app)/profile/page.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`,
`src/features/apartments/actions.ts`, `src/features/apartments/queries.ts`,
`src/features/apartments/components/apartment-form.tsx`,
`src/features/apartments/components/photo-upload.tsx`,
`src/features/apartments/components/photo-manager.tsx`,
`src/features/auth/actions.ts`, `src/features/profile/actions.ts`,
`src/features/work-sessions/actions.ts`, `src/features/work-sessions/queries.ts`,
`src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`,
`src/lib/format.ts`, `src/lib/i18n/server.ts`, `next.config.ts`, `package.json`, `tsconfig.json`

## 6. Pendientes reales para la próxima sesión

1. (Opcional, requiere testing propio) Evaluar `reactCompiler: true` y `cacheComponents: true` en `next.config.ts` — mejoras reales de Next 16, no aplicadas a ciegas en esta ronda; requieren que el usuario navegue la app completa buscando regresiones antes de activarlas.

Todo lo demás de la lista original (seguridad, performance, dependencias sueltas, RLS, trigger de `profiles`, `metadataBase`) quedó cerrado y confirmado en esta ronda.

---

## Nota sobre versionado

`package.json` sigue en `1.5.0` — no se tocó durante esta ronda (no era parte del pedido).
Para versionar esto correctamente cuando hagas el próximo release, la convención estándar es
**SemVer** (`MAJOR.MINOR.PATCH`):

- Todo lo de esta ronda son **fixes de seguridad, performance y correcciones internas**, sin
  romper ninguna funcionalidad ni cambiar la API pública de la app → esto calificaría como un
  bump de **MINOR** (`1.5.0` → `1.6.0`) si lo agrupas todo en un release, o varios **PATCH**
  (`1.5.1`, `1.5.2`...) si prefieres versionar cada tanda de commits por separado.
- Un **MAJOR** (`2.0.0`) se reserva para cambios que rompan compatibilidad — no es el caso aquí.

Si quieres, en la próxima sesión te ayudo a armar el flujo completo: bump de versión en
`package.json` + tag de Git (`git tag v1.6.0`) + changelog por release.
