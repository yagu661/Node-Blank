import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (_openai) return _openai;
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) return null;
  _openai = new OpenAI({ baseURL, apiKey });
  return _openai;
}

export async function correctSearchQuery(query: string): Promise<string> {
  if (query.startsWith("http://") || query.startsWith("https://")) return query;
  const client = getClient();
  if (!client) return query;
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "You are a music search assistant. The user typed a song/artist query that may have typos or misspellings. " +
            "Return ONLY the corrected search query — nothing else, no explanation, no quotes, no punctuation changes. " +
            "If it already looks correct or is a URL, return it unchanged.",
        },
        { role: "user", content: query },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || query;
  } catch {
    return query;
  }
}

export async function getRelatedSongs(title: string, author: string): Promise<string[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            'You are a music recommendation AI. Given a song, return exactly 5 similar songs in the same genre, style, and mood. ' +
            'Reply ONLY with a valid JSON array of strings, each in the format "Artist Name - Song Title". ' +
            'No markdown, no explanation — just the raw JSON array.',
        },
        { role: "user", content: `"${title}" by ${author}` },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim() ?? "[]";
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return (parsed as string[]).slice(0, 5);
  } catch {}
  return [];
}
