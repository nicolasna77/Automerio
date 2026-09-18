"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "./actions";

const EMPTY_VALUES = { name: "", email: "", activity: "", message: "", website: "" };

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const confirmationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sent) confirmationRef.current?.focus();
  }, [sent]);

  function set(key: keyof typeof EMPTY_VALUES, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitContactMessage(values);
      if (result.status === "success") {
        setSent(true);
      } else {
        toast.error(result.error ?? "Une erreur est survenue.");
      }
    });
  }

  if (sent) {
    return (
      <Card>
        <CardContent>
          <div ref={confirmationRef} tabIndex={-1} className="outline-none">
            <p className="font-medium text-foreground">Message envoyé.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nous revenons vers vous sous 24h ouvrées.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="absolute left-[-9999px]" aria-hidden="true">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity">
              Votre activité
              <span className="font-normal text-muted-foreground">(facultatif)</span>
            </Label>
            <Input
              id="activity"
              placeholder="Ex. artisan plombier, coach sportif…"
              value={values.activity}
              onChange={(e) => set("activity", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              required
              rows={5}
              placeholder="Quelle tâche répétitive vous prend le plus de temps, à vous ou votre équipe ?"
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            aria-busy={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Envoi…
              </>
            ) : (
              <>
                Envoyer le message
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
