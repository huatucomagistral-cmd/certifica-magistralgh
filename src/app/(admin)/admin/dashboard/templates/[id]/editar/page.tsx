"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Template, TemplateField, TextAlign } from "@/lib/types";
import {
  ArrowLeft, Save, Trash2, FileText,
  MousePointer, QrCode, Check, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Plus as PlusIcon, ChevronUp, ChevronDown,
  Loader2, Upload, Link2,
} from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELD_COLORS = ["#4338ca", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2"];

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

/** Devuelve una clave semántica estable según el label del campo. */
function resolveDataKey(label: string, id: string): string {
  const words = label.trim().split(/\s+/);
  // Si el label tiene más de 4 palabras, es texto estático (no dato dinámico)
  if (words.length > 4) return `custom_${id}`;
  const l = label.toLowerCase();
  if (l.includes("alumno") || (l.includes("nombre") && !l.includes("curso"))) return "alumno_nombre";
  if (l.includes("curso")) return "curso_nombre";
  if (l.includes("fecha")) return "fecha_emision";
  if (l.includes("dni") || l.includes("documento")) return "alumno_dni";
  if (l.includes("nota") || l.includes("calificacion") || l.includes("calificación")) return "calificacion";
  if (l.includes("hora") || l.includes("credito") || l.includes("crédito")) return "horas";
  return `custom_${id}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadingBg, setLoadingBg]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [replacingBg, setReplacingBg]         = useState(false);
  const [showExitModal, setShowExitModal]     = useState(false);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Template data
  const [name, setName]             = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [isPdfBg, setIsPdfBg]       = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [previewScale, setPreviewScale] = useState(1);
  const [pdfNaturalWidth, setPdfNaturalWidth] = useState<number | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  // Active element
  const [activeId, setActiveId] = useState<string | "qr" | null>(null);
  const dragOffsetRef = useRef<{x: number, y: number} | null>(null);
  
  // Drag properties
  const [isDragging, setIsDragging] = useState(false);
  // Refs a cada contenedor de página para calcular posición global en el drag
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIdRef = useRef<string | "qr" | null>(null);
  const isDraggingRef = useRef(false);

  // Fields
  const [fields, setFields] = useState<EditableField[]>([]);

  // QR
  const [qrXRatio,    setQrXRatio]    = useState<number>(0.88);
  const [qrYRatio,    setQrYRatio]    = useState<number>(0.92);
  const [qrSizeRatio, setQrSizeRatio] = useState<number>(0.12);
  const [qrPage,      setQrPage]      = useState<number>(1);

  // Enlace de verificación
  const [vuXRatio,   setVuXRatio]   = useState<number | undefined>(undefined);
  const [vuYRatio,   setVuYRatio]   = useState<number | undefined>(undefined);
  const [vuPage,     setVuPage]     = useState<number>(1);
  const [vuFontSize, setVuFontSize] = useState<number>(7);
  const [vuColor,    setVuColor]    = useState<string>("#555555");

  // ── Load Google Fonts ──────────────────────────────────────────────────────
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel:wght@400;700&family=Great+Vibes&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Raleway:ital,wght@0,400;0,700;1,400;1,700&family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Dancing+Script:wght@400;700&family=Pinyon+Script&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400;1,700&family=Oswald:wght@400;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Sync refs with state
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // ── Global drag handler (evita cancelaciones al cruzar páginas) ────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !activeIdRef.current) return;

      for (let i = 0; i < pageRefs.current.length; i++) {
        const pageEl = pageRefs.current[i];
        if (!pageEl) continue;
        const rect = pageEl.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top  && e.clientY <= rect.bottom) {
          const pageNum = i + 1;
          let xRatio = (e.clientX - rect.left) / rect.width;
          let yRatio = (e.clientY - rect.top)  / rect.height;

          if (dragOffsetRef.current) {
            xRatio -= dragOffsetRef.current.x;
            yRatio -= dragOffsetRef.current.y;
          }

          if (activeIdRef.current === "qr") {
            setQrXRatio(xRatio);
            setQrYRatio(yRatio);
            setQrPage(pageNum);
          } else if (activeIdRef.current === "verifyUrl") {
            setVuXRatio(xRatio);
            setVuYRatio(yRatio);
            setVuPage(pageNum);
          } else {
            setFields((prev) => prev.map((f) => f.id === activeIdRef.current ? { ...f, xRatio, yRatio, page: pageNum } : f));
          }
          break;
        }
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      dragOffsetRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Normalizar campos: asignar dataKey si no existe (plantillas antiguas)
        const normalizedFields = (data.fields ?? []).map((f) => ({
          ...f,
          dataKey: f.dataKey ?? resolveDataKey(f.label, f.id),
        }));
        setFields(normalizedFields);
        setQrXRatio(data.qrXRatio ?? 0.88);
        setQrYRatio(data.qrYRatio ?? 0.92);
        setQrSizeRatio(data.qrSizeRatio ?? 0.12);
        setQrPage(data.qrPage ?? 1);
        // Enlace de verificación
        if (data.verifyUrlXRatio !== undefined) {
          setVuXRatio(data.verifyUrlXRatio);
          setVuYRatio(data.verifyUrlYRatio);
          setVuPage(data.verifyUrlPage ?? 1);
          setVuFontSize(data.verifyUrlFontSize ?? 7);
          setVuColor(data.verifyUrlColor ?? "#555555");
        }

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
        const numPages = pdf.numPages;
        const previews: string[] = [];
        for (let i = 1; i <= Math.min(2, numPages); i++) {
          const pdfPage = await pdf.getPage(i);
          if (i === 1) {
            const viewport1x = pdfPage.getViewport({ scale: 1 });
            setPdfNaturalWidth(viewport1x.width);
          }
          const renderScale = 2;
          const viewport    = pdfPage.getViewport({ scale: renderScale });
          const canvas      = document.createElement("canvas");
          canvas.width  = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await pdfPage.render({ canvasContext: ctx, canvas, viewport }).promise;
          previews.push(canvas.toDataURL("image/png"));
        }
        setImagePreviews(previews);
      } else {
        setPdfNaturalWidth(null);
        setImagePreviews([url]);
      }
    } catch (e) {
      console.error("Error rendering background:", e);
      if (!isPdf) setImagePreviews([url]);
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

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!activeId) return;

    const rect   = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top)  / rect.height;

    if (activeId === "qr") {
      setQrXRatio(xRatio);
      setQrYRatio(yRatio);
      setQrPage(pageNum);
      // Mantener seleccionado para permitir edición
    } else if (activeId === "verifyUrl") {
      setVuXRatio(xRatio);
      setVuYRatio(yRatio);
      setVuPage(pageNum);
    } else {
      setFields((prev) => prev.map((f) => f.id === activeId ? { ...f, xRatio, yRatio, page: pageNum } : f));
      const idx = fields.findIndex((f) => f.id === activeId);
      const next = fields.find((f, i) => i > idx && f.xRatio === undefined);
      setActiveId(next?.id ?? null);
    }
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const addField = () => {
    const newId = uuidv4();
    const label = "Nuevo Campo";
    setFields((p) => [
      ...p,
      // Sin coordenadas iniciales: el usuario hace clic en el certificado para posicionarlo
      { id: newId, label, dataKey: resolveDataKey(label, newId), fontSize: 18, color: "#000000", fontFamily: "Helvetica", bold: false, italic: false, align: "left", page: 1 },
    ]);
    setActiveId(newId);
  };

  const removeField = (fid: string) => {
    setFields((p) => p.filter((f) => f.id !== fid));
    if (activeId === fid) setActiveId(null);
  };

  const updateField = (fid: string, key: keyof EditableField, value: unknown) => {
    setFields((p) => p.map((f) => {
      if (f.id !== fid) return f;
      const updated = { ...f, [key]: value };
      // Si cambia el label, recalcular el dataKey automáticamente
      if (key === "label" && typeof value === "string") {
        updated.dataKey = resolveDataKey(value, fid);
      }
      return updated;
    }));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(newIndex, 0, moved);
    setFields(newFields);
  };

  // ── Replace background ───────────────────────────────────────────────────
  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!file.type.startsWith("image/") && !isPdf) {
      alert("Solo se permiten PNG, JPG o PDF.");
      return;
    }
    setReplacingBg(true);
    try {
      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `templates/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const newUrl = await getDownloadURL(storageRef);

      // Update Firestore immediately
      await updateDoc(doc(db, "templates", id), { bgImageUrl: newUrl, updatedAt: Date.now() });

      setBgImageUrl(newUrl);
      setIsPdfBg(isPdf);
      await renderBackground(newUrl, isPdf);
    } catch (err) {
      console.error(err);
      alert("Error al subir el nuevo fondo.");
    } finally {
      setReplacingBg(false);
    }
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
        qrPage,
        // Enlace de verificación
        ...(vuXRatio !== undefined && vuYRatio !== undefined ? {
          verifyUrlXRatio:   vuXRatio,
          verifyUrlYRatio:   vuYRatio,
          verifyUrlPage:     vuPage,
          verifyUrlFontSize: vuFontSize,
          verifyUrlColor:    vuColor,
          verifyUrlVisible:  true,
        } : { verifyUrlVisible: false }),
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Cargando plantilla…</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-red-600 font-semibold">{errorMsg}</p>
        <Link href="/admin/dashboard/templates" className="text-sm text-primary underline">← Volver a plantillas</Link>
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
            <button onClick={() => setShowExitModal(true)} className="p-2 hover:bg-white rounded-xl text-slate-500 border border-transparent hover:border-slate-100 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Editar Plantilla</h1>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider text-emerald-600">Modo Edición</p>
            </div>
          </div>

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
            
            {/* Page Toggle removed for stacked view */}
            
            <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-lg py-1 border border-slate-100 ml-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[120px]" title={bgImageUrl}>
                {isPdfBg ? `PDF (${imagePreviews.length} pág)` : "Imagen"}
              </span>
              {/* Reemplazar fondo */}
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                disabled={replacingBg}
                className="ml-1 flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50 shrink-0"
                title="Reemplazar fondo"
              >
                {replacingBg ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                {replacingBg ? "Subiendo..." : "Cambiar"}
              </button>
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/png,image/jpeg,application/pdf,.pdf"
                className="hidden"
                onChange={handleBgFileChange}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-indigo-800 transition-all disabled:opacity-50 shadow-md hover:shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {/* Row 2: Field Selector */}
        <div className="bg-white rounded-xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-sm min-h-[52px]">
          <button
            onClick={addField}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 text-primary hover:bg-indigo-50 transition-colors border border-dashed border-indigo-200 shrink-0"
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
                    ? "bg-primary border-primary text-white shadow-md ring-2 ring-indigo-200" 
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-primary"}`} style={{ backgroundColor: isActive ? 'white' : FIELD_COLORS[idx % FIELD_COLORS.length] }} />
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
                ? "bg-primary border-primary text-white shadow-md ring-2 ring-indigo-200" 
                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">QR Code</span>
          </button>

          {/* Botón enlace de verificación */}
          <button
            onClick={() => setActiveId(activeId === "verifyUrl" ? null : "verifyUrl")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0 ${
              activeId === "verifyUrl"
                ? "bg-primary border-primary text-white shadow-md ring-2 ring-indigo-200"
                : vuXRatio !== undefined
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm"
                  : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">URL Verificación</span>
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
                  className="w-20 accent-[#4338ca] h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
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
              <div className="ml-auto px-4 bg-indigo-50 py-1 rounded-full border border-indigo-100">
                 <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Editando QR</span>
              </div>
            </div>
          ) : activeId === "verifyUrl" ? (
            <div className="flex items-center gap-6 px-2 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tamaño fuente:</span>
                <NumericControl value={vuFontSize} onChange={setVuFontSize} min={5} max={14} suffix="pt" className="w-20" />
              </div>
              <div className="h-6 w-px bg-slate-100" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Color:</span>
                <input type="color" value={vuColor} onChange={(e) => setVuColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="h-6 w-px bg-slate-100" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Posición Manual</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">X:</span>
                  <NumericControl value={vuXRatio !== undefined ? +(vuXRatio * 100).toFixed(1) : 50} onChange={(v) => setVuXRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Y:</span>
                  <NumericControl value={vuYRatio !== undefined ? +(vuYRatio * 100).toFixed(1) : 95} onChange={(v) => setVuYRatio(v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                </div>
              </div>
              <div className="ml-auto px-4 bg-indigo-50 py-1 rounded-full border border-indigo-100">
                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Editando URL Verificación</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 px-2 whitespace-nowrap w-full">
              {(() => {
                const field = fields.find(f => f.id === activeId);
                if (!field) return null;
                return (
                  <>
                    {/* Group: Label + DataKey */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Etiqueta:</span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, "label", e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 w-32 outline-[#4338ca]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase">Clave:</span>
                      <input
                        type="text"
                        value={field.dataKey ?? resolveDataKey(field.label, field.id)}
                        onChange={(e) => updateField(field.id, "dataKey", e.target.value.trim().toLowerCase().replace(/\s+/g, "_"))}
                        className="bg-transparent border-none outline-none text-[10px] font-mono font-bold text-indigo-700 w-28"
                        title="Campos con la misma clave comparten valor en el formulario de emisión"
                      />
                    </div>

                    <div className="h-6 w-px bg-slate-100" />

                    {/* Group: Font */}
                    <div className="flex items-center gap-3">
                      <select
                        value={field.fontFamily}
                        onChange={(e) => updateField(field.id, "fontFamily", e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold w-32 outline-[#4338ca]"
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
                          <NumericControl value={+((field.xRatio ?? 0) * 100).toFixed(1)} onChange={(v) => updateField(field.id, "xRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">Y:</span>
                          <NumericControl value={+((field.yRatio ?? 0) * 100).toFixed(1)} onChange={(v) => updateField(field.id, "yRatio", v / 100)} step={0.5} min={0} max={100} suffix="%" className="w-24" />
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
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando Vista Previa...</p>
            </div>
          ) : imagePreviews.length > 0 ? (
            <div className="flex flex-col items-center w-full bg-slate-200/50 py-8 gap-y-12">
              {imagePreviews.map((previewUrl, i) => {
                const pageNum = i + 1;
                return (
                  <div
                      key={pageNum}
                      className="relative group w-full bg-white border border-slate-200 shadow-2xl"
                    >
                     <div
                       ref={(el) => { pageRefs.current[i] = el; }}
                       className={`relative select-none ${isDragging ? "cursor-grabbing" : activeId ? "cursor-crosshair" : "cursor-default"}`}
                       onClick={(e) => {
                         if (!isDragging) handleImageClick(e, pageNum);
                       }}
                     >
                       <img
                         ref={pageNum === 1 ? imageRef : undefined}
                         src={previewUrl}
                         alt={`Vista previa Página ${pageNum}`}
                         className="w-full h-auto block"
                         draggable={false}
                         onLoad={pageNum === 1 ? handleImageLoad : undefined}
                       />

                       {/* Placement tooltip eliminado según requerimiento */}

                       {/* Field overlays - solo mostrar campos con coordenadas */}
                       {fields.filter(f => f.xRatio !== undefined && (f.page ?? 1) === pageNum).map((field) => (

                        <div
                          key={field.id}
                          className={`absolute pointer-events-auto rounded-sm ${
                            activeId === field.id 
                              ? "ring-2 ring-indigo-500 bg-indigo-500/10 shadow-xl z-20 outline-dashed outline-2 outline-indigo-400 -outline-offset-2" 
                              : "hover:ring-1 hover:ring-slate-300 z-10"
                          } cursor-grab active:cursor-grabbing transition-shadow`}
                          onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveId(field.id);
                              setIsDragging(true);
                              const containerRect = e.currentTarget.parentElement!.getBoundingClientRect();
                              const pointerX = (e.clientX - containerRect.left) / containerRect.width;
                              const pointerY = (e.clientY - containerRect.top) / containerRect.height;
                              dragOffsetRef.current = { x: pointerX - field.xRatio!, y: pointerY - field.yRatio! };
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            left: `${(field.xRatio ?? 0) * 100}%`,
                            top: `${(field.yRatio ?? 0) * 100}%`,
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
                       ))}{/* end fields map */}

              {/* QR overlay */}
                      {(qrPage === pageNum || (!qrPage && pageNum === 1)) && (
                        <div
                          className={`absolute pointer-events-auto border-2 ${activeId === "qr" ? 'border-indigo-500 bg-indigo-500/10 shadow-2xl' : 'border-slate-500/50 bg-white/80'} cursor-grab active:cursor-grabbing flex items-center justify-center rounded transition-shadow`}
                          onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveId("qr");
                              setIsDragging(true);
                              const containerRect = e.currentTarget.parentElement!.getBoundingClientRect();
                              const pointerX = (e.clientX - containerRect.left) / containerRect.width;
                              const pointerY = (e.clientY - containerRect.top) / containerRect.height;
                              dragOffsetRef.current = { x: pointerX - qrXRatio!, y: pointerY - qrYRatio! };
                          }}
                          onClick={(e) => e.stopPropagation()}
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

                      {/* Enlace de verificación overlay */}
                      {vuXRatio !== undefined && vuYRatio !== undefined && vuPage === pageNum && (
                        <div
                          className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded border ${
                            activeId === "verifyUrl"
                              ? "border-indigo-400 bg-indigo-50/90 shadow-md"
                              : "border-dashed border-slate-400/60 bg-white/70"
                          } flex items-center gap-1 whitespace-nowrap transition-shadow`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setActiveId("verifyUrl");
                            setIsDragging(true);
                            const containerRect = e.currentTarget.parentElement!.getBoundingClientRect();
                            const pointerX = (e.clientX - containerRect.left) / containerRect.width;
                            const pointerY = (e.clientY - containerRect.top) / containerRect.height;
                            dragOffsetRef.current = { x: pointerX - vuXRatio!, y: pointerY - vuYRatio! };
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            left: `${vuXRatio * 100}%`,
                            top: `${vuYRatio * 100}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <Link2 className="w-2.5 h-2.5 text-slate-400" />
                          <span style={{ fontSize: `${vuFontSize * previewScale}px`, color: vuColor, fontFamily: "Helvetica, Arial, sans-serif" }}>
                            certifica.magistral.pe/verificar/CERT-XXXXXX
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm pointer-events-none">
                      Cara {pageNum} · {fields.filter(f => (f.page ?? 1) === pageNum).length} campos · QR {(qrPage === pageNum || (!qrPage && pageNum === 1)) ? '✓' : '×'} · URL {vuXRatio !== undefined && vuPage === pageNum ? '✓' : '×'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8 bg-slate-50/50">
              <FileText className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-slate-400 text-sm">No se pudo cargar la vista previa</p>
            </div>
          )}
        </div>
      </div>

      {/* ── EXIT MODAL ────────────────────────────────────────────────────── */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">¿Salir sin guardar?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Tienes cambios en tu plantilla. Si sales ahora, se perderán. ¿Deseas guardarlos?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowExitModal(false);
                  handleSave();
                }}
                className="w-full py-2.5 bg-primary text-[13px] text-white font-bold rounded-xl hover:bg-indigo-800 transition-colors shadow-sm"
              >
                Guardar y Salir
              </button>
              <button
                onClick={() => router.push("/admin/dashboard/templates")}
                className="w-full py-2.5 bg-slate-100 text-[13px] text-slate-700 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 bg-transparent text-[13px] text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
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
        className="px-1.5 h-full text-slate-400 hover:bg-slate-50 hover:text-primary transition-colors border-r border-slate-100"
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
        className="px-1.5 h-full text-slate-400 hover:bg-slate-50 hover:text-primary transition-colors border-l border-slate-100"
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
      className={`p-1.5 rounded-lg transition-colors ${active ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
    >
      {children}
    </button>
  );
}
