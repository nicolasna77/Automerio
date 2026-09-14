import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { EMAIL_COLORS } from "../colors";

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: EMAIL_COLORS.background,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            backgroundColor: EMAIL_COLORS.card,
            border: `1px solid ${EMAIL_COLORS.border}`,
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
          }}
        >
          <Text
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: EMAIL_COLORS.foreground,
              margin: "0 0 24px",
            }}
          >
            Automerio
          </Text>

          {children}

          <Hr
            style={{
              borderColor: EMAIL_COLORS.border,
              margin: "32px 0 16px",
            }}
          />
          <Text
            style={{
              fontSize: "12px",
              color: EMAIL_COLORS.mutedForeground,
              margin: 0,
            }}
          >
            Automerio — automatisations pour artisans, coachs, indépendants et
            TPE/PME.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailTextStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  color: EMAIL_COLORS.foreground,
  margin: "0 0 16px",
};

export const emailMutedTextStyle = {
  fontSize: "13px",
  lineHeight: "20px",
  color: EMAIL_COLORS.mutedForeground,
  margin: "0 0 16px",
};

export const emailButtonStyle = {
  backgroundColor: EMAIL_COLORS.primary,
  color: EMAIL_COLORS.primaryForeground,
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: "999px",
  padding: "10px 20px",
  textDecoration: "none",
  display: "inline-block",
};
