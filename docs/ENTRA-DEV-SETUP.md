# Microsoft Entra — local dev setup

## How sign-in works (same as Copilot)

1. User clicks **Sign in with Microsoft**
2. Browser goes to **login.microsoftonline.com** — Microsoft’s email/password screen
3. User signs in with work account (+ MFA if required)
4. Microsoft redirects back to Lotris
5. Lotris completes login or links the organisation

Lotris never sees your Microsoft password — Microsoft handles authentication.

---

Lotris uses **OpenID Connect** against Entra ID for:

- **Login** — `Sign in with Microsoft` on `/login`
- **Intelligence** — connect your organisation on `/admin/intelligence` (reads `tid` from the token)

Until the four Entra settings are configured, the API returns `microsoft: false` and OAuth cannot start.

## 1. Create an app registration (Azure Portal)

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `Lotris Dev` (any name)
3. Supported account types:
   - **Single tenant** — use your directory tenant ID as `ENTRA_TENANT_ID`
   - **Multitenant** — use `common` as `ENTRA_TENANT_ID`
4. Redirect URI: **Web** → `http://localhost:5153/api/v1/auth/microsoft/callback`
5. Register, then note the **Application (client) ID**

## 2. Create a client secret

1. App → **Certificates & secrets** → **New client secret**
2. Copy the **Value** (not the Secret ID) — this is `ENTRA_CLIENT_SECRET`

## 3. API permissions (login)

1. App → **API permissions** → **Add** → **Microsoft Graph** → **Delegated**
2. Add: `openid`, `profile`, `email`, `User.Read`
3. **Grant admin consent** if your tenant requires it

## 4. Configure Lotris `.env`

Edit repo-root `.env`:

```env
ENTRA_ENABLED=true
ENTRA_TENANT_ID=common
ENTRA_CLIENT_ID=<application-client-id>
ENTRA_CLIENT_SECRET=<client-secret-value>
```

Optional — map new Microsoft users into your Lotris tenant (e.g. Lotris Digital Setup):

```env
ENTRA_DEFAULT_TENANT_ID=701fc546-342b-4b80-82e1-24b152044161
```

## 5. Restart the API

```bash
cd src/Lotris.Api && dotnet run
```

Verify:

```bash
curl -s http://localhost:5153/api/v1/auth/providers
# → { "identity": true, "microsoft": true }
```

Then refresh `/admin/intelligence` and click **Sign in with Microsoft**.

## Local dev without Azure (stub connect)

If you only need to test Azure OpenAI settings UI (no real Microsoft login), in **Development** use **Connect for local dev** on the Intelligence page. This stores a stub Entra tenant ID via `POST /api/v1/admin/intelligence/connect-entra/dev`.

## Redirect URIs checklist

| Environment | Redirect URI |
|-------------|----------------|
| Local API | `http://localhost:5153/api/v1/auth/microsoft/callback` |
| On-prem proxy | `https://<your-host>/api/v1/auth/microsoft/callback` |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Button shows “not configured” | `ENTRA_ENABLED=true` and all three IDs/secrets set; restart API |
| `microsoft: false` from `/auth/providers` | Missing `ClientId` or `TenantId` |
| Redirect mismatch | Redirect URI in Azure must match API callback exactly |
| Intelligence connect fails after Microsoft login | Ensure you are logged into Lotris (JWT cookie) before clicking connect |
