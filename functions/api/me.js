import { authenticatedUser } from '../_lib/auth.js';
import { json, unauthorized } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
  const user = await authenticatedUser(request, env);
  return user ? json({ user }) : unauthorized();
}
