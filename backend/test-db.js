import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS role,
      (
        SELECT extversion
        FROM pg_extension
        WHERE extname = 'vector'
      ) AS pgvector_version;
  `);

  console.log("Database connection successful!");
  console.log(result.rows[0]);
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
