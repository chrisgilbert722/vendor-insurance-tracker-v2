// pages/api/requirements-v2/rules.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  const { method } = req;

  // GET: list rules for a group
  if (method === "GET") {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ ok: false, error: "Missing groupId" });
    }

    const { data, error } = await supabase
      .from("requirements_rules_v2")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("GET rules error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, rules: data || [] });
  }

  // POST: create new rule
  if (method === "POST") {
    const {
      groupId,
      field_key,
      operator,
      expected_value,
      severity,
      requirement_text,
      internal_note,
    } = req.body || {};

    if (!groupId || !field_key || !operator || !expected_value) {
      return res.status(400).json({
        ok: false,
        error: "groupId, field_key, operator and expected_value are required",
      });
    }

    const { data, error } = await supabase
      .from("requirements_rules_v2")
      .insert({
        group_id: groupId,
        field_key,
        operator,
        expected_value,
        severity: severity || "medium",
        requirement_text: requirement_text || null,
        internal_note: internal_note || null,
      })
      .select()
      .single();

    if (error) {
      console.error("POST rule error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, rule: data });
  }

  // PUT: update rule
  if (method === "PUT") {
    const {
      id,
      field_key,
      operator,
      expected_value,
      severity,
      requirement_text,
      internal_note,
      is_active,
    } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing rule id" });
    }

    const updates = {};
    if (field_key !== undefined) updates.field_key = field_key;
    if (operator !== undefined) updates.operator = operator;
    if (expected_value !== undefined) updates.expected_value = expected_value;
    if (severity !== undefined) updates.severity = severity;
    if (requirement_text !== undefined) updates.requirement_text = requirement_text;
    if (internal_note !== undefined) updates.internal_note = internal_note;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }

    const { data, error } = await supabase
      .from("requirements_rules_v2")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("PUT rule error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ ok: false, error: "Rule not found" });
    }

    return res.status(200).json({ ok: true, rule: data });
  }

  // DELETE: delete rule
  if (method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing rule id" });
    }

    const { error } = await supabase
      .from("requirements_rules_v2")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE rule error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res
    .status(405)
    .json({ ok: false, error: `Method ${method} Not Allowed` });
}
