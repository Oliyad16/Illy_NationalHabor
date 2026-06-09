function deriveFrontendApiUrl(publishableKey) {
  const encoded = String(publishableKey || "").split("_")[2];
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  } catch (err) {
    return "";
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || "";
  const frontendApiUrl = process.env.CLERK_FRONTEND_API_URL || deriveFrontendApiUrl(publishableKey);

  res.setHeader("Cache-Control", "no-store");
  if (!publishableKey || !frontendApiUrl) {
    res.status(503).json({
      error: "clerk_not_configured",
      message: "Set CLERK_PUBLISHABLE_KEY. Set CLERK_FRONTEND_API_URL only if Clerk cannot derive it."
    });
    return;
  }

  res.status(200).json({
    publishableKey: publishableKey,
    frontendApiUrl: frontendApiUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")
  });
};
