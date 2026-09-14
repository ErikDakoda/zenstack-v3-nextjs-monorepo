import { PlusIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@erikdakoda/auth-ui/context';
import type { List, Space } from '@erikdakoda/database';
import { schema } from '@erikdakoda/database/zenstack/schema-lite';
import BreadCrumb from '@/components/BreadCrumb';
import TodoComponent from '@erikdakoda/todo-ui/components/Todo';
import WithNavBar from '@/components/WithNavBar';
import type { GetServerSideProps } from 'next';
import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import { getEnhancedDb } from '@erikdakoda/database/server/getEnhancedDb';
import { toast } from 'react-toastify';
import { useClientQueries } from '@zenstackhq/tanstack-query/react';

type Props = {
  space: Space;
  list: List;
};

export default function TodoList(props: Props) {
  const { user } = useCurrentUser();
  const [title, setTitle] = useState('');
  const client = useClientQueries(schema);
  const createTodo = client.todo.useCreate().mutateAsync;

  const { data: todos } = client.todo.useFindMany({
    where: { listId: props.list.id },
    include: {
      owner: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const _createTodo = () => {
    void createTodo({
      data: {
        title,
        owner: { connect: { id: user!.id } },
        space: { connect: { id: props.space.id } },
        list: { connect: { id: props.list.id } },
      },
    }).catch((error: Error) => {
      toast.error(error.message);
    });
    setTitle('');
  };

  if (!props.space || !props.list) {
    return <></>;
  }

  return (
    <WithNavBar>
      <div className="px-8 py-2">
        <BreadCrumb space={props.space} list={props.list} />
      </div>
      <div className="container w-full flex flex-col items-center py-12 mx-auto">
        <h1 className="text-2xl font-semibold mb-4">{props.list?.title}</h1>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Type a title and press enter"
            className="input input-bordered w-72 max-w-xs mt-2"
            value={title}
            onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                _createTodo();
              }
            }}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setTitle(e.currentTarget.value);
            }}
          />
          <button onClick={() => _createTodo()}>
            <PlusIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <ul className="flex flex-col space-y-4 py-8 w-11/12 md:w-auto">
          {todos?.map((todo) => (
            <TodoComponent key={todo.id} value={todo} optimistic={todo.$optimistic} />
          ))}
        </ul>
      </div>
    </WithNavBar>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, params }) => {
  const db = await getEnhancedDb({ req, res });
  const space = await db.space.findUnique({
    where: { slug: params!.slug as string },
  });
  if (!space) {
    return {
      notFound: true,
    };
  }

  const list = await db.list.findUnique({
    where: { id: params!.listId as string },
  });
  if (!list) {
    return {
      notFound: true,
    };
  }

  return {
    props: { space, list },
  };
};
