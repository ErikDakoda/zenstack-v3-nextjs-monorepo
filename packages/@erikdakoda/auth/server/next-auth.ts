import { authDb, db } from '@erikdakoda/database/server/db';
import { type Space, SpaceUserRole } from '@erikdakoda/database';
import type { AuthDbClient } from '@erikdakoda/database/server/db';

// ** NextAuth
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import authConfig from '../config';

// ** Utilities
import { compare } from 'bcryptjs';
import omit from 'lodash/omit';

const userSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  email: true,
  emailVerified: true,
  password: true,
  name: true,
  image: true,
  role: true,
  activeSpaceId: true,
  spaces: {
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      spaceId: true,
      space: true,
      role: true,
    },
  },
} as const;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: authConfig.config.pages.login,
  },

  providers: [
    CredentialsProvider({
      credentials: {
        email: {
          type: 'email',
        },
        password: {
          type: 'password',
        },
      },
      authorize: authorize(authDb),
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      const user = await authDb.user.findUnique({
        where: {
          id: token.sub,
        },
        select: userSelect,
      });

      return {
        ...session,
        user: {
          ...omit(user, ['password']),
          id: token.sub!,
        },
      };
    },
  },

  events: {
    async signIn({ user }) {
      console.log('Signing in', user.email);
      let space: Space | null = null;

      const spaceCount = await db.spaceUser.count({
        where: {
          userId: user.id,
        },
      });

      if (spaceCount === 0) {
        space = await db.space.create({
          data: {
            name: `${user?.name || user?.email?.split('@')[0]}’s space`,
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
      } else {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
          select: { activeSpaceId: true },
        });
        if (!existingUser?.activeSpaceId) {
          const spaceUser = await db.spaceUser.findFirst({
            where: {
              userId: user.id,
            },
            include: {
              space: true,
            },
          });
          space = spaceUser?.space ?? null;
        }
      }

      if (space) {
        await db.user.update({
          where: {
            id: user.id,
          },
          data: {
            activeSpaceId: space.id,
          },
        });
      }
    },
  },
};

function authorize(client: AuthDbClient) {
  return async (credentials: Record<'email' | 'password', string> | undefined) => {
    if (!credentials) {
      throw new Error('Missing credentials');
    }

    if (!credentials.email) {
      throw new Error('"email" is required in credentials');
    }

    if (!credentials.password) {
      throw new Error('"password" is required in credentials');
    }

    const maybeUser = await client.user.findFirst({
      where: {
        email: credentials.email,
      },
      select: userSelect,
    });

    if (!maybeUser?.password) {
      return null;
    }

    const isValid = await compare(credentials.password, maybeUser.password);

    if (!isValid) {
      return null;
    }

    return omit(maybeUser, ['password']);
  };
}
