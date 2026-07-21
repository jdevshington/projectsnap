"use client";

// src/features/billing/components/checkout-error.tsx

import { useI18n } from "@/lib/i18n/context";

interface CheckoutErrorProps {
  message: string;
}

export function CheckoutError({ message }: CheckoutErrorProps) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message || t("billing.errorGeneric")}
    </div>
  );
}
