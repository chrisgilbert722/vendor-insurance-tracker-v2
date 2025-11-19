import { supabase } from "../../../../lib/supabaseClient";

export default async function handler(req, res) {
  const { method } = req;

  // -------------------------
  // GET GROUPS
  // -------------------------
  if (method === "GET") {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 🔥 FIX: Convert orgId to integer
    const org_id_int = parseInt(orgId, 10);

    const { data, error } = await supabase
      .from("requirements_groups_v2")
      .select("*")
      .eq("org_id", org_id_int)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET groups error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const groups =
      data?.map((g) => ({
        id: g.id,
        org_id: g.org_id,
        name: g.name,
        description: g.description,
        is_active: g.is_active,
        created_at: g.created_at,
        rule_count: 0, // rules loaded separately
      })) || [];

    return res.status(200).json({ ok: true, groups });
  }

  // -------------------------
  // CREATE GROUP
  // -------------------------
  if (method === "POST") {
    const { orgId, name, description } = req.body || {};

    if (!orgId || !name) {
      return res
        .status(400)
        .json({ ok: false, error: "orgId and name are required" });
    }

    // 🔥 Fix int conversion
    const org_id_int = parseInt(orgId, 10);

    const { data, error } = await supabase
      .from("requirements_groups_v2")
      .insert({
        org_id: org_id_int,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("POST group error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, group: data });
  }

  // -------------------------
  // UPDATE GROUP
  // -------------------------
  if (method === "PUT") {
    const { id, name, description, is_active } = req.body || {};

    if (!id)
      return res.status(400).json({ ok: false, error: "Missing group id" });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("requirements_groups_v2")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("PUT group error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data)
      return res.status(404).json({ ok: false, error: "Group not found" });

    return res.status(200).json({ ok: true, group: data });
  }

  // -------------------------
  // DELETE GROUP
  // -------------------------
  if (method === "DELETE") {
    const { id } = req.query;
    if (!id)
      return res.status(400).json({ ok: false, error: "Missing group id" });

    const { error } = await supabase
      .from("requirements_groups_v2")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE group error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res
    .status(405)
    .json({ ok: false, error: `Method ${method} Not Allowed` });
}

