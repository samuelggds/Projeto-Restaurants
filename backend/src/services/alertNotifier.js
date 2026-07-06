const alertWebhookUrl = process.env.ALERT_WEBHOOK_URL || "";

function buildPayload(title, details) {
  return {
    text: `${title}\n${details}`,
  };
}

export async function notifyCriticalError(title, details) {
  if (!alertWebhookUrl) {
    return;
  }

  try {
    await fetch(alertWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(title, details)),
    });
  } catch (notificationError) {
    console.error("[ALERT_WEBHOOK_ERROR]", notificationError?.message);
  }
}
