import type { Metadata } from "next";
import { PasswordForm } from "@/features/profile/profile-forms";
import { ChangeScreenHeader } from "@/features/profile/profile-summary";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default function PasswordPage() {
  return (
    <>
      <ChangeScreenHeader
        title="Cambiar contraseña"
        description="Seguís con la sesión abierta en este dispositivo; en los demás la cerramos."
      />
      <div className="mt-6">
        <PasswordForm />
      </div>
    </>
  );
}
