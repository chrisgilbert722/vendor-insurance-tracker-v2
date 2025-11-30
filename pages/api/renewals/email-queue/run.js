import { processRenewalEmailQueue } from "../../../../lib/autoEmailBrain";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const out = await processRenewalEmailQueue(25);
    return res.status(200).json({ ok: true, out });
  } catch (err) {
    console.error("[email-queue/run] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
