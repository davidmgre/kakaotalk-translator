const HANGUL = /[ㄱ-ㆎ가-힣]/;
const LETTERS = /\p{Letter}/u;
export function needsTranslation(text, target = "en") {
  if (!text) return false;
  return target === "ko" ? LETTERS.test(text) && !HANGUL.test(text) : HANGUL.test(text);
}
export function parseCliJson(text) {
  const safe = text.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (token) =>
    token.startsWith('"') || !/^-?\d+$/.test(token) || Number.isSafeInteger(Number(token))
      ? token : JSON.stringify(token));
  return JSON.parse(safe);
}
function pick(obj, keys) {
  for (const key of keys) if (obj[key] != null && obj[key] !== "") return obj[key];
}
export function parseMessages(stdout) {
  const text = stdout.trim();
  if (!text) return [];
  let rows;
  try {
    const data = parseCliJson(text);
    rows = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [data];
  } catch {
    rows = text.split("\n").flatMap((line) => { try { return [parseCliJson(line)]; } catch { return []; } });
  }
  return rows.filter((row) => row && typeof row === "object").map((m) => ({
    chatId: pick(m, ["chatId", "chat_id"]) ?? "",
    logId: pick(m, ["logId", "log_id", "id"]),
    senderId: pick(m, ["sender_id", "authorId", "author_id"]),
    author: String(pick(m, ["author", "sender", "name", "nickname"]) ?? "Name unavailable"),
    text: String(pick(m, ["message", "text", "content", "body"]) ?? ""),
    sentAt: pick(m, ["sentAt", "sent_at", "timestamp", "time", "createdAt"]) ?? null,
  }));
}
export function extractArray(output, expected) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(output.slice(start, end + 1));
    return Array.isArray(data) && data.length === expected && data.every((v) => typeof v === "string") ? data : null;
  } catch { return null; }
}
