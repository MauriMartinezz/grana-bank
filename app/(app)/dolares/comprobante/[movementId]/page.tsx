import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/current-user";
import { getExchangeReceipt } from "@/features/exchange/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Operación realizada" };

export default async function ExchangeSuccessPage({
  params,
}: PageProps<"/dolares/comprobante/[movementId]">) {
  const { movementId } = await params;
  const user = await getCurrentUser();
  const movement = await getExchangeReceipt(user.id, movementId);
  const exchange = movement?.exchange;

  // Only the paying side of an exchange has a success screen.
  if (!movement || !exchange || movement.accountId !== exchange.fromAccountId) notFound();

  const buying = exchange.direction === "BUY";

  return (
    <section className="flex flex-col items-center pt-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-garnet-fill text-white">
        <CheckIcon className="size-8" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-bold">
        {buying ? "¡Compraste dólares!" : "¡Vendiste dólares!"}
      </h1>
      <p className="mt-2 text-3xl font-semibold">
        {buying
          ? formatMoney(exchange.usdCents, "USD")
          : formatMoney(exchange.arsCents, "ARS")}
      </p>
      <p className="mt-1 text-sm text-muted">
        {buying
          ? `por ${formatMoney(exchange.arsCents, "ARS")}`
          : `por ${formatMoney(exchange.usdCents, "USD")}`}
      </p>
      <p className="mt-4 text-sm text-muted">N.º de operación {movement.reference}</p>

      <div className="mt-10 w-full space-y-3">
        <Link href={`/movimientos/${movement.id}`} className={`${buttonClassName} w-full`}>
          Ver comprobante
        </Link>
        <Link
          href="/inicio"
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
