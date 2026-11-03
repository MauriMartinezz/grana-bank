import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { BellIcon, CloseIcon } from "@/components/icons";
import { MOVEMENT_TYPE_STYLES } from "@/features/movements/movement-type";
import { formatDateTime } from "@/lib/format";
import type { Notification, NotificationKind } from "./feed";

const KIND_STYLES: Record<
  NotificationKind,
  { Icon: ComponentType<SVGProps<SVGSVGElement>>; tileClass: string }
> = {
  "money-in": MOVEMENT_TYPE_STYLES.RECEIVED,
  "money-out": MOVEMENT_TYPE_STYLES.SENT,
  exchange: MOVEMENT_TYPE_STYLES.EXCHANGE,
  failure: { Icon: CloseIcon, tileClass: "bg-garnet-soft text-garnet" },
  reminder: { Icon: BellIcon, tileClass: "bg-blue-soft text-blue" },
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  return (
    <ul aria-label="Notificaciones" className="space-y-px overflow-hidden rounded-2xl">
      {notifications.map((item) => {
        const { Icon, tileClass } = KIND_STYLES[item.kind];
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
            >
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tileClass}`}
              >
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{item.title}</span>
                <span className="block truncate text-sm text-muted">{item.detail}</span>
                <span className="block text-xs text-muted">{formatDateTime(item.at)}</span>
              </span>
              {item.unread && (
                <span className="size-2.5 shrink-0 rounded-full bg-garnet-fill">
                  <span className="sr-only">Sin leer</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
