import OpenAI from "openai";

/**
 * Un client par appel plutot qu'un singleton de module : la cle est lue au
 * moment de l'appel, si bien qu'un build sans `OPENAI_API_KEY` passe, et
 * seules les fonctionnalites qui s'en servent echouent a l'execution.
 */
export function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
