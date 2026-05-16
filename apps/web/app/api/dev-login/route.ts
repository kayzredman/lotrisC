import { NextRequest, NextResponse } from 'next/server';

// DEV ONLY — auto-login bypass using Clerk sign-in tokens
// Usage: /api/dev-login?user=yaw  (or kofi, kwame, abena, etc.)

const USER_IDS: Record<string, { clerkId: string; name: string }> = {
  yaw:    { clerkId: 'user_3DP8aNpw7RDxTOvd2e5VQgOiu1j', name: 'Yaw Owusu (Engineer)' },
  kofi:   { clerkId: 'user_3DP8ZyhbMzhzMFmhctZ1SsggzGJ', name: 'Kofi Boateng (Team Lead)' },
  kwame:  { clerkId: 'user_3DP8ZaH7FcKqGbp3FOvC9fZDqoO', name: 'Kwame Asante (Superadmin)' },
  abena:  { clerkId: 'user_3DP8ZuU5uL5sEvfWS9IzKVQJr9C', name: 'Abena Mensah (Admin)' },
  fatima: { clerkId: 'user_3DP8bnKs0ZJ22LHs8f7ykqOiKFs', name: 'Fatima Al-Hassan (IT Manager)' },
};

export async function GET(req: NextRequest) {
  // Disabled in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

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

  const host = req.headers.get('host') ?? req.nextUrl.host;
  const protocol = req.nextUrl.protocol;
  const loginUrl = new URL('/login', `${protocol}//${host}`);
  loginUrl.searchParams.set('__clerk_ticket', data.token);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Dev Login</title>
<meta http-equiv="refresh" content="0;url=${loginUrl.toString()}">
</head>
<body><p>Signing in as ${user.name}... <a href="${loginUrl.toString()}">Click here if not redirected</a></p></body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
