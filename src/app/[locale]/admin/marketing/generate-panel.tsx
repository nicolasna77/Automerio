"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { MarketingChannel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_RULES } from "@/lib/marketing/channels";
import { generatePostsAction } from "./actions";

const CHANNELS = Object.keys(CHANNEL_RULES) as MarketingChannel[];
const COUNTS = [1, 2, 3, 4, 5];

export function GeneratePanel() {
  const [channel, setChannel] = useState<MarketingChannel>("LINKEDIN");
  const [count, setCount] = useState(2);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      try {
        await generatePostsAction(channel, count);
        toast.success(
          count > 1 ? `${count} propositions ajoutées à relire.` : "Proposition ajoutée à relire."
        );
      } catch {
        toast.error("La génération a échoué. Réessayez.");
      }
    });
  }

  const rule = CHANNEL_RULES[channel];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="channel">Réseau</Label>
          <Select
            value={channel}
            onValueChange={(value) => setChannel(value as MarketingChannel)}
            items={Object.fromEntries(CHANNELS.map((c) => [c, CHANNEL_RULES[c].label]))}
          >
            <SelectTrigger id="channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((value) => (
                <SelectItem key={value} value={value}>
                  {CHANNEL_RULES[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:w-32">
          <Label htmlFor="count">Propositions</Label>
          <Select value={String(count)} onValueChange={(value) => setCount(Number(value))}>
            <SelectTrigger id="count">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerate} disabled={pending} className="sm:mb-0">
          <Sparkles data-icon="inline-start" />
          {pending ? "Rédaction…" : "Proposer"}
        </Button>
      </CardContent>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          Sur {rule.label}, on s&apos;adresse à {rule.audience}.{" "}
          {rule.needsImage
            ? "Ce réseau exige une image : l'agent décrit le visuel à produire."
            : `Environ ${rule.targetChars} caractères.`}
        </p>
      </CardContent>
    </Card>
  );
}
