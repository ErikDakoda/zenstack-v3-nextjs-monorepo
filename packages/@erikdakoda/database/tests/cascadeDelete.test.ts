// @vitest-environment node

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  PostgresDialect,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
} from 'kysely';
import { Pool } from 'pg';
import { ZenStackClient, type ClientContract } from '@zenstackhq/orm';
import { schema } from '../zenstack/schema';
import { procedures } from '../server/db';

const PROBE_PARENT_ID = 'probe_parent_id';

const postgresUrl = process.env.POSTGRES_URL_NON_POOLING;
const describeIfDb = postgresUrl ? describe : describe.skip;

type CaptureDialect = {
  dialect: Dialect;
  captured: string[];
};

/**
 * Builds a Kysely dialect that records every compiled query and returns empty result sets.
 * When `parentTable` is set, the first SELECT against that table returns one id row so the
 * walker exercises cascade edges without infinite recursion.
 */
function createCaptureDialect(parentTable?: string): CaptureDialect {
  const captured: string[] = [];
  let parentRowReturned = false;

  const connection = {
    executeQuery: async (compiledQuery: CompiledQuery) => {
      captured.push(compiledQuery.sql);
      if (
        parentTable &&
        !parentRowReturned &&
        compiledQuery.sql.includes(`"${parentTable}"`) &&
        compiledQuery.sql.toLowerCase().includes('select')
      ) {
        parentRowReturned = true;
        return { rows: [{ id: PROBE_PARENT_ID }], numAffectedRows: 0n };
      }
      return { rows: [], numAffectedRows: 0n };
    },
    streamQuery: async function* streamQuery() {
      yield { rows: [], numAffectedRows: 0n };
    },
  } as unknown as DatabaseConnection;

  const driver: Driver = {
    init: async () => undefined,
    acquireConnection: async () => connection,
    beginTransaction: async () => undefined,
    commitTransaction: async () => undefined,
    rollbackTransaction: async () => undefined,
    releaseConnection: async () => undefined,
    destroy: async () => undefined,
  };

  const dialect: Dialect = {
    createDriver: () => driver,
    createAdapter: () => new PostgresAdapter(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  };

  return { dialect, captured };
}

type DbClient = ClientContract<typeof schema>;

function createDbClient(dialect: Dialect): DbClient {
  return new ZenStackClient(schema, { dialect, procedures });
}

describe('ZenStack delegate cascade delete (reproduction)', () => {
  it('todo.deleteMany by id terminates with a bounded query count (bug 1: Comment subject loop)', async () => {
    const { dialect, captured } = createCaptureDialect('Todo');
    const db = createDbClient(dialect);

    await db.todo.deleteMany({ where: { id: PROBE_PARENT_ID } });

    expect(captured.length).toBeGreaterThan(0);
    expect(captured.length).toBeLessThan(15);
  });
});

describeIfDb('ZenStack delegate cascade delete (database)', { timeout: 30_000 }, () => {
  let db: DbClient;
  let pool: Pool;

  const runId = `cd${Date.now().toString(36)}`;
  const ownerId = `usr_${runId}`;
  const spaceId = `spc_${runId}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: postgresUrl });
    db = createDbClient(new PostgresDialect({ pool }));
  });

  afterEach(async () => {
    await db.space.deleteMany({ where: { id: spaceId } }).catch(() => undefined);
    await db.user.deleteMany({ where: { id: ownerId } }).catch(() => undefined);
  });

  async function seedSpace(): Promise<void> {
    await db.user.create({
      data: {
        id: ownerId,
        email: `${ownerId}@example.test`,
        name: 'Cascade test user',
      },
    });
    await db.space.create({
      data: {
        id: spaceId,
        name: 'Cascade space',
        slug: `sp${runId}`,
      },
    });
    await db.spaceUser.create({
      data: {
        userId: ownerId,
        spaceId,
        role: 'ADMIN',
      },
    });
  }

  it('todo.delete removes the OwnedItem base row', async () => {
    await seedSpace();

    const list = await db.list.create({
      data: {
        title: 'List',
        ownerId,
        spaceId,
      },
    });

    const todo = await db.todo.create({
      data: {
        title: 'Todo',
        listId: list.id,
        ownerId,
        spaceId,
      },
    });

    await expect(db.todo.delete({ where: { id: todo.id } })).resolves.toBeDefined();

    const todoRow = await db.$qb
      .selectFrom('Todo')
      .select('id')
      .where('id', '=', todo.id)
      .executeTakeFirst();
    const baseRow = await db.$qb
      .selectFrom('OwnedItem')
      .select('id')
      .where('id', '=', todo.id)
      .executeTakeFirst();

    expect(todoRow).toBeUndefined();
    expect(baseRow).toBeUndefined();
  });

  it('list.delete removes todos and their OwnedItem base rows (bug 2)', async () => {
    await seedSpace();

    const list = await db.list.create({
      data: {
        title: 'List with todo',
        ownerId,
        spaceId,
      },
    });

    const todo = await db.todo.create({
      data: {
        title: 'Nested todo',
        listId: list.id,
        ownerId,
        spaceId,
      },
    });

    await expect(db.list.delete({ where: { id: list.id } })).resolves.toBeDefined();

    const todoRow = await db.$qb
      .selectFrom('Todo')
      .select('id')
      .where('id', '=', todo.id)
      .executeTakeFirst();
    const baseRow = await db.$qb
      .selectFrom('OwnedItem')
      .select('id')
      .where('id', '=', todo.id)
      .executeTakeFirst();

    expect(todoRow).toBeUndefined();
    expect(baseRow).toBeUndefined();
  });
});
