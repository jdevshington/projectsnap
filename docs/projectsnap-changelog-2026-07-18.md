# ProjectSnap — Changelog de auditoría y optimización (Jul 2026)

**Repo:** github.com/jdevshington/projectsnap (renombrado de `worklog`)
**Stack:** Next.js 16.2.x (App Router, Turbopack) / React 19 / Supabase (`@supabase/ssr`) / Tailwind v4
**Deploy:** Vercel (projectsnap.online)
**Versión en `package.json` al iniciar esta ronda:** `1.5.0`

Este documento resume todo lo auditado y corregido en las sesiones de Jul 2026, para dar
contexto a cualquier chat nuevo (Claude o Claude Code) que retome el proyecto.

> **Nota:** este archivo reemplaza a `projectsnap-changelog-2026-07-18.md`. Las secciones 1-6
> son la ronda original (seguridad/performance/housekeeping). La sección 7 es la ronda nueva
> (feature flag de UI + primera pantalla con la UI nueva).

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
| `queries.ts` con `select("*")`                                                                                              | ✅ Corregido  | `apartments/queries.ts` (lista) y `work-sessions/queries.ts` seleccionan solo las columnas que la UI usa. `getApartmentById` se dejó igual (ya necesitaba todo). `profile/queries.ts` ahora selecciona `full_name, use_new_ui` (ver sección 7).                                                                                   |
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

## 4. Archivos nuevos creados (ronda de seguridad/performance)

- `src/lib/action-state.ts`
- `src/features/apartments/schema.ts`
- `src/features/auth/schema.ts`
- `src/features/profile/schema.ts`
- `src/app/(app)/error.tsx`
- `src/app/(auth)/error.tsx`

## 5. Archivos modificados (ronda de seguridad/performance)

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

---

## 7. Feature flag de UI + Apartments V2 (ronda nueva)

**Objetivo:** permitir que el usuario elija entre la UI original y una UI nueva, empezando
solo por `/apartments` (buscador en tiempo real + filtro por fecha), sin duplicar rutas ni
tocar el middleware.

### 7.1 Metodología elegida

- **Descartado:** resolver el flag en `proxy.ts` (middleware). Corre en Edge en cada request
  a rutas protegidas — meterle una consulta a `profiles` ahí agrega latencia a toda la app,
  no solo a `/apartments`.
- **Descartado:** crear `apartments/v2/page.tsx` como ruta aparte. Duplicar rutas completas
  es doble mantenimiento (cada fix hay que arrastrarlo a las dos versiones).
- **Elegido:** columna `use_new_ui` en `profiles` + branch server-side dentro del mismo
  `apartments/page.tsx`: `if (profile.use_new_ui) return <ApartmentsListV2 ... />`. Reusa el
  mismo query (`getApartments`) y el mismo `getUser()` cacheado — cero round-trips extra,
  cero redirects.

### 7.2 Base de datos

```sql
-- supabase/migrations/20260718_add_use_new_ui.sql
alter table public.profiles
  add column if not exists use_new_ui boolean not null default false;
```

✅ Migración corrida en Supabase SQL Editor — columna existe, todos los usuarios en `false`
por default (nadie ve la UI nueva hasta que la activa manualmente).

### 7.3 Toggle en `/profile`

- Server Action `toggleUseNewUi(useNewUi: boolean)` en `features/profile/actions.ts` —
  mismo patrón que `deletePhoto` (llamada directa desde el cliente, no `FormData`/
  `useActionState`, porque es un solo booleano sin formulario alrededor).
- `getProfile()` ahora selecciona `full_name, use_new_ui` (antes solo `full_name`).
- Componente `features/profile/components/new-ui-toggle.tsx`: switch con badge "Beta",
  update optimista (revierte si la Server Action falla), y toast con **cuenta regresiva de
  5 segundos** antes de recargar la página (`window.location.reload()`, no
  `router.refresh()` — necesario porque el branch que decide qué UI mostrar vive en el
  Server Component, así que hace falta un request nuevo de verdad).
- **Bug encontrado y corregido en esta misma ronda:** la primera versión del switch usaba
  `position: absolute` + `translate-x-[22px]` (valor arbitrario en px) para mover la
  bolita. Eso dependía de que el navegador calculara la "posición estática" del elemento
  absoluto, lo cual es frágil — el switch se veía invertido (bolita a la derecha estando
  apagado) y se desbordaba al activarse. Se reemplazó por un enfoque **flexbox +
  padding** (`justify-start`/`justify-end` con `p-0.5` en el track): la bolita queda
  contenida por el propio layout, no por matemática de transform, así que no puede
  desbordarse. Se pierde la animación de slide (ahora el salto es instantáneo); queda
  pendiente si se quiere una transición suave sin volver a `translate` arbitrario.

### 7.4 `apartments/page.tsx` — branch server-side

```tsx
const [apartments, { t, locale }, profile] = await Promise.all([
  getApartments(user.id),
  getT(),
  getProfile(user.id),
]);

if (profile?.use_new_ui) {
  return <ApartmentsListV2 apartments={apartments} />;
}
// ...UI original sin cambios
```

**Detalle técnico importante:** `t` y `locale` (de `getT()`, que corre en el servidor) NO se
pasan como props a `ApartmentsListV2` — una función (`t`) no serializa cruzando el límite
Server → Client Component. `ApartmentsListV2` los saca de `useI18n()` (el mismo context que
ya usa `NamePromptModal` y `LocaleToggle`), no como prop del server.

### 7.5 `ApartmentsListV2` (nuevo componente)

`features/apartments/components/apartments-list-v2.tsx` — client component:

- **Buscador en tiempo real:** filtra en memoria por `apartment_number`/`location`
  (`useMemo`, sin queries nuevas a Supabase — la lista completa ya vino del server en el
  primer render).
- **Filtro por fecha:** chips `Todo el tiempo / Hoy / Esta semana / Este mes`.
- Mismos tokens de color y layout que la lista original (`#111110`/`#E2E2E0`/`#6F6F6C`/
  `#ADADAA`, mismas cards, mismo empty state) — cero rediseño, solo funcionalidad nueva.
- Maneja 3 estados: sin apartments (CTA para crear el primero), con apartments pero filtro
  sin resultados (estado "no matches"), y con resultados.

### 7.6 Archivos nuevos en esta ronda

- `supabase/migrations/20260718_add_use_new_ui.sql`
- `src/features/profile/components/new-ui-toggle.tsx`
- `src/features/apartments/components/apartments-list-v2.tsx`

### 7.7 Archivos modificados en esta ronda

- `src/features/profile/schema.ts` (+ `toggleUseNewUiSchema`)
- `src/features/profile/queries.ts` (`getProfile` ahora trae `use_new_ui`)
- `src/features/profile/actions.ts` (+ `toggleUseNewUi`)
- `src/app/(app)/profile/page.tsx` (renderiza `<NewUiToggle />`)
- `src/app/(app)/apartments/page.tsx` (branch server-side)
- `src/lib/i18n/translations.ts` (+ ~15 keys nuevas EN/ES: `profile.newUi*`,
  `apartments.search*`, `apartments.filter*`, `apartments.noResults`,
  `apartments.resultsCount`)

### 7.8 Pendientes / mejoras opcionales de esta ronda

1. `getProfile()` no está envuelto en `cache()` de React (a diferencia de `getUser()`). Con
   el toggle, ahora se llama en `/profile` y en `/apartments` — no es un bug, pero si se
   agregan más lugares que necesiten `profile`, vale la pena cachearlo igual que `getUser()`.
2. `"apartments.filterDate"` quedó como key de traducción sin uso visible (no hay label para
   el grupo de chips de fecha). No rompe nada — se puede usar como `aria-label` del
   contenedor de chips o borrarla.
3. Animación de slide del switch: se sacrificó al pasar de `translate` a `flex` +
   `justify-start/end`. Si se quiere recuperar el deslizamiento suave sin volver al bug
   original, evaluar `transition-all duration-200` sobre el padding/justify, o un enfoque
   con CSS Grid + `grid-template-columns` animado.
4. (Heredado de la ronda anterior, sigue igual) Evaluar `reactCompiler: true` y
   `cacheComponents: true` en `next.config.ts` — requiere testing manual navegando la app
   completa antes de activarse.

---

## Nota sobre versionado

`package.json` sigue en `1.5.0` — no se tocó en ninguna de las dos rondas.
Para versionar esto correctamente cuando hagas el próximo release, la convención estándar es
**SemVer** (`MAJOR.MINOR.PATCH`):

- La ronda de seguridad/performance (secciones 1-6): fixes internos sin romper funcionalidad
  ni cambiar la API pública → bump de **MINOR** (`1.5.0` → `1.6.0`) o varios **PATCH** si se
  versiona por tanda de commits.
- La ronda de UI (sección 7): agrega una columna nueva a `profiles` y una feature opt-in
  (default `false`, no cambia el comportamiento de nadie que no active el toggle) → también
  calificaría como **MINOR** (`1.6.0` → `1.7.0`), no como MAJOR, porque no rompe nada para
  quien no lo activa.
- Un **MAJOR** (`2.0.0`) se reserva para cambios que rompan compatibilidad — no es el caso
  en ninguna de las dos rondas.

Si quieres, en la próxima sesión te ayudo a armar el flujo completo: bump de versión en
`package.json` + tag de Git (`git tag v1.7.0`) + changelog por release.
