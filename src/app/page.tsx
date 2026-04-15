"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Code, Database, Cpu, CheckCircle, CalendarDays } from "lucide-react";

export default function LandingPage() {
  const courses = [
    {
      title: "Arquitectura Cloud Computing",
      description: "Aprende a diseñar y desplegar infraestructuras escalables en la nube (AWS, Firebase, Vercel).",
      icon: <Database className="w-6 h-6 text-indigo-500" />
    },
    {
      title: "Programación con IA y Agentes",
      description: "Integra modelos de lenguaje en aplicaciones web modernas mediante LLMs y RAG.",
      icon: <Cpu className="w-6 h-6 text-purple-500" />
    },
    {
      title: "Desarrollo Web Fullstack",
      description: "Domina Next.js, React, Tailwind CSS y bases de datos NoSQL para construir soluciones enterpise.",
      icon: <Code className="w-6 h-6 text-emerald-500" />
    },
    {
      title: "Herramientas IT & Productividad",
      description: "Maximiza el rendimiento y automatiza tareas digitales avanzadas en el entorno corporativo.",
      icon: <BookOpen className="w-6 h-6 text-amber-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1 items-center gap-3">
            <div className="bg-white p-1 rounded-lg shadow-sm">
              <img
                src="/certifica-magistral.webp"
                alt="Certifica Magistral"
                className="h-7 w-auto object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Magistral</span>
          </div>
          <div className="flex gap-x-6 items-center">
            <Link href="/verificar" className="text-sm font-semibold leading-6 text-indigo-100 hover:text-white transition-colors">
              Verificar Certificado
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold leading-6 bg-white text-indigo-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
            >
              Ingresar <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate pt-14 bg-gradient-to-br from-indigo-950 via-primary to-indigo-900 overflow-hidden shadow-xl">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-secondary to-[#9089fc] opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>

          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl text-balance drop-shadow-sm">
                  Especialízate en Tecnología Digital con las herramientas más avanzadas
                </h1>
                <p className="mt-6 text-lg leading-8 text-indigo-100 text-pretty">
                  Impulsa tu carrera profesional con nuestras capacitaciones técnicas de vanguardia. Cursos prácticos enfocados en el mercado laboral real, avalados por Magistral.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    href="/login"
                    className="rounded-xl bg-secondary px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary transition-all flex items-center gap-2"
                  >
                    Portal de Alumnos
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/verificar" className="text-sm font-semibold leading-6 text-white flex items-center gap-2 group hover:text-indigo-200 transition-colors">
                    <CheckCircle className="w-5 h-5 text-secondary group-hover:text-teal-300 transition-colors" />
                    Validar un documento
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cursos / Capacitaciones Section */}
        <div className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-primary">Aprende haciendo</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Nuestras Capacitaciones Destacadas
              </p>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Formación continua diseñada para ingenieros, desarrolladores y profesionales de TI que buscan mantenerse competitivos.
              </p>
            </div>

            {/* ── FEATURED LAUNCH CARD ──────────────────────────── */}
            <div className="mx-auto mt-14 max-w-4xl w-full">
              <div className="relative bg-gradient-to-br from-indigo-700 via-primary to-indigo-800 rounded-3xl p-[2px] shadow-2xl shadow-indigo-900/40">
                {/* Glow ring */}
                <div className="relative bg-gradient-to-br from-indigo-50 via-white to-teal-50 rounded-3xl p-8 sm:p-10 overflow-hidden">
                  {/* Top badge row */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-600 to-primary text-white shadow-md uppercase tracking-widest">
                      ¡Primer Lanzamiento!
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Este domingo · Inscripciones abiertas
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100">
                      {/* Google G logo */}
                      <svg viewBox="0 0 48 48" className="w-9 h-9">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.22l6.87-6.87C35.78 2.09 30.22 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.01 6.22C12.43 13.39 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-8.01-6.22C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.89-13.43-9.51l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                        Domina las Herramientas Digitales de Google para la Optimización de su Organización
                      </h3>
                      <p className="mt-3 text-base text-slate-600 leading-relaxed">
                        Aprende a utilizar el ecosistema completo de Google Workspace — Gmail, Drive, Docs, Sheets, Meet, Forms y más — para transformar la productividad de tu equipo. Ideal para directivos, coordinadores y profesionales que buscan digitalizar y optimizar sus procesos de negocio de forma inmediata y sin conocimientos técnicos previos.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-teal-500" />
                      Certificado oficial incluido
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-teal-500" />
                      100% práctico
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-teal-500" />
                      Sin requisitos previos
                    </div>
                  </div>

                  {/* Decorative corner glow */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ── REGULAR COURSES GRID ─────────────────────────── */}
            <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mt-14 mb-2">Próximas capacitaciones</p>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
                {courses.map((course) => (
                  <div key={course.title} className="flex flex-col bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-slate-900">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        {course.icon}
                      </div>
                      {course.title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                      <p className="flex-auto">{course.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-indigo-950 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Autenticidad y prestigio profesional</h2>
              <p className="mt-6 text-lg leading-8 text-indigo-200">
                Todos nuestros egresados reciben acceso a su propio portal de certificaciones, permitiendo una fácil visualización y compartición con reclutadores.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl lg:max-w-none">
              <dl className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <div className="flex flex-col gap-y-3">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <CheckCircle className="h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                    Validación por Código QR
                  </dt>
                  <dd className="h-px w-full bg-indigo-800 mt-2 mb-2"></dd>
                  <dd className="text-sm leading-6 text-indigo-200">
                    Cualquier persona puede verificar la autenticidad de tu certificado simplemente escaneando su QR, conectando en tiempo real con nuestra base de datos en la nube.
                  </dd>
                </div>
                <div className="flex flex-col gap-y-3">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <CheckCircle className="h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                    Panel de control del estudiante
                  </dt>
                  <dd className="h-px w-full bg-indigo-800 mt-2 mb-2"></dd>
                  <dd className="text-sm leading-6 text-indigo-200">
                    Ingresa con tu cuenta de Google y descubre todos los diplomas y constancias emitidas a tu nombre, listos para descargar en PDF y adjuntar a tu Curriculum Vitae.
                  </dd>
                </div>
                <div className="flex flex-col gap-y-3">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <CheckCircle className="h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                    Contenido actualizado
                  </dt>
                  <dd className="h-px w-full bg-indigo-800 mt-2 mb-2"></dd>
                  <dd className="text-sm leading-6 text-indigo-200">
                    Nuestro plan de estudios se revisan periódicamente para incluir las últimas tendencias en ingeniería de software e inteligencia artificial aplicadas.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <span className="text-sm text-slate-500">huatucomagistral@gmail.com</span>
          </div>
          <div className="mt-8 md:order-1 md:mt-0 flex items-center justify-center gap-2">
            <img src="/certifica-magistral.webp" alt="Magistral" className="h-5 w-auto object-contain opacity-50" />
            <p className="text-center text-xs leading-5 text-slate-500">
              &copy; {new Date().getFullYear()} Magistral. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
