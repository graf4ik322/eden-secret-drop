import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';
import { startBroadcastWorker } from './queue/broadcast';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const server = Fastify({
    maxParamLength: 5000,
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // CORS
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // tRPC plugin
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  // Health endpoint
  server.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  // Start
  try {
    // Start broadcast worker (BullMQ)
    startBroadcastWorker();

    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log(`📡 tRPC endpoint at http://${HOST}:${PORT}/trpc`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
