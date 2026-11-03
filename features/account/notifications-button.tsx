import Link from "next/link";
import { BellIcon } from "@/components/icons";
import { getCurrentUser } from "@/features/auth/current-user";
import { countUnreadNotifications } from "@/features/notifications/queries";

/** The bell: opens Notificaciones, with the unread count. */
export async function NotificationsButton() {
  const user = await getCurrentUser();
  const unread = await countUnreadNotifications(user.id, new Date());
  return <BellLink unread={unread} />;
}

/** The bell without the count, while it loads. */
export function BellLink({ unread = 0 }: { unread?: number }) {
  return (
    <Link
      href="/notificaciones"
      aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
      className="relative flex size-11 items-center justify-center rounded-full"
    >
      <BellIcon />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-garnet-fill px-1 text-[10px] font-semibold text-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
