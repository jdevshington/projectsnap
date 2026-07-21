# ProjectSnap — Billing con PayPal: handoff v3 (Jul 21, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `projectsnap-billing-handoff-v2-2026-07-21.md`.

## 🎉 ESTADO: validación end-to-end en sandbox CONFIRMADA

Esto ya no es teórico — se probó el flujo real completo y funcionó:

1. Usuario real (`3d9c0318-dc03-4a68-8eda-a4104914e6db`) entró a `/billing`, click en botón PayPal.
2. `POST /api/paypal/create-subscription` → 200, PayPal creó la suscripción (`I-0A9VT1CHYRV6`).
3. Login con cuenta **Personal** (buyer) de sandbox, aprobó ($0 porque hay 7 días de trial).
4. PayPal mandó el webhook real — **dos** `POST /api/paypal/webhook` → 200 c/u (eventos `CREATED` y `ACTIVATED`).
5. `verify-webhook.ts` (la versión con postback API, JSON.parse del body) verificó la firma correctamente — sin esto, los webhooks hubieran sido rechazados con 400.
6. Fila final en `subscriptions`:
   ```
   status: active, plan: monthly, paypal_subscription_id: I-0A9VT1CHYRV6,
   current_period_start: 2026-07-21 11:37:10+00,
   current_period_end: 2026-07-28 10:00:00+00
   ```
7. `/profile` renderiza la tarjeta de billing correctamente: Plan "Mensual — $15 USD", Estado "Activo", "Renueva el 28 jul de 2026", botones "Cancelar suscripción" y "Solicitar reembolso" visibles.
8. El gate de acceso (`requirePaidAccess()`) funciona: con la suscripción activa, `/apartments`, `/dashboard`, `/history` cargan normal.

**Esto confirma que:** la verificación de firma del webhook es correcta, el flujo completo de creación de suscripción funciona, el upsert con `onConflict: user_id` no rompió nada, y el gating por página funciona en la práctica, no solo en el código.

## Problema resuelto en el camino: localhost vs ngrok

El primer intento falló silenciosamente — el webhook nunca llegó porque no había un túnel público (ngrok) corriendo, o la URL de ngrok había cambiado y ya no coincidía con la registrada en el dashboard de PayPal. La fila quedó atascada en `status: 'incomplete'`, `current_period_start/end: null` — exactamente el placeholder de `create-subscription`, nunca tocado por el webhook. Se resolvió corriendo ngrok activamente y actualizando la URL del webhook registrado en PayPal antes de reintentar. **Para el próximo test:** confirma que ngrok esté corriendo (o mejor, mover a Vercel Preview, ver sección de pendientes) antes de iniciar el checkout, no después.

## Bug de display confirmado (no de seguridad) — visto en producción de prueba

`status` muestra `"active"` en vez de `"trialing"` durante el período de prueba de 7 días (el caso ya documentado en `lib/paypal/types.ts`: PayPal reporta `resource.status = "ACTIVE"` durante el trial en vez de un estado distintivo, y el código solo hace el override a `"trialing"` cuando el estado ya mapeado es `"trialing"`/`"incomplete"`, no cuando ya llegó como `"active"`). **No afecta el acceso** — `has_paid_access()` da `true` en ambos casos. Solo es cosmético: el usuario ve "Activo" cuando en realidad está en su semana gratis. Pendiente de arreglo, baja prioridad.

## Todo lo demás sigue igual que en v2 — no repetir

- Las 10 decisiones de negocio (recurrente, $15/mes, trial 7 días, reembolso 14 días, usuarios exentos, etc.)
- La arquitectura (webhook como única fuente de verdad, `has_paid_access()` como gate único, service role solo en `admin.ts`, gating por página no en layout)
- Los bugs corregidos en rondas anteriores (current_period_end fallback, onConflict en user_id, plan faltante, timeout de paypal-button.tsx, get_user_id_by_email vs listUsers roto)
- Lista completa de archivos nuevos/modificados (18 nuevos + 9 modificados, ver handoff v2 o pregunta por la lista si se perdió)

## Pendientes reales antes de producción

1. **Fix opcional del bug de display** (`"active"` vs `"trialing"` durante trial) — cosmético, no bloqueante.
2. **Probar el flujo de cancelación** — click en "Cancelar suscripción" en `/profile`, confirmar que PayPal la marca para cancelar al final del período, y que el webhook `CANCELLED` eventualmente llega y actualiza `status`.
3. **Probar el flujo de reembolso** — dentro y fuera de la ventana de 14 días, confirmar el código `OUTSIDE_REFUND_WINDOW` y la pérdida de acceso inmediata dentro de ventana.
4. **Mover de localhost+ngrok a Vercel Preview** — más estable para seguir probando sin que la URL del webhook se rompa cada vez que reinicias ngrok. Env vars de sandbox solo en "Preview", nunca en "Production".
5. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live` con credenciales reales, crear el producto/plan real (no sandbox) con el mismo script `create-paypal-plan.mjs`, registrar el webhook de producción.
6. Limpiar filas de prueba en `subscriptions`/`billing_incidents` antes de producción si se desea, aunque no es obligatorio (son solo datos de tu propio usuario de test).

## Nota de proceso (para el próximo Claude)

Esta sesión demostró el valor de exigir siempre "muéstrame el código real, no un resumen" y de correr `tsc`/`eslint`/`build` de verdad en vez de solo revisar visualmente — se encontraron múltiples bugs reales (incluyendo uno crítico: `listUsers()` no filtra por email en esta versión del SDK) que una revisión superficial no hubiera detectado. Mantener ese estándar en las pruebas de cancelación/reembolso que faltan.
