// features/profile/components/new-ui-toggle.tsx

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleUseNewUi } from "../actions";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  initialValue: boolean;
}

const RELOAD_SECONDS = 5;

export function NewUiToggle({ initialValue }: Props) {
  const [checked, setChecked] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [reloading, setReloading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { t } = useI18n();

  // Si el usuario navega fuera de /profile durante la cuenta regresiva,
  // no queremos un setInterval huérfano corriendo en segundo plano.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function reloadMessage(seconds: number) {
    return t("profile.newUiReloadNotice").replace("{seconds}", String(seconds));
  }

  function handleToggle() {
    const next = !checked;
    setChecked(next); // optimista

    startTransition(async () => {
      const result = await toggleUseNewUi(next);

      if (result && "error" in result) {
        setChecked(!next); // revertir
        toast.error(result.error);
        return;
      }

      setReloading(true);
      let remaining = RELOAD_SECONDS;

      const toastId = toast.success(
        next ? t("profile.newUiEnabled") : t("profile.newUiDisabled"),
        {
          description: reloadMessage(remaining),
          duration: Infinity,
          descriptionClassName: "!text-[#E3E3E3]",
        }
      );

      intervalRef.current = setInterval(() => {
        remaining -= 1;

        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          window.location.reload();
          return;
        }

        // sonner actualiza el toast existente si se le pasa el mismo id
        toast.success(
          next ? t("profile.newUiEnabled") : t("profile.newUiDisabled"),
          {
            id: toastId,
            description: reloadMessage(remaining),
            duration: Infinity,
            descriptionClassName: "!text-[#E3E3E3]",
          }
        );
      }, 1000);
    });
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#111110]">
            {t("profile.newUiTitle")}
          </p>
          <span className="rounded-full bg-[#E8FF57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#111110]">
            {t("profile.newUiBeta")}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#6F6F6C]">
          {t("profile.newUiDescription")}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isPending || reloading}
        onClick={handleToggle}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${
          checked ? "justify-end bg-[#111110]" : "justify-start bg-[#E2E2E0]"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
