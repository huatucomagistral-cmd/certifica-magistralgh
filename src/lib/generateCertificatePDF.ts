import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { Template } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0, g: 0, b: 0 };
}

async function getFont(
  pdfDoc: PDFDocument,
  fontFamily: string,
  bold: boolean,
  italic: boolean,
  baseUrl: string
): Promise<PDFFont> {
  const loadCustom = async (path: string): Promise<PDFFont> => {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`Font not found: ${path}`);
    const bytes = await res.arrayBuffer();
    return pdfDoc.embedFont(new Uint8Array(bytes));
  };

  switch (fontFamily) {
    case "TimesRoman":
      if (bold && italic) return pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      if (bold)           return pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      if (italic)         return pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      return pdfDoc.embedFont(StandardFonts.TimesRoman);
    case "Courier":
      if (bold && italic) return pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
      if (bold)           return pdfDoc.embedFont(StandardFonts.CourierBold);
      if (italic)         return pdfDoc.embedFont(StandardFonts.CourierOblique);
      return pdfDoc.embedFont(StandardFonts.Courier);
    case "PlayfairDisplay":
      if (italic) return loadCustom("/fonts/PlayfairDisplay-Italic.ttf");
      return loadCustom("/fonts/PlayfairDisplay-Regular.ttf");
    case "Cinzel":
      return loadCustom("/fonts/Cinzel-Regular.ttf");
    case "GreatVibes":
      return loadCustom("/fonts/GreatVibes-Regular.ttf");
    case "EBGaramond":
      if (bold && italic) return loadCustom("/fonts/EBGaramond-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/EBGaramond-Bold.ttf");
      if (italic) return loadCustom("/fonts/EBGaramond-Italic.ttf");
      return loadCustom("/fonts/EBGaramond-Regular.ttf");
    case "Lora":
      if (bold && italic) return loadCustom("/fonts/Lora-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/Lora-Bold.ttf");
      if (italic) return loadCustom("/fonts/Lora-Italic.ttf");
      return loadCustom("/fonts/Lora-Regular.ttf");
    case "LibreBaskerville":
      if (bold && italic) return loadCustom("/fonts/LibreBaskerville-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/LibreBaskerville-Bold.ttf");
      if (italic) return loadCustom("/fonts/LibreBaskerville-Italic.ttf");
      return loadCustom("/fonts/LibreBaskerville-Regular.ttf");
    case "Montserrat":
      if (bold && italic) return loadCustom("/fonts/Montserrat-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/Montserrat-Bold.ttf");
      if (italic) return loadCustom("/fonts/Montserrat-Italic.ttf");
      return loadCustom("/fonts/Montserrat-Regular.ttf");
    case "Raleway":
      if (bold && italic) return loadCustom("/fonts/Raleway-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/Raleway-Bold.ttf");
      if (italic) return loadCustom("/fonts/Raleway-Italic.ttf");
      return loadCustom("/fonts/Raleway-Regular.ttf");
    case "OpenSans":
      if (bold && italic) return loadCustom("/fonts/OpenSans-BoldItalic.ttf");
      if (bold) return loadCustom("/fonts/OpenSans-Bold.ttf");
      if (italic) return loadCustom("/fonts/OpenSans-Italic.ttf");
      return loadCustom("/fonts/OpenSans-Regular.ttf");
    case "DancingScript":
      if (bold) return loadCustom("/fonts/DancingScript-Bold.ttf");
      return loadCustom("/fonts/DancingScript-Regular.ttf");
    case "PinyonScript":
      return loadCustom("/fonts/PinyonScript-Regular.ttf");
    case "OldStandardTT":
      if (bold) return loadCustom("/fonts/OldStandardTT-Bold.ttf");
      if (italic) return loadCustom("/fonts/OldStandardTT-Italic.ttf");
      return loadCustom("/fonts/OldStandardTT-Regular.ttf");
    case "Oswald":
      if (bold) return loadCustom("/fonts/Oswald-Bold.ttf");
      return loadCustom("/fonts/Oswald-Regular.ttf");
    default: // Helvetica
      if (bold && italic) return pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      if (bold)           return pdfDoc.embedFont(StandardFonts.HelveticaBold);
      if (italic)         return pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      return pdfDoc.embedFont(StandardFonts.Helvetica);
  }
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth?: number): string[][] {
  if (!maxWidth) return [text.split(" ")]; // Retorna una sola línea con array de palabras
  const words = text.split(" ");
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentLineWidth = 0;
  const spaceWidth = font.widthOfTextAtSize(" ", fontSize);

  for (const word of words) {
    const wordWidth = font.widthOfTextAtSize(word, fontSize);
    if (currentLine.length === 0) {
      currentLine.push(word);
      currentLineWidth = wordWidth;
    } else {
      const newLineW = currentLineWidth + spaceWidth + wordWidth;
      if (newLineW <= maxWidth) {
        currentLine.push(word);
        currentLineWidth = newLineW;
      } else {
        lines.push(currentLine);
        currentLine = [word];
        currentLineWidth = wordWidth;
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}

function isBgPdf(url: string) {
  const lower = url.toLowerCase();
  // Firebase Storage encodes the path in the URL; look for .pdf in the path segment
  return lower.includes(".pdf");
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface GeneratePDFParams {
  template: Template;
  recipientName: string;
  courseName: string;
  issueDate: string;  // YYYY-MM-DD
  certId: string;
  baseUrl: string;    // window.location.origin
  extraFields?: Record<string, string>; // campos personalizados: { labelLower: value }
}

export async function generateCertificatePDF(params: GeneratePDFParams): Promise<Blob> {
  const { template, recipientName, courseName, issueDate, certId, baseUrl, extraFields } = params;

  const verificationUrl = `${baseUrl}/verificar/${certId}`;
  const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(template.bgImageUrl)}`;

  // ── 1. Create PDF document and handle background ──────────────────────────
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let page;
  let pageW: number;
  let pageH: number;

  const isPdf = isBgPdf(template.bgImageUrl);

  if (isPdf) {
    // PDF background (vectorial)
    const bgResponse = await fetch(proxyUrl);
    if (!bgResponse.ok) throw new Error("No se pudo descargar la plantilla PDF.");
    const bgBytes = await bgResponse.arrayBuffer();

    const bgPdfDoc = await PDFDocument.load(bgBytes);
    const copiedPages = await pdfDoc.copyPages(bgPdfDoc, bgPdfDoc.getPageIndices());
    copiedPages.forEach((p) => pdfDoc.addPage(p));

    page = pdfDoc.getPages()[0];
    const size = page.getSize();
    pageW = size.width;
    pageH = size.height;
  } else {
    // Raster background (Image) - Normalize to sensible size if too large
    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) throw new Error("No se pudo descargar la imagen de fondo.");
    const imageBlob = await imageResponse.blob();
    const imageBytes = await imageBlob.arrayBuffer();

    const isPng = imageBlob.type === "image/png" || template.bgImageUrl.toLowerCase().includes(".png");
    const bgImage = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

    // If image is very large (e.g. 300dpi), we map pixels to points 1:1,
    // but the editor usually treats pixels as points.
    pageW = bgImage.width;
    pageH = bgImage.height;
    page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(bgImage, { x: 0, y: 0, width: pageW, height: pageH });
  }

  // ── 2. Data map ─────────────────────────────────────────────────────────────
  const dateFormatted = new Date(issueDate + "T12:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const dataMap: Record<string, string> = {
    // Claves dataKey estandarizadas (nuevo sistema)
    "alumno_nombre":  recipientName,
    "curso_nombre":   courseName,
    "fecha_emision":  dateFormatted,
    // Claves legacy por label (compatibilidad con plantillas antiguas)
    "nombre del alumno": recipientName,
    "alumno":            recipientName,
    "nombre":            recipientName,
    "curso":             courseName,
    "nombre del curso":  courseName,
    "fecha":             dateFormatted,
    "fecha de emisión":  dateFormatted,
    // Merge custom extra fields (keys are dataKey keys)
    ...extraFields,
  };

  // ── 3. Draw text fields ─────────────────────────────────────────────────────
  for (const field of template.fields) {
    // Saltar campos sin posición (no fueron posicionados por el usuario)
    if (field.xRatio === undefined || field.yRatio === undefined) continue;

    const targetPageNum = (field.page ?? 1) - 1;
    const targetPage = pdfDoc.getPages()[targetPageNum] || pdfDoc.getPages()[0];

    // Usar las dimensiones de la página destino (no siempre igual a página 1)
    const tPageSize = targetPage.getSize();
    const tPageW = tPageSize.width;
    const tPageH = tPageSize.height;

    const { r, g, b } = hexToRgb(field.color);
    const labelLower = field.label.toLowerCase();

    let textToDraw = field.label; // default: mostrar el label literal
    
    // Prioridad 1: dataKey explícito del campo
    if (field.dataKey && dataMap[field.dataKey] !== undefined) {
      textToDraw = dataMap[field.dataKey];
    } else {
      // Prioridad 2: fallback por label — SOLO si el campo es "corto" (≤4 palabras)
      // y coincide EXACTAMENTE con una clave del mapa, no si la contiene como substring
      // (para evitar que campos estáticos como "Por haber participado en el curso..." sean reemplazados)
      const labelWords = field.label.trim().split(/\s+/);
      if (labelWords.length <= 4) {
        const mapKeys = Object.keys(dataMap).sort((a, b) => b.length - a.length);
        for (const key of mapKeys) {
          if (labelLower === key || labelLower.startsWith(key + " ") || labelLower.endsWith(" " + key)) {
            textToDraw = dataMap[key];
            break;
          }
        }
      }
    }

    const font = await getFont(pdfDoc, field.fontFamily ?? "Helvetica", !!field.bold, !!field.italic, baseUrl);

    // Dynamic Font Scaling for Recipient Names
    let adjustedFontSize = field.fontSize;
    const isRecipientName = field.dataKey === "alumno_nombre" 
      || (field.dataKey == null && (labelLower.includes("alumno") || labelLower === "nombre"));
    const maxWidth = field.widthRatio ? field.widthRatio * tPageW : undefined;

    if (maxWidth && isRecipientName) {
      // Reduce font size until it fits within maxWidth (min 8px)
      while (adjustedFontSize > 8 && font.widthOfTextAtSize(textToDraw, adjustedFontSize) > maxWidth) {
        adjustedFontSize -= 0.5;
      }
    }

    const lines = wrapText(textToDraw, font, adjustedFontSize, isRecipientName ? undefined : maxWidth);
    
    // boundingBoxWidth for alignment/justification
    const boundingBoxWidth = maxWidth ?? font.widthOfTextAtSize(textToDraw, adjustedFontSize);
    
    const anchorX = field.xRatio * tPageW;
    const anchorY = (1 - field.yRatio) * tPageH;
    const align   = field.align ?? "left";
    
    const boxLeftX = align === "center" ? anchorX - boundingBoxWidth / 2
                   : align === "right"  ? anchorX - boundingBoxWidth
                   : anchorX;

    const lineHeight = adjustedFontSize * 1.2; // Estandarizado a 1.2 para paridad con el editor
    const spaceWidth = font.widthOfTextAtSize(" ", adjustedFontSize);
    
    lines.forEach((lineWords, lineIndex) => {
      const lineText = lineWords.join(" ");
      const lineWidth = font.widthOfTextAtSize(lineText, adjustedFontSize);
      
      let lineX = boxLeftX;
      let extraSpacePerSlot = 0;

      if (align === "center") {
        lineX = boxLeftX + (boundingBoxWidth - lineWidth) / 2;
      } else if (align === "right") {
        lineX = boxLeftX + (boundingBoxWidth - lineWidth);
      } else if (align === "justify") {
        // Justify unless it's the last line, or if there's only 1 word
        if (lineIndex < lines.length - 1 && lineWords.length > 1) {
          const totalExtra = boundingBoxWidth - lineWidth;
          extraSpacePerSlot = totalExtra / (lineWords.length - 1);
        }
      }

      // Vertical centering: The whole block is centered vertically on anchorY.
      // We use font metrics (Ascent/Descent) to find the visual center displacement relative to baseline.
      const blockCenterBaselineOffset = ((lines.length - 1) / 2 - lineIndex) * lineHeight;
      const ascent = font.heightAtSize(adjustedFontSize, { descender: false });
      const heightWithDescender = font.heightAtSize(adjustedFontSize);
      const descent = ascent - heightWithDescender;
      const fontVerticalCenterAdjustment = (ascent + descent) / 2;
      const lineY = anchorY + blockCenterBaselineOffset - fontVerticalCenterAdjustment;

      // Draw word by word if justified, otherwise we can just draw the whole line string
      if (align === "justify" && extraSpacePerSlot > 0) {
        let currentWordX = lineX;
        for (const word of lineWords) {
          targetPage.drawText(word, { x: currentWordX, y: lineY, size: adjustedFontSize, font, color: rgb(r, g, b) });
          currentWordX += font.widthOfTextAtSize(word, adjustedFontSize) + spaceWidth + extraSpacePerSlot;
        }
      } else {
        targetPage.drawText(lineText, { x: lineX, y: lineY, size: adjustedFontSize, font, color: rgb(r, g, b) });
      }

      // ── Underline ─────────────────────────────────────────────────────────
      if (field.underline) {
        const thickness = Math.max(0.5, adjustedFontSize * 0.05);
        const underlineY = lineY - (adjustedFontSize * 0.08);
        
        // In justified lines, the underline should span the entire bounding box
        const drawWidth = (align === "justify" && lineIndex < lines.length - 1 && lineWords.length > 1) 
          ? boundingBoxWidth 
          : lineWidth;

        targetPage.drawLine({
          start: { x: lineX, y: underlineY },
          end: { x: lineX + drawWidth, y: underlineY },
          thickness: thickness,
          color: rgb(r, g, b),
          opacity: 1,
        });
      }
    });
  }

  // ── 4. Draw QR code ─────────────────────────────────────────────────────────
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "H" });
  const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // QR usa las dimensiones de la página destino del QR
  const targetQrPageNum = (template.qrPage ?? 1) - 1;
  const qrTargetPage = pdfDoc.getPages()[targetQrPageNum] || pdfDoc.getPages()[0];
  const qrPageSize = qrTargetPage.getSize();
  const qrPageW = qrPageSize.width;
  const qrPageH = qrPageSize.height;

  const qrSize = (template.qrSizeRatio ?? 0.12) * qrPageW;
  const qrPdfX = (template.qrXRatio ?? 0.88) * qrPageW - qrSize / 2;
  const qrPdfY = (1 - (template.qrYRatio ?? 0.92)) * qrPageH - qrSize / 2;

  qrTargetPage.drawImage(qrImage, { x: qrPdfX, y: qrPdfY, width: qrSize, height: qrSize });

  // ── 5. Draw verification URL text (if configured) ───────────────────────────
  if (template.verifyUrlVisible !== false && template.verifyUrlXRatio !== undefined && template.verifyUrlYRatio !== undefined) {
    const vuPageNum  = (template.verifyUrlPage ?? 1) - 1;
    const vuPage     = pdfDoc.getPages()[vuPageNum] || pdfDoc.getPages()[0];
    const vuPageSize = vuPage.getSize();
    const vuPageW    = vuPageSize.width;
    const vuPageH    = vuPageSize.height;

    const vuFontSize = template.verifyUrlFontSize ?? 7;
    const vuColor    = hexToRgb(template.verifyUrlColor ?? "#555555");
    const vuFont     = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const vuText  = verificationUrl;
    const vuAncX  = template.verifyUrlXRatio * vuPageW;
    const vuAncY  = (1 - template.verifyUrlYRatio) * vuPageH;

    // Center the text on the anchor point
    const vuTextW = vuFont.widthOfTextAtSize(vuText, vuFontSize);
    const vuX     = vuAncX - vuTextW / 2;
    const vuAscent = vuFont.heightAtSize(vuFontSize, { descender: false });
    const vuY      = vuAncY - vuAscent / 2;

    vuPage.drawText(vuText, {
      x: vuX, y: vuY,
      size: vuFontSize,
      font: vuFont,
      color: rgb(vuColor.r, vuColor.g, vuColor.b),
    });
  }

  // ── 6. Save ─────────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
