const DEFAULT_DB = "/app/backend/data/massage_shop.db"; // safe default
const DB_PATH = process.env.DB_PATH && process.env.DB_PATH.trim()
  ? process.env.DB_PATH.trim()
  : DEFAULT_DB;
module.exports = DB_PATH;
