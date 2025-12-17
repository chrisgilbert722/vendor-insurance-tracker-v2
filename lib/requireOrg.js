export function requireOrgId(req, res) {
  const orgId = req.query?.orgId;

  if (!orgId || typeof orgId !== "string") {
    res.status(200).json({
      ok: true,
      empty: true,
    });
    return null;
  }

  return orgId; // UUID string ONLY
}
