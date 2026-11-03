import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function CompanyNotFound() {
  return (
    <StateMessage
      title="No encontramos esta empresa"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/servicios/adherir" className={`${buttonClassName} mt-4`}>
        Ver empresas
      </Link>
    </StateMessage>
  );
}
