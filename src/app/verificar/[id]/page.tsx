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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
         <p className="mt-4 text-slate-500 font-medium">Verificando en blockchain / base de datos oficial...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 p-4">
      <Link href="/" className="mb-8 font-bold text-2xl text-slate-800 tracking-tight">
        Magistral Certificaciones
      </Link>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {!cert ? (
           <div className="p-8 text-center bg-red-50/50">
             <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10" />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Certificado no encontrado</h2>
             <p className="text-slate-600 mb-6 font-medium">
               El identificador proporcionado no corresponde a ningún registro oficial en nuestro sistema.
             </p>
             <p className="text-sm text-slate-500 break-all bg-white p-3 rounded-md border border-slate-200">
               ID buscado: {id}
             </p>
             <Link href="/" className="mt-8 inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
                <Search className="w-4 h-4" /> Buscar otro certificado
             </Link>
           </div>
        ) : (
           <div>
              <div className="bg-green-50/50 p-8 text-center border-b border-green-100">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-2 border-green-200">
                   <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">¡Documento Auténtico!</h2>
                <p className="text-green-700 font-medium text-lg">
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
                   <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">ID Único de Verificación</p>
                   <p className="text-sm text-slate-600 font-mono break-all bg-slate-50 p-4 rounded-lg border border-slate-200">{cert.id}</p>
                </div>

                <a 
                   href={cert.pdfUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 text-base font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
                >
                   <Download className="w-5 h-5" /> 
                   Descargar Documento Original (PDF)
                </a>
              </div>
           </div>
        )}
      </div>

      <p className="mt-12 text-sm text-slate-400 text-center max-w-md">
        Este sistema garantiza la integridad e inmutabilidad de los documentos emitidos por la institución.
      </p>
    </div>
  );
}
