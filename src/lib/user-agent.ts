const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent?.trim()) return "Appareil inconnu";
  if (/^curl\//i.test(userAgent)) return "Outil en ligne de commande (curl)";
  if (/bot|crawler|spider/i.test(userAgent)) return "Robot";
  if (/node|undici|axios|python-requests|Go-http-client/i.test(userAgent)) return "Script ou serveur";

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} sur ${system}`;
  return browser ?? system ?? "Appareil inconnu";
}
