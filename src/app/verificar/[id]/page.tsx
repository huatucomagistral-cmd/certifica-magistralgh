"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Certificate } from "@/lib/types";
import { CheckCircle2, XCircle, Search, Download } from "lucide-react";
import Link from "next/link";

export default function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<Certificate | null>(null);

  useEffect(() => {
    async function verifyId() {
      if (!id) return;
      try {
        const docRef = doc(db, "certificates", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCert({ id: docSnap.id, ...docSnap.data() } as Certificate);
        } else {
          setCert(null);
        }
      } catch (error) {
        console.error("Error verifying:", error);
      } finally {
        setLoading(false);
      }
    }
    verifyId();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 flex flex-col items-center justify-center p-4">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
         <p className="mt-6 text-indigo-200 font-medium tracking-wide animate-pulse">Verificando en base de datos oficial...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 flex flex-col items-center pt-20 p-4 relative overflow-hidden">
      {/* Luces de fondo (Glow) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <Link href="/" className="mb-10 font-bold text-2xl text-white tracking-tight z-10 flex items-center gap-3 hover:scale-105 transition-transform">
        <img
          src="/certifica-magistral.webp"
          alt="Certifica Magistral"
          className="h-9 w-auto object-contain drop-shadow-lg"
        />
        Magistral Certificaciones
      </Link>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden border border-white/10 z-10">
        {!cert ? (
           <div className="p-10 text-center bg-white relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm shadow-red-100">
                <XCircle className="w-10 h-10" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-3">Certificado no encontrado</h2>
             <p className="text-slate-600 mb-6 font-medium">
               El identificador proporcionado no corresponde a ningún registro oficial en nuestro sistema.
             </p>
             <p className="text-sm text-slate-500 font-mono break-all bg-slate-50 p-4 rounded-xl border border-slate-200">
               ID: {id}
             </p>
             <Link href="/verificar" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 hover:text-slate-900 font-bold transition-colors">
                <Search className="w-5 h-5" /> Buscar otro identificador
             </Link>
           </div>
        ) : (
           <div>
              <div className="bg-gradient-to-b from-emerald-50 to-white pt-10 pb-8 px-6 text-center border-b border-emerald-100 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white shadow-emerald-200/50">
                   <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">¡Documento Auténtico!</h2>
                <p className="text-emerald-700 font-semibold text-lg flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Este certificado es válido y oficial.
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div>
                   <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Otorgado a</p>
                   <p className="text-xl font-bold text-slate-800">{cert.recipientName}</p>
                </div>
                <div>
                   <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Por haber completado</p>
                   <p className="text-lg font-medium text-slate-700">{cert.courseName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                       <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha de Emisión</p>
                       <p className="text-base font-medium text-slate-700">{new Date(cert.issueDate).toLocaleDateString()}</p>
                   </div>
                   <div>
                       <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado</p>
                       <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${cert.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                         {cert.status === 'active' ? 'Vigente' : 'Revocado'}
                       </span>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ID Único de Verificación</p>
                   <p className="text-sm text-slate-600 font-mono break-all bg-slate-50 p-4 rounded-xl border border-slate-200">{cert.id}</p>
                </div>

                <a 
                   href={cert.pdfUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full mt-6 flex items-center justify-center gap-3 px-6 py-4 text-base font-bold text-white bg-gradient-to-r from-primary to-indigo-800 rounded-2xl hover:shadow-lg hover:shadow-indigo-900/30 hover:scale-[1.02] transition-all"
                >
                   <Download className="w-5 h-5" /> 
                   Descargar Documento Original (PDF)
                </a>
              </div>
           </div>
        )}
      </div>

      <p className="mt-12 text-sm text-indigo-200/60 text-center max-w-md z-10 font-medium">
        Este sistema garantiza la integridad e inmutabilidad de los documentos emitidos por la institución.
      </p>
    </div>
  );
}
