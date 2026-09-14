declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // NextAuth
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;

      // Database
      POSTGRES_URL_NON_POOLING: string;
      LOG_ZEN_QUERY: string;
    }
  }
}

export {};
