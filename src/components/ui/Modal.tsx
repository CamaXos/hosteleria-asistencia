"use client";

import { useEffect } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
  variant?: "primary" | "danger";
  hideFooter?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  loading,
  variant = "primary",
  hideFooter = false,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative z-10 w-full rounded-xl bg-white shadow-xl", sizeClass)}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 text-sm text-gray-600">{children}</div>
        {!hideFooter && (
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            {onConfirm && (
              <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
