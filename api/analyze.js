// api/analyze.js — Backend handler (Groq + Tavily, 100% free)
// To upgrade to Anthropic later: swap GROQ_API_KEY → ANTHROPIC_API_KEY
// and change the fetch URL + body format below.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const GROQ_KEY   = process.env.GROQ_API_KEY;
  const TAVILY_KEY = process.env.TAVILY_API_KEY;

  if (!GROQ_KEY)   return res.status(500).json({ error: "GROQ_API_KEY not set" });
  if (!TAVILY_KEY) return res.status(500).json({ error: "TAVILY_API_KEY not set" });

  const { type, messages, system } = req.body;

  try {
    // ── Step 1: Web search via Tavily ─────────────────────────────────────
    let searchContext = "";
    const searchQueries = {
      price:  "XAU/USD gold spot price live today current",
      signal: "XAU/USD gold price today technical analysis support resistance levels market sentiment",
      chat:   null, // no search for chat unless user asks about price
    };

    const searchQ = searchQueries[type];
    if (searchQ) {
      try {
        const tavRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: TAVILY_KEY,
            query: searchQ,
            max_results: 5,
            include_answer: true,
            search_depth: "basic",
          }),
        });
        const tavData = await tavRes.json();
        if (tavData.answer) searchContext += `ANSWER: ${tavData.answer}\n\n`;
        if (tavData.results?.length) {
          searchContext += "SOURCES:\n";
          tavData.results.slice(0, 4).forEach(r => {
            searchContext += `- ${r.title}: ${(r.content || "").slice(0, 400)}\n`;
          });
        }
      } catch (e) {
        searchContext = "Web search unavailable. Use knowledge to estimate.";
      }
    }

    // ── Step 2: Build messages for Groq ──────────────────────────────────
    const lastUserMsg = messages?.filter(m => m.role === "user").pop()?.content || "";
    const chatHistory = messages?.filter(m => m.role !== "system") || [];

    let groqMessages = [];

    if (type === "price" || type === "signal") {
      // Inject search context into the user message
      const augmented = searchContext
        ? `REAL-TIME WEB DATA (use this as primary source):\n${searchContext}\n\n---\n\nINSTRUCTION:\n${lastUserMsg}`
        : lastUserMsg;
      groqMessages = [{ role: "user", content: augmented }];
    } else {
      // Chat: use full history + inject search context if available
      const augmented = searchContext
        ? `MARKET DATA:\n${searchContext}\n\nUSER: ${lastUserMsg}`
        : lastUserMsg;
      groqMessages = [
        ...chatHistory.slice(0, -1),
        { role: "user", content: augmented },
      ];
    }

    // ── Step 3: Call Groq ─────────────────────────────────────────────────
    const systemPrompt = system || (type === "signal"
      ? "You are an expert XAU/USD trading analyst. Always respond with valid JSON only, no markdown fences, no preamble."
      : type === "price"
      ? "You are a financial data assistant. Always respond with valid JSON only, no markdown, no extra text."
      : "You are an XAU/USD trading assistant for an Indonesian trader. Reply in bahasa gaul (informal Indonesian). Be direct, max 4 sentences unless asked for more.");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...groqMessages,
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(500).json({ error: `Groq error: ${err}` });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   UPGRADE TO ANTHROPIC (paid, higher quality) — change these 3 things:
   
   1. Env var: GROQ_API_KEY → ANTHROPIC_API_KEY
   
   2. Fetch URL:
      "https://api.groq.com/openai/v1/chat/completions"
      →  "https://api.anthropic.com/v1/messages"
   
   3. Headers + body:
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }
      body: { model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: groqMessages, system: systemPrompt,
              tools: [{ type: "web_search_20250305", name: "web_search" }] }
      
   4. Parse response:
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("")
   
   That's it — everything else stays the same.
──────────────────────────────────────────────────────────────────────────── */
