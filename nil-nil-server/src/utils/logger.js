// src/utils/logger.js
// Simple logger that adds timestamps and emoji prefixes.
// Makes it easy to read Railway/Render logs.

const timestamp = () => new Date().toISOString();

module.exports = {
  info: (...args) => console.log(`[${timestamp()}] ℹ️ `, ...args),
  success: (...args) => console.log(`[${timestamp()}] ✅`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] ⚠️ `, ...args),
  error: (...args) => console.error(`[${timestamp()}] ❌`, ...args),
  goal: (...args) => console.log(`[${timestamp()}] ⚽`, ...args),
  match: (...args) => console.log(`[${timestamp()}] 🏟️ `, ...args),
};
