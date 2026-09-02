import {
  onRequestGet as getEntries,
  onRequestPost as postEntries,
} from '../functions/api/entries.js';
import { onRequestGet as getCurrentUser } from '../functions/api/me.js';
import { onRequestGet as beginGitHubLogin } from '../functions/api/auth/login.js';
import { onRequestGet as completeGitHubLogin } from '../functions/api/auth/callback.js';
import { onRequestPost as logOut } from '../functions/api/auth/logout.js';
import { json } from '../functions/_lib/http.js';

const routes = {
  '/api/auth/callback': { GET: completeGitHubLogin },
  '/api/auth/login': { GET: beginGitHubLogin },
  '/api/auth/logout': { POST: logOut },
  '/api/entries': { GET: getEntries, POST: postEntries },
  '/api/me': { GET: getCurrentUser },
};

function handlerContext(request, env, executionContext) {
  return {
    request,
    env,
    params: {},
    waitUntil: executionContext?.waitUntil?.bind(executionContext) || (() => {}),
  };
}

export async function handleRequest(request, env, executionContext) {
  const path = new URL(request.url).pathname;
  const methods = routes[path];

  if (methods) {
    const handler = methods[request.method];
    if (!handler) {
      return json(
        { error: 'Method not allowed.' },
        405,
        { Allow: Object.keys(methods).join(', ') },
      );
    }
    return handler(handlerContext(request, env, executionContext));
  }

  if (path.startsWith('/api/')) {
    return json({ error: 'Not found.' }, 404);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch: handleRequest,
};
