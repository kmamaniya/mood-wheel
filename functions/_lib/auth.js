import { sessionFromRequest } from './session.js';

export async function authenticatedUser(request, env) {
  const session = await sessionFromRequest(request, env);
  if (!session || typeof session.login !== 'string') {
    return null;
  }
  return {
    login: session.login,
    avatarUrl: typeof session.avatarUrl === 'string' ? session.avatarUrl : '',
  };
}
