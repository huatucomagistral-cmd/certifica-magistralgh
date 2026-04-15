"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

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
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-primary to-indigo-900 font-sans">
      <main className="flex flex-col items-center justify-center w-full max-w-2xl px-6 py-20 text-center">
        
        <div className="mb-10 flex flex-col items-center">
           <div className="bg-white p-2 rounded-2xl shadow-xl mb-6">
             <img
               src="/certifica-magistral.webp"
               alt="Certifica Magistral"
               className="h-20 w-auto object-contain"
             />
           </div>
           <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 drop-shadow-md">
             Validación Oficial de <span className="text-teal-300">Certificados</span>
           </h1>
           <p className="text-lg text-indigo-100 max-w-lg drop-shadow-sm">
             Sistema de verificación para garantizar la autenticidad e integridad de los documentos emitidos.
           </p>
        </div>

        <div className="w-full bg-white p-8 rounded-2xl shadow-2xl border border-white/10">
           <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                   <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Ej. CM-2026-000142"
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-4 px-6 text-lg font-bold text-white bg-primary hover:bg-indigo-800 shadow-md rounded-xl transition-colors"
               >
                Verificar Certificado
              </button>
           </form>

           <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500">
              <Link href="/" className="font-medium text-slate-500 hover:text-primary transition-colors">Volver a la página principal</Link>
           </div>
        </div>
      </main>
    </div>
  );
}
