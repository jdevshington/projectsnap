// features/apartments/components/apartments-list-v2.tsx

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import type { ApartmentRecord } from "../types";

type DateFilter = "all" | "today" | "week" | "month";

interface Props {
  apartments: ApartmentRecord[];
}

function isWithinFilter(isoDate: string, filter: DateFilter): boolean {
  if (filter === "all") return true;

  const date = new Date(isoDate);
  const now = new Date();

  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }

  // month
  const monthAgo = new Date(now);
  monthAgo.setMonth(now.getMonth() - 1);
  return date >= monthAgo;
}

export function ApartmentsListV2({ apartments }: Props) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return apartments.filter((apt) => {
      const matchesQuery =
        q.length === 0 ||
        apt.apartment_number.toLowerCase().includes(q) ||
        apt.location.toLowerCase().includes(q);

      return matchesQuery && isWithinFilter(apt.created_at, dateFilter);
    });
  }, [apartments, query, dateFilter]);

  const dateFilterOptions: { value: DateFilter; label: string }[] = [
    { value: "all", label: t("apartments.filterAll") },
    { value: "today", label: t("apartments.filterToday") },
    { value: "week", label: t("apartments.filterWeek") },
    { value: "month", label: t("apartments.filterMonth") },
  ];

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-[#111110]">
          {t("apartments.title")}
        </h1>
        <Link
          href="/apartments/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
        >
          <Plus size={14} strokeWidth={2} />
          {t("apartments.addRecord")}
        </Link>
      </div>

      {apartments.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#ADADAA]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("apartments.searchPlaceholder")}
              className="w-full rounded-lg border border-[#E2E2E0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#111110] placeholder:text-[#ADADAA] focus:border-[#111110] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {dateFilterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateFilter(opt.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  dateFilter === opt.value
                    ? "border-[#111110] bg-[#111110] text-white"
                    : "border-[#E2E2E0] bg-white text-[#6F6F6C] hover:border-[#ADADAA]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(query.trim().length > 0 || dateFilter !== "all") && (
            <p className="text-xs text-[#ADADAA]">
              {filtered.length} {t("apartments.resultsCount")}
            </p>
          )}
        </div>
      )}

      {apartments.length === 0 ? (
        <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-10 text-center">
          <Building2
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[#ADADAA]"
          />
          <p className="text-sm font-medium text-[#111110]">
            {t("apartments.noRecords")}
          </p>
          <p className="mt-1 text-sm text-[#6F6F6C]">
            {t("apartments.noRecordsPrompt")}
          </p>
          <Link
            href="/apartments/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111110]"
          >
            <Plus size={14} strokeWidth={2} />
            {t("apartments.addRecord")}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E2E2E0] bg-white px-5 py-10 text-center">
          <Search
            size={24}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[#ADADAA]"
          />
          <p className="text-sm text-[#6F6F6C]">{t("apartments.noResults")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
          {filtered.map((apt) => (
            <Link
              key={apt.id}
              href={`/apartments/${apt.id}`}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-[#F9F9F8]"
            >
              <div className="flex items-start gap-3">
                <Building2
                  size={15}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-[#ADADAA]"
                />
                <div>
                  <p className="text-sm font-medium text-[#111110]">
                    Apt {apt.apartment_number}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6F6F6C]">
                    {apt.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#ADADAA]">
                  {formatDate(apt.created_at, locale)}
                </span>
                <ChevronRight
                  size={14}
                  strokeWidth={1.75}
                  className="text-[#ADADAA]"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
