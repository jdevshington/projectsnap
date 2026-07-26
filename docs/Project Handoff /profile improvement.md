# ProjectSnap — Billing con PayPal: handoff v5 (Jul 25, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `projectsnap-billing-handoff-v4-2026-07-25.md`.

## 🎉 ESTADO: end-to-end confirmado en Vercel Preview + los 4 hallazgos de la auditoría YA RESUELTOS (código + DB real)

Todo lo de v3 y v4 sigue en pie (checkout completo, verificación de firma, upsert, gating, fix de Vercel Deployment Protection). Esta versión cierra el ciclo de la auditoría del 25 de julio: los 4 hallazgos Alto/Medio están corregidos, verificados con `tsc`/`lint`/`build`, y aplicados en la base de datos real — no solo en el repo.

## Bug de infraestructura resuelto: Vercel Deployment Protection bloqueaba el webhook (401)

Sin cambios respecto a v4 — ver ese handoff para el detalle completo. Resumen: Vercel Authentication (SSO) interceptaba las requests de PayPal con 401 antes de llegar al route handler. Fix: se desactivó "Require Vercel Authentication" para el proyecto. Trade-off aceptado: `qa.projectsnap.online` queda públicamente accesible sin login de Vercel — revisar si se reactiva con "Protection Bypass for Automation" antes de que este entorno se vuelva sensible.

## ✅ Los 4 hallazgos de la auditoría del repo (Jul 25) — RESUELTOS

1. **[Resuelto] Refund ahora cancela la suscripción en PayPal** — `src/app/api/paypal/refund/route.ts` llama a `POST /v1/billing/subscriptions/{id}/cancel` (try/catch: si falla, loggea y continúa igual con `status: 'expired'` local, porque el acceso ya se revoca de todas formas) antes del update en la DB.
2. **[Resuelto] Refund ordena transacciones por fecha real, no por string ID** — el sort ahora usa el campo `time` (ISO 8601 → epoch) de la respuesta de PayPal, descendente, en vez de comparar `a.id < b.id`.
3. **[Resuelto] `has_paid_access(uid)` restringido a `auth.uid()`** — migración `supabase/migrations/20260725_lock_has_paid_access.sql`, **aplicada en Supabase SQL Editor** (confirmado, no solo en el repo). Reescrita en `plpgsql`: si `auth.uid()` no es null, exige `uid = auth.uid()`; si es null (llamada de `service_role`, ej. el webhook), conserva el comportamiento original. Cualquier usuario autenticado ya no puede consultar el estado de pago de otra cuenta.
4. **[Resuelto] `get_user_id_by_email` capturada y versionada** — se descubrió que la función **no existía en absoluto** en Supabase (no era solo "sin versionar", estaba ausente por completo). Se creó de cero:

   ```sql
   create or replace function public.get_user_id_by_email(p_email text)
   returns uuid
   language sql
   stable
   security definer
   set search_path = public, auth
   as $$
     select id from auth.users where lower(email) = lower(p_email) limit 1;
   $$;

   revoke all on function public.get_user_id_by_email(text) from public;
   grant execute on function public.get_user_id_by_email(text) to service_role;
   ```

   Verificada contra un usuario real (devolvió el UUID correcto), aplicada en Supabase, y capturada en `supabase/migrations/20260725_capture_get_user_id_by_email.sql` con la definición real (confirmada byte-a-byte contra `pg_get_functiondef`).
   Se confirmó además que `billing_incidents` con `reason = 'cannot_resolve_user'` estaba vacía — la ausencia de esta función nunca llegó a morder en producción/sandbox porque el placeholder row de `create-subscription` siempre resolvió el `user_id` primero.

**Limpieza también aplicada:** `webhook-route.ts` (duplicado exacto de `route.ts`, 397 líneas de código muerto) y `CheckoutError` (componente sin ningún import en el repo) — ambos borrados.

**Commit:** `fix: refund cancels PayPal subscription, sort by time not id, restrict has_paid_access to auth.uid(), capture get_user_id_by_email migration, remove dead code` — pusheado con ambas migraciones (`20260725_lock_has_paid_access.sql`, `20260725_capture_get_user_id_by_email.sql`) ya aplicadas en Supabase antes del push.

Reporte completo original con severidad/esfuerzo: `projectsnap-audit-qa-payments.md`.

## Todo lo demás sigue igual — no repetir

- Las 10 decisiones de negocio (recurrente, $15/mes, trial 7 días, reembolso 14 días, usuarios exentos, etc.)
- La arquitectura (webhook como única fuente de verdad, `has_paid_access()` como gate único, service role solo en `admin.ts`, gating por página no en layout)
- Los bugs corregidos en rondas anteriores (current_period_end fallback, onConflict en user_id, plan faltante, timeout de paypal-button.tsx)
- El bug de display `"active"` vs `"trialing"` durante el trial — sigue pendiente, cosmético, baja prioridad (único ítem de la auditoría original que quedó sin tocar, por decisión, ya que es de prioridad baja)

## Pendientes reales antes de producción

1. **Probar el flujo de cancelación** — click en "Cancelar suscripción" en `/profile`, confirmar que PayPal la marca para cancelar al final del período, y que el webhook `CANCELLED` eventualmente llega y actualiza `status`.
2. **Probar el flujo de reembolso** — ahora con el fix aplicado, confirmar que además de reembolsar el pago, la suscripción efectivamente queda cancelada en PayPal (revisar en el dashboard de PayPal que el status pase a `CANCELLED`, no solo `status: 'expired'` en la DB). Probar dentro y fuera de la ventana de 14 días.
3. **Fix opcional del bug de display** (`"active"` vs `"trialing"` durante trial) — cosmético, no bloqueante.
4. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live` con credenciales reales, crear el producto/plan real (no sandbox) con `create-paypal-plan.mjs`, registrar el webhook de producción, y decidir la postura final de Deployment Protection en Vercel para el dominio de producción (probablemente sí se quiere protección + Protection Bypass ahí, a diferencia de QA).
5. Limpiar filas de prueba en `subscriptions`/`billing_incidents` antes de producción si se desea (no obligatorio).

## Nota de proceso (para el próximo Claude)

Tres lecciones de esta ronda: (1) cuando un webhook "no llega", mirar primero el historial de transmisión en el dashboard de PayPal (http_status + headers) antes de tocar código — ya van tres causas de infraestructura distintas para el mismo síntoma. (2) Una función SQL "creada a mano" puede no solo estar sin versionar sino no existir en absoluto — verificar con `pg_get_functiondef`/`select * from pg_proc where proname = '...'` antes de asumir que solo hace falta capturarla. (3) Una migración escrita y verificada por Claude Code con `tsc`/`lint`/`build` NO está aplicada en la base de datos real hasta que alguien la corre en el SQL Editor — el build pasando confirma que el código compila, no que el estado vivo de Supabase cambió. Confirmar siempre ambos lados antes de dar algo por resuelto.
