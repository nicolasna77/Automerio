"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { Configuration } from "@/lib/catalog";
import { previewVoice } from "./voice-preview-actions";

const asText = (value: Configuration[string] | undefined) => (typeof value === "string" ? value : "");

// Onglet « Voix » des réglages : écouter le message d'accueil avec les
// réglages en cours (même non enregistrés), sans passer d'appel.
export function VoicePreview({ clientServiceId, values }: { clientServiceId: string; values: Configuration }) {
  const [isLoading, startLoading] = useTransition();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  function stop() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function play() {
    startLoading(async () => {
      try {
        const source = unwrap(
          await previewVoice(clientServiceId, {
            voice: asText(values.voice),
            speakingRate: asText(values.speakingRate),
            tone: asText(values.tone),
            greeting: asText(values.greetingMessage),
          })
        );
        audioRef.current?.pause();
        const audio = new Audio(source);
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;
        await audio.play();
        setPlaying(true);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/40 p-4">
      {playing ? (
        <Button type="button" variant="outline" size="sm" onClick={stop}>
          <Square aria-hidden="true" data-icon="inline-start" />
          Arrêter
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={play} disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? (
            <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
          ) : (
            <Play aria-hidden="true" data-icon="inline-start" />
          )}
          Écouter un exemple
        </Button>
      )}
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        L&apos;assistant lit votre message d&apos;accueil avec ces réglages, sans passer d&apos;appel.
        Un aperçu fidèle de la voix ; en appel, elle passe par le téléphone.
      </p>
    </div>
  );
}
