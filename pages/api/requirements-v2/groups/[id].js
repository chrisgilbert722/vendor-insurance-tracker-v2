// pages/api/requirements-v2/groups/[id].js
import { supabase } from "../../../../lib/supabaseClient";

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing group id" });
  }

  // ----------------------------------
  // GET A SINGLE GROUP (optional)
  // ----------------------------------
  if (method === "GET") {
    const { data, error } = await supabase
      .from("requirements_groups_v2")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("GET group error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ ok: false, error: "Group not found" });
    }

    return res.status(200).json({ ok: true, group: data });
  }

  // ----------------------------------
  // UPDATE GROUP
  // ----------------------------------
  if (method === "PUT") {
    const { name, description, is_active, order_index } = req.body || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;
    if (order_index !== undefined) updates.order_index = order_index;

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

    return res.status(200).json({ ok: true, group: data });
  }

  // ----------------------------------
  // DELETE GROUP
  // ----------------------------------
  if (method === "DELETE") {
    const { error } = await supabase
      .from("requirements_groups_v2")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE group error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, deleted: true });
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res
    .status(405)
    .json({ ok: false, error: `Method ${method} Not Allowed` });
}
