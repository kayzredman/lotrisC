import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5153';
const TOKEN_KEY = 'lotris_token';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('redirect', '/admin/intelligence');
    return NextResponse.redirect(loginUrl);
  }

  const returnUrl = req.nextUrl.searchParams.get('returnUrl') ?? '/admin/intelligence';
  const apiUrl = `${API_BASE}/api/v1/admin/intelligence/microsoft/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  const apiRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    redirect: 'manual',
  });

  const location = apiRes.headers.get('location');
  if (apiRes.status >= 300 && apiRes.status < 400 && location) {
    return NextResponse.redirect(location);
  }

  const text = await apiRes.text();
  let message = text || 'Microsoft connect failed';
  try {
    const json = JSON.parse(text) as { message?: string };
    if (json.message) message = json.message;
  } catch {
    // keep raw text
  }

  const errorUrl = new URL(returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`, req.nextUrl.origin);
  errorUrl.searchParams.set('entra', 'error');
  errorUrl.searchParams.set('message', message.slice(0, 200));
  return NextResponse.redirect(errorUrl);
}
