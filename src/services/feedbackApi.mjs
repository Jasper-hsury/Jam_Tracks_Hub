export function validateFeedbackFields(topicValue, suggestionValue) {
  const topic = String(topicValue || "").trim();
  const suggestion = String(suggestionValue || "").trim();

  if (!topic) return { valid: false, field: "topic", topic, suggestion };
  if (!suggestion) return { valid: false, field: "suggestion", topic, suggestion };
  return { valid: true, field: null, topic, suggestion };
}

export async function submitFeedback({ endpoint, payload, fetchImpl }) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let responsePayload = {};
  try {
    responsePayload = await response.json();
  } catch (error) {
    responsePayload = {};
  }

  if (!response.ok || responsePayload.ok === false) {
    throw new Error(responsePayload.message || "Feedback failed");
  }

  return responsePayload;
}
