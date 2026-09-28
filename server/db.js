import 'dotenv/config';
import pg from 'pg';

// DATABASE_URL supports Railway; standard PG* variables support local development.
const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    options: '-c timezone=UTC',
});

db.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

export default db;
