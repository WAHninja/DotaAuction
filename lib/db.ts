import mysql from 'mysql2/promise';

export async function getDBConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  });
  return connection;
}