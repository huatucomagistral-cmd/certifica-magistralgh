"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  collection, getDocs, orderBy, query, deleteDoc, doc, updateDoc, addDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Template } from "@/lib/types";
import { Copy, Plus, Trash2, Eye, FileText, Pencil, Check, X as XIcon, Edit2, Loader2 } from "lucide-react";


function isBgPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

function TemplateThumbnail({ url, name }: { url: string; name: string }) {
  if (isBgPdf(url)) {
    return (
      <div className="w-12 h-8 rounded-md border border-slate-100 bg-slate-50 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className="w-12 h-8 object-cover rounded-md border border-slate-100 flex-shrink-0"
    />
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loading, setLoading]         = useState(true);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId]   = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingName, setSavingName]   = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Template[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => {
    if (renamingId) setTimeout(() => renameRef.current?.focus(), 50);
  }, [renamingId]);

  const startRename = (t: Template) => { setRenamingId(t.id); setRenameValue(t.name); };
  const cancelRename = () => { setRenamingId(null); setRenameValue(""); };

  const saveRename = async (id: string) => {
    const newName = renameValue.trim();
    if (!newName) return cancelRename();
    setSavingName(true);
    try {
      await updateDoc(doc(db, "templates", id), { name: newName });
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
      setRenamingId(null);
    } catch {
      alert("Error al renombrar la plantilla.");
    } finally {
      setSavingName(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`¿Eliminar "${template.name}"? Esta acción es irreversible.`)) return;
    setDeletingId(template.id);
    try {
      if (template.bgImageUrl) {
        try { await deleteObject(ref(storage, template.bgImageUrl)); } catch (_) {}
      }
      await deleteDoc(doc(db, "templates", template.id));
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch (e) {
      alert("Error al eliminar la plantilla.");
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (template: Template) => {
    setDuplicatingId(template.id);
    try {
      const newDoc = await addDoc(collection(db, "templates"), {
        name:        `Copia de ${template.name}`,
        bgImageUrl:  template.bgImageUrl,
        fields:      template.fields,
        qrXRatio:    template.qrXRatio    ?? 0.88,
        qrYRatio:    template.qrYRatio    ?? 0.92,
        qrSizeRatio: template.qrSizeRatio ?? 0.12,
        qrPage:      template.qrPage      ?? 1,
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      });
      // Agrega la copia al inicio de la lista sin necesidad de recargar
      const copy: Template = {
        id:          newDoc.id,
        name:        `Copia de ${template.name}`,
        bgImageUrl:  template.bgImageUrl,
        fields:      template.fields,
        qrXRatio:    template.qrXRatio    ?? 0.88,
        qrYRatio:    template.qrYRatio    ?? 0.92,
        qrSizeRatio: template.qrSizeRatio ?? 0.12,
        qrPage:      template.qrPage      ?? 1,
        createdAt:   Date.now(),
      };
      setTemplates((prev) => [copy, ...prev]);
    } catch (e) {
      alert("Error al duplicar la plantilla.");
      console.error(e);
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plantillas</h1>
          <p className="text-slate-500 mt-1">Diseños base para los certificados.</p>
        </div>
        <Link
          href="/admin/dashboard/templates/nuevo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-indigo-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-3 text-sm text-slate-500">Cargando plantillas...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-14 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-5 border border-slate-100">
              <Copy className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Sin plantillas todavía</h3>
            <p className="text-slate-500 text-sm mt-1.5 max-w-xs">
              Crea tu primera plantilla subiendo un PDF de Canva y configurando los campos de texto.
            </p>
            <Link
              href="/admin/dashboard/templates/nuevo"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primera plantilla
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Campos</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Creada</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <TemplateThumbnail url={template.bgImageUrl} name={template.name} />
                        {renamingId === template.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              ref={renameRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(template.id);
                                if (e.key === "Escape") cancelRename();
                              }}
                              className="border border-primary rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
                              disabled={savingName}
                            />
                            <button onClick={() => saveRename(template.id)} disabled={savingName}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Guardar">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelRename}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Cancelar">
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/name">
                            <span className="font-semibold text-slate-800">{template.name}</span>
                            <button onClick={() => startRename(template)}
                              className="opacity-0 group-hover/name:opacity-100 p-1 text-slate-300 hover:text-primary hover:bg-indigo-50 rounded-md transition-all" title="Renombrar">
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {template.fields.length} campo{template.fields.length !== 1 ? "s" : ""}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {new Date(template.createdAt).toLocaleDateString("es-PE", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        {/* Edit */}
                        <Link
                          href={`/admin/dashboard/templates/${template.id}/editar`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar plantilla"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(template)}
                          disabled={duplicatingId === template.id}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Duplicar plantilla"
                        >
                          {duplicatingId === template.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {/* Open background */}
                        <a
                          href={template.bgImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                          title={isBgPdf(template.bgImageUrl) ? "Abrir PDF de fondo" : "Ver imagen de fondo"}
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(template)}
                          disabled={deletingId === template.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
