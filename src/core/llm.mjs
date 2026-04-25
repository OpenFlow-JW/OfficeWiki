// Minimal BYOK client abstraction.
// Keys are never written to disk; only read from env at runtime.

export async function llmChat({ provider, model, baseUrl, messages, maxTokens = 800 }) {
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Missing OPENAI_API_KEY');
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens })
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'openai_compat') {
    const key = process.env.OPENAI_COMPAT_API_KEY || process.env.OPENAI_API_KEY || 'ollama';
    if (!baseUrl) throw new Error('Missing baseUrl for openai_compat');
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens })
    });
    if (!res.ok) throw new Error(`OpenAI-compat error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
    const url = 'https://api.anthropic.com/v1/messages';
    const sys = messages.find(m => m.role === 'system')?.content;
    const userText = messages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: sys || undefined,
        messages: [{ role: 'user', content: userText }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    // content is array
    const out = (data.content || []).map(p => p.text).join('');
    return out;
  }

  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY)');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { maxOutputTokens: maxTokens } })
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const out = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
    return out;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
