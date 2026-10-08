// Formateo determinista: misma zona horaria en servidor (UTC en Vercel) y cliente → sin errores de hidratación.
export const TZ = process.env.NEXT_PUBLIC_APP_TZ ?? "America/Bogota";

const copFmt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("es-CO");
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "numeric", month: "short" });
const dateYearFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const relFmt = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export const cop = (n: number | null | undefined) => (n == null ? "—" : copFmt.format(n));
export const num = (n: number) => numFmt.format(n);

/** YYYY-MM-DD en la zona de la app. */
export const dayKey = (d: Date) => dayKeyFmt.format(d);
export const fmtDate = (d: Date) => dateFmt.format(d).replace(".", "");
export const fmtDateYear = (d: Date) => dateYearFmt.format(d).replace(".", "");
export const fmtTime = (d: Date) => timeFmt.format(d);

/** Las fechas de <input type="date"> se guardan a medianoche UTC: se leen en UTC para no correr un día. */
export const dateOnlyKey = (d: Date) => d.toISOString().slice(0, 10);
export const fmtDateOnly = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" }).format(d).replace(".", "");

/** Solo en servidor (RSC): en cliente el "ahora" difiere y rompe la hidratación. */
export function fromNow(d: Date, now = new Date()) {
  const s = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return "ahora";
  if (abs < 3600) return relFmt.format(Math.round(s / 60), "minute");
  if (abs < 86400) return relFmt.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return relFmt.format(Math.round(s / 86400), "day");
  return fmtDateYear(d);
}

export const daysBetween = (fromKey: string, toKey: string) =>
  Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000);
