import { Button, Heading, Link, Text } from "react-email";

import { EmailLayout } from "./layout";

export type ActionEmailProps = {
  preview: string;
  heading: string;
  greetingName?: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  expiryNote: string;
};

/** One template for single-action emails: verify address, reset password. */
export default function ActionEmail({
  preview,
  heading,
  greetingName,
  body,
  actionLabel,
  actionUrl,
  expiryNote,
}: ActionEmailProps) {
  return (
    <EmailLayout preview={preview}>
      <Heading as="h1" className="m-0 mb-4 text-[24px] leading-[30px] font-bold text-ink">
        {heading}
      </Heading>
      <Text className="text-muted m-0 mb-2 text-[15px] leading-[24px]">
        {greetingName ? `Hi ${greetingName},` : "Hi,"}
      </Text>
      <Text className="text-muted m-0 mb-6 text-[15px] leading-[24px]">{body}</Text>
      <Button
        href={actionUrl}
        className="box-border block rounded-[10px] bg-ink px-6 py-3 text-center text-[15px] font-semibold text-canvas no-underline"
      >
        {actionLabel}
      </Button>
      <Text className="text-subtle m-0 mt-6 text-[13px] leading-[20px]">{expiryNote}</Text>
      <Text className="text-subtle m-0 mt-4 text-[12px] leading-[18px] break-all">
        Button not working? Paste this link into your browser:{" "}
        <Link href={actionUrl} className="text-fern underline">
          {actionUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

ActionEmail.PreviewProps = {
  preview: "Confirm your email to open your space",
  heading: "Confirm your email",
  greetingName: "Siyam",
  body: "Tap the button below to confirm this address and step into your space.",
  actionLabel: "Confirm email",
  actionUrl: "http://localhost:3000/api/auth/verify-email?token=example",
  expiryNote: "This link expires in 1 hour.",
} satisfies ActionEmailProps;
