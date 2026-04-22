export type TextAlign = "left" | "center" | "right" | "justify";

export type TemplateField = {
  id: string;
  label: string;
  /** Clave semántica del dato. Campos con el mismo dataKey comparten el mismo input en el formulario de emisión. */
  dataKey?: string;
  xRatio: number;
  yRatio: number;
  widthRatio?: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  underline?: boolean;
  page?: number; // 1 for front, 2 for back
};

export interface Template {
  id: string;
  name: string;
  bgImageUrl: string;
  fields: TemplateField[];
  qrXRatio: number;
  qrYRatio: number;
  qrSizeRatio: number;
  qrPage?: number; // 1 for front, 2 for back. Default is 1 if unspecified.
  // Enlace de verificación (texto arrastrable, auto-rellenado con certId)
  verifyUrlXRatio?: number;
  verifyUrlYRatio?: number;
  verifyUrlPage?: number;
  verifyUrlFontSize?: number;  // default 7
  verifyUrlColor?: string;     // default #555555
  verifyUrlVisible?: boolean;  // false = no mostrar en el PDF
  createdAt: number;
  updatedAt: number;
}

export interface Certificate {
  id: string;
  templateId: string;
  recipientName: string;
  courseName: string;
  issueDate: number;
  email?: string;
  pdfUrl: string;
  
  // Public validation fields
  dni?: string;
  finalGrade?: string; // String to support formats like "18/20", "Sobresaliente", etc.
  hours?: string; // String to support formats like "120 Hrs", "2 Créditos"
  startDate?: number;
  endDate?: number;
  
  status: "active" | "revoked";
  createdAt: number;
}
