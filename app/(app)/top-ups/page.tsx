import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Recargas" };

export default function TopUpsPage() {
  return (
    <ComingSoon
      title="Recargas"
      options={["Telefonía", "Televisión satelital", "Tarjeta de transporte"]}
    />
  );
}
