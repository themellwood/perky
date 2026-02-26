export type AppEnv = {
  Bindings: {
    DB: D1Database;
    AUTH_KV: KVNamespace;
    DOCUMENTS: R2Bucket;
    CLAUDE_API_KEY: string;
    RESEND_API_KEY: string;
    APP_URL: string;
  };
  Variables: {
    user: {
      id: string;
      email: string;
      role: string;
    } | null;
  };
};
