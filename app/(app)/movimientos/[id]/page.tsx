import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { listCategories } from "@/features/categories/categories";
import { MovementCategoryForm } from "@/features/categories/movement-category-form";
import { movementSource } from "@/features/movements/movement-source";
import { MOVEMENT_TYPE_STYLES } from "@/features/movements/movement-type";
import { getMovement } from "@/features/movements/queries";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Detalle del movimiento" };

export default async function MovementDetailPage({
  params,
}: PageProps<"/movimientos/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [movement, categories] = await Promise.all([
    getMovement(user.id, id),
    listCategories(user.id),
  ]);

  if (!movement) {
    notFound();
  }

  const { label, Icon, tileClass, amountClass } =
    MOVEMENT_TYPE_STYLES[movement.type];
  // A movement belongs to at most one operation, so at most one note exists.
  const note =
    movement.transfer?.note ?? movement.topUp?.note ?? movement.servicePayment?.note ?? null;

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/movimientos" />
        <h1 className="font-serif text-2xl font-bold">Detalle</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <div className="flex flex-col items-center text-center">
          <span
            className={`flex size-14 items-center justify-center rounded-2xl ${tileClass}`}
          >
            <Icon />
          </span>
          <p className="mt-4 font-medium">{movement.counterparty}</p>
          <p className={`mt-1 text-3xl font-semibold ${amountClass}`}>
            {formatMoney(movement.amountCents, movement.account.currency)}
          </p>
        </div>

        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Tipo</dt>
            <dd className="text-right font-medium">{label}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Tarjeta</dt>
            <dd className="text-right font-medium">{movementSource(movement)}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Fecha</dt>
            <dd className="text-right font-medium">
              {formatDateTime(movement.occurredAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">N.º de operación</dt>
            <dd className="text-right font-medium">{movement.reference}</dd>
          </div>
          {note && (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Nota</dt>
              <dd className="min-w-0 text-right font-medium break-words">{note}</dd>
            </div>
          )}
          <div className="py-3">
            <dt>
              <label htmlFor="movementCategory" className="text-muted">
                Categoría <span className="text-xs">(solo la ves vos)</span>
              </label>
            </dt>
            <dd className="mt-1.5">
              <MovementCategoryForm
                movementId={movement.id}
                categoryId={movement.categoryId}
                categories={categories}
              />
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
