// Fills a tagged .docx template (see public/templates) with plan data.
// Supports {{key}} text tags (newlines become line breaks) and paragraph
// loops written as marker paragraphs: [[#name]] ... [[/name]] (nestable).
import JSZip from "jszip";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toXml = (s) => esc(s).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');

const START = /<w:p>\s*<w:r>\s*<w:t>\[\[#(\w+)\]\]<\/w:t>\s*<\/w:r>\s*<\/w:p>/;

export function render(xml, ctx) {
  let m;
  while ((m = START.exec(xml))) {
    const name = m[1];
    const endRe = new RegExp(`<w:p>\\s*<w:r>\\s*<w:t>\\[\\[\\/${name}\\]\\]<\\/w:t>\\s*<\\/w:r>\\s*<\\/w:p>`);
    const rest = xml.slice(m.index + m[0].length);
    const e = endRe.exec(rest);
    if (!e) throw new Error("Unclosed loop: " + name);
    const body = rest.slice(0, e.index);
    const after = rest.slice(e.index + e[0].length);
    const items = Array.isArray(ctx[name]) ? ctx[name] : [];
    const out = items.map((item) => render(body, { ...ctx, ...item })).join("");
    xml = xml.slice(0, m.index) + out + after;
  }
  return xml.replace(/\{\{(\w+)\}\}/g, (_, k) => toXml(ctx[k]));
}

export async function fillDocx(templateBuffer, data, outType = "blob") {
  const zip = await JSZip.loadAsync(templateBuffer);
  const xml = await zip.file("word/document.xml").async("string");
  zip.file("word/document.xml", render(xml, data));
  return zip.generateAsync({
    type: outType,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE"
  });
}
