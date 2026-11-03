import type { Metadata } from "next";
import { getCurrentUser } from "@/features/auth/current-user";
import { PersonalDataForm } from "@/features/profile/profile-forms";
import { ChangeScreenHeader } from "@/features/profile/profile-summary";

export const metadata: Metadata = { title: "Datos personales" };

export default async function PersonalDataPage() {
  const user = await getCurrentUser();

  return (
    <>
      <ChangeScreenHeader title="Datos personales" />
      <div className="mt-6">
        <PersonalDataForm
          initial={{
            firstName: user.firstName,
            lastName: user.lastName,
            address: user.address ?? "",
            phone: user.phone ?? "",
          }}
        />
      </div>
    </>
  );
}
