export interface Konfigurasi {
  databaseUrl: string;
  jwtSecret: string;
  jwtTtlJam: number;
  port: number;
}

export function bacaKonfigurasi(env: NodeJS.ProcessEnv = process.env): Konfigurasi {
  const databaseUrl = env.DATABASE_URL;
  const jwtSecret = env.JWT_SECRET;

  if (!databaseUrl) throw new Error('DATABASE_URL belum diatur');
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET belum diatur atau terlalu pendek, minimal 16 karakter');
  }

  return {
    databaseUrl,
    jwtSecret,
    jwtTtlJam: Number(env.JWT_TTL_JAM ?? 12),
    port: Number(env.PORT ?? 3000),
  };
}
