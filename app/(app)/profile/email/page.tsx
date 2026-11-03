import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/current-user";
import { EmailForm } from "@/features/profile/profile-forms";
import { ChangeScreenHeader } from "@/features/profile/profile-summary";

export const metadata: Metadata = { title: "Cambiar email" };

export default async function EmailPage() {
  const user = await getCurrentUser();

  return (
    <>
      <ChangeScreenHeader
        title="Cambiar email"
        description={`Hoy ingresás con ${user.email}. Para cambiarlo, confirmá tu contraseña.`}
      />
      <div className="mt-6">
        <EmailForm />
      </div>
    </>
  );
}
