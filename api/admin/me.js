/* ============================================================
   AI Tutor - Vercel Serverless Endpoint: /api/admin/me
   Verifies Google RS256 ID token + Admin allowlist on the server.
   Used by UI to conditionally render Admin-only System Key controls.
   ============================================================ */
const { handleAdminMe } = require("../../lib/admin-keys");

module.exports = async function adminMeHandler(req, res) {
  return handleAdminMe(req, res);
};
