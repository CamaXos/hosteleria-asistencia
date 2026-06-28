"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Copy, Printer, Check } from "lucide-react";

interface CredentialsCardProps {
  open: boolean;
  username: string;
  password: string;
  fullName?: string;
  onClose: () => void;
}

export function CredentialsCard({
  open,
  username,
  password,
  fullName,
  onClose,
}: CredentialsCardProps) {
  const [copied, setCopied] = useState(false);

  const credentialsText = `Usuario: ${username}\nContraseña: ${password}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(credentialsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credenciales de acceso"
      hideFooter
      size="md"
    >
      <div id="credentials-print-area" className="credentials-card space-y-4">
        <Alert variant="warning">
          Guarde estas credenciales; no se volverán a mostrar.
        </Alert>

        {fullName && (
          <p className="text-sm text-gray-600">
            Responsable: <span className="font-medium text-gray-900">{fullName}</span>
          </p>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Usuario
            </p>
            <p className="mt-1 font-mono text-base text-gray-900">{username}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Contraseña
            </p>
            <p className="mt-1 font-mono text-base text-gray-900">{password}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          El responsable puede iniciar sesión con el usuario (sin dominio) o con el email interno generado.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end print:hidden">
          <Button type="button" variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button type="button" onClick={onClose} className="w-full sm:w-auto">
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
}
