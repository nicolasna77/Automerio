import { describe, expect, it } from "vitest";
import { describeUserAgent } from "./user-agent";

describe("describeUserAgent", () => {
  it("nomme le navigateur et le système", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
    ).toBe("Chrome sur Windows");
    expect(
      describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1")
    ).toBe("Safari sur iPhone");
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0")
    ).toBe("Edge sur Windows");
    expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe(
      "Firefox sur Mac"
    );
  });

  it("reconnaît les outils et les appareils inconnus", () => {
    expect(describeUserAgent("curl/7.83.0")).toBe("Outil en ligne de commande (curl)");
    expect(describeUserAgent("node")).toBe("Script ou serveur");
    expect(describeUserAgent(null)).toBe("Appareil inconnu");
    expect(describeUserAgent("quelque chose")).toBe("Appareil inconnu");
  });
});
