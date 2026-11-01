import type { ComponentType, SVGProps } from "react";
import type { MovementType } from "@/generated/prisma/client";
import { ArrowDownIcon, ArrowUpIcon, SwapIcon } from "@/components/icons";

type MovementTypeStyle = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tileClass: string;
  amountClass: string;
};

export const MOVEMENT_TYPE_STYLES: Record<MovementType, MovementTypeStyle> = {
  SUBSCRIPTION: {
    label: "Pago de suscripción",
    Icon: SwapIcon,
    tileClass: "bg-blue-soft text-blue",
    amountClass: "text-blue",
  },
  RECEIVED: {
    label: "Pago recibido",
    Icon: ArrowDownIcon,
    tileClass: "bg-garnet-soft text-garnet",
    amountClass: "text-garnet",
  },
  SENT: {
    label: "Pago enviado",
    Icon: ArrowUpIcon,
    tileClass: "bg-yellow-soft text-yellow",
    amountClass: "text-yellow",
  },
};
