import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import type { ReactNode } from "react";

/** Email clients need hex colors; these mirror the Frosted Fern tokens. */
export const emailColors = {
  canvas: "#f6f6ee",
  surface: "#fdfdf9",
  ink: "#252c24",
  muted: "#5d665a",
  subtle: "#848c80",
  line: "#e4e6da",
  fern: "#748469",
  cream: "#f9ead7",
};

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: { extend: { colors: emailColors } },
        }}
      >
        <Head />
        <Body className="m-0 bg-canvas py-10 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto max-w-[480px] px-5">
            <Text className="m-0 mb-6 text-[18px] font-bold tracking-tight text-ink">
              <span className="text-fern">●</span> Wanna Space
            </Text>
            <Section className="rounded-[16px] bg-surface px-8 py-8">{children}</Section>
            <Hr className="my-6 border-none" />
            <Text className="text-subtle m-0 text-[12px] leading-[18px]">
              You’re receiving this because someone used this address on Wanna Space. If that wasn’t
              you, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
