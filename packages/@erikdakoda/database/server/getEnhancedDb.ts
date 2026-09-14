import { getServerAuthSession } from '@erikdakoda/auth/server/getServerAuthSession';
import type { User } from '@erikdakoda/database';
import { PolicyPlugin } from '@zenstackhq/plugin-policy';
import type { GetServerSidePropsContext } from 'next';
import { db } from './db';

/**
 * Policy-enforcing ZenStack client for the current request.
 * @param ctx Next.js request context.
 * @returns Client with policies applied for the signed-in user.
 */
export async function getEnhancedDb(ctx: {
  req: GetServerSidePropsContext['req'];
  res: GetServerSidePropsContext['res'];
}) {
  const session = await getServerAuthSession(ctx);
  return db.$use(new PolicyPlugin()).$setAuth(session?.user as User | undefined);
}
