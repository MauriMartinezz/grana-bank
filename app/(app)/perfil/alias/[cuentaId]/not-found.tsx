import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function AliasNotFound() {
  return (
    <StateMessage
      title="No encontramos esta cuenta"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/profile" className={`${buttonClassName} mt-4`}>
        Volver al perfil
      </Link>
    </StateMessage>
  );
}
