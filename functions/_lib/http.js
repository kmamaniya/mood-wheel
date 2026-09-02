export function json(body, status = 200, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function appRedirect(request, path, headers = {}) {
  const target = new URL(path, request.url);
  const responseHeaders = headers instanceof Headers ? headers : new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Location', target.toString());
  return new Response(null, { status: 302, headers: responseHeaders });
}

export function unauthorized() {
  return json({ error: 'Sign in with your approved GitHub account to continue.' }, 401);
}

export function unavailable(message) {
  return json({ error: message }, 503);
}
