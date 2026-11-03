import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function AdhesionNotFound() {
  return (
    <StateMessage
      title="No encontramos este servicio"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/servicios" className={`${buttonClassName} mt-4`}>
        Ver mis servicios
      </Link>
    </StateMessage>
  );
}
