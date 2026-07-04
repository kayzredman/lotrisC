# Intelligence — local development setup

> **Audience:** Lotris developers running the stack locally  
> **Enterprise / Microsoft Copilot:** see [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) (customer tenant deployments — not required for local dev)

Connect AI features through the admin UI only. No Entra, Azure Portal, or Copilot sign-in needed for day-to-day Lotris development.

---

## Prerequisites

| Item | Value |
|------|-------|
| API | `http://localhost:5153` |
| Web | `http://localhost:3000` |
| Dev login | `admin-loose@test.local` / `Test1234!` |
| Optional seeds | `node scripts/seed-knowledge-samples.mjs`, `node scripts/seed-problems-demo.mjs` |

Ensure migration `0012_ai_provider_credentials.sql` is applied.

---

## Setup (UI only, ~5 minutes)

1. Log in and open **Admin → Intelligence and AI Setup** (`/admin/intelligence`).

2. Under **Standard providers**, choose **ChatGPT** or **OpenAI** (recommended for local dev).

3. Enter your email and an OpenAI API key (`sk-…`) → **Connect** → **Test connection**.

4. Enable features and **Save feature settings**:
   - RCA AI suggest
   - Knowledge base Q&A
   - Report narratives (optional)

5. Smoke-test:
   - **Problems → RCA** → Root Cause step → **AI suggest**
   - **Knowledge** → **Ask Knowledge Base**
   - **Reports** → **Generate Now** (narrative section if enabled)

---

## Provider notes (local dev)

| Provider | Chat | Local dev recommended | Notes |
|----------|------|----------------------|-------|
| ChatGPT / OpenAI | Yes | **Yes** | Paste `sk-…` API key |
| Claude | Yes | Yes | Anthropic API key |
| Cursor | No (`crsr_`) | No | Account verify only; use OpenAI/ChatGPT for AI chat |
| Copilot | Yes (with Azure) | No | Customer deploy — see enterprise doc |

**Cursor:** `crsr_…` keys validate your Cursor account but do not support direct LLM chat. Lotris falls back to knowledge retrieval when Cursor is connected without a chat-capable provider.

---

## Not required locally

- `ENTRA_ENABLED` / Azure app registration
- Microsoft **Sign in with Microsoft** on login or Intelligence
- Copilot OAuth or Azure OpenAI endpoint configuration

Those are configured **per deployment** by customer IT — see [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Connect rejected | Use a valid `sk-…` OpenAI key for ChatGPT/OpenAI |
| Ask KB returns excerpts only | Connected provider cannot chat (e.g. Cursor `crsr_`) — connect ChatGPT or OpenAI |
| Intelligence 404 | Restart API after pulling latest |
| RCA / Problems 500 | Apply migrations; see [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md) |

---

## See also

- [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) — Entra login + Copilot for tenant deployments
- [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md) — Phase 8 changelog and verification
