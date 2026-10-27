// Server-side proxy for JD parsing so the Gemini API key never reaches the browser.
// Set GEMINI_API_KEY (and optionally GEMINI_API_BASE for a proxy host) in the server environment.

const MAX_JD_CHARS = 20_000;
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";
const MODEL = "gemini-2.5-flash";

const PROMPT_PREFIX =
  "You are an expert tech recruiter parser. Extract information from the following Job Description and return ONLY a valid JSON object (no markdown, no backticks). The JSON must have these exact keys:\n'company' (string, extract company name),\n'role' (string, extract job title),\n'deadline' (string, extract deadline in YYYY-MM-DD format, or leave empty string if not found),\n'prepTags' (array of strings, extract 3-5 core technical skills or interview topics. Focus heavily on algorithm, software engineering, and hardware/ECE related tech stacks like C++, DSP, Machine Learning, System Design).\nJob Description: ";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 },
    );
  }

  let jd: unknown;
  try {
    ({ jd } = (await request.json()) as { jd?: unknown });
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof jd !== "string" || !jd.trim()) {
    return Response.json({ error: "Field 'jd' is required." }, { status: 400 });
  }
  if (jd.length > MAX_JD_CHARS) {
    return Response.json(
      { error: `Job description is longer than ${MAX_JD_CHARS} characters.` },
      { status: 413 },
    );
  }

  const base = (process.env.GEMINI_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
  const upstream = await fetch(`${base}/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Send the key in a header instead of the query string so it does not end up in URL logs.
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT_PREFIX + jd.trim() }] }],
    }),
  });

  if (!upstream.ok) {
    return Response.json(
      { error: `Model API error ${upstream.status}.` },
      { status: 502 },
    );
  }

  const data = (await upstream.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text.trim()) {
    return Response.json({ error: "Empty response from model." }, { status: 502 });
  }
  return Response.json({ text });
}
