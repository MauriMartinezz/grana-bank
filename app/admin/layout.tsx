import { logout } from "@/features/auth/actions";

// The admin view: one centered column, no app navigation. Every page checks
// the role itself with requireAdmin(); this layout only frames them.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-12 pb-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="font-serif text-sm text-muted">Administración</p>
        <form action={logout}>
          <button type="submit" className="min-h-11 font-serif text-sm text-garnet">
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </main>
  );
}
