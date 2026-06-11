// components/bottom-nav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Building2, History, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/apartments", label: "Apartments", icon: Building2 },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E2E2E0] bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-1"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? "text-[#111110]" : "text-[#ADADAA]"}
              />
              <span
                className={`text-[10px] font-medium tracking-wide ${
                  isActive ? "text-[#111110]" : "text-[#ADADAA]"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
