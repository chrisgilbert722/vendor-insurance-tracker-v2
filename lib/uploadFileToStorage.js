// lib/uploadFileToStorage.js
import fs from "fs";
import path from "path";

export async function uploadFileToStorage(file) {
  // LOCAL DEV STORAGE — saves in /public/uploads
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, file.name);

  // Convert Blob/File to buffer if needed
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(filePath, buffer);

  // Return public URL
  return `/uploads/${file.name}`;
}
