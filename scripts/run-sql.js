const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const args = process.argv.slice(2);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  let sql;
  let isQuery = false;
  if (args[0] === "--query" && args[1]) {
    sql = args[1];
    isQuery = true;
  } else if (args[0] === "--query-file" && args[1]) {
    const filePath = path.resolve(args[1]);
    if (!fs.existsSync(filePath)) {
      console.error(`Query file not found: ${filePath}`);
      process.exit(1);
    }
    sql = fs.readFileSync(filePath, "utf8");
    isQuery = true;
  } else if (args[0]) {
    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
      console.error(`SQL file not found: ${filePath}`);
      process.exit(1);
    }
    sql = fs.readFileSync(filePath, "utf8");
  } else {
    console.error("Usage: node run-sql.js <file.sql>");
    console.error("       node run-sql.js --query \"SELECT 1\"");
    console.error("       node run-sql.js --query-file <file.sql>");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(sql);
    if (isQuery) {
      process.stdout.write(JSON.stringify(result.rows));
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
