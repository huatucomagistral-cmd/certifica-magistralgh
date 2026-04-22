"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Template } from "@/lib/types";
import { ArrowLeft, Save, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { generateCertificatePDF } from "@/lib/generateCertificatePDF";
import { generateOfficialCertId } from "@/lib/generateCertId";

// ─── Keywords que se auto-rellenan (no se muestran como input) ───────────────
const AUTO_KEYS = [
  "alumno_nombre", "curso_nombre", "fecha_emision",
  // Fallback por label (compatibilidad con plantillas antiguas)
  "nombre del alumno", "alumno", "nombre",
  "nombre del curso", "curso",
  "fecha de emisión", "fecha",
];

function isAutoField(field: { label: string; dataKey?: string }): boolean {
  if (field.dataKey && AUTO_KEYS.includes(field.dataKey)) return true;
  const lower = field.label.toLowerCase();
  return AUTO_KEYS.some((k) => lower.includes(k));
}

/** Retorna un subconjunto de campos deduplicados por dataKey — un campo representativo por clave. */
function deduplicateFieldsByDataKey(fields: Template["fields"]) {
  const seen = new Set<string>();
  return fields.filter((f) => {
    const key = f.dataKey || `unique_${f.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveDataKey(label: string, id: string): string {
  const l = label.toLowerCase();
  if (l.includes("alumno") || (l.includes("nombre") && !l.includes("curso"))) return "alumno_nombre";
  if (l.includes("curso")) return "curso_nombre";
  if (l.includes("fecha")) return "fecha_emision";
  if (l.includes("dni") || l.includes("documento")) return "alumno_dni";
  return `custom_${id}`;
}

export default function IssueCertificatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Bureaucratic validation fields
  const [dni, setDni] = useState("");
  const [finalGrade, setFinalGrade] = useState("");
  const [hours, setHours] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Dynamic extra fields — keyed by field.id, value is user input
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  useEffect(() => {
    getDocs(collection(db, "templates")).then((snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]);
    });
  }, []);

  // When template changes, reset extraValues and prefill empty strings
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (!selectedTemplate) { setExtraValues({}); return; }
    const extras: Record<string, string> = {};
    const deduplicated = deduplicateFieldsByDataKey(selectedTemplate.fields);
    for (const field of deduplicated) {
      if (!isAutoField(field)) {
        const key = field.dataKey || resolveDataKey(field.label, field.id);
        extras[key] = "";
      }
    }
    setExtraValues(extras);
  }, [selectedTemplateId, selectedTemplate]);

  // Extra fields for this template (non-auto, deduplicated by dataKey)
  const extraFields = deduplicateFieldsByDataKey(selectedTemplate?.fields ?? []).filter((f) => !isAutoField(f));

  const handleIssue = async () => {
    if (!selectedTemplateId || !recipientName || !courseName || !issueDate) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    setLoading(true);
    setStatus("Generando PDF...");
    try {
      const certId = await generateOfficialCertId();
      const baseUrl = window.location.origin;

      // Construir extraFields map usando dataKey como clave (más robusto y predecible)
      const extraFieldsMap: Record<string, string> = {};
      for (const field of extraFields) {
        const key = field.dataKey || resolveDataKey(field.label, field.id);
        const val = extraValues[key] ?? "";
        if (val.trim()) {
          extraFieldsMap[key] = val;
          // También añadir el label como alias para compatibilidad con el generador legacy
          extraFieldsMap[field.label.toLowerCase()] = val;
        }
      }

      const pdfBlob = await generateCertificatePDF({
        template,
        recipientName,
        courseName,
        issueDate,
        certId,
        baseUrl,
        extraFields: extraFieldsMap,
      });

      setStatus("Subiendo PDF...");
      const pdfRef = ref(storage, `certificates/${certId}.pdf`);
      await uploadBytes(pdfRef, pdfBlob);
      const pdfUrl = await getDownloadURL(pdfRef);

      setStatus("Guardando registro...");
      await setDoc(doc(db, "certificates", certId), {
        id: certId,
        templateId: selectedTemplateId,
        recipientName,
        courseName,
        issueDate: new Date(issueDate).getTime(),
        dni,
        finalGrade,
        hours,
        startDate: startDate ? new Date(startDate).getTime() : null,
        endDate: endDate ? new Date(endDate).getTime() : null,
        ...(recipientEmail ? { email: recipientEmail } : {}),
        pdfUrl,
        status: "active",
        createdAt: Date.now(),
      });

      // Send email if provided
      if (recipientEmail) {
        setStatus("Enviando email...");
        try {
          const emailRes = await fetch("/api/send-certificate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipientEmail,
              recipientName,
              courseName,
              pdfUrl,
              certId,
            }),
          });
          if (!emailRes.ok) {
            const err = await emailRes.json();
            console.warn("Email no enviado:", err.error);
          }
        } catch (e) {
          console.warn("Error al enviar email:", e);
        }
      }

      router.push("/admin/dashboard/certificados");
      router.refresh();
    } catch (error) {
      console.error("Error issuing certificate:", error);
      alert("Hubo un error al emitir el certificado. Revisa la consola para más detalles.");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/dashboard/certificados" className="p-2 hover:bg-white rounded-xl text-slate-500 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Emitir Certificado</h1>
          <p className="text-slate-500 text-xs mt-0.5">Crea un nuevo documento oficial de verificación.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Plantilla <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">Seleccione una plantilla...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* ── Unified Template Fields (deduplicados por dataKey) ────────────── */}
        {selectedTemplate && deduplicateFieldsByDataKey(selectedTemplate.fields)
          .map((field) => {
            const dataKey = field.dataKey || resolveDataKey(field.label, field.id);
            const labelLower = field.label.toLowerCase();
            
            // 1. Recipient Name
            if (dataKey === "alumno_nombre" || (!field.dataKey && (labelLower.includes("alumno") || labelLower.includes("nombre")) && !labelLower.includes("curso") && !labelLower.includes("intro"))) {
              return (
                <div key={dataKey}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre del Alumno <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ej. Juan Diego Pérez López"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              );
            }

            // 2. Course Name
            if (dataKey === "curso_nombre" || (!field.dataKey && labelLower.includes("curso"))) {
              return (
                <div key={dataKey}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre del Curso <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Ej. Taller de Liderazgo Empresarial"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              );
            }

            // 3. Issue Date
            if (dataKey === "fecha_emision" || (!field.dataKey && labelLower.includes("fecha"))) {
              return (
                <div key={dataKey}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Fecha de Emisión <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              );
            }

            // 4. Custom/Extra Fields (usando dataKey como clave del estado)
            return (
              <div key={dataKey}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}
                  <span className="text-[10px] font-mono text-slate-400 ml-2">({dataKey})</span>
                </label>
                <textarea
                  rows={field.widthRatio ? 2 : 1}
                  value={extraValues[dataKey] ?? ""}
                  onChange={(e) => setExtraValues((prev) => ({ ...prev, [dataKey]: e.target.value }))}
                  placeholder={`Ingresa el contenido para "${field.label}"...`}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            );
          })}

        {/* ── Bureaucratic Validation Data ─────────────────────────────────────── */}
        {selectedTemplateId && (
          <div className="border-t border-slate-100 pt-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-800">Datos de Validación Oficial</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Documento de Identidad (DNI/CE)</label>
                <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej. 76543210" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Calificación Final</label>
                <input type="text" value={finalGrade} onChange={(e) => setFinalGrade(e.target.value)} placeholder="Ej. 18/20 o Sobresaliente" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Horas Lectivas / Créditos</label>
                <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ej. 120 Horas" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Fecha Inicio</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Fecha Fin</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Data (Always at the end) ───────────────────────────── */}
        {selectedTemplateId && (
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Email del receptor
              <span className="text-xs text-slate-400 font-normal">(opcional – se enviará el certificado)</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="alumno@email.com"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}

        {/* Submit */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={handleIssue}
            disabled={loading || !selectedTemplateId || !recipientName || !courseName}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="w-4 h-4" />
            {loading ? (status ?? "Procesando...") : "Emitir Certificado Oficial"}
          </button>
          {!recipientEmail && (
            <p className="text-xs text-center text-slate-400 mt-3">
              Añade un email para entregar el certificado automáticamente al alumno.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
