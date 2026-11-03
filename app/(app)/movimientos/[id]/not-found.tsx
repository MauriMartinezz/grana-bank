import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function MovementNotFound() {
  return (
    <StateMessage
      title="No encontramos este movimiento"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/movements" className={`${buttonClassName} mt-4`}>
        Ver movimientos
      </Link>
    </StateMessage>
  );
}
