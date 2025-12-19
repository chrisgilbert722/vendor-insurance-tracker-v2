// pages/api/admin/sso/get.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const orgId = Number(req.query.orgId);
  if (!orgId) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      external_uuid,
      sso_provider,
      sso_enforced,
      allowed_domains,
      azure_tenant_id,
      azure_client_id
    `)
    .eq("id", orgId)
    .single();

  if (error || !org) {
    return res.status(404).json({ ok: false, error: "Organization not found" });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const callbackUrl = `${siteUrl}/auth/callback`;

  return res.status(200).json({
    ok: true,
    org,
    callbackUrl,
  });
}
