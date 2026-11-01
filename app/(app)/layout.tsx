import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="px-6 pt-12 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
