// Keep rolling context inside both the API character limits and Node's UTF-8
// request-byte limit. The full conversation stays visible in the interface.
export function buildChatHistory(messages) {
  const history = messages
    .filter(m => !m.error && ['user', 'assistant'].includes(m.role) && m.text.trim())
    .slice(-10)
    .map(m => ({ role: m.role, text: m.text.trim().slice(0, 2000) }));
  const encoder = new TextEncoder();
  while (history.length > 1) {
    const json = JSON.stringify(history);
    if (json.length <= 12000 && encoder.encode(json).length <= 16000) break;
    history.shift();
  }
  while (history[0]?.role === 'assistant') history.shift();
  return history;
}
