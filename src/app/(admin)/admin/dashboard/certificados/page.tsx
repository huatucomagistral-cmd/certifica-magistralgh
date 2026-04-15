"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection, getDocs, orderBy, query, doc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Certificate } from "@/lib/types";
import { FileText, Plus, ExternalLink, Download, ShieldOff, Search, Users } from "lucide-react";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function fetchCertificates() {
    setLoading(true);
    try {
      const q = query(collection(db, "certificates"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setCertificates(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Certificate[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCertificates(); }, []);

  const handleRevoke = async (cert: Certificate) => {
    if (!confirm(`¿Revocar el certificado de "${cert.recipientName}"? Su página de verificación mostrará el documento como inválido.`)) return;
    setRevokingId(cert.id);
    try {
      await updateDoc(doc(db, "certificates", cert.id), { status: "revoked" });
      setCertificates((prev) =>
        prev.map((c) => (c.id === cert.id ? { ...c, status: "revoked" } : c))
      );
    } catch (e) {
      alert("Error al revocar el certificado.");
    } finally {
      setRevokingId(null);
    }
  };

  const filtered = certificates.filter(
    (c) =>
      c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certificados</h1>
          <p className="text-slate-500 mt-1">
            {certificates.length > 0
              ? `${certificates.length} documento${certificates.length !== 1 ? "s" : ""} emitido${certificates.length !== 1 ? "s" : ""}`
              : "Historial de documentos generados"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/admin/dashboard/certificados/masivo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
            Emisión masiva
          </Link>
          <Link
            href="/admin/dashboard/certificados/nuevo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-indigo-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Emitir Nuevo
          </Link>
        </div>
      </div>

      {/* Search */}
      {certificates.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por alumno, curso o ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-sm text-slate-500">Cargando registros...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-14 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-5 border border-slate-100">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Sin certificados todavía</h3>
            <p className="text-slate-500 text-sm mt-1.5 max-w-xs">
              Asegúrate de tener al menos una plantilla lista antes de emitir un certificado.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No se encontraron resultados para "{search}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Curso</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Emisión</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {cert.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {cert.recipientName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {cert.courseName}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(cert.issueDate).toLocaleDateString("es-PE", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cert.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {cert.status === "active" ? "Vigente" : "Revocado"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <a
                          href={`/verificar/${cert.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver validación pública"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                          href={cert.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {cert.status === "active" && (
                          <button
                            onClick={() => handleRevoke(cert)}
                            disabled={revokingId === cert.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Revocar certificado"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
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
