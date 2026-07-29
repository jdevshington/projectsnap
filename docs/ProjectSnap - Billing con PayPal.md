# ProjectSnap — Billing con PayPal: handoff v10 (Jul 29, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `ProjectSnap — Billing con PayPal.md` (v9, Jul 28 2026).

## ✅ Confirmado desde v9

- CTA de "Resuscribirse" en `/profile` para status `expired` — desplegado.
- **Historial de suscripción (`billing_events`)** — confirmado funcionando en QA con captura real: muestra "Subscription canceled" y "Payment received $15 USD" correctamente.
- **Bug crítico encontrado y corregido: `has_paid_access()` nunca incluía `'canceled'` en su chequeo de status** — un usuario que cancelaba perdía el acceso de inmediato en vez de mantenerlo hasta `current_period_end`, contradiciendo la promesa de la propia app ("cancel anytime, keep access until period end"). Migración `20260729_fix_has_paid_access_canceled_grace.sql` — **ya aplicada en Supabase, confirmada por el usuario.**

## 🚀 Checklist para primera prueba en producción con dinero real ($1)

**Contexto de la decisión:** Producción usará el **mismo proyecto de Supabase** que QA (no uno nuevo) — así que todas las migraciones ya aplicadas (incluida la del punto anterior) siguen vigentes, no hay que re-correrlas.

Pasos, en orden:

1. **Rotar `SUPABASE_SERVICE_ROLE_KEY`** — Supabase Dashboard → Settings → API → regenerar `service_role`. Actualizar el valor en Vercel, **environment de Production** (no Preview/QA). Redeploy tras el cambio.
2. **`PAYPAL_ENV=live`** con Client ID/Secret reales de la app en modo Live (no Sandbox) — variable de entorno de Production en Vercel.
3. **Confirmar que la cuenta business de PayPal está verificada para Live** — revisar en el dashboard de PayPal antes de intentar cualquier checkout real; si no está verificada, el primer intento puede fallar por eso, no por el código.
4. **Crear un plan de PayPal temporal de $1** con `create-paypal-plan.mjs` contra credenciales Live — **NO usar el plan real de $15 para esta prueba.** Probar el ciclo completo con el plan de $1: checkout → webhook → historial en `/profile` → cancelación → reembolso. Una vez confirmado, crear el plan real de $15 aparte y apuntar `PAYPAL_PLAN_ID_MONTHLY` (producción) a ese.
5. **Registrar el webhook de producción en el dashboard Live de PayPal** (no el de Sandbox) — nueva URL apuntando al dominio de producción, nuevo `PAYPAL_WEBHOOK_ID` de producción. Es la primera vez que la verificación de firma corre contra credenciales Live — confirmar que valida bien con un evento real, no asumir que porque funcionó en Sandbox va a funcionar igual.
6. **Vercel Deployment Protection para el dominio de producción** — a diferencia de QA (`qa.projectsnap.online`, dejado público a propósito), en producción revisar si se quiere protección activa + "Protection Bypass for Automation" solo para la URL del webhook, en vez de dejar todo el dominio abierto.
7. **Confirmar que las env vars de producción están en el environment correcto de Vercel** (Production, no Preview) para no mezclar credenciales Live con las de Sandbox que sigue usando QA.
8. **Probar el ciclo completo con el plan de $1**, confirmando en 4 lugares: la UI de `/profile` (status + historial), el correo que llega, la fila en `subscriptions`/`billing_events` en Supabase, y el dashboard Live de PayPal (no Sandbox).
9. **Solo después de confirmar el punto 8 sin errores:** crear el plan real de $15, apuntar la env var de producción a ese plan, y ya queda lista para usuarios reales.

**Nada de esto es código nuevo** — el código de billing (checkout, webhook, refund, cancelación, historial, gating) ya está probado end-to-end en sandbox. Esto es enteramente configuración/infraestructura de producción.

## Todo lo de v9 sigue vigente — no repetir

- Sin trial, $15 desde el día uno (a confirmar que el plan real siga sin trial, o decidir si se reactiva antes de producción).
- Arquitectura: webhook única fuente de verdad, `has_paid_access()` restringido a `auth.uid()` + grace period de `canceled`, service role solo en `admin.ts`, gating por página.
- Los 4 hallazgos de la auditoría del 25 de julio, ya aplicados en DB real.
- Emails cubren: trial iniciado, pago exitoso, pago fallido, cancelación, reembolso — con el fix de que el refund no dispara el correo viejo de cancelación.

## Pendientes reales

1. Ejecutar el checklist de arriba, en orden.
2. Limpieza opcional, no bloqueante: keys de i18n de trial sin usar, código inerte de trial en webhook/billing-status-card, filas de prueba en `subscriptions`/`billing_events`/`billing_incidents` de QA (no afectan producción, solo higiene).

## Nota de proceso (para el próximo Claude)

Verificar siempre con un `grep`, un output de build, o una captura real antes de dar un fix por aplicado — ya ha pasado más de una vez en este proyecto que "te di el código" no significaba "está aplicado". Para esta ronda de producción específicamente: **cada paso del checklist de arriba se confirma con evidencia real** (captura del dashboard de PayPal Live, valor de la env var en Vercel, respuesta real del webhook) antes de marcarlo como hecho — no asumir que porque funcionó en Sandbox, funciona igual en Live.
