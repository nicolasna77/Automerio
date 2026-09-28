"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import { setUserPasswordAction } from "./actions";

const PASSWORD_ALPHABET =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 14) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join(
    ""
  );
}

export function PasswordResetControl({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPassword("");
    setDone(false);
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier — copiez-le manuellement.");
    }
  }

  function handleSubmit() {
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    startTransition(async () => {
      try {
        unwrap(await setUserPasswordAction(userId, password));
        setDone(true);
        toast.success("Mot de passe réinitialisé.");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Réinitialiser le mot de passe
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            {!done && (
              <DialogDescription>
                Ses sessions actives seront révoquées : il devra se
                reconnecter avec ce nouveau mot de passe.
              </DialogDescription>
            )}
          </DialogHeader>

          {done ? (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2">
                <code className="flex-1 truncate font-mono text-sm">
                  {password}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  aria-label="Copier le mot de passe"
                >
                  {copied ? (
                    <Check className="text-primary" aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Communiquez-le à l&apos;utilisateur — il ne sera plus affiché
                ensuite.
              </p>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Fermer</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  aria-label="Nouveau mot de passe"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                  disabled={isPending}
                >
                  Générer
                </Button>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || password.length < 8}
                  aria-busy={isPending}
                >
                  {isPending ? "Réinitialisation…" : "Réinitialiser"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
