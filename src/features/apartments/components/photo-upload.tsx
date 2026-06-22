// features/apartments/components/photo-upload.tsx

"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface Preview {
  file: File;
  url: string;
}

export function PhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePreview(index: number) {
    URL.revokeObjectURL(previews[index].url);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#111110]">
        Photos
        <span className="ml-1 font-normal text-[#6F6F6C]">(optional)</span>
      </label>

      {/* Hidden file inputs — one per preview to attach to FormData */}
      {previews.map((preview, index) => (
        <input
          key={index}
          type="file"
          name="photos"
          className="hidden"
          readOnly
          ref={(el) => {
            if (el) {
              const dt = new DataTransfer();
              dt.items.add(preview.file);
              el.files = dt.files;
            }
          }}
        />
      ))}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#E2E2E0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePreview(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-lg border border-dashed border-[#E2E2E0] px-4 py-3 text-sm text-[#6F6F6C] transition hover:border-[#111110] hover:text-[#111110]"
      >
        <Camera size={15} strokeWidth={1.75} />
        {previews.length === 0 ? "Add photos" : "Add more"}
      </button>

      {/* Hidden input for camera/gallery picker */}
      <input
        ref={inputRef}
        type="file"
        name="photos"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  );
}
