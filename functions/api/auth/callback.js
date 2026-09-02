import { appRedirect, unavailable } from '../../_lib/http.js';
import {
  allowedGitHubLogin,
  clearCookie,
  createCookie,
  readCookie,
  signPayload,
  verifyPayload,
} from '../../_lib/session.js';

async function exchangeCode(code, codeVerifier, request, env) {
  const callbackUrl = new URL('/api/auth/callback', request.url);
  const requestBody = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    redirect_uri: callbackUrl.toString(),
  });
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestBody.toString(),
  });

  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) {
    return null;
  }

  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token.access_token,
      'User-Agent': 'mood-wheel',
    },
  });
  if (!profileResponse.ok) {
    return null;
  }
  return profileResponse.json();
}

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || !env.ALLOWED_GITHUB_LOGIN) {
    return unavailable('GitHub sign-in is not configured yet.');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const ticket = await verifyPayload(readCookie(request, 'mood_oauth'), env.SESSION_SECRET);

  if (!code || !state || !ticket || ticket.state !== state || typeof ticket.codeVerifier !== 'string') {
    return appRedirect(request, '/?auth=invalid', { 'Set-Cookie': clearCookie('mood_oauth') });
  }

  const profile = await exchangeCode(code, ticket.codeVerifier, request, env);
  if (!profile?.login || !allowedGitHubLogin(profile.login, env)) {
    return appRedirect(request, '/?auth=not-approved', { 'Set-Cookie': clearCookie('mood_oauth') });
  }

  const session = await signPayload(
    {
      login: profile.login,
      avatarUrl: profile.avatar_url || '',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    env.SESSION_SECRET,
  );
  const headers = new Headers();
  headers.append('Set-Cookie', createCookie('mood_session', session, { maxAge: 60 * 60 * 24 * 7 }));
  headers.append('Set-Cookie', clearCookie('mood_oauth'));
  return appRedirect(request, '/', headers);
}
