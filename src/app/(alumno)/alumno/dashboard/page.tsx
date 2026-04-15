"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Certificate } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, FileWarning, Search, Award } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

export default function AlumnoDashboard() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        fetchCertificates(user.email);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCertificates = async (email: string) => {
    try {
      const q = query(
        collection(db, "certificates"),
        where("email", "==", email),
        where("status", "==", "active")
      );
      
      const querySnapshot = await getDocs(q);
      const certsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Certificate[];

      // Ordenar por fecha descendente manualmente (ya que orderBy con where requiere un índice compuesto)
      certsData.sort((a, b) => b.issueDate - a.issueDate);
      
      setCertificates(certsData);
    } catch (error) {
      console.error("Error al obtener los certificados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCerts = certificates.filter((cert) =>
    cert.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Tus Certificados
            </h1>
            <p className="text-slate-500 mt-1">
              Aquí encontrarás todos los diplomas emitidos a tu nombre.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
            />
          </div>
        </div>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-indigo-100 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-4">
            <FileWarning className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Aún no tienes certificados</h3>
          <p className="text-slate-500 max-w-md">
            Cuando el administrador emita un certificado a tu correo <b>{userEmail}</b>, aparecerá automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCerts.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:border-indigo-200 transition-all group">
              <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 p-6 flex-1 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                <div className="text-xs font-bold text-secondary mb-2 uppercase tracking-wider">
                  {format(cert.createdAt, "dd MMM, yyyy", { locale: es })}
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                  {cert.courseName}
                </h3>
                <p className="text-sm text-slate-500">
                  Emitido para: <span className="font-medium text-slate-700">{cert.recipientName}</span>
                </p>
              </div>
              <div className="p-4 bg-white flex items-center gap-2 border-t border-slate-50">
                <a
                  href={cert.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-800 hover:shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </a>
                <Link
                  href={`/verificar/${cert.id}`}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-primary transition-colors text-center"
                >
                  Verificar
                </Link>
                {/* LinkedIn Share Button */}
                <a
                  href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.courseName)}&organizationId=123456&issueYear=${new Date(cert.issueDate).getFullYear()}&issueMonth=${new Date(cert.issueDate).getMonth() + 1}&certUrl=${encodeURIComponent(`https://certifica.magistral.pe/verificar/${cert.id}`)}&certId=${cert.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Añadir a LinkedIn"
                  className="flex items-center justify-center p-2.5 text-[#0A66C2] bg-white border border-[#0A66C2]/20 rounded-xl hover:bg-[#0A66C2]/5 transition-colors"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          ))}

          {filteredCerts.length === 0 && searchTerm && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No se encontraron certificados para "{searchTerm}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
