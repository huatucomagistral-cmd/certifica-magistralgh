export type TextAlign = "left" | "center" | "right" | "justify";

export type TemplateField = {
  id: string;
  label: string;
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
};

export interface Template {
  id: string;
  name: string;
  bgImageUrl: string;
  fields: TemplateField[];
  qrXRatio: number;
  qrYRatio: number;
  qrSizeRatio: number;
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
  status: "active" | "revoked";
  createdAt: number;
}
