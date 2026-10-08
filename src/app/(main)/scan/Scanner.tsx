"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Camera, CameraOff, Flashlight, Keyboard, Link2, Minus, Plus, Search, Undo2 } from "lucide-react";
import { linkBarcode, scanCode, undoScan } from "@/actions/scan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Segmented } from "@/components/ui/form";
import { Empty, Panel, PanelHeader } from "@/components/ui/panel";
import { stockLevel } from "@/lib/stock";
import { cn } from "@/lib/utils";

type Mode = "lookup" | "in" | "out";
type IndexItem = { id: string; name: string; value: string | null; part_number: string | null };
type LogEntry = { key: number; componentId: string; name: string; delta: number; quantity: number; min: number; unit: string; undone?: boolean };
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

const MODES: { value: Mode; label: string }[] = [
  { value: "lookup", label: "Consultar" },
  { value: "in", label: "Entrada" },
  { value: "out", label: "Salida" },
];
const FRAME = { lookup: "var(--ion)", in: "var(--ok)", out: "var(--thruster)" } as const;
const REPEAT_MS = 2500; // el mismo código no vuelve a contar hasta pasado este tiempo

export default function Scanner({ index }: { index: IndexItem[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const last = useRef({ code: "", at: 0 });
  const busy = useRef(false);

  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>("lookup");
  const [step, setStep] = useState(1);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);

  // Los valores vigentes viven en un ref: el bucle de la cámara no se reinicia al cambiar de modo
  const live = useRef({ mode, step });
  useEffect(() => {
    live.current = { mode, step };
  }, [mode, step]);

  const handle = useCallback(async (raw: string) => {
    const code = raw.trim();
    const now = Date.now();
    if (!code || busy.current) return;
    if (code === last.current.code && now - last.current.at < REPEAT_MS) return;
    last.current = { code, at: now };
    busy.current = true;

    const res = await scanCode({ code, mode: live.current.mode, quantity: live.current.step });
    busy.current = false;

    if (!res.ok) {
      navigator.vibrate?.([60, 40, 60]);
      toast.error(res.error);
      return;
    }
    if (!res.data.found) {
      navigator.vibrate?.([60, 40, 60]);
      setUnknown(res.data.code);
      return;
    }
    const { component: c, delta, wishlisted } = res.data;
    navigator.vibrate?.(40);
    setFlash((f) => f + 1);
    setLog((l) => [
      { key: now, componentId: c.id, name: c.value ? `${c.name} ${c.value}` : c.name, delta, quantity: c.current_quantity, min: c.min_stock, unit: c.unit },
      ...l.slice(0, 29),
    ]);
    if (wishlisted) toast.warning(`${c.name} bajó del mínimo`, { description: "Se añadió a la wishlist." });
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
    setTorch(false);
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setCamera("unsupported");
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  };

  useEffect(() => {
    if (camera !== "on") return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      // BarcodeDetector nativo (Chrome/Android) y, donde no existe (iOS, Firefox), el mismo API sobre ZXing-WASM
      const Native = (window as unknown as { BarcodeDetector?: new () => Detector }).BarcodeDetector;
      const detector: Detector = Native ? new Native() : new (await import("barcode-detector/ponyfill")).BarcodeDetector();

      const tick = async () => {
        if (!alive) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && !document.hidden) {
          try {
            const [hit] = await detector.detect(video);
            if (hit?.rawValue) void handle(hit.rawValue);
          } catch {
            /* cuadro ilegible: se intenta con el siguiente */
          }
        }
        timer = setTimeout(tick, 160);
      };
      void tick();
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [camera, handle]);

  useEffect(() => stop, [stop]); // apaga la cámara al salir de la página

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    try {
      await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch((t) => !t);
    } catch {
      toast.error("Este teléfono no deja controlar la linterna desde el navegador.");
    }
  };

  const undo = async (entry: LogEntry) => {
    const res = await undoScan({ componentId: entry.componentId, delta: entry.delta });
    if (!res.ok) return void toast.error(res.error);
    setLog((l) => l.map((e) => (e.key === entry.key ? { ...e, undone: true, quantity: e.quantity - e.delta } : e)));
  };

  const link = async (componentId: string) => {
    if (!unknown) return;
    const res = await linkBarcode({ componentId, code: unknown });
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Código vinculado a ${res.data.name}`);
    const code = unknown;
    setUnknown(null);
    last.current = { code: "", at: 0 };
    void handle(code); // aplica la lectura que quedó pendiente
  };

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel className="xl:col-span-7">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Segmented label="Qué hace cada lectura" value={mode} onChange={setMode} options={MODES} />
          {mode !== "lookup" && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Menos por lectura" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                <Minus />
              </Button>
              <span className="num whitespace-nowrap px-1 text-center text-sm">
                {mode === "in" ? "+" : "−"}
                {step} por lectura
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Más por lectura" onClick={() => setStep((s) => Math.min(999, s + 1))}>
                <Plus />
              </Button>
            </div>
          )}
          {camera === "on" && (
            <div className="ml-auto flex gap-1">
              <Button variant={torch ? "warn" : "ghost"} size="icon" aria-label="Linterna" aria-pressed={torch} onClick={toggleTorch}>
                <Flashlight />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Apagar cámara" onClick={stop}>
                <CameraOff />
              </Button>
            </div>
          )}
        </div>

        <div className="relative aspect-[4/3] bg-black sm:aspect-video">
          <video ref={videoRef} playsInline muted className={cn("size-full object-cover", camera !== "on" && "invisible")} />

          {camera === "on" ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative aspect-square h-[62%] transition-colors" style={{ color: FRAME[mode] }}>
                {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((pos) => (
                  <span key={pos} className={cn("absolute size-8 border-current", pos)} />
                ))}
                <span className="absolute inset-x-3 h-px animate-scanline bg-current shadow-[0_0_12px_currentColor]" />
                <AnimatePresence>
                  {flash > 0 && (
                    <motion.span
                      key={flash}
                      className="absolute inset-0 bg-current"
                      initial={{ opacity: 0.45 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              {camera === "denied" ? (
                <Empty title="Sin permiso para la cámara" icon={<CameraOff />}>
                  Actívalo en el candado de la barra de direcciones y vuelve a intentar. Mientras tanto puedes escribir el código abajo.
                </Empty>
              ) : camera === "unsupported" ? (
                <Empty title="Este navegador no da acceso a la cámara" icon={<CameraOff />}>
                  La cámara solo funciona con HTTPS. Escribe el código abajo o usa un lector USB.
                </Empty>
              ) : (
                <Button size="lg" onClick={start} disabled={camera === "starting"}>
                  <Camera />
                  {camera === "starting" ? "Abriendo cámara…" : "Encender cámara"}
                </Button>
              )}
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
            last.current = { code: "", at: 0 }; // lo tecleado a mano siempre cuenta
            void handle(input.value);
            input.value = "";
          }}
        >
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="code" placeholder="Código, referencia o lector USB" aria-label="Código" autoComplete="off" className="num pl-9" />
          </div>
          <Button type="submit" variant="secondary">
            Leer
          </Button>
        </form>
      </Panel>

      <Panel className="xl:col-span-5">
        <PanelHeader title="Lecturas de esta sesión" hint={log.length ? `${log.length} registradas` : undefined} />
        {log.length === 0 ? (
          <Empty title="Aún no has leído nada">Cada lectura aparece aquí con el stock resultante y un botón para deshacerla.</Empty>
        ) : (
          <ul className="max-h-[560px] divide-y overflow-y-auto">
            <AnimatePresence initial={false}>
              {log.map((e) => {
                const level = stockLevel(e.quantity, e.min);
                return (
                  <motion.li
                    key={e.key}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: e.undone ? 0.45 : 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className={cn("num w-12 shrink-0 text-lg font-bold", e.delta > 0 ? "text-ok" : e.delta < 0 ? "text-accent" : "text-primary")}>
                      {e.delta === 0 ? <Search className="size-5" /> : `${e.delta > 0 ? "+" : "−"}${Math.abs(e.delta)}`}
                    </span>
                    <Link href={`/inventory/${e.componentId}`} className="min-w-0 flex-1 hover:text-primary">
                      <span className={cn("block truncate text-sm font-medium", e.undone && "line-through")}>{e.name}</span>
                      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        Quedan {e.quantity} {e.unit}
                        {level !== "ok" && <Badge tone={level === "out" ? "danger" : "warn"}>{level === "out" ? "Agotado" : "Bajo"}</Badge>}
                      </span>
                    </Link>
                    {e.delta !== 0 && !e.undone && (
                      <Button variant="ghost" size="sm" onClick={() => undo(e)}>
                        <Undo2 />
                        Deshacer
                      </Button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <LinkDialog code={unknown} index={index} onClose={() => setUnknown(null)} onLink={link} />
    </div>
  );
}

/** Código desconocido: se vincula una vez y queda aprendido. */
function LinkDialog({ code, index, onClose, onLink }: { code: string | null; index: IndexItem[]; onClose: () => void; onLink: (id: string) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const matches = term ? index.filter((c) => `${c.name} ${c.value ?? ""} ${c.part_number ?? ""}`.toLowerCase().includes(term)).slice(0, 8) : [];

  return (
    <Dialog
      open={!!code}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setQ("");
        }
      }}
      title="Código sin vincular"
      description="Elige a qué componente pertenece. La próxima vez se reconoce solo."
    >
      <p className="num mb-4 truncate rounded-sm bg-plate px-3 py-2 text-sm">{code}</p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar componente" aria-label="Buscar componente" autoFocus />
      <ul className="mt-2 max-h-64 divide-y overflow-y-auto">
        {matches.map((c) => (
          <li key={c.id}>
            <button onClick={() => onLink(c.id)} className="flex w-full items-center gap-3 px-2 py-2.5 text-left text-sm hover:bg-plate">
              <Link2 className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate">
                {c.name} <span className="text-muted-foreground">{c.value}</span>
              </span>
              <span className="num text-xs text-muted-foreground">{c.part_number}</span>
            </button>
          </li>
        ))}
        {term && matches.length === 0 && <li className="px-2 py-4 text-sm text-muted-foreground">Ningún componente coincide.</li>}
      </ul>
      <Link href="/inventory?new=1" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
        No existe todavía: crear componente
      </Link>
    </Dialog>
  );
}
