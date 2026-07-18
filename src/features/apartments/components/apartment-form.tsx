// src/features/apartments/components/apartment-form.tsx

"use client";

import { useActionState, useEffect, useState } from "react";
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

  const [state, dispatch, pending] = useActionState(formAction, null);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Los campos de texto se leen del DOM (tienen `name`, el form
    // sigue siendo nativo); las fotos vienen del estado `files` de
    // React, no de un <input type="file">. Se arma el FormData a
    // mano y se despacha directo — dispatch() acepta un FormData sin
    // necesidad de que venga de un submit nativo, y sigue actualizando
    // `pending` igual.
    const formData = new FormData(e.currentTarget);
    files.forEach((file) => formData.append("photos", file));

    dispatch(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

        <PhotoUpload files={files} onChange={setFiles} />
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
