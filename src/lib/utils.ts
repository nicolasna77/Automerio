export { cn } from "cn"

const MASKED_ERROR = /Minified React error|Server Components render|omitted in production/i

export function getErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  if (!(err instanceof Error) || !err.message || MASKED_ERROR.test(err.message)) return fallback
  return err.message
}

export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || "organisation"}-${suffix}`
}
