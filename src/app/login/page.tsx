"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === "huatucomagistral@gmail.com") {
          router.push("/admin/dashboard");
        } else {
          router.push("/alumno/dashboard");
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user.email === "huatucomagistral@gmail.com") {
        router.push("/admin/dashboard");
      } else {
        router.push("/alumno/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Error al iniciar sesión con Google. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-primary to-indigo-900">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-primary to-indigo-900 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-white/10 text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/certifica-magistral.webp"
            alt="Certifica Magistral"
            className="h-16 w-auto object-contain drop-shadow-md"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido a Magistral</h1>
        <p className="text-slate-600 mb-8">
          Inicia sesión para acceder a tu panel.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <svg viewBox="0 0 48 48" className="w-5 h-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.22l6.87-6.87C35.78 2.09 30.22 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.01 6.22C12.43 13.39 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-8.01-6.22C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.89-13.43-9.51l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          Continuar con Google
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
