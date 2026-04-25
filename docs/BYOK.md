# BYOK (Bring Your Own Key)

OfficeWiki는 기본적으로 **API 키를 디스크에 저장하지 않습니다.**
키는 환경변수로만 주입합니다.

## OpenAI
- provider: `openai`
- env: `OPENAI_API_KEY`

## Anthropic (Claude)
- provider: `anthropic`
- env: `ANTHROPIC_API_KEY`

## Gemini
- provider: `gemini`
- env: `GEMINI_API_KEY` (또는 `GOOGLE_API_KEY`)

## Local / OpenAI-compatible (Ollama 등)
- provider: `openai_compat`
- config: `baseUrl` (예: `http://localhost:11434/v1`)
- env: `OPENAI_COMPAT_API_KEY` (옵션)
