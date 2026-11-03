import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function SubeCardNotFound() {
  return (
    <StateMessage
      title="No encontramos esta tarjeta SUBE"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/recargas/sube" className={`${buttonClassName} mt-4`}>
        Ver mis tarjetas SUBE
      </Link>
    </StateMessage>
  );
}
