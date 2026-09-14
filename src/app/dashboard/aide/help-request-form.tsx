"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { HelpRequestServiceOption } from "@/lib/help";
import { submitHelpRequest } from "./actions";

const NO_SERVICE_VALUE = "none";
const EMPTY_VALUES = {
  subject: "",
  message: "",
  clientServiceId: NO_SERVICE_VALUE,
};

export function HelpRequestForm({
  services,
}: {
  services: HelpRequestServiceOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(EMPTY_VALUES);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        unwrap(
          await submitHelpRequest({
            subject: values.subject,
            message: values.message,
            clientServiceId:
              values.clientServiceId === NO_SERVICE_VALUE
                ? null
                : values.clientServiceId,
          })
        );
        toast.success("Votre demande a été envoyée à l'équipe Automerio.");
        setValues(EMPTY_VALUES);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  const serviceLabel = (service: (typeof services)[number]) =>
    service.name !== service.serviceName
      ? `${service.name} (${service.serviceName})`
      : service.name;
  const serviceItems = {
    [NO_SERVICE_VALUE]: "Question générale",
    ...Object.fromEntries(services.map((s) => [s.clientServiceId, serviceLabel(s)])),
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="help-service">Solution concernée</Label>
            <Select
              value={values.clientServiceId}
              onValueChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  clientServiceId: value ?? NO_SERVICE_VALUE,
                }))
              }
              items={serviceItems}
            >
              <SelectTrigger id="help-service" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SERVICE_VALUE}>
                  Question générale
                </SelectItem>
                {services.map((service) => (
                  <SelectItem
                    key={service.clientServiceId}
                    value={service.clientServiceId}
                  >
                    {serviceLabel(service)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="help-subject">Objet</Label>
            <Input
              id="help-subject"
              required
              placeholder="Ex. Numéro de téléphone injoignable"
              value={values.subject}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, subject: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="help-message">Message</Label>
            <Textarea
              id="help-message"
              required
              rows={5}
              placeholder="Que se passe-t-il, et depuis quand ? Plus c'est précis, plus vite nous pourrons vous aider."
              value={values.message}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, message: e.target.value }))
              }
            />
          </div>

          <Button type="submit" disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <>
                <Loader2
                  className="animate-spin"
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                Envoi…
              </>
            ) : (
              <>
                <Send aria-hidden="true" data-icon="inline-start" />
                Envoyer ma demande
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
