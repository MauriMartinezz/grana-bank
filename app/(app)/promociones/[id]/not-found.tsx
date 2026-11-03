import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";

export default function PromotionNotFound() {
  return (
    <StateMessage title="No encontramos esta promoción" description="Puede que ya no esté vigente.">
      <Link href="/promociones" className={`${buttonClassName} mt-4`}>
        Ver promociones
      </Link>
    </StateMessage>
  );
}
