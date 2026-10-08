"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "./button";
import { Dialog, DialogFooter } from "./dialog";
import { Input } from "./form";

type ConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone?: ButtonProps["variant"];
  /** Si se define, hay que escribir esta frase para habilitar el botón. */
  phrase?: string;
  pending?: boolean;
  onConfirm: () => void;
};

/** Reemplaza window.confirm / window.prompt. */
export function Confirm({ open, onOpenChange, title, body, confirmLabel, tone = "danger", phrase, pending, onConfirm }: ConfirmProps) {
  const [typed, setTyped] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTyped(""); }} title={title} size="sm">
      <div className="text-sm text-muted-foreground">{body}</div>
      {phrase && (
        <Input
          className="mt-4"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={`Escribe ${phrase}`}
          aria-label={`Escribe ${phrase} para confirmar`}
          autoFocus
        />
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant={tone} disabled={pending || (!!phrase && typed !== phrase)} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
