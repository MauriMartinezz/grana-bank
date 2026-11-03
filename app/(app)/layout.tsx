import { BottomNav } from "@/components/layout/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";

// Mobile view: the page column and the bottom bar. Desktop view (the
// `desktop:` variant in globals.css): a sidebar beside a centered, readable
// page column, and no bottom bar. `data-shell` lets the root frame widen; a
// page marked `data-layout="wide"` (Home) gets a wider column for two columns.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-shell="app"
      className="desktop:grid desktop:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <SideNav />
      <main className="px-6 pt-12 pb-28 desktop:mx-auto desktop:w-full desktop:max-w-2xl desktop:px-10 desktop:pt-12 desktop:pb-12 desktop:has-[[data-layout=wide]]:max-w-6xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
