"use client";

// src/features/billing/components/paypal-button.tsx
//
// Loads the PayPal JS SDK and renders the Smart Subscribe button.
//
// Flow:
//   1. User clicks the PayPal button.
//   2. We POST /api/paypal/create-subscription → PayPal returns a
//      subscription id.
//   3. The SDK opens the PayPal approval flow for that id.
//   4. On approval, the SDK redirects to return_url (/billing/success).
//      On cancel, to /billing/canceled.
//   5. PayPal sends a webhook that flips our DB row to active/trialing.

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: {
          layout?: "vertical" | "horizontal";
          color?: "gold" | "blue" | "silver" | "black";
          shape?: "rect" | "pill";
          label?: "paypal" | "checkout" | "subscribe" | "buynow";
        };
        createSubscription: (
          data: Record<string, unknown>,
          actions: unknown
        ) => Promise<string>;
        onApprove: (data: Record<string, unknown>, actions: unknown) => void;
        onCancel: (data: Record<string, unknown>) => void;
        onError: (err: Record<string, unknown> | string) => void;
      }) => { render: (selector: string) => Promise<void> };
    };
  }
}

interface PayPalButtonProps {
  initialError?: string | null;
}

const SDK_URL = "https://www.paypal.com/sdk/js";
const SDK_TIMEOUT_MS = 10_000;

export function PayPalButton({ initialError = null }: PayPalButtonProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Computed once, eagerly, rather than checked inside the effect and
  // followed by a synchronous setState — process.env.NEXT_PUBLIC_* is
  // baked in at build time and never changes at runtime, so there's no
  // reason to defer this check into an effect body at all.
  const missingClientId = !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const [sdkState, setSdkState] = useState<"loading" | "ready" | "error">(
    initialError || missingClientId ? "error" : "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ?? (missingClientId ? t("billing.errorConfig") : null)
  );

  // BUG FIX: the original version checked `sdkState === "loading"` inside
  // the setTimeout callback, but `sdkState` there was a stale closure value
  // captured when the effect ran (always "loading", since sdkState is
  // intentionally excluded from the effect's deps). That meant the timeout
  // would ALWAYS fire the error branch 10s after mount, even if the SDK had
  // already loaded successfully — silently replacing a working button with
  // an error message on every single page view. We track readiness in a
  // ref instead, which always reflects the current value when the timeout
  // callback runs, and we clear the timeout as soon as we know we're ready.
  const isReadyRef = useRef(false);

  useEffect(() => {
    if (initialError || missingClientId) return;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string;

    if (window.paypal) {
      // Legitimate exception to react-hooks/set-state-in-effect: this is
      // exactly the "synchronize with an external system" case the rule's
      // own docs describe as fine — window.paypal may already exist if
      // another component/page loaded the SDK first, and there's no way
      // to know that without checking inside the effect.
      isReadyRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSdkState("ready");
      return;
    }

    const script = document.createElement("script");
    script.src = `${SDK_URL}?client-id=${encodeURIComponent(
      clientId
    )}&vault=true&intent=subscription`;
    script.async = true;
    script.dataset.paypalSdk = "true";

    const timeout = window.setTimeout(() => {
      if (!isReadyRef.current) {
        setSdkState("error");
        setErrorMessage(t("billing.paypalUnavailable"));
      }
    }, SDK_TIMEOUT_MS);

    const ready = () => {
      if (window.paypal) {
        isReadyRef.current = true;
        window.clearTimeout(timeout);
        setSdkState("ready");
      } else {
        setTimeout(ready, 100);
      }
    };

    script.addEventListener("load", ready);
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      setSdkState("error");
      setErrorMessage(t("billing.paypalUnavailable"));
    });

    document.body.appendChild(script);
    return () => {
      window.clearTimeout(timeout);
      script.removeEventListener("load", ready);
    };
  }, [initialError, missingClientId, t]);

  useEffect(() => {
    if (sdkState !== "ready" || !containerRef.current || !window.paypal) {
      return;
    }

    const buttons = window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "black",
        shape: "rect",
        label: "subscribe",
      },
      createSubscription: async () => {
        const res = await fetch("/api/paypal/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const body = (await res.json()) as {
          id: string;
          alreadyTrialed?: boolean;
        };
        if (body.alreadyTrialed) {
          toast.info(t("billing.alreadyTrialedNotice"));
        }
        return body.id;
      },
      onApprove: () => {
        // The SDK redirects to return_url — nothing to do here.
      },
      onCancel: () => {
        // The SDK redirects to cancel_url — nothing to do here.
      },
      onError: (err) => {
        const message =
          typeof err === "string"
            ? err
            : (err as { message?: string })?.message;
        const declined =
          typeof err === "object" &&
          (err as { name?: string }).name === "PAYMENT_DENIED";
        setErrorMessage(
          declined ? t("billing.errorDecline") : t("billing.errorGeneric")
        );
        setSdkState("error");
        if (message) {
          console.warn("[paypal button]", message);
        }
      },
    });

    buttons.render(`#${containerRef.current.id}`).catch(() => {
      setSdkState("error");
      setErrorMessage(t("billing.paypalUnavailable"));
    });
  }, [sdkState, t]);

  if (sdkState === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage ?? t("billing.errorGeneric")}
      </div>
    );
  }

  if (sdkState === "loading") {
    return (
      <div
        className="flex h-12 items-center justify-center rounded-lg border border-[#E2E2E0] bg-white text-sm text-[#6F6F6C]"
        aria-live="polite"
      >
        {t("billing.paypalLoading")}
      </div>
    );
  }

  return (
    <div id="paypal-button-container" ref={containerRef} className="min-h-12" />
  );
}
