// app/(app)/profile/page.tsx

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-[#111110]">
        Profile
      </h1>

      <div className="rounded-xl border border-[#E2E2E0] bg-white divide-y divide-[#F0F0EE]">
        <div className="px-5 py-4">
          <p className="text-xs text-[#6F6F6C]">Email</p>
          <p className="mt-0.5 text-sm font-medium text-[#111110]">
            {user!.email}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-[#6F6F6C]">Account ID</p>
          <p className="mt-0.5 font-mono text-xs text-[#6F6F6C] break-all">
            {user!.id}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
