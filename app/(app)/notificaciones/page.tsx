import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { MarkSeen } from "@/features/notifications/mark-seen";
import { NotificationList } from "@/features/notifications/notification-list";
import { listNotifications } from "@/features/notifications/queries";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = await listNotifications(user.id, new Date());

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Notificaciones</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Los últimos 30 días: dinero que entra y sale, dólares, pagos que fallaron y los
        recordatorios de tus servicios.
      </p>

      {notifications.length > 0 ? (
        <NotificationList notifications={notifications} />
      ) : (
        <StateMessage
          title="No tenés notificaciones"
          description="Cuando recibas o envíes dinero, o se acerque un vencimiento, lo vas a ver acá."
        />
      )}
      <MarkSeen />
    </>
  );
}
