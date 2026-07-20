import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db } from '../db';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    db,
    // Admin check will be added with initData validation later
    isAdmin: false,
    tgUserId: null as string | null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
