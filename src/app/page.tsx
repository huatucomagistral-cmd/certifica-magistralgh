"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [searchId, setSearchId] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/verificar/${searchId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 font-sans">
      <main className="flex flex-col items-center justify-center w-full max-w-2xl px-6 py-20 text-center">
        
        <div className="mb-10 flex flex-col items-center">
           <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10" />
           </div>
           <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
             Validación Oficial de <span className="text-primary">Certificados</span>
           </h1>
           <p className="text-lg text-slate-600 max-w-lg">
             Sistema de verificación para garantizar la autenticidad e integridad de los documentos emitidos.
           </p>
        </div>

        <div className="w-full bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
           <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                   <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Ej. d50e41f0-9a3c..."
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 text-lg font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
               >
                Verificar Certificado
              </button>
           </form>

           <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500">
              ¿Eres administrador? <Link href="/admin/login" className="font-medium text-primary hover:underline">Iniciar Sesión</Link>
           </div>
        </div>
      </main>
    </div>
  );
}
