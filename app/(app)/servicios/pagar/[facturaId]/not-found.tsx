import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function BillNotFound() {
  return (
    <StateMessage
      title="No encontramos esta factura"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/servicios" className={`${buttonClassName} mt-4`}>
        Ver mis servicios
      </Link>
    </StateMessage>
  );
}
