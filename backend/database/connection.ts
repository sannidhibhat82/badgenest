import sql from "mssql";

const config: sql.config = {
  user: process.env.DB_USER ?? "sa",
  password: process.env.DB_PASSWORD ?? "",
  server: process.env.DB_SERVER ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "1433", 10),
  database: process.env.DB_DATABASE ?? "badgenest",
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function query<T = sql.IResult<any>>(
  queryText: string,
  params?: Record<string, unknown>
): Promise<T> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  return request.query(queryText) as Promise<T>;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
