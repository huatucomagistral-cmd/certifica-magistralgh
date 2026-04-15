"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Certificate } from "@/lib/types";
import {
  Search, User, ChevronDown, ChevronUp, ExternalLink,
  Download, FileText, Mail, GraduationCap,
} from "lucide-react";

interface AlumnoGroup {
  name: string;
  email?: string;
  certificates: Certificate[];
}

export default function AlumnosPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [expanded, setExpanded]         = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  // Group by recipientName (case-insensitive)
  const groups = useMemo<AlumnoGroup[]>(() => {
    const map = new Map<string, AlumnoGroup>();
    for (const c of certificates) {
      const key = c.recipientName.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { name: c.recipientName, email: c.email, certificates: [] });
      }
      map.get(key)!.certificates.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [certificates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q) ||
        g.certificates.some((c) => c.courseName.toLowerCase().includes(q))
    );
  }, [groups, search]);

  const toggle = (name: string) => setExpanded((prev) => (prev === name ? null : name));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
          <p className="text-slate-500 mt-1">
            {loading ? "Cargando…" : `${groups.length} alumno${groups.length !== 1 ? "s" : ""} · ${certificates.length} certificado${certificates.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o curso…"
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-3 text-sm text-slate-500">Cargando registros…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-2xl border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-5 border border-slate-100">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search ? `Sin resultados para "${search}"` : "Sin alumnos todavía"}
            </h3>
          </div>
        ) : (
          filtered.map((alumno) => {
            const isOpen = expanded === alumno.name;
            const active = alumno.certificates.filter((c) => c.status === "active").length;
            return (
              <div
                key={alumno.name}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Row header */}
                <button
                  onClick={() => toggle(alumno.name)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {alumno.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{alumno.name}</p>
                    {alumno.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {alumno.email}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-primary border border-indigo-100">
                      <FileText className="w-3 h-3" />
                      {alumno.certificates.length} cert{alumno.certificates.length !== 1 ? "s" : "."}
                    </span>
                    {active > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {active} vigente{active !== 1 ? "s" : ""}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded — certificate list */}
                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {alumno.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/40 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{cert.courseName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(cert.issueDate).toLocaleDateString("es-PE", {
                              day: "2-digit", month: "long", year: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            cert.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {cert.status === "active" ? "Vigente" : "Revocado"}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a
                            href={`/verificar/${cert.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver verificación"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
