import "server-only";
import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";
import { chalanRows, accountLines, rupees } from "./chalan";
export const xml = (value: any) => String(value ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
const wrap = (value: any, max: number) => {
  const lines: string[] = [];
  for (const paragraph of String(value ?? "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && `${line} ${word}`.length > max) { lines.push(line); line = ""; }
      if (word.length > max) { if (line) lines.push(line); for (let i = 0; i < word.length; i += max) lines.push(word.slice(i, i + max)); line = ""; }
      else line += `${line ? " " : ""}${word}`;
    }
    lines.push(line);
  }
  return lines;
};
export async function renderChalan(fee: any, school: any, accounts: any[]) {
  const rows = chalanRows(fee), student = fee.student || {};
  const out: string[] = [];
  let y = 42;
  const text = (x: number, baseline: number, value: any, size = 18, bold = false, color = "#1e293b", anchor = "start") => out.push(`<text x="${x}" y="${baseline}" font-family="Inter" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${color}" text-anchor="${anchor}">${xml(value)}</text>`);
  const rect = (x: number, top: number, width: number, height: number, fill: string, stroke = "none") => out.push(`<rect x="${x}" y="${top}" width="${width}" height="${height}" rx="4" fill="${fill}" stroke="${stroke}"/>`);
  const centered = (value: any, size: number, bold = false, max = 52) => { for (const line of wrap(value, max)) { y += size + 9; text(450, y, line, size, bold, "#1e293b", "middle"); } };
  // Only the school's validated, locally embedded logo is rendered; no remote fetch.
  if (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(school.logo || "")) { out.push(`<image href="${school.logo}" x="410" y="24" width="80" height="80" preserveAspectRatio="xMidYMid meet"/>`); y += 82; }
  centered(school.name || "School", 29, true);
  centered("FEE CHALAN", 20, true);
  centered(`Chalan # ${fee.chalanNo || "—"}  ·  ${fee.month === "0000-00" ? "Opening balance" : fee.month}`, 16);
  y += 26;
  const details = [
    ["Student", student.name], ["Father", student.fatherName || "—"],
    ["Class / section", `${student.className || "—"} ${student.section || ""}`], ["Roll #", student.rollNo || "—"],
  ];
  for (let i = 0; i < details.length; i += 2) {
    rect(36, y, 828, 42, "#f1f5f9", "#cbd5e1");
    for (let j = 0; j < 2; j++) { const x = 48 + j * 414; text(x, y + 27, details[i + j][0], 15, true); text(x + 125, y + 27, wrap(details[i + j][1], 25)[0], 16); }
    y += 42;
  }
  y += 20;
  for (const [label, amount] of rows.lines) {
    const important = ["This voucher total", "Total payable", "Balance due"].includes(label);
    rect(36, y, 828, 40, important ? "#eff6ff" : "#ffffff", "#cbd5e1");
    text(50, y + 26, label, 17, important); text(848, y + 26, rupees(amount), 18, important, "#1e293b", "end"); y += 40;
  }
  y += 30;
  text(36, y, "PAY ONLINE / AT SCHOOL", 18, true); y += 16;
  if (!accounts.length) { y += 28; text(36, y, "Please contact the school office for payment details.", 16); y += 12; }
  for (const account of accounts) {
    const lines = accountLines(account).flatMap((line, i) => wrap(line, i === 0 ? 76 : 85));
    const height = lines.length * 25 + 22;
    rect(36, y, 828, height, "#f8fafc", "#94a3b8");
    lines.forEach((line, i) => text(50, y + 28 + i * 25, line, i === 0 ? 17 : 16, i < 2)); y += height + 12;
  }
  y += 20;
  for (const line of wrap("Please verify the account title and number before paying. Keep your payment receipt and share it with the school office.", 94)) { y += 22; text(450, y, line, 13, false, "#475569", "middle"); }
  y += 34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${y}"><rect width="900" height="${y}" fill="white"/>${out.join("")}</svg>`;
  const renderer = new Resvg(svg, { font: { fontFiles: [join(process.cwd(), "src/lib/chalan-fonts/Inter-Regular.ttf"), join(process.cwd(), "src/lib/chalan-fonts/Inter-Bold.ttf")], loadSystemFonts: false, defaultFontFamily: "Inter" } });
  return { png: renderer.render().asPng(), filename: `Fee-Chalan-${String(fee.chalanNo || fee._id).replace(/[^a-zA-Z0-9_-]/g, "-")}.png` };
}
