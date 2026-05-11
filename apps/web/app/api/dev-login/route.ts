import { NextRequest, NextResponse } from 'next/server';

// DEV ONLY — auto-login bypass using Clerk sign-in tokens
// Usage: /api/dev-login?user=yaw  (or kofi, kwame, abena, etc.)
// Remove this route before going to production.

if (process.env.NODE_ENV === 'production') {
  throw new Error('dev-login route must not be included in production builds');
}

const USER_IDS: Record<string, { clerkId: string; name: string }> = {
  yaw:    { clerkId: 'user_3DP8aNpw7RDxTOvd2e5VQgOiu1j', name: 'Yaw Owusu (Engineer)' },
  kofi:   { clerkId: 'user_3DP8ZyhbMzhzMFmhctZ1SsggzGJ', name: 'Kofi Boateng (Team Lead)' },
  kwame:  { clerkId: 'user_3DP8ZaH7FcKqGbp3FOvC9fZDqoO', name: 'Kwame Asante (Superadmin)' },
  abena:  { clerkId: 'user_3DP8ZuU5uL5sEvfWS9IzKVQJr9C', name: 'Abena Mensah (Admin)' },
  fatima: { clerkId: 'user_3DP8bnKs0ZJ22LHs8f7ykqOiKFs', name: 'Fatima Al-Hassan (IT Manager)' },
};

export async function GET(req: NextRequest) {
  const userName = req.nextUrl.searchParams.get('user') ?? 'yaw';
  const user = USER_IDS[userName];

  if (!user) {
    return NextResponse.json(
      { error: `Unknown user. Available: ${Object.keys(USER_IDS).join(', ')}` },
      { status: 400 },
    );
  }

  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'CLERK_SECRET_KEY not set' }, { status: 500 });

  const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.clerkId, expires_in_seconds: 300 }),
  });

  const data = await res.json() as { token?: string; errors?: unknown };

  if (!data.token) {
    return NextResponse.json({ error: 'Failed to create token', detail: data.errors }, { status: 500 });
  }

  // Redirect to Clerk's ticket URL which signs the user in automatically
  // Use the Host header so phone/LAN requests redirect to the correct IP, not localhost
  const host = req.headers.get('host') ?? req.nextUrl.host;
  const protocol = req.nextUrl.protocol; // http: or https:
  const loginUrl = new URL('/login', `${protocol}//${host}`);
  loginUrl.searchParams.set('__clerk_ticket', data.token);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Dev Login — ${user.name}</title>
<meta http-equiv="refresh" content="0;url=${loginUrl.toString()}">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5;}
.card{background:white;border-radius:12px;padding:32px 40px;box-shadow:0 2px 16px rgba(0,0,0,.1);text-align:center;}
h2{margin:0 0 8px;font-size:18px;}p{color:#666;margin:0 0 16px;}a{color:#4f46e5;font-size:13px;}</style>
</head>
<body><div class="card">
<h2>Signing in as ${user.name}…</h2>
<p>Redirecting automatically.</p>
<a href="${loginUrl.toString()}">Click here if not redirected</a>
</div></body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
