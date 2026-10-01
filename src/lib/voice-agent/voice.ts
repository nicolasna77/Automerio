import type { Configuration } from "@/lib/catalog";

// Réglages de voix des solutions téléphoniques : la voix de l'assistant, son
// débit et son ton. Les valeurs inconnues retombent sur les valeurs par
// défaut, pour qu'un réglage corrompu ne fasse jamais échouer un appel.

export const VOICE_OPTIONS = [
  { value: "marin", label: "Marin : voix féminine, naturelle (recommandée)" },
  { value: "cedar", label: "Cedar : voix masculine, naturelle (recommandée)" },
  { value: "coral", label: "Coral : voix féminine, chaleureuse" },
  { value: "sage", label: "Sage : voix féminine, calme" },
  { value: "ash", label: "Ash : voix masculine, claire" },
  { value: "verse", label: "Verse : voix masculine, expressive" },
] as const;

export const SPEAKING_RATE_OPTIONS = [
  { value: "0.9", label: "Posé" },
  { value: "1", label: "Normal" },
  { value: "1.1", label: "Un peu plus rapide" },
] as const;

export const TONE_OPTIONS = [
  { value: "warm", label: "Chaleureux" },
  { value: "professional", label: "Professionnel et sobre" },
  { value: "energetic", label: "Dynamique" },
] as const;

const DEFAULT_VOICE = "marin";
const DEFAULT_SPEED = 1;

const TONE_INSTRUCTIONS: Record<(typeof TONE_OPTIONS)[number]["value"], string> = {
  warm: "Ton chaleureux et rassurant, comme un accueil de proximité.",
  professional: "Ton professionnel, sobre et précis, sans familiarité.",
  energetic: "Ton dynamique et souriant, avec de l'entrain, sans parler trop vite.",
};

function pick<T extends readonly { value: string }[]>(options: T, value: unknown): T[number]["value"] | null {
  return options.find((option) => option.value === value)?.value ?? null;
}

export function voiceSettingsOf(configuration: Configuration): { voice: string; speed: number } {
  return {
    voice: pick(VOICE_OPTIONS, configuration.voice) ?? DEFAULT_VOICE,
    speed: Number(pick(SPEAKING_RATE_OPTIONS, configuration.speakingRate) ?? DEFAULT_SPEED),
  };
}

export function toneInstructionOf(configuration: Configuration): string {
  return TONE_INSTRUCTIONS[pick(TONE_OPTIONS, configuration.tone) ?? "warm"];
}
