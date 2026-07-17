// features/apartments/components/photo-manager.tsx

"use client";

import { useState, useTransition } from "react";
import { X, ImageIcon } from "lucide-react";
import { deletePhoto } from "../actions";
import { toast } from "sonner";
import type { Photo } from "../types";

interface Props {
  photos: Photo[];
}

export function PhotoManager({ photos }: Props) {
  const [current, setCurrent] = useState<Photo[]>(photos);
  const [isPending, startTransition] = useTransition();

  function handleDelete(photo: Photo) {
    startTransition(async () => {
      const result = await deletePhoto(photo.id, photo.storage_path);
      // Solo cambia la condición del resultado:
      if ("error" in (result ?? {})) {
        toast.error((result as { error: string }).error);
      } else {
        setCurrent((prev) => prev.filter((p) => p.id !== photo.id));
        toast.success("Photo deleted.");
      }
    });
  }

  if (current.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <ImageIcon size={13} strokeWidth={1.75} className="text-[#ADADAA]" />
        <p className="text-sm font-medium text-[#111110]">
          Current photos
          <span className="ml-1 font-normal text-[#6F6F6C]">
            ({current.length})
          </span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {current.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[#E2E2E0] bg-[#F9F9F8]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.public_url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(photo)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-red-500 disabled:cursor-not-allowed"
              aria-label="Delete photo"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-[#ADADAA]">
        Tap and hold a photo to delete it.
      </p>
    </div>
  );
}
