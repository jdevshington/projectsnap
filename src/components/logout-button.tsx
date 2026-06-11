import { signOut } from "@/features/auth/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="rounded border px-4 py-2">
        Logout
      </button>
    </form>
  );
}
