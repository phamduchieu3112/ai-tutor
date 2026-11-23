/* ============================================================
   AI Tutor - Vercel Serverless Endpoint: /api/ai/proxy
   Routes authenticated AI requests using the System Default Key Pool.
   ============================================================ */
const { handleAiProxy } = require("../../lib/ai-proxy");

module.exports = async function aiProxyHandler(req, res) {
  return handleAiProxy(req, res);
};
