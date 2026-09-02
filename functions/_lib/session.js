const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export function randomUrlSafeValue(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function signPayload(payload, secret) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret),
    encoder.encode(encodedPayload),
  );
  return encodedPayload + '.' + base64UrlEncode(new Uint8Array(signature));
}

export async function verifyPayload(token, secret) {
  try {
    const [encodedPayload, encodedSignature, ...extraParts] = String(token || '').split('.');
    if (!encodedPayload || !encodedSignature || extraParts.length > 0) {
      return null;
    }

    const verified = await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      base64UrlDecode(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!verified) {
      return null;
    }

    const payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload)));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const item of cookieHeader.split(';')) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) {
      return value.join('=');
    }
  }
  return null;
}

export function createCookie(name, value, options = {}) {
  const parts = [name + '=' + value, 'Path=' + (options.path || '/'), 'HttpOnly', 'Secure'];
  if (options.maxAge !== undefined) {
    parts.push('Max-Age=' + options.maxAge);
  }
  parts.push('SameSite=' + (options.sameSite || 'Lax'));
  return parts.join('; ');
}

export function clearCookie(name) {
  return createCookie(name, '', { maxAge: 0 });
}

export async function sessionFromRequest(request, env) {
  if (!env.SESSION_SECRET) {
    return null;
  }
  return verifyPayload(readCookie(request, 'mood_session'), env.SESSION_SECRET);
}

export function allowedGitHubLogin(login, env) {
  const expectedLogin = String(env.ALLOWED_GITHUB_LOGIN || '').trim().toLowerCase();
  return Boolean(expectedLogin) && expectedLogin === String(login || '').trim().toLowerCase();
}
