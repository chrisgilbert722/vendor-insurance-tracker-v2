// 🟢 FINAL — Vercel Node.js API Route (Stable + JSON-Safe + Production Ready)

export const config = {
  runtime: "nodejs",
  api: { bodyParser: false },
};

import OpenAI from "openai";
import { Client } from "pg";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let client = null;

  try {
    // Parse form-data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // Read PDF
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF contains no readable text");
    }

    const text = pdfData.text.trim().slice(0, 5000);

    // OpenAI extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
You
