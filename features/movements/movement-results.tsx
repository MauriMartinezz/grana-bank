import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { hasActiveFilters, type MovementFilters } from "./filters";
import { MovementList } from "./movement-list";
import { listMovements } from "./queries";

export async function MovementResults({
  filters,
}: {
  filters: MovementFilters;
}) {
  const user = await getCurrentUser();
  const movements = await listMovements(user.id, filters);

  if (movements.length > 0) {
    return <MovementList movements={movements} />;
  }

  return hasActiveFilters(filters) ? (
    <StateMessage
      title="No encontramos movimientos"
      description="Probá con otro nombre o cambiá el filtro."
    />
  ) : (
    <StateMessage
      title="Todavía no tenés movimientos"
      description="Cuando hagas o recibas un pago, lo vas a ver acá."
    />
  );
}
