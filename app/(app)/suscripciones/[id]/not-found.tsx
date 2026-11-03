import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function SubscriptionNotFound() {
  return (
    <StateMessage
      title="No encontramos esta suscripción"
      description="Puede que el enlace sea incorrecto."
    >
      <Link href="/suscripciones" className={`${buttonClassName} mt-4`}>
        Ver mis suscripciones
      </Link>
    </StateMessage>
  );
}
