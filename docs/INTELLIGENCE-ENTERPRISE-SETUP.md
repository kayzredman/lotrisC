# Intelligence — enterprise tenant setup (Microsoft)

> **Audience:** Tenant administrators / customer IT deploying Lotris with Microsoft login and Copilot  
> **Lotris local dev:** use [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) instead — no Entra required

Companies configure Entra and Azure OpenAI on **their** infrastructure when they host Lotris. The Lotris platform exposes hooks; each tenant wires up Microsoft through admin UI + deployment `.env`.

---

## What this enables

| Feature | Mechanism |
|---------|-----------|
| **Sign in with Microsoft** | Entra OIDC on `/login` |
| **Copilot provider** | Microsoft OAuth on `/admin/intelligence` + Azure OpenAI for chat/embeddings |
| **Teams alerts** | Webhook URL in Intelligence settings (optional) |

Until Entra is configured on the deployment, the API returns `microsoft: false` and Copilot OAuth cannot start. Standard API-key providers (ChatGPT, OpenAI, Claude) work independently.

---

## How Microsoft sign-in works

1. User clicks **Sign in with Microsoft**
2. Browser goes to **login.microsoftonline.com**
3. User signs in with work account (+ MFA if required)
4. Microsoft redirects back to Lotris
5. Lotris completes login or links the organisation

Lotris never sees the Microsoft password.

Lotris uses **OpenID Connect** against Entra ID for:

- **Login** — `Sign in with Microsoft` on `/login`
- **Intelligence** — connect organisation on `/admin/intelligence` (reads `tid` from token)

---

## 1. Create an app registration (Azure Portal)

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: e.g. `Lotris Production` (customer-specific)
3. Supported account types:
   - **Single tenant** — use directory tenant ID as `ENTRA_TENANT_ID`
   - **Multitenant** — use `common` as `ENTRA_TENANT_ID`
4. Redirect URI: **Web** → `https://<your-host>/api/v1/auth/microsoft/callback`
5. Register, then note the **Application (client) ID**

For local staging with real OAuth (not Lotris core dev default):

| Environment | Redirect URI |
|-------------|----------------|
| Local API | `http://localhost:5153/api/v1/auth/microsoft/callback` |
| On-prem proxy | `https://<your-host>/api/v1/auth/microsoft/callback` |

## 2. Create a client secret

1. App → **Certificates & secrets** → **New client secret**
2. Copy the **Value** — this is `ENTRA_CLIENT_SECRET`

## 3. API permissions (login)

1. App → **API permissions** → **Microsoft Graph** → **Delegated**
2. Add: `openid`, `profile`, `email`, `User.Read`
3. **Grant admin consent** if the tenant requires it

## 4. Configure deployment `.env`

Set on the **hosting company's** server (not required for Lotris product dev):

```env
ENTRA_ENABLED=true
ENTRA_TENANT_ID=common
ENTRA_CLIENT_ID=<application-client-id>
ENTRA_CLIENT_SECRET=<client-secret-value>
```

Optional — map new Microsoft users into a Lotris tenant:

```env
ENTRA_DEFAULT_TENANT_ID=<lotris-tenant-guid>
```

Restart the API after changes.

Verify:

```bash
curl -s https://<your-host>/api/v1/auth/providers
# → { "identity": true, "microsoft": true }
```

## 5. Connect Copilot in Intelligence UI

1. Tenant admin logs into Lotris → `/admin/intelligence`
2. Expand **Enterprise — Microsoft Copilot**
3. **Sign in with Microsoft**
4. Fill **Azure OpenAI** fields (endpoint, chat deployment, embed deployment, API key)
5. **Save feature settings**

Chat and embeddings route through Azure OpenAI when endpoint + deployments + key are set.

---

## Staging without full OAuth (Development only)

For customer staging environments running `ASPNETCORE_ENVIRONMENT=Development`, a stub connect endpoint exists:

`POST /api/v1/admin/intelligence/connect-entra/dev`

This stores a stub Entra tenant ID for UI testing without real Microsoft login. **Not** the recommended path for Lotris core local dev — use [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) with API keys instead.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Button shows “not configured” | `ENTRA_ENABLED=true` and client ID/secret set; restart API |
| `microsoft: false` from `/auth/providers` | Missing `ClientId` or `TenantId` |
| Redirect mismatch | Redirect URI in Azure must match API callback exactly |
| Copilot connected but no AI answers | Azure OpenAI endpoint, deployments, and API key must be saved in Intelligence settings |
| Cursor connected but excerpts only | `crsr_` keys do not support chat — use ChatGPT/OpenAI or Copilot + Azure |

---

## See also

- [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) — API-key setup for Lotris developers
- [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md) — Phase 8 implementation changelog
