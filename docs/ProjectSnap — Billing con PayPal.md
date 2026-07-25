# ProjectSnap — Billing con PayPal: handoff v4 (Jul 25, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `projectsnap-billing-handoff-v3-2026-07-21.md`.

## 🎉 ESTADO: validación end-to-end confirmada en dos entornos — localhost+ngrok Y Vercel Preview (qa.projectsnap.online)

Todo lo de v3 sigue en pie (checkout completo, verificación de firma, upsert, gating). Esta versión agrega la migración a Vercel Preview y un bug de infraestructura nuevo que casi nadie ve venir.

## 🔴 Bug nuevo y su fix: Vercel Deployment Protection bloqueaba el webhook (401)

**Síntoma:** la suscripción se creaba bien en PayPal, el usuario aprobaba, pero la fila en `subscriptions` se quedaba en `status: 'incomplete'` para siempre — igual que el viejo problema de ngrok en v3, pero esta vez **no había ngrok de por medio**: el webhook apuntaba directo a `https://qa.projectsnap.online/api/paypal/webhook` (Vercel Preview).

**Causa real:** Vercel protege por defecto todos los deployments de Preview con **Deployment Protection / Vercel Authentication (SSO)**. Esa protección intercepta CUALQUIER request entrante — incluyendo las de PayPal — antes de que llegue a `route.ts`, y responde `401 Unauthorized` con un `Set-Cookie: _vercel_sso_nonce=...`. El webhook de PayPal nunca llega a ejecutar nuestro código: ni siquiera se intenta la verificación de firma.

**Cómo se diagnosticó:** en el dashboard de PayPal (Developer Dashboard → Webhooks → historial del evento), el log de transmisión mostraba:

```
http_status: 401, reason_phrase: "Unauthorized"
response_headers: { Set-Cookie: "_vercel_sso_nonce=...", Server: "Vercel", ... }
```

Ese `Set-Cookie` con `_vercel_sso_nonce` es la huella digital de que es Vercel Auth bloqueando, no nuestro código. (Si hubiera sido nuestra firma fallando, el código devuelve `400` con `{"error": "Invalid signature."}` — nunca `401`.)

**Fix aplicado:** se desactivó **"Require Vercel Authentication"** (require Vercel login) en Deployment Protection para el proyecto. Con eso desactivado, "Protection Bypass for Automation" queda no-aplicable/grisado en el dashboard de Vercel — es esperado, no un error: esa opción solo tiene sentido cuando hay una protección activa que saltarse.

**⚠️ Trade-off a tener en cuenta:** con la protección desactivada, `qa.projectsnap.online` (todo el entorno Preview) queda públicamente accesible sin login de Vercel — no solo para PayPal. Aceptable para seguir probando; **antes de escalar el uso de este entorno o si se vuelve sensible, evaluar reactivar la protección y usar en su lugar "Protection Bypass for Automation"**, registrando la URL del webhook en PayPal con el query param `?x-vercel-protection-bypass=<secret>` (método recomendado por Vercel para webhooks de terceros que no pueden mandar headers custom).

**Para el próximo test / próxima sesión:** si se vuelve a migrar de entorno (otro dominio de preview, un proyecto nuevo de Vercel, etc.), revisar Deployment Protection ANTES de registrar el webhook en PayPal — no después. Este es ahora el tercer "falso silencio" del webhook que hemos visto (ngrok caído → ngrok con URL vieja → Vercel Deployment Protection); todos comparten el mismo síntoma (`status: incomplete` para siempre) pero causas de infraestructura distintas. Si vuelve a pasar, lo primero es SIEMPRE revisar el historial de transmisión del evento en el dashboard de PayPal antes de tocar código — el `http_status` y los headers de la respuesta dicen inmediatamente si es ngrok caído (sin respuesta / connection refused), nuestra firma (400), o un proxy/protección externa (401 con cookies ajenas a nuestra app).

## Todo lo demás sigue igual que en v3 — no repetir

- Las 10 decisiones de negocio (recurrente, $15/mes, trial 7 días, reembolso 14 días, usuarios exentos, etc.)
- La arquitectura (webhook como única fuente de verdad, `has_paid_access()` como gate único, service role solo en `admin.ts`, gating por página no en layout)
- Los bugs corregidos en rondas anteriores (current_period_end fallback, onConflict en user_id, plan faltante, timeout de paypal-button.tsx, get_user_id_by_email vs listUsers roto)
- El bug de display `"active"` vs `"trialing"` durante el trial — sigue pendiente, cosmético, baja prioridad
- Lista completa de archivos nuevos/modificados (ver handoff v2 o pregunta por la lista si se perdió)

## Hallazgos de la auditoría completa del repo (rama `qa/payments`, Jul 25 2026) — pendientes reales

Se corrió una auditoría tipo Staff Engineer sobre todo el repo. Resultado general: arquitectura sólida, sin necesidad de restructurar nada. Pendientes concretos que quedaron abiertos (ninguno relacionado con el bug de Vercel de arriba):

1. **[Alto] El flujo de reembolso no cancela la suscripción en PayPal** — `refund/route.ts` reembolsa el pago y marca `status: 'expired'` en la DB, pero la suscripción sigue viva en PayPal y puede intentar cobrar el próximo ciclo. Falta agregar la llamada al endpoint de cancelación de PayPal dentro de ese mismo route handler tras el refund exitoso.
2. **[Alto] `get_user_id_by_email` (función RPC que usa el webhook como fallback) no está en ninguna migración versionada** — se creó a mano en el SQL Editor de Supabase en algún momento y nunca se capturó. Bloqueante antes de crear un proyecto de Supabase nuevo para producción real.
3. **[Medio] `refund/route.ts` ordena transacciones por string ID (`a.id < b.id`) en vez de por fecha** para encontrar "el último pago" — puede reembolsar la transacción equivocada si hay más de un pago en la ventana de 35 días.
4. **[Medio] `has_paid_access(uid)` (función SQL) no restringe `uid = auth.uid()`** — cualquier usuario autenticado puede consultar si otra cuenta tiene acceso pagado conociendo su UUID. Fuga de info binaria, no de datos de pago. Fix de una línea.
5. **[Bajo]** Archivo duplicado `webhook-route.ts` (código muerto, copia exacta de `route.ts`) y componente `CheckoutError` sin usar en ningún lado — limpiar antes de producción.
6. **[Bajo]** El reembolso no hace `router.refresh()` tras éxito — el toast dice "reembolso exitoso" pero la tarjeta de billing muestra el estado viejo hasta recargar.

Reporte completo con severidad/esfuerzo/roadmap: `projectsnap-audit-qa-payments.md`.

## Pendientes reales antes de producción

1. **Fix opcional del bug de display** (`"active"` vs `"trialing"` durante trial) — cosmético, no bloqueante.
2. **Probar el flujo de cancelación** — click en "Cancelar suscripción" en `/profile`, confirmar que PayPal la marca para cancelar al final del período, y que el webhook `CANCELLED` eventualmente llega y actualiza `status`.
3. **Probar el flujo de reembolso** — dentro y fuera de la ventana de 14 días, confirmar el código `OUTSIDE_REFUND_WINDOW` y la pérdida de acceso inmediata dentro de ventana. **Antes de probarlo en serio, resolver el hallazgo #1 de la auditoría** (cancelar la suscripción en PayPal como parte del refund), o el reembolso de prueba va a dejar una suscripción zombie cobrando en sandbox.
4. **Resolver los hallazgos Alto/Medio de la auditoría** (#1–#4 arriba) antes de ir a producción real.
5. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live` con credenciales reales, crear el producto/plan real (no sandbox) con el mismo script `create-paypal-plan.mjs`, registrar el webhook de producción, y decidir la postura final de Deployment Protection en Vercel para el dominio de producción (probablemente sí se quiere protección + Protection Bypass ahí, a diferencia del entorno QA).
6. Limpiar filas de prueba en `subscriptions`/`billing_incidents` antes de producción si se desea, aunque no es obligatorio (son solo datos de tu propio usuario de test).

## Nota de proceso (para el próximo Claude)

Esta sesión demostró el valor de exigir siempre "muéstrame el código real, no un resumen" y de correr `tsc`/`eslint`/`build` de verdad en vez de solo revisar visualmente. También demostró que cuando un webhook "no llega", el primer lugar a mirar es el historial de transmisión en el dashboard de PayPal (http_status + headers de la respuesta), no el código — ya van tres causas de infraestructura distintas (ngrok caído, ngrok con URL vieja, Vercel Deployment Protection) para el mismo síntoma exacto (`status: incomplete` para siempre). Mantener ese estándar en las pruebas de cancelación/reembolso que faltan, y priorizar los hallazgos Alto de la auditoría antes de tocar producción.
