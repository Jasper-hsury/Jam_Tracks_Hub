const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSubscriberEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateSubscriberEmail(value) {
  const email = normalizeSubscriberEmail(value);
  return {
    email,
    valid: EMAIL_PATTERN.test(email)
  };
}

export async function submitSubscription({ endpoint, fetchImpl, payload }) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(function() {
    return {};
  });

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Subscription request failed.");
  }

  return result;
}
