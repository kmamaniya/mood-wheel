import { appRedirect, unavailable } from '../../_lib/http.js';
import {
  createCookie,
  randomUrlSafeValue,
  sha256Base64Url,
  signPayload,
} from '../../_lib/session.js';

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.SESSION_SECRET) {
    return unavailable('GitHub sign-in is not configured yet.');
  }

  const state = randomUrlSafeValue();
  const codeVerifier = randomUrlSafeValue(48);
  const authTicket = await signPayload(
    {
      state,
      codeVerifier,
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    env.SESSION_SECRET,
  );

  const callbackUrl = new URL('/api/auth/callback', request.url);
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl.toString());
  authorizeUrl.searchParams.set('scope', 'read:user');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', await sha256Base64Url(codeVerifier));
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('allow_signup', 'false');
  authorizeUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': createCookie('mood_oauth', authTicket, { maxAge: 600 }),
    },
  });
}
