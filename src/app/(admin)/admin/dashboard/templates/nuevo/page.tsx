"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { TemplateField, TextAlign } from "@/lib/types";
import {
  ArrowLeft, Save, Trash2, Image as ImageIcon,
  MousePointer, QrCode, Check, AlertCircle, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Plus as PlusIcon, ChevronUp, ChevronDown,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableField = Omit<TemplateField, "xRatio" | "yRatio"> & {
  xRatio?: number;
  yRatio?: number;
};



// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCssFamily(fontFamily: string): string {
  return FONT_OPTIONS.find((f) => f.value === fontFamily)?.css ?? "Helvetica, Arial, sans-serif";
}

function getAlignTransform(align: TextAlign): string {
  if (align === "center") return "translate(-50%, -50%)";
  if (align === "right") return "translate(-100%, -50%)";
  return "translateY(-50%)";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isPdfBg, setIsPdfBg] = useState(false);
  const [pdfNaturalWidth, setPdfNaturalWidth] = useState<number | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Active element being positioned (fieldId | logoId | 'qr' | null)
  const [activeId, setActiveId] = useState<string | "qr" | null>(null);
  
  // Drag properties
  const [isDragging, setIsDragging] = useState(false);

  // Text fields
  const [fields, setFields] = useState<EditableField[]>([
    { id: uuidv4(), label: "Nombre del Alumno", fontSize: 36, color: "#000000", fontFamily: "PlayfairDisplay", bold: true,  italic: false, align: "center" },
    { id: uuidv4(), label: "Nombre del Curso",  fontSize: 22, color: "#000000", fontFamily: "Helvetica",       bold: false, italic: true,  align: "center" },
    { id: uuidv4(), label: "Fecha de Emisión",  fontSize: 16, color: "#000000", fontFamily: "Helvetica",       bold: false, italic: false, align: "left"   },
  ]);

  // QR
  const [qrXRatio, setQrXRatio] = useState<number | undefined>(undefined);
  const [qrYRatio, setQrYRatio] = useState<number | undefined>(undefined);
  const [qrSizeRatio, setQrSizeRatio] = useState(0.12);

  // Load Google Fonts for preview
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel:wght@400;700&family=Great+Vibes&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Raleway:ital,wght@0,400;0,700;1,400;1,700&family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Dancing+Script:wght@400;700&family=Pinyon+Script&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400;1,700&family=Oswald:wght@400;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdfBg(isPdf);

    if (isPdf) {
      // Render first page of PDF to canvas for preview
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pdfPage = await pdf.getPage(1);

      // Store natural PDF page width (in points at 72 DPI) for preview font scaling
      const viewport1x = pdfPage.getViewport({ scale: 1 });
      setPdfNaturalWidth(viewport1x.width);

      // Render at 2× for a sharp preview
      const renderScale = 2;
      const viewport = pdfPage.getViewport({ scale: renderScale });
      const canvas = document.createElement("canvas");
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await pdfPage.render({ canvasContext: ctx, canvas, viewport }).promise;
      setImagePreview(canvas.toDataURL("image/png"));
    } else {
      setPdfNaturalWidth(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      const displayW = imageRef.current.offsetWidth;
      // For PDF: use actual PDF page width (points) — font sizes are in points
      // For PNG/JPG: use natural pixel width
      const naturalW = isPdfBg && pdfNaturalWidth ? pdfNaturalWidth : imageRef.current.naturalWidth;
      setPreviewScale(displayW / naturalW);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    if (activeId === "qr") {
      setQrXRatio(xRatio);
      setQrYRatio(yRatio);
      setActiveId(null);
    } else {
      setFields((prev) => prev.map((f) => f.id === activeId ? { ...f, xRatio, yRatio } : f));
      const idx = fields.findIndex((f) => f.id === activeId);
      const next = fields.find((f, i) => i > idx && f.xRatio === undefined);
      setActiveId(next?.id ?? null);
    }
  };

  // Fields
  const addField = () => {
    const newId = uuidv4();
    setFields((p) => [
      ...p,
      { id: newId, label: "Nuevo Campo", fontSize: 18, color: "#000000", fontFamily: "Helvetica", bold: false, italic: false, align: "left" },
    ]);
    setActiveId(newId);
  };
  const removeField = (id: string) => {
    setFields((p) => p.filter((f) => f.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const updateField = (id: string, key: keyof EditableField, value: unknown) => {
    setFields((p) => p.map((f) => f.id === id ? { ...f, [key]: value } : f));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(newIndex, 0, moved);
    setFields(newFields);
  };

  // Save
  const handleSave = async () => {
    if (!name.trim() || !imageFile) {
      alert("Por favor ingresa un nombre y selecciona una imagen de fondo.");
      return;
    }
    const positioned = fields.filter((f) => f.xRatio !== undefined);
    if (positioned.length === 0) {
      alert("Posiciona al menos un campo de texto en la imagen.");
      return;
    }
    const unpositioned = fields.filter((f) => f.xRatio === undefined);
    if (unpositioned.length > 0) {
      if (!confirm(`${unpositioned.length} campo(s) sin posición serán ignorados. ¿Continuar?`)) return;
    }

    setSaving(true);
    try {
      const bgRef = storageRef(storage, `templates/${Date.now()}_${imageFile.name}`);
      await uploadBytes(bgRef, imageFile);
      const bgImageUrl = await getDownloadURL(bgRef);

      await addDoc(collection(db, "templates"), {
        name: name.trim(),
        bgImageUrl,
        fields: positioned as TemplateField[],
        qrXRatio: qrXRatio ?? 0.88,
        qrYRatio: qrYRatio ?? 0.92,
        qrSizeRatio,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      router.push("/admin/dashboard/templates");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const positionedFields = fields.filter((f) => f.xRatio !== undefined).length;
  const activeLabel =
    activeId === "qr" ? "QR" : fields.find((f) => f.id === activeId)?.label ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
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
              <h1 className="text-xl font-bold text-slate-900">Nueva Plantilla</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Editor de Diseño</p>
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
            <label className="flex items-center gap-2 px-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors group">
              <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-[#02367B]" />
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 truncate max-w-[150px]">
                {imageFile ? imageFile.name : "Subir Fondo"}
              </span>
              <input type="file" className="hidden" accept="image/png,image/jpeg,application/pdf,.pdf" onChange={handleImageChange} />
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#02367B] rounded-xl hover:bg-[#012d68] transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar"}
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
            const isPositioned = field.xRatio !== undefined;
            return (
              <button
                key={field.id}
                onClick={() => setActiveId(isActive ? null : field.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0 max-w-[180px] group ${
                  isActive 
                    ? "bg-[#02367B] border-[#02367B] text-white shadow-md ring-2 ring-blue-200" 
                    : isPositioned 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300 shadow-sm" 
                      : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-white" : isPositioned ? "bg-emerald-500" : "bg-slate-300"}`} />
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
                : qrXRatio !== undefined 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm" 
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
                  <NumericControl value={qrXRatio !== undefined ? +(qrXRatio * 100).toFixed(1) : 88} onChange={(v) => setQrXRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Y:</span>
                  <NumericControl value={qrYRatio !== undefined ? +(qrYRatio * 100).toFixed(1) : 92} onChange={(v) => setQrYRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
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
                          <NumericControl value={field.xRatio !== undefined ? +(field.xRatio * 100).toFixed(1) : 0} onChange={(v) => updateField(field.id, "xRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Y:</span>
                          <NumericControl value={field.yRatio !== undefined ? +(field.yRatio * 100).toFixed(1) : 0} onChange={(v) => updateField(field.id, "yRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
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
          {imagePreview ? (
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
                {fields.filter((f) => f.xRatio !== undefined).map((field) => (
                  <div
                    key={field.id}
                    className={`absolute pointer-events-auto ${activeId === field.id ? "ring-2 ring-blue-500 bg-blue-500/5 shadow-2xl z-20" : "hover:ring-1 hover:ring-slate-400 z-10"} cursor-grab active:cursor-grabbing transition-all`}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveId(field.id);
                        setIsDragging(true);
                    }}
                    style={{
                      left: `${field.xRatio! * 100}%`,
                      top: `${field.yRatio! * 100}%`,
                      transform: getAlignTransform(field.align),
                      width: field.widthRatio ? `${field.widthRatio * 100}%` : 'auto',
                      textAlign: field.align,
                    }}
                  >
                    <div
                      className={`${field.widthRatio ? "whitespace-normal break-words" : "whitespace-nowrap leading-none"}`}
                      style={{
                        color: field.color,
                        fontSize: `${field.fontSize * previewScale}px`,
                        fontFamily: getCssFamily(field.fontFamily),
                        fontWeight: field.bold ? "700" : "400",
                        fontStyle: field.italic ? "italic" : "normal",
                        textDecoration: field.underline ? "underline" : "none",
                        textAlign: field.align,
                      }}
                    >
                      {field.label}
                    </div>
                  </div>
                ))}

                {/* QR overlay */}
                {qrXRatio !== undefined && qrYRatio !== undefined && (
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
                )}
              </div>
              
              {/* Contextual Status Info */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm pointer-events-none">
                {positionedFields} campos · QR {qrXRatio !== undefined ? "✓" : "×"}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8 bg-slate-50/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 mb-6 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                <ImageIcon className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Carga tu plantilla base</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-[320px]">
                Sube un PNG, JPG o PDF. Te recomendamos PDF de Canva para máxima nitidez en la emisión de certificados.
              </p>
              <label className="mt-8 px-8 py-3 bg-[#02367B] text-white rounded-xl font-bold cursor-pointer hover:bg-[#012d68] transition-all shadow-md hover:shadow-xl active:scale-95">
                Seleccionar Archivo
                <input type="file" className="hidden" accept="image/png,image/jpeg,application/pdf,.pdf" onChange={handleImageChange} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleBtn({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-[#02367B] text-white" : "text-slate-500 hover:bg-white hover:text-[#02367B]"}`}
    >
      {children}
    </button>
  );
}

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


