"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/action-result";
import { getErrorMessage } from "@/lib/utils";
import type { Configuration } from "@/lib/catalog";
import { previewVoice, type VoicePreviewTarget } from "./voice-preview-actions";

const asText = (value: Configuration[string] | undefined) => (typeof value === "string" ? value : "");

// Onglet « Voix » des réglages et étape « Voix » de l'activation : écouter le
// message d'accueil avec les réglages en cours (même non enregistrés), sans
// passer d'appel.
export function VoicePreview({ target, values }: { target: VoicePreviewTarget; values: Configuration }) {
  const t = useTranslations("Dashboard.voicePreview");
  const [isLoading, startLoading] = useTransition();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // La voix met une à trois secondes à arriver : si l'on quitte la page entre
  // temps, elle ne doit pas se lancer sur la page suivante.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioRef.current?.pause();
    };
  }, []);

  function stop() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function play() {
    startLoading(async () => {
      try {
        const source = unwrap(
          await previewVoice(target, {
            voice: asText(values.voice),
            speakingRate: asText(values.speakingRate),
            tone: asText(values.tone),
            greeting: asText(values.greetingMessage),
          })
        );
        if (!mountedRef.current) return;
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

  // Un seul bouton dont le libellé change : le focus clavier reste dessus
  // pendant la génération et la lecture (better-accessibility).
  const label = playing ? t("stop") : t("listen");
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/40 p-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-disabled={isLoading || undefined}
        aria-busy={isLoading || undefined}
        onClick={() => {
          if (isLoading) return;
          if (playing) stop();
          else play();
        }}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" aria-hidden="true" data-icon="inline-start" />
        ) : playing ? (
          <Square aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Play aria-hidden="true" data-icon="inline-start" />
        )}
        {label}
      </Button>
      <p className="min-w-0 flex-1 text-sm text-pretty text-muted-foreground">
        {t("hint")}
      </p>
    </div>
  );
}
