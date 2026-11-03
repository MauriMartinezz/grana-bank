import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Mis tarjetas" };

// Replaced by the card list in the cards feature (odd/tasks/cards.md).
export default function CardsPage() {
  return (
    <ComingSoon
      title="Mis tarjetas"
      description="Muy pronto vas a poder agregar y ver todas tus tarjetas."
    />
  );
}
