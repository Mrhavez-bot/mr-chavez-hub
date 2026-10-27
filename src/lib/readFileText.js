import JSZip from "jszip";
import * as XLSX from "xlsx";

export const TEXT_EXTS = [".txt", ".csv", ".docx", ".xlsx", ".xls"];
export const ATTACH_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"];
export const extOf = (name) => { const i = name.lastIndexOf("."); return i < 0 ? "" : name.slice(i).toLowerCase(); };

// Reads a rubric file as plain text: .txt .csv .docx .xlsx .xls
// (Word and Excel tables keep their rows, with cells separated by " | ").
export async function readFileText(file) {
  const ext = extOf(file.name);
  if (ext === ".txt" || ext === ".csv") return (await file.text()).trim();
  if (ext === ".docx") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = zip.file("word/document.xml");
    if (!entry) throw new Error("No se pudo leer este archivo de Word.");
    let xml = await entry.async("string");
    xml = xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tc>/g, " | ")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    return xml.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  }
  if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return wb.SheetNames.map((n) => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " | " })}`).join("\n").trim();
  }
  throw new Error("Formato no compatible. Usa Word, Excel, PDF, imagen (JPG/PNG) o .txt.");
}

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1]);
  r.onerror = () => reject(new Error("No se pudo leer el archivo."));
  r.readAsDataURL(blob);
});

// PDFs and images are sent to Claude as they are (images are shrunk first).
export async function prepareAttachment(file) {
  if (extOf(file.name) === ".pdf") {
    if (file.size > 5 * 1024 * 1024) throw new Error("El PDF pesa más de 5 MB. Usa uno más ligero o pega el texto.");
    return { mediaType: "application/pdf", data: await toBase64(file), name: file.name };
  }
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("No pude abrir la imagen. Prueba con JPG o PNG."); }
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  return { mediaType: "image/jpeg", data: await toBase64(blob), name: file.name };
}
