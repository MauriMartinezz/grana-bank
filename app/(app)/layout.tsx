import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";

// Mobile view: the page column and the bottom bar. Desktop view (the
// `desktop:` variant in globals.css): a sidebar beside a centered, readable
// page column, and no bottom bar. `data-shell` lets the root frame widen.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-shell="app"
      className="desktop:grid desktop:grid-cols-[15rem_minmax(0,1fr)] desktop:gap-8 desktop:pr-8"
    >
      <SideNav />
      <main className="px-6 pt-12 pb-28 desktop:mx-auto desktop:w-full desktop:max-w-2xl desktop:px-0 desktop:pt-12 desktop:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
