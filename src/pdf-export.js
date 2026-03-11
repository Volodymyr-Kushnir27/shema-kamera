import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import { generateSvg } from "./svg-renderer.js";

export function generatePlanPdfBuffer(plan) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 24
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).fillColor("#111827").text("Схема відеоспостереження", 24, 18);

      const svg = generateSvg(plan);

      SVGtoPDF(doc, svg, 24, 50, {
        width: 790,
        height: 500,
        preserveAspectRatio: "xMidYMid meet"
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}