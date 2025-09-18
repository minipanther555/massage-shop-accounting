// S5_Gauntlet: No defaults - require explicit DB_PATH
if (!process.env.DB_PATH || !process.env.DB_PATH.trim()) {
  throw new Error('DB_PATH environment variable is required but not set. This prevents accidental DB path drift.');
}

const DB_PATH = process.env.DB_PATH.trim();
module.exports = DB_PATH;
