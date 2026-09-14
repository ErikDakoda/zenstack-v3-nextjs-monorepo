import { hash } from 'bcryptjs';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { ZenStackClient, type ClientContract } from '@zenstackhq/orm';
import { schema } from '../zenstack/schema';

function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error('POSTGRES_URL_NON_POOLING is not set');
  }
  return connectionString;
}

const logQueries = process.env.LOG_ZEN_QUERY === 'true' ? (['query'] as const) : [];

const procedures = {
  signUp: async ({
    client,
    args,
  }: {
    client: ClientContract<typeof schema>;
    args: { email: string; password: string; name?: string | null };
  }) => {
    const passwordHash = await hash(args.password, 10);
    return client.user.create({
      data: {
        email: args.email,
        password: passwordHash,
        name: args.name ?? undefined,
      },
    });
  },
};

let pool: Pool | undefined;
let dbSingleton: ReturnType<typeof createDbClient> | undefined;
let authDbSingleton: ReturnType<typeof createAuthDbClient> | undefined;

function createDbClient() {
  const dialect = new PostgresDialect({ pool: pool! });
  return new ZenStackClient(schema, {
    dialect,
    log: [...logQueries],
    procedures,
  });
}

function createAuthDbClient() {
  const dialect = new PostgresDialect({ pool: pool! });
  return new ZenStackClient(schema, {
    dialect,
    log: [...logQueries],
    omit: { user: { password: false } },
    procedures,
  });
}

function initClients(): void {
  if (dbSingleton && authDbSingleton) {
    return;
  }

  pool = new Pool({ connectionString: getConnectionString() });
  dbSingleton = createDbClient();
  authDbSingleton = createAuthDbClient();
}

function createClientProxy<T extends object>(getClient: () => T): T {
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      initClients();
      return Reflect.get(getClient(), property, receiver);
    },
  });
}

export const db = createClientProxy(() => dbSingleton!);
export const authDb = createClientProxy(() => authDbSingleton!);

export type DbClient = typeof db;
export type AuthDbClient = typeof authDb;
