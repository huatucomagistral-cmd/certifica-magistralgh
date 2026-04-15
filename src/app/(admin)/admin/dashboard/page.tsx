"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Certificate } from "@/lib/types";
import Link from "next/link";
import {
  FileText, Copy, Plus, ArrowRight, TrendingUp,
  Users, Award, BarChart2, BookOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function groupByMonth(certs: Certificate[]) {
  const now = new Date();
  const result: { mes: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const total = certs.filter((c) => {
      const cd = new Date(c.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    result.push({ mes: label, total });
  }
  return result;
}

function topCourses(certs: Certificate[], n = 5) {
  const map = new Map<string, number>();
  for (const c of certs) map.set(c.courseName, (map.get(c.courseName) ?? 0) + 1);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([course, count]) => ({ course, count }));
}

function thisMonthCount(certs: Certificate[]) {
  const now = new Date();
  return certs.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function uniqueStudents(certs: Certificate[]) {
  return new Set(certs.map((c) => c.recipientName.toLowerCase().trim())).size;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-2.5">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} <span className="text-xs font-normal text-slate-400">certs.</span></p>
      </div>
    );
  }
  return null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates]       = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [certsSnap, tplSnap] = await Promise.all([
          getDocs(collection(db, "certificates")),
          getDocs(collection(db, "templates")),
        ]);
        setCertificates(certsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Certificate[]);
        setTemplates(tplSnap.size);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const monthData   = useMemo(() => groupByMonth(certificates), [certificates]);
  const courses     = useMemo(() => topCourses(certificates),    [certificates]);
  const thisMonth   = useMemo(() => thisMonthCount(certificates), [certificates]);
  const students    = useMemo(() => uniqueStudents(certificates), [certificates]);
  const active      = useMemo(() => certificates.filter((c) => c.status === "active").length, [certificates]);

  const maxBar = Math.max(...monthData.map((d) => d.total), 1);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-slate-500 mt-1">Métricas generales del sistema de certificaciones.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Certificados totales", value: certificates.length, icon: FileText,  color: "bg-indigo-50",    iconColor: "text-primary" },
          { label: "Alumnos únicos",       value: students,            icon: Users,     color: "bg-violet-50",  iconColor: "text-violet-600" },
          { label: "Este mes",             value: thisMonth,           icon: TrendingUp, color: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "Plantillas activas",   value: templates,           icon: Copy,      color: "bg-amber-50",   iconColor: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-indigo-100 transition-all group">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {loading ? "—" : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — últimos 6 meses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Certificados emitidos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p>
            </div>
            <BarChart2 className="w-5 h-5 text-slate-300" />
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9", radius: 8 }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {monthData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.total === maxBar && entry.total > 0 ? "#4338ca" : "#bfdbfe"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Courses */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Top cursos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Por número de certificados</p>
            </div>
            <BookOpen className="w-5 h-5 text-slate-300" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-8">Sin datos todavía</p>
          ) : (
            <div className="space-y-3">
              {courses.map(({ course, count }, i) => (
                <div key={course}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[70%]">{course}</span>
                    <span className="text-xs font-bold text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / courses[0].count) * 100}%`,
                        background: i === 0 ? "#4338ca" : `hsl(${215 + i * 15},${70 - i * 10}%,${50 + i * 8}%)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/dashboard/certificados/nuevo"
            className="group bg-gradient-to-r from-primary to-indigo-800 text-white rounded-2xl p-6 flex items-center justify-between hover:shadow-lg transition-all shadow-md shadow-indigo-900/20"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-base">Emitir Certificado</p>
                <p className="text-indigo-200 text-sm mt-0.5">Generar un nuevo documento</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/dashboard/templates/nuevo"
            className="group bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-base text-slate-800">Nueva Plantilla</p>
                <p className="text-slate-500 text-sm mt-0.5">Crear un diseño base</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-4">Gestionar</h2>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {[
            { href: "/admin/dashboard/alumnos",      icon: Users,    label: "Ver todos los Alumnos",     sub: `${students} registrado${students !== 1 ? "s" : ""}` },
            { href: "/admin/dashboard/certificados", icon: FileText, label: "Ver todos los Certificados", sub: `${active} vigente${active !== 1 ? "s" : ""}` },
            { href: "/admin/dashboard/templates",    icon: Copy,     label: "Ver todas las Plantillas",  sub: `${templates} disponible${templates !== 1 ? "s" : ""}` },
          ].map(({ href, icon: Icon, label, sub }, i, arr) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group ${i === 0 ? "rounded-t-2xl" : ""} ${i === arr.length - 1 ? "rounded-b-2xl" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  {!loading && <span className="text-xs text-slate-400 ml-2">{sub}</span>}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Banner si no hay plantillas */}
      {!loading && templates === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
          <TrendingUp className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Comienza creando una plantilla</p>
            <p className="text-amber-700 text-sm mt-1">
              Para emitir certificados necesitas al menos una plantilla configurada.{" "}
              <Link href="/admin/dashboard/templates/nuevo" className="font-semibold underline underline-offset-2">
                Crear plantilla →
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
