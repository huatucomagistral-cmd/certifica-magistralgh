"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Template, TemplateField, TextAlign } from "@/lib/types";
import {
  ArrowLeft, Save, Trash2, FileText,
  MousePointer, QrCode, Check, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Plus as PlusIcon, ChevronUp, ChevronDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_COLORS = ["#02367B", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2"];

const FONT_OPTIONS = [
  { value: "Helvetica",      label: "Helvetica",         css: "Helvetica, Arial, sans-serif" },
  { value: "TimesRoman",     label: "Times Roman",        css: '"Times New Roman", Times, serif' },
  { value: "Courier",        label: "Courier",            css: '"Courier New", Courier, monospace' },
  { value: "PlayfairDisplay",label: "Playfair Display",   css: '"Playfair Display", serif' },
  { value: "Cinzel",         label: "Cinzel",             css: '"Cinzel", serif' },
  { value: "GreatVibes",     label: "Great Vibes",        css: '"Great Vibes", cursive' },
  { value: "EBGaramond",     label: "EB Garamond",        css: '"EB Garamond", serif' },
  { value: "Lora",           label: "Lora",               css: '"Lora", serif' },
  { value: "LibreBaskerville",label: "Libre Baskerville", css: '"Libre Baskerville", serif' },
  { value: "Montserrat",     label: "Montserrat",         css: '"Montserrat", sans-serif' },
  { value: "Raleway",        label: "Raleway",            css: '"Raleway", sans-serif' },
  { value: "OpenSans",       label: "Open Sans",          css: '"Open Sans", sans-serif' },
  { value: "DancingScript",  label: "Dancing Script",     css: '"Dancing Script", cursive' },
  { value: "PinyonScript",   label: "Pinyon Script",      css: '"Pinyon Script", cursive' },
  { value: "OldStandardTT",  label: "Old Standard TT",    css: '"Old Standard TT", serif' },
  { value: "Oswald",         label: "Oswald",             css: '"Oswald", sans-serif' },
];

type EditableField = TemplateField;

function getCssFamily(fontFamily: string): string {
  return FONT_OPTIONS.find((f) => f.value === fontFamily)?.css ?? "Helvetica, Arial, sans-serif";
}

function getAlignTransform(align: TextAlign): string {
  if (align === "center") return "translate(-50%, -50%)";
  if (align === "right")  return "translate(-100%, -50%)";
  return "translateY(-50%)";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadingBg, setLoadingBg]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);

  // Template data
  const [name, setName]             = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [isPdfBg, setIsPdfBg]       = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [pdfNaturalWidth, setPdfNaturalWidth] = useState<number | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  // Active element
  const [activeId, setActiveId] = useState<string | "qr" | null>(null);
  
  // Drag properties
  const [isDragging, setIsDragging] = useState(false);

  // Fields
  const [fields, setFields] = useState<EditableField[]>([]);

  // QR
  const [qrXRatio,    setQrXRatio]    = useState<number>(0.88);
  const [qrYRatio,    setQrYRatio]    = useState<number>(0.92);
  const [qrSizeRatio, setQrSizeRatio] = useState<number>(0.12);

  // ── Load Google Fonts ──────────────────────────────────────────────────────
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel:wght@400;700&family=Great+Vibes&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Raleway:ital,wght@0,400;0,700;1,400;1,700&family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Dancing+Script:wght@400;700&family=Pinyon+Script&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400;1,700&family=Oswald:wght@400;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // ── Fetch template from Firestore ──────────────────────────────────────────
  useEffect(() => {
    async function loadTemplate() {
      setLoadingTemplate(true);
      try {
        const snap = await getDoc(doc(db, "templates", id));
        if (!snap.exists()) { setErrorMsg("Plantilla no encontrada."); return; }
        const data = snap.data() as Template;
        setName(data.name);
        setBgImageUrl(data.bgImageUrl);
        setFields(data.fields);
        setQrXRatio(data.qrXRatio ?? 0.88);
        setQrYRatio(data.qrYRatio ?? 0.92);
        setQrSizeRatio(data.qrSizeRatio ?? 0.12);

        // Determine if PDF
        const pdf = data.bgImageUrl.toLowerCase().includes(".pdf");
        setIsPdfBg(pdf);

        // Render background preview
        await renderBackground(data.bgImageUrl, pdf);
      } catch (e) {
        console.error(e);
        setErrorMsg("Error al cargar la plantilla.");
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Render background (from URL) ───────────────────────────────────────────
  async function renderBackground(url: string, isPdf: boolean) {
    setLoadingBg(true);
    try {
      if (isPdf) {
        const resp = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!resp.ok) throw new Error("Failed to fetch PDF");
        const arrayBuffer = await resp.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf     = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pdfPage = await pdf.getPage(1);

        const viewport1x = pdfPage.getViewport({ scale: 1 });
        setPdfNaturalWidth(viewport1x.width);

        const renderScale = 2;
        const viewport    = pdfPage.getViewport({ scale: renderScale });
        const canvas      = document.createElement("canvas");
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await pdfPage.render({ canvasContext: ctx, canvas, viewport }).promise;
        setImagePreview(canvas.toDataURL("image/png"));
      } else {
        setPdfNaturalWidth(null);
        setImagePreview(url);
      }
    } catch (e) {
      console.error("Error rendering background:", e);
      if (!isPdf) setImagePreview(url);
    } finally {
      setLoadingBg(false);
    }
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      const displayW = imageRef.current.offsetWidth;
      const naturalW = isPdfBg && pdfNaturalWidth ? pdfNaturalWidth : imageRef.current.naturalWidth;
      setPreviewScale(displayW / naturalW);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeId) return;
    const rect   = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top)  / rect.height;

    if (activeId === "qr") {
      setQrXRatio(xRatio);
      setQrYRatio(yRatio);
      setActiveId(null);
    } else {
      setFields((prev) => prev.map((f) => f.id === activeId ? { ...f, xRatio, yRatio } : f));
      setActiveId(null);
    }
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const addField = () => {
    const newId = uuidv4();
    setFields((p) => [
      ...p,
      { id: newId, label: "Nuevo Campo", fontSize: 18, color: "#000000", fontFamily: "Helvetica", bold: false, italic: false, align: "left", xRatio: 0.5, yRatio: 0.5 },
    ]);
    setActiveId(newId);
  };

  const removeField = (fid: string) => {
    setFields((p) => p.filter((f) => f.id !== fid));
    if (activeId === fid) setActiveId(null);
  };

  const updateField = (fid: string, key: keyof EditableField, value: unknown) => {
    setFields((p) => p.map((f) => f.id === fid ? { ...f, [key]: value } : f));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(newIndex, 0, moved);
    setFields(newFields);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { alert("El nombre no puede estar vacío."); return; }
    if (fields.length === 0) { alert("Necesitas al menos un campo de texto."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "templates", id), {
        name:        name.trim(),
        fields,
        qrXRatio,
        qrYRatio,
        qrSizeRatio,
        updatedAt:   Date.now(),
      });
      router.push("/admin/dashboard/templates");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeLabel = activeId === "qr" ? "QR" : fields.find((f) => f.id === activeId)?.label ?? "";

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#02367B] animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Cargando plantilla…</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-red-600 font-semibold">{errorMsg}</p>
        <Link href="/admin/dashboard/templates" className="text-sm text-[#02367B] underline">← Volver a plantillas</Link>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* ── STICKY TOOLBAR AREA ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm -mx-4 px-4 sm:-mx-8 sm:px-8 py-4 space-y-4">
        {/* Row 1: Header & Global Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard/templates" className="p-2 hover:bg-white rounded-xl text-slate-500 border border-transparent hover:border-slate-100 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Editar Plantilla</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider text-emerald-600">Modo Edición</p>
            </div>
          </div>

          {/* Basic Info Inline */}
          <div className="flex flex-1 max-w-2xl items-center gap-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm ml-0 md:ml-8">
            <div className="flex-1 flex items-center gap-2 px-2 border-r border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Nombre:</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la plantilla..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300"
              />
            </div>
            <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-lg py-1 border border-slate-100 max-w-[200px] overflow-hidden">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[10px] font-semibold text-slate-500 truncate" title={bgImageUrl}>
                {isPdfBg ? "Fondo PDF Vectorial" : "Fondo Imagen"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#02367B] rounded-xl hover:bg-[#012d68] transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {/* Row 2: Field Selector */}
        <div className="bg-white rounded-xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-sm min-h-[52px]">
          <button
            onClick={addField}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 text-[#02367B] hover:bg-blue-50 transition-colors border border-dashed border-blue-200 shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Nuevo Campo</span>
          </button>
          <div className="w-px h-6 bg-slate-100 mx-1 shrink-0" />
          
          {fields.map((field, idx) => {
            const isActive = activeId === field.id;
            return (
              <button
                key={field.id}
                onClick={() => setActiveId(isActive ? null : field.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0 max-w-[180px] group ${
                  isActive 
                    ? "bg-[#02367B] border-[#02367B] text-white shadow-md ring-2 ring-blue-200" 
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-[#02367B]"}`} style={{ backgroundColor: isActive ? 'white' : FIELD_COLORS[idx % FIELD_COLORS.length] }} />
                <span className="text-xs font-semibold truncate">{field.label}</span>
                <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col -space-y-1">
                    <ChevronUp className="w-2.5 h-2.5 hover:text-white" onClick={(e) => { e.stopPropagation(); moveField(idx, "up"); }} />
                    <ChevronDown className="w-2.5 h-2.5 hover:text-white" onClick={(e) => { e.stopPropagation(); moveField(idx, "down"); }} />
                  </div>
                  <Trash2 className="w-3 h-3 hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeField(field.id); }} />
                </div>
              </button>
            );
          })}
          
          <button
            onClick={() => setActiveId(activeId === "qr" ? null : "qr")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0 ${
              activeId === "qr" 
                ? "bg-[#02367B] border-[#02367B] text-white shadow-md ring-2 ring-blue-200" 
                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">QR Code</span>
          </button>
        </div>

        {/* Row 3: Inspector (Always Visible) */}
        <div className={`bg-white rounded-xl border border-slate-200 p-1.5 flex items-center gap-4 shadow-sm transition-all overflow-x-auto no-scrollbar min-h-[52px] ${!activeId ? "bg-slate-50/50" : ""}`}>
          {!activeId ? (
            <div className="flex items-center justify-center w-full py-1 gap-2 text-slate-400">
              <MousePointer className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-medium italic">Selecciona un campo arriba o en el certificado para editar sus propiedades</span>
            </div>
          ) : activeId === "qr" ? (
            <div className="flex items-center gap-6 px-2 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">QR Tamaño:</span>
                <NumericControl
                  value={Math.round(qrSizeRatio * 100)}
                  onChange={(v) => setQrSizeRatio(v / 100)}
                  min={5} max={30} suffix="%" className="w-24"
                />
                <input type="range" min="5" max="30" value={Math.round(qrSizeRatio * 100)}
                  onChange={(e) => setQrSizeRatio(Number(e.target.value) / 100)}
                  className="w-20 accent-[#02367B] h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="h-6 w-px bg-slate-100" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Posición Manual</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">X:</span>
                  <NumericControl value={+(qrXRatio * 100).toFixed(1)} onChange={(v) => setQrXRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Y:</span>
                  <NumericControl value={+(qrYRatio * 100).toFixed(1)} onChange={(v) => setQrYRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                </div>
              </div>
              <div className="ml-auto px-4 bg-blue-50 py-1 rounded-full border border-blue-100">
                 <span className="text-[10px] font-bold text-[#02367B] uppercase tracking-tighter">Editando QR</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 px-2 whitespace-nowrap w-full">
              {(() => {
                const field = fields.find(f => f.id === activeId);
                if (!field) return null;
                return (
                  <>
                    {/* Group: Label */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Etiqueta:</span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, "label", e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 w-32 outline-[#02367B]"
                      />
                    </div>

                    <div className="h-6 w-px bg-slate-100" />

                    {/* Group: Font */}
                    <div className="flex items-center gap-3">
                      <select
                        value={field.fontFamily}
                        onChange={(e) => updateField(field.id, "fontFamily", e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold w-32 outline-[#02367B]"
                        style={{ fontFamily: getCssFamily(field.fontFamily) }}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.css }}>{f.label}</option>
                        ))}
                      </select>
                      <NumericControl value={field.fontSize} onChange={(v) => updateField(field.id, "fontSize", v)} min={6} max={200} suffix="px" className="w-24" />
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                         <input type="color" value={field.color} onChange={(e) => updateField(field.id, "color", e.target.value)} className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden shadow-inner" />
                         <input type="text" value={field.color} onChange={(e) => updateField(field.id, "color", e.target.value)} className="w-16 bg-transparent border-none outline-none text-[10px] uppercase font-bold text-slate-600" />
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100" />

                    {/* Group: Style & Align */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        <ToggleBtn active={field.bold} onClick={() => updateField(field.id, "bold", !field.bold)} title="Negrita">
                          <Bold className="w-3 h-3" />
                        </ToggleBtn>
                        <ToggleBtn active={field.italic} onClick={() => updateField(field.id, "italic", !field.italic)} title="Cursiva">
                          <Italic className="w-3 h-3" />
                        </ToggleBtn>
                        <ToggleBtn active={field.underline || false} onClick={() => updateField(field.id, "underline", !field.underline)} title="Subrayado">
                          <Underline className="w-3 h-3" />
                        </ToggleBtn>
                      </div>
                      <div className="flex gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                        {(["left", "center", "right", "justify"] as TextAlign[]).map((a) => (
                          <ToggleBtn key={a} active={field.align === a} onClick={() => updateField(field.id, "align", a)} title={a}>
                            {a === "left"   && <AlignLeft   className="w-3 h-3" />}
                            {a === "center" && <AlignCenter className="w-3 h-3" />}
                            {a === "right"  && <AlignRight  className="w-3 h-3" />}
                            {a === "justify" && <AlignJustify className="w-3 h-3" />}
                          </ToggleBtn>
                        ))}
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100" />

                    {/* Group: Width & Position */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ancho Máx</span>
                        <NumericControl
                          value={field.widthRatio !== undefined ? Math.round(field.widthRatio * 100) : 100}
                          onChange={(v) => updateField(field.id, "widthRatio", v / 100)}
                          min={10} max={100} suffix="%" className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pos Cort</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">X:</span>
                          <NumericControl value={+(field.xRatio * 100).toFixed(1)} onChange={(v) => updateField(field.id, "xRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Y:</span>
                          <NumericControl value={+(field.yRatio * 100).toFixed(1)} onChange={(v) => updateField(field.id, "yRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                        </div>
                      </div>
                    </div>
                    <div className="ml-auto px-4 bg-emerald-50 py-1 rounded-full border border-emerald-100">
                       <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">Editando Texto</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT: CANVAS (CENTERED) ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center py-10 bg-slate-100/30 overflow-y-auto">
        <div className="max-w-[95vw] lg:max-w-5xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mb-12">
          {loadingBg ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 bg-slate-50/50">
              <Loader2 className="w-10 h-10 text-[#02367B] animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando Vista Previa...</p>
            </div>
          ) : imagePreview ? (
            <div className="relative group">
              <div
                className={`relative select-none ${isDragging ? "cursor-grabbing" : activeId ? "cursor-crosshair" : "cursor-default"}`}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={(e) => {
                  if (isDragging && activeId) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xRatio = (e.clientX - rect.left) / rect.width;
                    const yRatio = (e.clientY - rect.top) / rect.height;
                    if (activeId === "qr") {
                      setQrXRatio(xRatio);
                      setQrYRatio(yRatio);
                    } else {
                      setFields((prev) => prev.map((f) => f.id === activeId ? { ...f, xRatio, yRatio } : f));
                    }
                  }
                }}
                onClick={(e) => {
                  if (!isDragging) handleImageClick(e);
                }}
              >
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full h-auto block"
                  draggable={false}
                  onLoad={handleImageLoad}
                />

                {/* Placement tooltip */}
                {activeId && !isDragging && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#02367B] text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-2xl animate-bounce pointer-events-none uppercase tracking-widest whitespace-nowrap border border-white/20">
                    🖊 Click para posicionar &ldquo;{activeLabel}&rdquo;
                  </div>
                )}

                {/* Field overlays */}
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={`absolute pointer-events-auto rounded-sm ${
                      activeId === field.id 
                        ? "ring-2 ring-blue-500 bg-blue-500/10 shadow-xl z-20 outline-dashed outline-2 outline-blue-400 -outline-offset-2" 
                        : "hover:ring-1 hover:ring-slate-300 z-10"
                    } cursor-grab active:cursor-grabbing transition-all`}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveId(field.id);
                        setIsDragging(true);
                    }}
                    style={{
                      left: `${field.xRatio * 100}%`,
                      top: `${field.yRatio * 100}%`,
                      transform: getAlignTransform(field.align),
                      width: field.widthRatio ? `${field.widthRatio * 100}%` : 'auto',
                      textAlign: field.align,
                    }}
                  >
                    <div
                      className={`${field.widthRatio ? "whitespace-normal break-words" : "whitespace-nowrap"}`}
                      style={{
                        color: field.color,
                        fontSize: `${field.fontSize * previewScale}px`,
                        fontFamily: getCssFamily(field.fontFamily),
                        fontWeight: field.bold ? "700" : "400",
                        fontStyle: field.italic ? "italic" : "normal",
                        textDecoration: field.underline ? "underline" : "none",
                        textAlign: field.align,
                        lineHeight: 1.2,
                      }}
                    >
                      {field.label}
                    </div>
                  </div>
                ))}

                {/* QR overlay */}
                <div
                  className={`absolute pointer-events-auto border-2 ${activeId === "qr" ? 'border-blue-500 bg-blue-500/10 shadow-2xl' : 'border-slate-500/50 bg-white/80'} cursor-grab active:cursor-grabbing flex items-center justify-center rounded transition-all`}
                  onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveId("qr");
                      setIsDragging(true);
                  }}
                  style={{
                    left: `${qrXRatio * 100}%`,
                    top: `${qrYRatio * 100}%`,
                    width: `${qrSizeRatio * 100}%`,
                    aspectRatio: "1",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <QrCode className="w-2/3 h-2/3 text-slate-500 opacity-60" />
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm pointer-events-none">
                {fields.length} campos · QR ✓
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8 bg-slate-50/50">
              <FileText className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm">No se pudo cargar la vista previa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumericControl({ 
  value, onChange, min, max, step = 1, suffix = "", className = "" 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  min: number; 
  max: number; 
  step?: number; 
  suffix?: string;
  className?: string;
}) {
  const handleAdd = () => {
    const newVal = Math.min(max, +(value + step).toFixed(1));
    onChange(newVal);
  };
  const handleSub = () => {
    const newVal = Math.max(min, +(value - step).toFixed(1));
    onChange(newVal);
  };

  return (
    <div className={`flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-7 shadow-sm ${className}`}>
      <button 
        onClick={handleSub}
        className="px-1.5 h-full text-slate-400 hover:bg-slate-50 hover:text-[#02367B] transition-colors border-r border-slate-100"
      >
        <Minus className="w-3 h-3" />
      </button>
      <div className="flex-1 flex items-center justify-center min-w-0 px-0.5">
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full text-center text-[11px] font-bold text-slate-700 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-[9px] text-slate-400 font-bold mr-0.5 uppercase">{suffix}</span>}
      </div>
      <button 
        onClick={handleAdd}
        className="px-1.5 h-full text-slate-400 hover:bg-slate-50 hover:text-[#02367B] transition-colors border-l border-slate-100"
      >
        <PlusIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

function ToggleBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${active ? "bg-[#02367B] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}
