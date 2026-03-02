/** In-memory store of recent webhook events for merchant diagnostics. Last 50 events. */
const MAX_EVENTS = 50;

export type WebhookEventRecord = {
  id: string;
  type: string;
  timestamp: string;
  signatureValid: boolean;
  status: "processed" | "invalid" | "test" | "error";
};

const events: WebhookEventRecord[] = [];

export function pushWebhookEvent(record: WebhookEventRecord): void {
  events.unshift(record);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export function getWebhookEvents(limit = 50): WebhookEventRecord[] {
  return events.slice(0, limit);
}
