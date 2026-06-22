// features/apartments/components/apartment-form.tsx

"use client";

import { useActionState } from "react";
import { createApartment, updateApartment } from "../actions";
import { PhotoUpload } from "./photo-upload";

type ApartmentFormProps = {
  apartment?: {
    id: string;
    apartment_number: string;
    location: string;
    notes: string | null;
  };
};

export function ApartmentForm({ apartment }: ApartmentFormProps) {
  const formAction = apartment
    ? updateApartment.bind(null, apartment.id)
    : createApartment;

  const [state, action, pending] = useActionState(formAction, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="apartment_number"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Apartment number
        </label>
        <input
          id="apartment_number"
          name="apartment_number"
          type="text"
          defaultValue={apartment?.apartment_number ?? ""}
          placeholder="e.g. 4B"
          className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm"
          required
        />
      </div>

      <div>
        <label
          htmlFor="location"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={apartment?.location ?? ""}
          placeholder="e.g. Tower A"
          className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm"
          required
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-[#111110]"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={apartment?.notes ?? ""}
          placeholder="Any details..."
          className="w-full resize-none rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm"
        />
      </div>

      <PhotoUpload />

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1A1A19] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending
          ? apartment
            ? "Saving changes..."
            : "Saving..."
          : apartment
          ? "Save changes"
          : "Save record"}
      </button>
    </form>
  );
}
