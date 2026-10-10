import { LightOnly } from "@/components/theme/light-only";

/** The landing page has no themes: it is always the light brand palette. */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="light" data-landing className="bg-canvas text-ink">
      <LightOnly />
      {children}
    </div>
  );
}
