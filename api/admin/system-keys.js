/* ============================================================
   AI Tutor - Vercel Serverless Endpoint: /api/admin/system-keys
   ============================================================ */
const { handleAdminSystemKeys } = require("../../lib/admin-keys");

module.exports = async function adminSystemKeysHandler(req, res) {
  const urlObj = new URL(String(req.url || "/"), "http://localhost");
  const rewritten = urlObj.searchParams.get("__path");
  let cleanPath = rewritten ? String(rewritten).trim() : urlObj.pathname;
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) cleanPath = cleanPath.slice(0, -1);
  return handleAdminSystemKeys(req, res, cleanPath);
};
