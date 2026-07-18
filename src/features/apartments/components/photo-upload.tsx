// src/features/apartments/components/photo-upload.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface PhotoUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1920;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          resolve(
            new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.82
      );
    };

    img.src = url;
  });
}

/**
 * Componente controlado: el padre es dueño del array de archivos
 * (`files`) y decide qué hacer con ellos en el submit. Este
 * componente solo se encarga de seleccionar, comprimir y previsualizar.
 *
 * Reemplaza la técnica anterior de un <input type="file"> oculto por
 * preview con archivos asignados vía DataTransfer — no era confiable
 * entre navegadores. Ahora no hay ningún input con `name`: los
 * archivos se agregan al FormData a mano en ApartmentForm.
 */
export function PhotoUpload({ files, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  // Se recrean solo cuando cambia el array de archivos, y se revocan
  // en cleanup para no filtrar memoria entre renders.
  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  );

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    setCompressing(true);
    const compressed = await Promise.all(selected.map(compressImage));
    setCompressing(false);

    onChange([...files, ...compressed]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#111110]">
        Photos
        <span className="ml-1 font-normal text-[#6F6F6C]">(optional)</span>
      </label>

      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#E2E2E0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[index]}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={compressing}
        className="flex items-center gap-2 rounded-lg border border-dashed border-[#E2E2E0] px-4 py-3 text-sm text-[#6F6F6C] transition hover:border-[#111110] hover:text-[#111110] disabled:opacity-50"
      >
        <Camera size={15} strokeWidth={1.75} />
        {compressing
          ? "Processing..."
          : files.length === 0
          ? "Add photos"
          : "Add more"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  );
}
