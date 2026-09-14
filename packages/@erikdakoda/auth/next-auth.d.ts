import type { Space, SpaceUser, UserRole } from '@erikdakoda/database';

type SessionSpaceUser = Pick<SpaceUser, 'id' | 'createdAt' | 'updatedAt' | 'spaceId' | 'role'> & {
  space: Space;
};

declare module 'next-auth' {
  interface User {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
    email: string;
    emailVerified?: Date | null;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    activeSpaceId?: string | null;
    spaces: SessionSpaceUser[];
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
  }
}
