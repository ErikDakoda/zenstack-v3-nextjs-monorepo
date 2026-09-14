<div align="center">
    <img src="https://github.com/zenstackhq/sample-todo-sveltekit/assets/16688722/df13f0ee-1d56-4a13-9a55-39e8779c6d9f" height="256">
    <h1>ZenStack v3 Monorepo Demo</h1>
    <a href="https://twitter.com/intent/tweet?text=Wow%20%40zenstackhq">
        <img src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fzenstackhq%2Fzenstack">
    </a>
    <a href="https://discord.gg/6HhebQynfz">
        <img src="https://img.shields.io/discord/1035538056146595961">
    </a>
</div>

# A Collaborative Todo Sample - ZenStack v3 + Next.js using PNPM + Turborepo

This project is a collaborative Todo app built with [Next.js](https://nextjs.org), [Next-Auth](nextauth.org), [ZenStack](https://zenstack.dev) 3.x, [Tanstack Query](https://tanstack.com/query/latest/docs/framework/react), and [Tailwind CSS](https://tailwindcss.com). It's purpose is to test and demonstrate the usage of ZenStack v3 in a monorepo setup. All apps and packages are 100% TypeScript and configured as ES Modules.

In this fictitious app, users can be invited to workspaces where they can collaborate on todos. Public todo lists are visible to all members in the workspace. Password authentication is implemented with a ZenStack `signUp` procedure, bcrypt hashing, and NextAuth credentials login.

> [!TIP]
> See a live deployment at: <https://sample-todo-nextjs-turbo.vercel.app>.
>
> For more information on using ZenStack, visit [https://zenstack.dev](https://zenstack.dev).

## Apps and Packages

- `apps`

  - `todo`: a Next.js app

- `packages`

  - `@erikdakoda`

    - `auth`: NextAuth configuration; Models for User, Space, and SpaceUser; OwnedItem polymorphic base model declaring created dates, owner, and space

    - `auth-ui`: React user context and auth components

    - `database`: ZenStack schema and generated client; Kysely + PostgreSQL runtime; policy plugin and RPC server helpers

    - `todo`: Models for Todo, and List

    - `todo-ui`: React components for Todo and List

  - `default-configs`: Shared default configs for eslint and tsconfig

## Implementation

- The `@erikdakoda/database` package implements ZenStack v3.

  - The data client is configured in `schema.zmodel` in this package, while the models for individual entities reside in their various packages.

  - `zen generate --lite` emits `schema.ts`, `schema-lite.ts`, `models.ts`, and `input.ts` into the git-ignored `zenstack/` folder.

  - Client components call `useClientQueries(schema)` from `@zenstackhq/tanstack-query/react` with `schema` imported from `@erikdakoda/database/zenstack/schema-lite`.

- An automatic RPC API is mounted at `/api/model` in `apps/todo/pages/api/model/[...path].ts`.

- On the server side always import the database client from the database package.

  - In API routes and `getServerSideProps()` use `getEnhancedDb()` to get a ZenStack client with the policy plugin and the signed-in user bound via `$setAuth`. Permissions with the credentials of the currently signed-in user will be enforced. See `apps/todo/src/pages/index.tsx` for an example.

  - For NextAuth credential verification, `authDb` is the same underlying client with `omit: { user: { password: false } }` so the password hash can be read despite `@omit` on the field.

  - For administrative or bootstrap tasks without a request context, use the unrestricted `db` export from `@erikdakoda/database/server/db`.

  - ZenStack v3 plugins (`db.$use(...)`) replace the old Prisma client extension registry.

## Running the sample

1. Setup a database

   Create `apps/todo/.env` with at least `POSTGRES_URL_NON_POOLING`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. For testing purposes, you can use the sample database provided. This database may be reset periodically.

2. Install dependencies

   ```bash
   pnpm run pnpm:install
   ```

3. Generate server and client-side code from the model

   ```bash
   pnpm run zen:generate
   ```

4. Synchronize database schema

   ```bash
   pnpm run db:push
   ```

5. Start dev server

   ```bash
   pnpm run dev
   ```

6. Visit the app at [http://localhost:3000](http://localhost:3000)

## Reproduction: ZenStack delegate cascade delete

Unpatched ZenStack ORM 3.9.4 has two delegate cascade-delete walker bugs:

1. **Infinite recursion** on base-level cascade edges (for example `OwnedItem.commentsAsSubject` / `Comment.subject`, the same shape as uvilo-mono's `Factoid.provenance`).
2. **Concrete-child cascades not simulated** (for example deleting a `List` orphans the `Todo` `OwnedItem` base row while the DB removes the concrete `Todo` row).

An upstream fix is in progress on [ErikDakoda/zenstack `fix/delegate-cascade-delete-walker`](https://github.com/ErikDakoda/zenstack/tree/fix/delegate-cascade-delete-walker) (no separate upstream issue yet; the PR will be the first report).

Run the regression tests:

```bash
pnpm -F @erikdakoda/database test
```

On branch `Zen_3.9.4` (and `main` after merge), the DB-less case fails with `RangeError: Maximum call stack size exceeded`. Branch `Zen_3.9.4-cascade-delete-fix` applies a pnpm patch to `@zenstackhq/orm@3.9.4` and the same command passes.

## Gotchas

While converting this project to ZenStack v3 in a monorepo, I learned the following:

- I had to add `public-hoist-pattern[]='*'` to `.npmrc`. I tried just adding `*zenstack*` but I kept getting broken builds. This can probably be fine tuned with more patience.

- I had to add my packages to `transpilePackages` in `next.config.js` or strange things started happening.

- `@omit` on `User.password` is enforced in the base client; only `authDb` opts the hash back in for NextAuth.

## Using Turborepo

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```bash
cd sample-todo-monorepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```bash
npx turbo link
```

### Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
