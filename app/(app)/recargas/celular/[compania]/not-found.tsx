import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function PhoneCompanyNotFound() {
  return (
    <StateMessage title="No encontramos esta compañía" description="Puede que el enlace sea incorrecto.">
      <Link href="/recargas/celular" className={`${buttonClassName} mt-4`}>
        Ver compañías
      </Link>
    </StateMessage>
  );
}
