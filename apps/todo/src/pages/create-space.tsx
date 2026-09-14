/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { SpaceUserRole } from '@erikdakoda/database';
import { schema } from '@erikdakoda/database/zenstack/schema-lite';
import WithNavBar from '@/components/WithNavBar';
import type { NextPage } from 'next';
import { useCurrentUser } from '@erikdakoda/auth-ui/context';
import { useRouter } from 'next/router';
import { type FormEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { useClientQueries } from '@zenstackhq/tanstack-query/react';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'info' in err &&
    (err as { info?: { reason?: string; dbErrorCode?: string } }).info?.reason ===
      'DB_QUERY_ERROR' &&
    (err as { info?: { dbErrorCode?: string } }).info?.dbErrorCode === '23505'
  );
}

const CreateSpace: NextPage = () => {
  const { user } = useCurrentUser();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const client = useClientQueries(schema);
  const createSpace = client.space.useCreate().mutateAsync;
  const router = useRouter();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      console.log('No user is signed in.');
      return;
    }
    try {
      const space = await createSpace({
        data: {
          name,
          slug,
          members: {
            create: [
              {
                userId: user.id,
                role: SpaceUserRole.ADMIN,
              },
            ],
          },
        },
      });
      console.log('Space created:', space);
      toast.success("Space created successfully! You'll be redirected.");

      setTimeout(() => {
        if (space) {
          void router.push(`/space/${space.slug}`);
        }
      }, 2000);
    } catch (err: unknown) {
      console.error(err);
      if (isUniqueConstraintError(err)) {
        toast.error('Space slug already in use');
      } else {
        toast.error(JSON.stringify(err));
      }
    }
  };

  return (
    <WithNavBar>
      <div className="flex items-center justify-center h-full">
        <form onSubmit={(e) => void onSubmit(e)}>
          <h1 className="text-3xl mb-8">Create a space</h1>
          <div className="flex-col space-y-4">
            <div>
              <label htmlFor="name" className="text-lg">
                Space name
              </label>
              <input
                id="name"
                type="text"
                required
                placeholder="Name of your space"
                className="input input-bordered w-full max-w-xs mt-2"
                autoFocus
                onChange={(e: FormEvent<HTMLInputElement>) => setName(e.currentTarget.value)}
              />
            </div>
            <div>
              <label htmlFor="slug" className="text-lg">
                Space slug
              </label>
              <input
                id="slug"
                type="text"
                required
                placeholder="Slug of your space"
                className="input input-bordered w-full max-w-xs mt-2"
                onChange={(e: FormEvent<HTMLInputElement>) => setSlug(e.currentTarget.value)}
              />
            </div>
          </div>

          <div className="flex space-x-4 mt-6">
            <input
              type="submit"
              disabled={
                name.length < 4 || name.length > 20 || !slug.match(/^[0-9a-zA-Z_\-]{4,50}$/)
              }
              value="Create"
              className="btn btn-primary px-8"
            />
            <button
              className="btn btn-outline"
              onClick={(e) => {
                e.preventDefault();
                void router.push('/');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </WithNavBar>
  );
};

export default CreateSpace;
