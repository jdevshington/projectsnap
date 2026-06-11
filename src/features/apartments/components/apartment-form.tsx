// features/apartments/components/apartment-form.tsx

"use client";

import { useActionState } from "react";
import { createApartment } from "../actions";

export function ApartmentForm() {
  const [state, action, pending] = useActionState(createApartment, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      {/* Apartment Number */}
      <div>
        <label
          htmlFor="apartment_number"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Apartment number <span className="text-red-500">*</span>
        </label>
        <input
          id="apartment_number"
          name="apartment_number"
          type="text"
          placeholder="e.g. 4B"
          autoComplete="off"
          className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm text-[#111110] placeholder:text-[#ADADAA] outline-none transition focus:border-[#111110] focus:ring-2 focus:ring-[#111110]/10"
          required
        />
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Location <span className="text-red-500">*</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Tower A, 123 Main St"
          autoComplete="off"
          className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm text-[#111110] placeholder:text-[#ADADAA] outline-none transition focus:border-[#111110] focus:ring-2 focus:ring-[#111110]/10"
          required
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Notes <span className="font-normal text-[#6F6F6C]">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          placeholder="Any details about this apartment…"
          rows={3}
          className="w-full resize-none rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm text-[#111110] placeholder:text-[#ADADAA] outline-none transition focus:border-[#111110] focus:ring-2 focus:ring-[#111110]/10"
        />
      </div>

      {/* Error */}
      {state?.error && (
        <p role="alert" className="text-sm text-red-500">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1A1A19] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#111110] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111110]/30"
      >
        {pending ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}
