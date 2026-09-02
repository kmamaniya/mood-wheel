import { appRedirect } from '../../_lib/http.js';
import { clearCookie } from '../../_lib/session.js';

export function onRequestPost({ request }) {
  return appRedirect(request, '/', { 'Set-Cookie': clearCookie('mood_session') });
}
