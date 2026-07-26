# ProjectSnap — Billing con PayPal: handoff v6 (Jul 25, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `projectsnap-billing-handoff-v5-2026-07-25.md`.

## 🎯 CAMBIO DE ESTA SESIÓN: se quitó el trial de 7 días — ahora se cobra $15 desde el día uno

Decisión del dueño del proyecto: dejar de ofrecer 7 días gratis, cobrar de inmediato al suscribirse. El reembolso de 14 días sigue siendo la red de seguridad para quien quiera "probar sin compromiso". Los trials se retoman en un entregable futuro separado — el código de trial **no se borró**, se dejó inerte (ver abajo).

### Archivos modificados

1. **`scripts/create-paypal-plan.mjs`** — `createPlan()` ahora define un solo `billing_cycle` tipo `REGULAR` ($15/mes, `total_cycles: 0` = infinito). Se quitó el `billing_cycle` tipo `TRIAL` que existía antes (7 días, $0).
2. **`src/app/(app)/billing/page.tsx`** — se quitaron los dos `<p>` de la card de pricing que mostraban `billing.trial` / `billing.trialExplainer` ("7 días de prueba gratis...").
3. **`src/app/api/paypal/create-subscription/route.ts`** — se quitó el import y la llamada a `getTrialUsed(user.id)`, y el override condicional de `billing_cycles` que forzaba `$15` para usuarios que ya habían usado su trial. Ya no hace falta: el plan en sí no tiene ciclo de trial, así que **todo** usuario paga $15 desde el primer cargo, sin excepción. También se quitó `alreadyTrialed` de la respuesta JSON.
4. **`src/features/billing/components/paypal-button.tsx`** — se quitó el import de `toast` (sonner) y la lógica que mostraba `billing.alreadyTrialedNotice` cuando `alreadyTrialed` venía en `true`. El `createSubscription` del cliente ahora solo extrae `{ id }` de la respuesta.

### Plan de PayPal — se generó uno NUEVO

Los planes de PayPal **no se pueden editar** una vez creados (no se le puede quitar el ciclo TRIAL a un plan existente). Se corrió `create-paypal-plan.mjs` de nuevo con el código actualizado, lo que generó:

- Un **Product ID** nuevo en PayPal (el script siempre crea un producto nuevo, no reutiliza el viejo — es cosmético, genera productos duplicados en el dashboard de PayPal pero no rompe nada funcionalmente).
- Un **Plan ID** nuevo, sin trial, actualizado en `.env` como `PAYPAL_PLAN_ID_MONTHLY`.

El plan viejo (con trial) sigue existiendo en el dashboard de PayPal, simplemente ya no se referencia desde el código — no hace falta borrarlo.

**`PAYPAL_WEBHOOK_ID` NO cambia** — el webhook está atado a la app de PayPal (Client ID/Secret) y a los tipos de evento suscritos, no a un Plan ID ni Product ID específico. Cualquier suscripción bajo la misma app dispara los mismos eventos al mismo webhook, sin importar qué plan se usó.

### Código de trial que quedó intencionalmente sin tocar (inerte, no roto)

- `src/app/api/paypal/webhook/route.ts` — toda la detección de `isTrial` (via `cycle_executions`), el estado `"trialing"`, y el stamping de `profiles.trial_used_at` siguen en el código. Con el plan nuevo (sin ciclo TRIAL), esta lógica simplemente nunca se activa — `resource.billing_info?.cycle_executions` no va a tener un elemento con `tenure_type: "TRIAL"` nunca más. No hace daño dejarlo ahí.
- `src/features/billing/components/billing-status-card.tsx` — el caso `"trialing"` en `statusKey`/`periodEndKey` sigue en el objeto de mapeo. Mismo razonamiento: código muerto e inofensivo.
- `src/lib/i18n/translations.ts` — las keys `billing.trial`, `billing.trialExplainer`, `billing.alreadyTrialedNotice` (EN y ES) quedaron sin ningún caller. No rompen el build (TypeScript no se queja de keys sin usar en un objeto `as const`). Se pueden borrar cuando se retome el trial como feature separada, o dejar ahí — no urge.
- El bug de display `"active"` vs `"trialing"` (documentado en handoffs v3-v5) queda **completamente irrelevante** ahora — sin ciclo de trial, ese caso nunca vuelve a ocurrir. Se puede quitar de la lista de pendientes.

### Verificación hecha en esta sesión

- `npx tsc --noEmit` — limpio, sin errores, después de los 4 edits.
- **Pendiente de confirmar por el usuario:** `npm run build` completo, y una suscripción de prueba end-to-end confirmando que (a) PayPal pide **$15** de una vez en la pantalla de aprobación, no $0, y (b) la fila en `subscriptions` sale con `status: 'active'` desde el primer momento, nunca `'trialing'`.

## Todo lo demás sigue igual — no repetir

- Las decisiones de negocio que siguen vigentes: recurrente, $15/mes, reembolso 14 días (con cancelación real en PayPal), usuarios exentos vía `profiles.is_exempt`.
- La arquitectura: webhook como única fuente de verdad, `has_paid_access()` como gate único (ya restringido a `auth.uid()`), service role solo en `admin.ts`, gating por página no en layout.
- Los 4 hallazgos Alto/Medio de la auditoría del 25 de julio — ya resueltos y aplicados en DB real (ver handoff v5 para detalle si hace falta).
- El fix de Vercel Deployment Protection bloqueando el webhook con 401 — ya resuelto (ver handoff v4).

## Pendientes reales antes de producción

1. **Confirmar la prueba end-to-end del cambio de esta sesión** (checkout cobrando $15 de una vez, `status: active` desde el inicio) — no confirmada todavía al cierre de esta sesión.
2. **Probar el flujo de cancelación** — click en "Cancelar suscripción" en `/profile`, confirmar que PayPal la marca para cancelar al final del período, y que el webhook `CANCELLED` eventualmente llega y actualiza `status`.
3. **Probar el flujo de reembolso** — confirmar que cancela la suscripción en PayPal (no solo `status: 'expired'` local), y probar dentro y fuera de la ventana de 14 días.
4. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live` con credenciales reales, correr `create-paypal-plan.mjs` contra el producto/plan real (no sandbox), registrar el webhook de producción, decidir postura final de Deployment Protection en Vercel para el dominio de producción.
5. Limpieza opcional, no bloqueante: borrar las keys de i18n de trial sin usar, quitar el código inerte de trial en el webhook/billing-status-card si se confirma que no se retoma pronto.

## Nota de proceso (para el próximo Claude)

Esta ronda tuvo un problema operativo, no de lógica: al pegar código nuevo a mano, el usuario accidentalmente sobreescribió partes de `create-paypal-plan.mjs` (quedó en 37 líneas en vez de ~130) y mezcló código de dos archivos distintos en `create-subscription/route.ts` (el `createSubscription` del cliente terminó pegado en medio de la palabra `paypal_subscription_id` del servidor). La lección: cuando el usuario dice "no veo el código" o algo "no se imprimió" sin error aparente, pedir `wc -l` o `cat` del archivo real antes de asumir que es un bug de lógica — a veces es simplemente un archivo corrupto por copy-paste, y ahí lo más rápido es dar el archivo completo de nuevo en vez de tratar de diagnosticar un diff parcial.
