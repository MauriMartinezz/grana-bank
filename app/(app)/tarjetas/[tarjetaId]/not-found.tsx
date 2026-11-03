import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function CardNotFound() {
  return (
    <StateMessage
      title="No encontramos esta tarjeta"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/tarjetas" className={`${buttonClassName} mt-4`}>
        Ver mis tarjetas
      </Link>
    </StateMessage>
  );
}
