# ProjectSnap — Billing con PayPal: handoff v9 (Jul 28, 2026)

**Pégale este archivo completo a cualquier chat nuevo al inicio de la sesión.**
Reemplaza a `ProjectSnap — Billing con PayPal.md` (v8, Jul 27 2026).

## ✅ Confirmado desde v8

- **Fix de "Access until" tras refund y confirmación de reembolso** — confirmado con captura real de `/profile`: status `Expired` sin fecha de acceso colgada. Ya en producción de QA.
- **Flujo de cancelación probado end-to-end** — confirmado con capturas: suscripción cancelada desde `/profile`, PayPal marca la transacción como cancelada, `status` pasa a `canceled` correctamente. El pendiente #2 de v7 ("sigue sin probarse") queda cerrado.
- **Fix de correos de refund (los 3 cambios de v8: `sendRefundIssued`, guard de `internalStatus === "expired"` en el webhook, copy sin "free tier")** — aplicado en código, `tsc`/`lint`/`build` limpios. **Aún sin confirmar en vivo** (falta un reembolso de prueba nuevo para verificar que llega el correo correcto y no el viejo).

## Nuevo — CTA de "Resuscribirse" en /profile

**Hallazgo:** para status `expired`, la tarjeta de billing en `/profile` no mostraba ninguna acción — el usuario tenía que saber navegar manualmente a `/billing` para volver a suscribirse.

**Fix aplicado:** botón "Resubscribe" agregado en `billing-status-card.tsx`, **solo para status `expired`**, no para `canceled`. Decisión deliberada: durante `canceled` el usuario todavía tiene acceso (grace period hasta `current_period_end`) — permitir resuscribirse ahí mismo podría crear una segunda suscripción en paralelo en PayPal antes de que la primera termine. Se deja que ese caso llegue a `/billing` de forma natural cuando el acceso se corte de verdad.

Nueva key de i18n: `profile.billingResubscribe` ("Resubscribe" / "Volver a suscribirse").

**Commit:** `feat: add resubscribe CTA on /profile for expired subscriptions`

## En progreso — Historial de suscripción en /profile

Feature nueva solicitada: mostrar en `/profile` los pagos, intentos de cobro, y reembolsos del usuario (fecha, tipo de evento, monto, status). Especificación completa con migración SQL, código de webhook/refund, y componente nuevo en `projectsnap-billing-history-handoff.md` (documento separado, pégaselo a Claude Code junto con este).

**Límite real confirmado, no asumido:** PayPal no expone al comercio los últimos 4 dígitos de la tarjeta del comprador en pagos vía wallet de PayPal (que es el único método hoy). El historial mostrará "Método: PayPal" en vez de datos de tarjeta — no es posible mostrar eso de forma honesta con los datos que PayPal realmente entrega.

## Todo lo de v8 sigue vigente — no repetir

- Sin trial, $15 desde el día uno. Fix de `amount_with_breakdown` en refund (v7).
- Arquitectura: webhook única fuente de verdad, `has_paid_access()` restringido a `auth.uid()`, service role solo en `admin.ts`, gating por página.
- Fix de Vercel Deployment Protection (v4). Los 4 hallazgos de la auditoría del 25 de julio (v5), ya aplicados en DB real.

## Pendientes reales antes de producción

1. **Confirmar en vivo los 3 fixes de correos de v8** — hacer un reembolso de prueba nuevo (con una cuenta en blanco, ver nota abajo) y confirmar: llega "Refund issued", NO llega el correo viejo de "canceled con acceso hasta X".
2. **Implementar el historial de suscripción** — ver `projectsnap-billing-history-handoff.md`.
3. **Antes de ir a producción real:** rotar `SUPABASE_SERVICE_ROLE_KEY`, cambiar `PAYPAL_ENV=live`, correr `create-paypal-plan.mjs` contra el producto real, registrar webhook de producción, decidir postura de Deployment Protection en Vercel para el dominio de producción.
4. Limpieza opcional: keys de i18n de trial sin usar, código inerte de trial en webhook/billing-status-card.

## Nota de proceso (para el próximo Claude)

**Verificar siempre con un `grep` o pidiendo el archivo real antes de asumir que un fix se aplicó.** En esta sesión, un fix completo (`billing-status-card.tsx`, dado como archivo completo para copiar/pegar) tardó 2 rondas en aplicarse de verdad — el usuario reportó que el bug seguía ahí, y solo al pedirle un `grep` de una constante específica del fix se confirmó que el archivo nunca se había reemplazado. No asumir que "te di el código" equivale a "está aplicado" — pedir confirmación verificable (grep, output de build, captura) antes de dar un fix por cerrado.
-e

---

# ProjectSnap — Historial de suscripción en /profile: handoff (Jul 28, 2026)

**Pégale este archivo a Claude Code junto con el handoff v9 de billing.**

## Qué se va a construir

Una sección nueva en `/profile`, debajo de `BillingStatusCard`, con la lista de eventos de facturación del usuario: fecha, tipo (pago recibido, pago fallido, prueba iniciada, suscripción cancelada, reembolso emitido), y monto cuando aplique.

**Límite real, no negociable:** no se mostrará "tarjeta usada" — PayPal no entrega esos datos para pagos vía wallet de PayPal. El método siempre es "PayPal".

## Decisión de diseño: tabla propia (`billing_events`), no llamadas en vivo a PayPal

Ya existe el patrón correcto para esto: el webhook es la única fuente de verdad y ya procesa cada evento de PayPal. En vez de pegarle a `GET /v1/billing/subscriptions/{id}/transactions` cada vez que alguien abre `/profile` (latencia extra, límites de rango de PayPal, más superficie de fallo), el webhook (y el route de refund) van a escribir una fila en una tabla nueva cada vez que ya envían un correo — mismo punto exacto del código, un `insert` más al lado del `send`.

---

## Archivo 1 — nueva migración `supabase/migrations/20260728_add_billing_events.sql`

```sql
-- supabase/migrations/20260728_add_billing_events.sql
--
-- User-facing billing history, shown on /profile. One row per
-- notable billing event (payment succeeded/failed, trial started,
-- subscription canceled, refund issued) — written at the exact same
-- point in the code where the corresponding email is sent (webhook
-- route.ts and refund/route.ts), so this table and the emails a user
-- received can never drift apart.
--
-- Deliberately does NOT store card details — PayPal does not expose
-- the buyer's card to the merchant for PayPal-wallet payments, which
-- is the only payment method this app supports today. "amount"/
-- "currency" are nullable because not every event type has a monetary
-- amount (e.g. trial_started).

create table if not exists public.billing_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  event_type   text        not null
                            check (event_type in (
                              'trial_started',
                              'payment_succeeded',
                              'payment_failed',
                              'subscription_canceled',
                              'refund_issued'
                            )),
  amount       numeric,
  currency     text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists billing_events_user_id_occurred_at_idx
  on public.billing_events (user_id, occurred_at desc);

alter table public.billing_events enable row level security;

-- Users can read their own billing history — same pattern as
-- subscriptions: SELECT only, no insert/update/delete for
-- authenticated. Only service_role (webhook + refund route) writes.
drop policy if exists "users can read own billing events" on public.billing_events;
create policy "users can read own billing events"
  on public.billing_events
  for select
  to authenticated
  using (user_id = auth.uid());
```

Aplicar en el SQL Editor de Supabase después de confirmar el resto del código (sin prisa, la tabla no rompe nada si existe antes de que el código la use).

---

## Archivo 2 — `src/features/billing/queries.ts` (agregar, no reemplazar el archivo completo)

Agregar al final del archivo:

```ts
export type BillingEventRow = {
  id: string;
  event_type:
    | "trial_started"
    | "payment_succeeded"
    | "payment_failed"
    | "subscription_canceled"
    | "refund_issued";
  amount: number | null;
  currency: string | null;
  occurred_at: string;
};

/** Read the calling user's billing history, most recent first. Used by
 *  /profile to render the billing history section. Capped at 20 rows —
 *  this is a UI convenience list, not an export/audit tool. */
export const getBillingHistory = cache(async (): Promise<BillingEventRow[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_events")
    .select("id, event_type, amount, currency, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data as BillingEventRow[]) ?? [];
});

/** Insert a row into billing_events. Called from the webhook and the
 *  refund route, right alongside the corresponding email send — same
 *  event, same place in the code, so the history and the emails a user
 *  received can never drift apart. Takes an already-constructed admin
 *  client (both callers already have one) instead of creating a new
 *  one, and never throws — a failed history write should never break
 *  the webhook or the refund flow; it's a nice-to-have UI list, not a
 *  source of truth for access. */
export async function logBillingEvent(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    userId: string;
    eventType: BillingEventRow["event_type"];
    amount?: string | null;
    currency?: string | null;
    occurredAt?: Date;
  }
): Promise<void> {
  const { error } = await supabase.from("billing_events").insert({
    user_id: params.userId,
    event_type: params.eventType,
    amount: params.amount ? Number(params.amount) : null,
    currency: params.currency ?? null,
    occurred_at: (params.occurredAt ?? new Date()).toISOString(),
  });

  if (error) {
    console.error("[billing_events] insert failed", error, {
      userId: params.userId,
      eventType: params.eventType,
    });
  }
}
```

Y agregar el import que falta arriba del archivo (junto al de `createAdminClient` que ya existe):

```ts
import { createAdminClient } from "@/lib/supabase/admin";
```

(Si ya está importado — `getTrialUsed` ya lo usa — no lo dupliques.)

---

## Archivo 3 — `src/app/api/paypal/webhook/route.ts` (5 inserciones puntuales, no reemplazar el archivo)

En cada punto donde ya se manda un correo dentro de `sendSubscriptionEmail` y `handleSaleEmail`, agregar el `logBillingEvent` correspondiente. Import nuevo arriba del archivo:

```ts
import { logBillingEvent } from "@/features/billing/queries";
```

**3a. Dentro de `sendSubscriptionEmail`, bloque `ACTIVATED`:**

Busca:

```ts
if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
  if (internalStatus === "trialing") {
    await sendTrialStarted(to, trialEndDate);
  } else {
    const amount = subEvent.resource.billing_info?.last_payment?.amount
      ? `${subEvent.resource.billing_info.last_payment.amount.value} ${subEvent.resource.billing_info.last_payment.amount.currency_code}`
      : "";
    await sendPaymentSucceeded(to, amount, trialEndDate);
  }
  return;
}
```

Reemplaza por:

```ts
if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
  const supabase = createAdminClient();
  if (internalStatus === "trialing") {
    await sendTrialStarted(to, trialEndDate);
    await logBillingEvent(supabase, { userId, eventType: "trial_started" });
  } else {
    const lastPaymentAmount =
      subEvent.resource.billing_info?.last_payment?.amount;
    const amount = lastPaymentAmount
      ? `${lastPaymentAmount.value} ${lastPaymentAmount.currency_code}`
      : "";
    await sendPaymentSucceeded(to, amount, trialEndDate);
    await logBillingEvent(supabase, {
      userId,
      eventType: "payment_succeeded",
      amount: lastPaymentAmount?.value,
      currency: lastPaymentAmount?.currency_code,
    });
  }
  return;
}
```

**3b. Bloque `RENEWED`:**

Busca:

```ts
if (eventType === "BILLING.SUBSCRIPTION.RENEWED") {
  const amount = subEvent.resource.billing_info?.last_payment?.amount
    ? `${subEvent.resource.billing_info.last_payment.amount.value} ${subEvent.resource.billing_info.last_payment.amount.currency_code}`
    : "";
  const nextBilling = nextPeriodEnd
    ? new Date(nextPeriodEnd)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sendPaymentSucceeded(to, amount, nextBilling);
  return;
}
```

Reemplaza por:

```ts
if (eventType === "BILLING.SUBSCRIPTION.RENEWED") {
  const lastPaymentAmount =
    subEvent.resource.billing_info?.last_payment?.amount;
  const amount = lastPaymentAmount
    ? `${lastPaymentAmount.value} ${lastPaymentAmount.currency_code}`
    : "";
  const nextBilling = nextPeriodEnd
    ? new Date(nextPeriodEnd)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sendPaymentSucceeded(to, amount, nextBilling);
  await logBillingEvent(createAdminClient(), {
    userId,
    eventType: "payment_succeeded",
    amount: lastPaymentAmount?.value,
    currency: lastPaymentAmount?.currency_code,
  });
  return;
}
```

**3c. Bloque `PAYMENT.FAILED`:**

Busca:

```ts
if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
  await sendPaymentFailed(to, null);
  return;
}
```

Reemplaza por:

```ts
if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
  await sendPaymentFailed(to, null);
  await logBillingEvent(createAdminClient(), {
    userId,
    eventType: "payment_failed",
  });
  return;
}
```

**3d. Bloque `CANCELLED`** (dentro del `if`, después del guard de `internalStatus === "expired"` que ya existe — el log solo debe ocurrir cuando SÍ se manda el correo, no en el `return` temprano del refund):

Busca:

```ts
    const accessUntil = nextPeriodEnd ? new Date(nextPeriodEnd) : new Date();
    await sendSubscriptionCanceled(to, accessUntil);
    return;
  }
```

Reemplaza por:

```ts
    const accessUntil = nextPeriodEnd ? new Date(nextPeriodEnd) : new Date();
    await sendSubscriptionCanceled(to, accessUntil);
    await logBillingEvent(createAdminClient(), { userId, eventType: "subscription_canceled" });
    return;
  }
```

**3e. Dentro de `handleSaleEmail`, bloque `PAYMENT.SALE.COMPLETED`:**

Busca:

```ts
if (event.event_type === "PAYMENT.SALE.COMPLETED") {
  const amount = event.resource.amount
    ? `${event.resource.amount.total} ${event.resource.amount.currency}`
    : "";
  const nextBillingDate = sub.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  try {
    await sendPaymentSucceeded(to, amount, nextBillingDate);
  } catch (err) {
    console.error("[paypal webhook] PAYMENT.SALE.COMPLETED email threw", err, {
      userId,
    });
  }
  return;
}
```

Reemplaza el `try` por (agrega el log dentro del mismo try, después del send):

```ts
    try {
      await sendPaymentSucceeded(to, amount, nextBillingDate);
      await logBillingEvent(createAdminClient(), {
        userId,
        eventType: "payment_succeeded",
        amount: event.resource.amount?.total,
        currency: event.resource.amount?.currency,
      });
    } catch (err) {
      console.error(
        "[paypal webhook] PAYMENT.SALE.COMPLETED email threw",
        err,
        { userId }
      );
    }
    return;
  }
```

**3f. Bloque `PAYMENT.SALE.DENIED`:**

Busca:

```ts
if (event.event_type === "PAYMENT.SALE.DENIED") {
  try {
    await sendPaymentFailed(to, null);
  } catch (err) {
    console.error("[paypal webhook] PAYMENT.SALE.DENIED email threw", err, {
      userId,
    });
  }
  return;
}
```

Reemplaza por:

```ts
if (event.event_type === "PAYMENT.SALE.DENIED") {
  try {
    await sendPaymentFailed(to, null);
    await logBillingEvent(createAdminClient(), {
      userId,
      eventType: "payment_failed",
    });
  } catch (err) {
    console.error("[paypal webhook] PAYMENT.SALE.DENIED email threw", err, {
      userId,
    });
  }
  return;
}
```

---

## Archivo 4 — `src/app/api/paypal/refund/route.ts` (1 inserción)

Import nuevo arriba:

```ts
import { logBillingEvent } from "@/features/billing/queries";
```

Justo después del bloque de `sendRefundIssued` que ya agregaron en la sesión anterior (antes del `return NextResponse.json({ ok: true, refunded: lastPaid.id });`), agregar el log dentro del mismo `if (to)`:

```ts
const to = await getUserEmail(user.id);
if (to) {
  try {
    await sendRefundIssued(
      to,
      `${lastPaid.amount_with_breakdown.gross_amount.value} ${lastPaid.amount_with_breakdown.gross_amount.currency_code}`
    );
    await logBillingEvent(admin, {
      userId: user.id,
      eventType: "refund_issued",
      amount: lastPaid.amount_with_breakdown.gross_amount.value,
      currency: lastPaid.amount_with_breakdown.gross_amount.currency_code,
    });
  } catch (err) {
    console.error("[refund] refund-issued email threw", err, {
      userId: user.id,
    });
  }
}
```

(Nota: `refund/route.ts` ya tiene una variable `admin` — el admin client creado arriba en la función — reutilízala, no crees una nueva.)

---

## Archivo 5 — `src/features/billing/components/billing-history-list.tsx` (nuevo)

```tsx
// src/features/billing/components/billing-history-list.tsx
//
// Read-only list rendered on /profile below BillingStatusCard. Server
// Component — the data is already fetched server-side in page.tsx, this
// just renders it. No "card used" column: PayPal does not expose the
// buyer's card to the merchant for PayPal-wallet payments, so the only
// honest "method" to show is "PayPal".

import type { BillingEventRow } from "@/features/billing/queries";

interface Props {
  events: BillingEventRow[];
  t: (key: string) => string;
  locale: string;
}

const EVENT_LABEL_KEY: Record<BillingEventRow["event_type"], string> = {
  trial_started: "profile.billingEventTrialStarted",
  payment_succeeded: "profile.billingEventPaymentSucceeded",
  payment_failed: "profile.billingEventPaymentFailed",
  subscription_canceled: "profile.billingEventSubscriptionCanceled",
  refund_issued: "profile.billingEventRefundIssued",
};

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-DO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function BillingHistoryList({ events, t, locale }: Props) {
  return (
    <div className="mt-4 rounded-xl border border-[#E2E2E0] bg-white">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-[#111110]">
          {t("profile.billingHistory")}
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#6F6F6C]">
            {t("profile.billingHistoryEmpty")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0EE]">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#111110]">
                  {t(EVENT_LABEL_KEY[event.event_type])}
                </p>
                <p className="mt-0.5 text-xs text-[#6F6F6C]">
                  {formatDateTime(event.occurred_at, locale)} · PayPal
                </p>
              </div>
              {event.amount !== null && (
                <p className="text-sm font-medium text-[#111110]">
                  {event.amount} {event.currency}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Archivo 6 — `src/app/(app)/profile/page.tsx` (editar)

Agregar el import:

```ts
import { getBillingHistory } from "@/features/billing/queries";
import { BillingHistoryList } from "@/features/billing/components/billing-history-list";
```

Agregar `getBillingHistory()` al `Promise.all` existente:

```ts
const [{ t }, profile, billingResult, billingHistory] = await Promise.all([
  getT(),
  getProfile(user.id),
  getBillingOverview(),
  getBillingHistory(),
]);
```

Y renderizar el componente justo después de `<BillingStatusCard ... />`:

```tsx
{
  billing && (
    <>
      <BillingStatusCard
        subscription={billing.subscription}
        isExempt={billing.isExempt}
        hasAccess={billing.hasAccess}
      />
      <BillingHistoryList
        events={billingHistory}
        t={t}
        locale={t === undefined ? "en" : "es"}
      />
    </>
  );
}
```

**Nota para Claude Code:** revisa cómo `page.tsx` obtiene `locale` — en el código que tengo no queda claro si `getT()` también devuelve el `locale` actual o si hay que leerlo de otro lado (revisa `lib/i18n/server.ts`, el mismo archivo que expone `getT()`). Ajusta esa línea para pasar el locale real, no el placeholder de arriba.

---

## Archivo 7 — `src/lib/i18n/translations.ts` (agregar keys)

```ts
// en:
"profile.billingHistory": "Billing history",
"profile.billingHistoryEmpty": "No billing activity yet.",
"profile.billingEventTrialStarted": "Trial started",
"profile.billingEventPaymentSucceeded": "Payment received",
"profile.billingEventPaymentFailed": "Payment failed",
"profile.billingEventSubscriptionCanceled": "Subscription canceled",
"profile.billingEventRefundIssued": "Refund issued",
```

```ts
// es:
"profile.billingHistory": "Historial de facturación",
"profile.billingHistoryEmpty": "Aún no hay actividad de facturación.",
"profile.billingEventTrialStarted": "Prueba iniciada",
"profile.billingEventPaymentSucceeded": "Pago recibido",
"profile.billingEventPaymentFailed": "Pago fallido",
"profile.billingEventSubscriptionCanceled": "Suscripción cancelada",
"profile.billingEventRefundIssued": "Reembolso emitido",
```

---

## Checklist

1. Aplicar la migración en Supabase SQL Editor.
2. Aplicar los 7 archivos/patches de arriba.
3. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
4. Prueba real: suscribirse con una cuenta nueva, confirmar que aparece "Payment received" en el historial con el monto correcto; cancelar, confirmar "Subscription canceled"; reembolsar (otra cuenta), confirmar "Refund issued". Confirmar en cada caso que **no** se rompió nada existente (correos, UI de billing status) — este cambio es aditivo, no debería tocar comportamiento previo.
5. Ya sabes por experiencia reciente en este proyecto: después de que Claude Code diga "listo", pide un `grep` o una captura real antes de dar el fix por confirmado.
