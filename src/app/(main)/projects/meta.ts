import { CircuitBoard, Code2, Layers, Wrench, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";
import type { PrintStatus, ProjectKind, ProjectStatus } from "@/lib/enums";

// Record<Unión, …>: si añades un valor en enums.ts, TypeScript obliga a darle etiqueta aquí.
export const KIND: Record<ProjectKind, { label: string; icon: LucideIcon }> = {
  ELECTRONICO: { label: "Electrónico", icon: CircuitBoard },
  MECANICO: { label: "Mecánico / impresión 3D", icon: Wrench },
  FIRMWARE: { label: "Firmware", icon: Code2 },
  MIXTO: { label: "Mixto", icon: Layers },
};

export const STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  IDEA: { label: "Idea", tone: "neutral" },
  ACTIVO: { label: "Activo", tone: "ion" },
  PAUSADO: { label: "En pausa", tone: "warn" },
  TERMINADO: { label: "Terminado", tone: "ok" },
};

export const PRINT: Record<PrintStatus, { label: string; tone: Tone }> = {
  PENDIENTE: { label: "Por imprimir", tone: "neutral" },
  IMPRIMIENDO: { label: "Imprimiendo", tone: "ion" },
  IMPRESA: { label: "Impresa", tone: "accent" },
  FALLIDA: { label: "Falló", tone: "danger" },
  VALIDADA: { label: "Validada", tone: "ok" },
};

// La columna es String: la base ya no garantiza el valor, así que la lectura lleva respaldo.
export const kindOf = (v: string) => KIND[v as ProjectKind] ?? KIND.ELECTRONICO;
export const statusOf = (v: string) => STATUS[v as ProjectStatus] ?? STATUS.ACTIVO;
export const printOf = (v: string) => PRINT[v as PrintStatus] ?? PRINT.PENDIENTE;
