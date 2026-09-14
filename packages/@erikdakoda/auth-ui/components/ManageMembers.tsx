/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '../context';
import { type Space, SpaceUserRole } from '@erikdakoda/database';
import { schema } from '@erikdakoda/database/zenstack/schema-lite';
import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { useClientQueries } from '@zenstackhq/tanstack-query/react';
import Avatar from './Avatar';

type Props = {
  space: Space;
};

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

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'info' in err &&
    (err as { info?: { reason?: string } }).info?.reason === 'NOT_FOUND'
  );
}

export default function ManageMembers({ space }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SpaceUserRole>(SpaceUserRole.USER);
  const { user } = useCurrentUser();
  const client = useClientQueries(schema);
  const createSpaceUser = client.spaceUser.useCreate().mutateAsync;
  const deleteSpaceUser = client.spaceUser.useDelete().mutateAsync;

  const { data: members } = client.spaceUser.useFindMany({
    where: {
      spaceId: space.id,
    },
    include: {
      user: true,
    },
    orderBy: {
      role: 'desc',
    },
  });

  const inviteUser = async () => {
    try {
      const r = await createSpaceUser({
        data: {
          user: {
            connect: {
              email,
            },
          },
          space: {
            connect: {
              id: space.id,
            },
          },
          role,
        },
      });
      console.log('SpaceUser created:', r);
    } catch (err: unknown) {
      console.error(err);
      if (isUniqueConstraintError(err)) {
        toast.error('User is already a member of the space');
      } else if (isNotFoundError(err)) {
        toast.error('User is not found for this email');
      } else {
        toast.error(`Error occurred: ${JSON.stringify(err)}`);
      }
    }
  };

  const removeMember = (id: string) => {
    if (confirm(`Are you sure to remove this member from space?`)) {
      void deleteSpaceUser({ where: { id } });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-8 w-full">
        <input
          type="text"
          placeholder="Type user email and enter to invite"
          className="input input-sm input-bordered flex-grow mr-2"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setEmail(e.currentTarget.value);
          }}
          onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              void inviteUser();
            }
          }}
        />

        <select
          className="select select-sm mr-2"
          value={role}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setRole(e.currentTarget.value as SpaceUserRole);
          }}
        >
          <option value={SpaceUserRole.USER}>USER</option>
          <option value={SpaceUserRole.ADMIN}>ADMIN</option>
        </select>

        <button onClick={() => void inviteUser()}>
          <PlusIcon className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <ul className="space-y-2">
        {members?.map((member) => (
          <li key={member.id} className="flex flex-wrap w-full justify-between">
            <div className="flex items-center">
              <div className="hidden md:block mr-2">
                <Avatar user={member.user} size={32} />
              </div>
              <p className="w-36 md:w-48 line-clamp-1 mr-2">
                {member.user.name || member.user.email}
              </p>
              <p>{member.role}</p>
            </div>
            <div className="flex items-center">
              {user?.id !== member.user.id && (
                <TrashIcon
                  className="w-4 h-4 text-gray-500 cursor-pointer"
                  onClick={() => {
                    removeMember(member.id);
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
