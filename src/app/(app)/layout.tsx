import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-5 pt-10 pb-28 md:px-10 md:pt-14 md:pb-16">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
