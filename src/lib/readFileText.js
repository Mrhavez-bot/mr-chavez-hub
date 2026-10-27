import JSZip from "jszip";

// Reads a rubric file as plain text. Supports .txt and .docx (tables keep their
// rows, with cells separated by " | ").
export async function readFileText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return (await file.text()).trim();
  if (name.endsWith(".docx")) {
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
  throw new Error("Por ahora acepto archivos .docx y .txt. Si tu rúbrica está en PDF o Excel, copia y pega el texto.");
}
