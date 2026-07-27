# ProjectSnap — Billing con PayPal: handoff v7 (Jul 27, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `projectsnap-billing-handoff-v6-2026-07-25.md`.

## ✅ Confirmado desde v6: checkout sin trial funciona end-to-end

El pendiente #1 de v6 quedó resuelto: se probó un checkout real en QA con el plan nuevo (sin `TRIAL` cycle) — PayPal cobró **$15** de una vez, el webhook `BILLING.SUBSCRIPTION.ACTIVATED` llegó con `status: 200`, `tenure_type: "REGULAR"`, `cycles_completed: 1`, `last_payment.value: "15.0"`, y la fila en `subscriptions` quedó en `status: 'active'` desde el primer momento. Confirmado con el JSON real del evento en el dashboard de PayPal.

## 🔴 Bug nuevo encontrado y corregido: `refund/route.ts` leía un campo que no existe

**Síntoma:** al probar el flujo de reembolso en QA (pendiente #3 de v6), el botón "Request refund" tiraba un toast genérico `"Something went wrong with checkout. Please try again."` y un 500 en el servidor.

**Causa real (confirmada con logs de Vercel, no adivinada):**

```
TypeError: Cannot read properties of undefined (reading 'total')
```

El código asumía que `GET /v1/billing/subscriptions/{id}/transactions` devuelve un campo `amount: { total, currency }` en cada transacción. **Eso no existe en la respuesta real de PayPal** — el monto viene anidado en `amount_with_breakdown.gross_amount: { value, currency_code }`. `lastPaid.amount` siempre fue `undefined`, y `.total` sobre `undefined` explotaba. Este bug existía desde que se escribió `refund/route.ts` originalmente — nunca se había disparado porque nunca se había probado un reembolso real hasta esta sesión.

**Fix aplicado en `src/app/api/paypal/refund/route.ts`:**

- El tipo de la respuesta de `paypalFetch` para `transactions` ahora usa `amount_with_breakdown?: { gross_amount: { value, currency_code } }` en vez de `amount: { total, currency }`.
- El filtro de `lastPaid` ahora también exige `t.amount_with_breakdown` presente antes de aceptar la transacción.
- La llamada a `POST /v2/payments/captures/{id}/refund` ahora manda `amount.value` y `amount.currency_code` leídos de `lastPaid.amount_with_breakdown.gross_amount`.

Nada más cambió en ese archivo — la ventana de 14 días, la cancelación de la suscripción en PayPal post-refund (del hallazgo de la auditoría del 25 de julio), y el update en Supabase siguen igual.

**Commit:** `fix: refund route reads wrong PayPal response field (amount_with_breakdown)`

**Verificado:** `npx tsc --noEmit` limpio tras el fix.

**⚠️ Pendiente de confirmar por el usuario tras el deploy:** volver a probar "Request refund" en QA y confirmar en 3 lugares — toast de éxito en la UI, `subscriptions.status = 'expired'` en Supabase, y `CANCELLED` en el dashboard de PayPal (no solo el pago reembolsado).

## Todo lo de v6 sigue vigente — no repetir

- Se quitó el trial de 7 días, se cobra $15 desde el día uno (detalle completo en v6: los 4 archivos modificados, el plan nuevo de PayPal, el código de trial dejado inerte a propósito).
- Las decisiones de negocio vigentes: recurrente, $15/mes, reembolso 14 días con cancelación real en PayPal, usuarios exentos vía `profiles.is_exempt`.
- La arquitectura: webhook como única fuente de verdad, `has_paid_access()` restringido a `auth.uid()`, service role solo en `admin.ts`, gating por página no en layout.
- El fix de Vercel Deployment Protection bloqueando el webhook con 401 (v4) — ya resuelto.
- Los 4 hallazgos Alto/Medio de la auditoría del 25 de julio — ya resueltos y aplicados en DB real (v5).

## Pendientes reales antes de producción

1. **Confirmar el fix de refund tras el deploy** (ver arriba) — no confirmado todavía al cierre de esta sesión.
2. **Probar el flujo de cancelación** — click en "Cancelar suscripción" en `/profile`, confirmar que PayPal la marca para cancelar al final del período, y que el webhook `CANCELLED` eventualmente llega y actualiza `status`. **Sigue sin probarse.**
3. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live` con credenciales reales, correr `create-paypal-plan.mjs` contra el producto/plan real (no sandbox), registrar el webhook de producción, decidir postura final de Deployment Protection en Vercel para el dominio de producción.
4. Limpieza opcional, no bloqueante: borrar las keys de i18n de trial sin usar, quitar el código inerte de trial en el webhook/billing-status-card si se confirma que no se retoma pronto.

## Nota de proceso (para el próximo Claude)

Cuarta vez en este proyecto que un flujo "se ve bien en el código" pero falla en la práctica porque la forma real de la respuesta de una API externa no coincidía con lo que el tipo de TypeScript prometía (antes: `listUsers` sin filtro de email real, el body del webhook mal anidado, ahora: `amount` vs `amount_with_breakdown` en transactions). **Lección repetida:** para cualquier endpoint de PayPal que no se haya probado con datos reales todavía, no confiar en la forma de la respuesta escrita a mano — o se verifica contra la documentación oficial línea por línea, o se loggea la respuesta cruda la primera vez antes de asumir su forma. `tsc --noEmit` limpio NO detecta este tipo de bug — el tipo estaba mal declarado desde el inicio, así que TypeScript solo confirmaba consistencia interna, no corrección contra la API real.
