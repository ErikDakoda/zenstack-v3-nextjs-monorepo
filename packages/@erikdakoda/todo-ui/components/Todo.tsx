import { TrashIcon } from '@heroicons/react/24/outline';
import type { OwnedItem, Todo, User } from '@erikdakoda/database';
import { schema } from '@erikdakoda/database/zenstack/schema-lite';
import type { ChangeEvent } from 'react';
import Avatar from '@erikdakoda/auth-ui/components/Avatar';
import { useClientQueries } from '@zenstackhq/tanstack-query/react';
import TimeInfo from './TimeInfo';

type Props = {
  value: Todo & OwnedItem & { owner: User };
  optimistic?: boolean;
};

export default function TodoComponent({ value, optimistic }: Props) {
  const client = useClientQueries(schema);
  const updateTodo = client.todo.useUpdate().mutateAsync;
  const deleteTodo = client.todo.useDelete().mutateAsync;

  const onDeleteTodo = () => {
    void deleteTodo({ where: { id: value.id } });
  };

  const toggleCompleted = (completed: boolean) => {
    if (completed === !!value.completedAt) {
      return;
    }
    void updateTodo({
      where: { id: value.id },
      data: { completedAt: completed ? new Date() : null },
    });
  };

  return (
    <div className="border rounded-lg px-8 py-4 shadow-lg flex flex-col items-center w-full lg:w-[480px]">
      <div className="flex justify-between w-full mb-4">
        <h3
          className={`text-xl line-clamp-1 ${
            value.completedAt ? 'line-through text-gray-400 italic' : 'text-gray-700'
          }`}
        >
          {value.title}
          {optimistic && <span className="loading loading-spinner loading-sm ml-1"></span>}
        </h3>
        <div className="flex">
          <input
            type="checkbox"
            className="checkbox mr-2"
            checked={!!value.completedAt}
            disabled={optimistic}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              toggleCompleted(e.currentTarget.checked)
            }
          />
          <TrashIcon
            className={`w-6 h-6 ${
              optimistic ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 cursor-pointer'
            }`}
            onClick={() => {
              if (!optimistic) {
                onDeleteTodo();
              }
            }}
          />
        </div>
      </div>
      <div className="flex justify-end w-full space-x-2">
        <TimeInfo value={value} />
        <Avatar user={value.owner} size={18} />
      </div>
    </div>
  );
}
