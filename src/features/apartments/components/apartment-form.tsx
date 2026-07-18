// src/features/apartments/components/apartment-form.tsx

"use client";

import { useActionState, useEffect } from "react";
import { createApartment, updateApartment } from "../actions";
import { PhotoUpload } from "./photo-upload";
import { toast } from "sonner";

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

  // createApartment/updateApartment hacen redirect() en éxito, lo cual
  // lanza NEXT_REDIRECT y navega antes de que la acción retorne un
  // estado — así que aquí solo hace falta manejar el caso de error.
  // El branch de "success" (con el setTimeout + router.push) nunca se
  // ejecutaba en la práctica; se quita.
  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
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
            className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm disabled:cursor-not-allowed"
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
            className="w-full rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm disabled:cursor-not-allowed"
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
            className="w-full resize-none rounded-lg border border-[#E2E2E0] bg-white px-3.5 py-2.5 text-sm disabled:cursor-not-allowed"
          />
        </div>

        <PhotoUpload />
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1A1A19] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
