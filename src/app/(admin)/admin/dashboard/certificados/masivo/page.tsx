"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Template } from "@/lib/types";
import {
  ArrowLeft, Upload, Download, FileSpreadsheet,
  CheckCircle2, XCircle, Loader2, Play, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { generateCertificatePDF } from "@/lib/generateCertificatePDF";
import { generateOfficialCertId } from "@/lib/generateCertId";

// ─── dataKeys que son manejados directamente por generateCertificatePDF ──────
// Campos con estos dataKey se mapean a los params dedicados y NO van en extraFields
const CORE_DATA_KEYS = new Set([
  "alumno_nombre",
  "curso_nombre",
  "fecha_emision",
]);

/** Devuelve true si el campo va en los params core (no en extraFields) */
function isCoreField(field: { dataKey?: string; label: string }): boolean {
  if (field.dataKey) return CORE_DATA_KEYS.has(field.dataKey);
  // Fallback para plantillas antiguas sin dataKey
  const l = field.label.toLowerCase();
  return (
    l.includes("alumno") ||
    (l.includes("nombre") && !l.includes("curso")) ||
    l.includes("curso") ||
    l.includes("fecha")
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza un texto para comparaciones: minúsculas, sin tildes, sin espacios extras.
 */
function cleanMatch(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina tildes
    .trim()
    .replace(/[\s_]+/g, ""); // Elimina espacios y guiones bajos para máxima flexibilidad
}

function isAutoField(label: string): boolean {
  // Mantenido solo por compatibilidad, usar isCoreField cuando se tiene el field completo
  const cleaned = cleanMatch(label);
  return ["alumno", "nombre", "curso", "fecha"].some((k) => cleaned.includes(k));
}

/**
 * Intenta parsear una fecha en formatos DD/MM/YYYY, YYYY-MM-DD, etc.
 * Retorna YYYY-MM-DD o null si es inválida.
 */
function parseFlexibleDate(str: string): string | null {
  if (!str) return null;
  
  // Limpiar caracteres comunes
  const clean = str.trim().replace(/\//g, "-");
  
  // Caso 1: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(clean);
    return !isNaN(d.getTime()) ? clean : null;
  }
  
  // Caso 2: DD-MM-YYYY
  const parts = clean.split("-");
  if (parts.length === 3) {
    let day, month, year;
    if (parts[0].length === 4) { // YYYY-MM-DD
      [year, month, day] = parts;
    } else { // DD-MM-YYYY o similar
      [day, month, year] = parts;
    }
    
    // Asegurar que tengan el padding correcto
    const fYear = year.length === 2 ? `20${year}` : year;
    const fMonth = month.padStart(2, "0");
    const fDay = day.padStart(2, "0");
    
    const ISO = `${fYear}-${fMonth}-${fDay}`;
    const d = new Date(ISO);
    return !isNaN(d.getTime()) ? ISO : null;
  }

  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  nombre: string;
  curso: string;
  fecha: string;
  email?: string;
  dni?: string;
  finalGrade?: string;
  hours?: string;
  startDate?: string;
  endDate?: string;
}

type RowStatus = "pending" | "processing" | "done" | "error";

interface ResultRow extends CsvRow {
  _id: string;
  _status: RowStatus;
  _error?: string;
  _pdfUrl?: string;
  _certId?: string;
  _raw?: Record<string, any>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeaders(raw: Record<string, any>): CsvRow | null {
  const map: Record<string, any> = {};
  for (const k in raw) {
    map[cleanMatch(k)] = raw[k];
  }

  // Búsqueda flexible: acepta nombres dataKey estándar Y nombres legacy
  const findVal = (keywords: string[]) => {
    for (const k of keywords) {
      if (map[cleanMatch(k)] !== undefined && map[cleanMatch(k)] !== "") return map[cleanMatch(k)];
    }
    return "";
  };

  // Nombres dataKey estándar primero, luego nombres legacy para compatibilidad
  const nombre = findVal(["alumno_nombre", "nombre", "alumno", "nombre del alumno", "estudiante", "nombre completo"]);
  const curso  = findVal(["curso_nombre", "curso", "nombre del curso", "programa", "taller", "materia"]);
  const fechaRaw = findVal(["fecha_emision", "fecha", "fecha de emision", "emision", "date"]);
  const email  = findVal(["email", "correo", "e-mail", "contacto"]);
  const dni    = findVal(["alumno_dni", "dni", "documento", "ce", "identidad", "rut", "cedula"]);
  const finalGrade = findVal(["calificacion", "nota", "grade", "puntaje"]);
  const hours  = findVal(["horas", "creditos", "duracion", "lectivas"]);
  const startDateRaw = findVal(["fecha_inicio", "fecha inicio", "inicio", "desde"]);
  const endDateRaw   = findVal(["fecha_fin", "fecha fin", "fin", "hasta"]);

  if (!nombre || !curso || !fechaRaw) return null;

  return { 
    nombre: String(nombre), 
    curso: String(curso), 
    fecha: String(fechaRaw), 
    email: email ? String(email) : undefined,
    dni: dni ? String(dni) : undefined,
    finalGrade: finalGrade ? String(finalGrade) : undefined,
    hours: hours ? String(hours) : undefined,
    startDate: startDateRaw ? String(startDateRaw) : undefined,
    endDate: endDateRaw ? String(endDateRaw) : undefined,
  };
}

function isValidDate(str: string) {
  return !!parseFlexibleDate(str);
}

// Template CSV de ejemplo — las columnas coinciden con los dataKey estándar
const CSV_TEMPLATE = `alumno_nombre,curso_nombre,fecha_emision,email,alumno_dni,calificacion,horas,fecha_inicio,fecha_fin
Juan Pérez,Taller de Liderazgo,${new Date().toISOString().split("T")[0]},juan@email.com,76543210,18/20,120 Horas,2023-01-01,2023-01-31
María García,Curso de Excel,${new Date().toISOString().split("T")[0]},,,,,`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkIssuePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dynamic extra fields (static defaults for all rows)
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  useEffect(() => {
    getDocs(collection(db, "templates")).then((snap) =>
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[])
    );
  }, []);

  // Sync extra fields when template changes
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  useEffect(() => {
    if (!selectedTemplate) { setExtraValues({}); return; }
    const extras: Record<string, string> = {};
    for (const field of selectedTemplate.fields) {
      // Solo mostrar input manual para campos que no se cargan del CSV automáticamente
      if (!isCoreField(field)) {
        extras[field.id] = "";
      }
    }
    setExtraValues(extras);
  }, [selectedTemplateId, selectedTemplate]);

  // ── File parsing ─────────────────────────────────────────────────────────

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRawRows(result.data as any[]),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
        processRawRows(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Formato no soportado. Sube CSV o XLSX.");
    }
    e.target.value = "";
  };

  const processRawRows = (rawRows: Record<string, any>[]) => {
    const parsed: ResultRow[] = [];
    let ignoredCount = 0;

    for (const raw of rawRows) {
      const row = normalizeHeaders(raw);
      if (!row) {
        ignoredCount++;
        continue;
      }
      
      const normalizedDate = parseFlexibleDate(row.fecha);
      const isOk = !!normalizedDate;
      
      const result: ResultRow = {
        ...row,
        fecha: normalizedDate || row.fecha,
        _id: crypto.randomUUID(),
        _status: isOk ? "pending" : "error",
        _error: isOk ? undefined : "Fecha inválida (usa AAAA-MM-DD o DD/MM/AAAA)",
        _raw: raw,
      };
      parsed.push(result);
    }

    if (parsed.length === 0 && rawRows.length > 0) {
      alert("No se encontraron datos válidos. Asegúrate de que las columnas tengan los nombres correctos (nombre, curso, fecha).");
    } else if (ignoredCount > 0) {
      console.warn(`Se ignoraron ${ignoredCount} filas por falta de datos requeridos.`);
    }

    setRows(parsed);
    setDone(false);
  };

  const updateRow = (id: string, patch: Partial<ResultRow>) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  // ── Bulk generation ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) { alert("Selecciona una plantilla."); return; }

    const pending = rows.filter((r) => r._status === "pending");
    if (pending.length === 0) { alert("No hay filas válidas para procesar."); return; }

    setRunning(true);
    const baseUrl = window.location.origin;

    for (const row of pending) {
      updateRow(row._id, { _status: "processing" });
      try {
        const certId = await generateOfficialCertId();

        // 1. Construir mapa de datos extra (campos que NO son core)
        const extraFieldsMap: Record<string, string> = {};

        // Primero, construir mapa normalizado de todas las columnas del CSV
        const rawNormalized: Record<string, string> = {};
        if (row._raw) {
          for (const k in row._raw) {
            // Mapear por dataKey exacto y por cleanMatch para compatibilidad
            rawNormalized[cleanMatch(k)] = String(row._raw[k] ?? "");
          }
        }

        for (const field of template.fields) {
          if (isCoreField(field)) continue; // Los campos core van en params dedicados

          const dk = field.dataKey ?? `custom_${field.id}`;

          // Prioridad: 1) columna con nombre exacto = dataKey, 2) cleanMatch del dataKey,
          // 3) cleanMatch del label, 4) valor estático del extraValues UI
          let val = extraValues[field.id] ?? "";

          if (rawNormalized[dk]) {
            val = rawNormalized[dk];
          } else if (rawNormalized[cleanMatch(dk)]) {
            val = rawNormalized[cleanMatch(dk)];
          } else if (rawNormalized[cleanMatch(field.label)]) {
            val = rawNormalized[cleanMatch(field.label)];
          }

          // Guardar con la clave dataKey para que generateCertificatePDF la encuentre
          extraFieldsMap[dk] = val;
        }

        // 2. Generate PDF
        const pdfBlob = await generateCertificatePDF({
          template,
          recipientName: row.nombre,
          courseName: row.curso,
          issueDate: row.fecha,
          certId,
          baseUrl,
          extraFields: extraFieldsMap,
        });

        // 3. Upload PDF
        const pdfRef = ref(storage, `certificates/${certId}.pdf`);
        await uploadBytes(pdfRef, pdfBlob);
        const pdfUrl = await getDownloadURL(pdfRef);

        // 4. Save to Firestore
        await setDoc(doc(db, "certificates", certId), {
          id: certId,
          templateId: selectedTemplateId,
          recipientName: row.nombre,
          courseName: row.curso,
          issueDate: new Date(row.fecha).getTime(),
          ...(row.dni ? { dni: row.dni } : {}),
          ...(row.finalGrade ? { finalGrade: row.finalGrade } : {}),
          ...(row.hours ? { hours: row.hours } : {}),
          ...(row.startDate && parseFlexibleDate(row.startDate) ? { startDate: new Date(parseFlexibleDate(row.startDate)!).getTime() } : {}),
          ...(row.endDate && parseFlexibleDate(row.endDate) ? { endDate: new Date(parseFlexibleDate(row.endDate)!).getTime() } : {}),
          ...(row.email ? { email: row.email } : {}),
          pdfUrl,
          status: "active",
          createdAt: Date.now(),
        });

        // Send email if provided
        if (row.email) {
          try {
            await fetch("/api/send-certificate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: row.email,
                recipientName: row.nombre,
                courseName: row.curso,
                pdfUrl,
                certId,
              }),
            });
          } catch { /* email is best-effort */ }
        }

        updateRow(row._id, { _status: "done", _pdfUrl: pdfUrl, _certId: certId });
      } catch (err) {
        updateRow(row._id, {
          _status: "error",
          _error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    setRunning(false);
    setDone(true);
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalPending   = rows.filter((r) => r._status === "pending").length;
  const totalDone      = rows.filter((r) => r._status === "done").length;
  const totalError     = rows.filter((r) => r._status === "error").length;
  const totalProcessing = rows.filter((r) => r._status === "processing").length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard/certificados" className="p-2 hover:bg-white rounded-xl text-slate-500 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Emisión Masiva</h1>
            <p className="text-slate-500 text-xs mt-0.5">Sube un archivo CSV o Excel para generar certificados en lote.</p>
          </div>
        </div>
        {done && (
          <button
            onClick={() => { router.push("/admin/dashboard/certificados"); router.refresh(); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Ver todos los certificados
          </button>
        )}
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 1. Template selector */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">1. Selecciona la plantilla</label>
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white appearance-none pr-9"
              >
                <option value="">Elige una plantilla...</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Special static fields (Intro, Description, etc.) */}
          {selectedTemplate && selectedTemplate.fields.some(f => !isAutoField(f.label)) && (
            <div className="pt-4 border-t border-slate-50 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valores estáticos para todo el lote</p>
              {selectedTemplate.fields
                .filter(f => !isAutoField(f.label))
                .map(field => (
                  <div key={field.id}>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{field.label}</label>
                    <textarea
                      rows={1}
                      value={extraValues[field.id] || ""}
                      onChange={(e) => setExtraValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={`Ej: "Por haber participado..."`}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                    />
                  </div>
                ))
              }
              <p className="text-[10px] text-slate-400 italic">
                * Si el Excel tiene una columna con el mismo nombre, prevalecerá el dato del Excel.
              </p>
            </div>
          )}
        </div>

        {/* 2. File upload */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">2. Sube tu archivo</label>
            <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFile} />
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={!selectedTemplateId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                <Upload className="w-4 h-4" /> Subir CSV / Excel
              </button>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
                download="plantilla_certificados.csv"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Plantilla
              </a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-medium text-slate-600 mb-1">Columnas requeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">nombre</code>
              <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">curso</code>
              <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">fecha</code>
              {selectedTemplate && selectedTemplate.fields
                .filter(f => !isAutoField(f.label))
                .map(f => (
                  <code key={f.id} className="px-1.5 py-0.5 bg-indigo-50 text-primary rounded text-[10px]">
                    {f.label.toLowerCase()} (opcional)
                  </code>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Preview / Results table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{rows.length} registros cargados</span>
              {totalDone > 0    && <Badge color="green">{totalDone} OK</Badge>}
              {totalError > 0   && <Badge color="red">{totalError} con error</Badge>}
              {totalPending > 0 && !running && <Badge color="blue">{totalPending} pendientes</Badge>}
              {running          && <Badge color="yellow"><Loader2 className="w-3 h-3 animate-spin" /> Procesando...</Badge>}
            </div>
            {!running && totalPending > 0 && (
              <button
                onClick={handleGenerate}
                disabled={!selectedTemplateId}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
              >
                <Play className="w-4 h-4" />
                Generar {totalPending} certificado{totalPending !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Progress bar */}
          {running && (
            <div className="h-1.5 bg-slate-100">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((totalDone + totalError) / rows.length) * 100}%` }}
              />
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left w-8">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left">Alumno</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left">Curso</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left">Fecha</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, idx) => (
                  <tr key={row._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.nombre}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{row.curso}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.fecha}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">{row.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row._status === "pending"    && <StatusBadge color="slate">Pendiente</StatusBadge>}
                      {row._status === "processing" && <StatusBadge color="blue"><Loader2 className="w-3.5 h-3.5 animate-spin" />Procesando...</StatusBadge>}
                      {row._status === "done"       && (
                        <div className="flex items-center gap-2">
                          <StatusBadge color="green"><CheckCircle2 className="w-3.5 h-3.5" />Generado</StatusBadge>
                          {row._pdfUrl && (
                            <a href={row._pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                              PDF
                            </a>
                          )}
                        </div>
                      )}
                      {row._status === "error"      && (
                        <div className="flex items-center gap-1.5" title={row._error}>
                          <StatusBadge color="red"><XCircle className="w-3.5 h-3.5" />Error</StatusBadge>
                          {row._error && <span className="text-xs text-red-400 truncate max-w-[120px]">{row._error}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-5 mx-auto border border-slate-100">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <p className="font-semibold text-slate-700">Sube un archivo para comenzar</p>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            Descarga la plantilla CSV, rellénala con los datos de cada alumno y súbela aquí.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    red:    "bg-red-50 text-red-700 border-red-100",
    blue:   "bg-indigo-50 text-indigo-700 border-indigo-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    slate:  "bg-slate-50 text-slate-600 border-slate-100",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[color] ?? colors.slate}`}>
      {children}
    </span>
  );
}

function StatusBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return <Badge color={color}>{children}</Badge>;
}
