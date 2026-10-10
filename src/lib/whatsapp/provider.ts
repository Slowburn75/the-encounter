import { sanitizeTemplateParameter, scrubSensitiveText } from "@/lib/domain/text";

export type ConfirmationMessage = {
  toE164: string;
  recipientName: string;
  eventName: string;
  reference: string;
  eventDate: string;
  eventTime: string;
  venue: string;
};

export type ProviderSendResult =
  | { ok: true; providerRef: string }
  | { ok: false; error: string; unconfigured: boolean; retryable: boolean };

export function providerLabel(): string {
  const mode = process.env.WHATSAPP_PROVIDER ?? "none";
  if (mode === "test-fail" && process.env.NODE_ENV !== "production") return "test-fail";
  if (mode === "meta") return "meta";
  return "none";
}

export function whatsAppConfig() {
  const provider = providerLabel();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? "";
  const configured =
    provider === "meta" &&
    Boolean(process.env.WHATSAPP_ACCESS_TOKEN) &&
    Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
    Boolean(templateName);
  return {
    provider,
    configured,
    templateName,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v22.0",
  };
}

export async function sendConfirmation(
  message: ConfirmationMessage,
): Promise<ProviderSendResult> {
  const config = whatsAppConfig();
  if (config.provider === "test-fail") {
    return {
      ok: false,
      error: "Simulated WhatsApp failure",
      unconfigured: false,
      retryable: true,
    };
  }
  if (!config.configured) {
    return {
      ok: false,
      error: "WhatsApp provider is not configured",
      unconfigured: true,
      retryable: true,
    };
  }

  const parameters = [
    message.recipientName,
    message.eventName,
    message.reference,
    message.eventDate,
    message.eventTime,
    message.venue,
  ].map((value) => ({
    type: "text",
    text: sanitizeTemplateParameter(value) || "-",
  }));

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.graphVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.toE164.replace(/^\+/, ""),
          type: "template",
          template: {
            name: config.templateName,
            language: { code: config.language },
            components: [{ type: "body", parameters }],
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const body = (await response.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        error: scrubSensitiveText(body?.error?.message || `WhatsApp request failed (${response.status})`),
        unconfigured: false,
        retryable: response.status === 429 || response.status >= 500,
      };
    }
    const providerRef = body?.messages?.[0]?.id;
    if (!providerRef) {
      return {
        ok: false,
        error: "WhatsApp did not return a message id",
        unconfigured: false,
        retryable: true,
      };
    }
    return { ok: true, providerRef };
  } catch (error) {
    return {
      ok: false,
      error: scrubSensitiveText(error instanceof Error ? error.message : "WhatsApp request failed"),
      unconfigured: false,
      retryable: true,
    };
  }
}
