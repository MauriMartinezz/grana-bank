import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function NotFound() {
  return (
    <main className="px-6 pt-24">
      <StateMessage
        title="Página no encontrada"
        description="La dirección que buscás no existe."
      >
        <Link href="/home" className={`${buttonClassName} mt-4`}>
          Volver al inicio
        </Link>
      </StateMessage>
    </main>
  );
}
