import { describe, expect, it } from "vitest";
import { isAcceptableAvatar, MAX_AVATAR_DATA_URL_LENGTH } from "./avatar-image";

const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQ==";

describe("isAcceptableAvatar", () => {
  it("accepte l'absence de photo", () => {
    expect(isAcceptableAvatar(null)).toBe(true);
    expect(isAcceptableAvatar(undefined)).toBe(true);
    expect(isAcceptableAvatar("")).toBe(true);
  });

  it("accepte une photo JPEG, PNG ou WebP encodée en base64", () => {
    expect(isAcceptableAvatar(jpeg)).toBe(true);
    expect(isAcceptableAvatar("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isAcceptableAvatar("data:image/webp;base64,UklGRg==")).toBe(true);
  });

  it("refuse les autres types d'image, dont le SVG", () => {
    expect(isAcceptableAvatar("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isAcceptableAvatar("data:image/gif;base64,R0lGODlh")).toBe(false);
    expect(isAcceptableAvatar("data:text/html;base64,PGh0bWw+")).toBe(false);
  });

  it("refuse une data URL qui n'est pas du base64", () => {
    expect(isAcceptableAvatar("data:image/jpeg,<script>")).toBe(false);
    expect(isAcceptableAvatar("data:image/jpeg;base64,abc\"onerror=x")).toBe(false);
  });

  it("refuse une photo de plus de 150 Ko", () => {
    const prefix = "data:image/jpeg;base64,";
    const atLimit = prefix + "A".repeat(MAX_AVATAR_DATA_URL_LENGTH - prefix.length);
    expect(isAcceptableAvatar(atLimit)).toBe(true);
    expect(isAcceptableAvatar(atLimit + "A")).toBe(false);
  });

  it("accepte la photo de profil Google, et seulement elle", () => {
    expect(isAcceptableAvatar("https://lh3.googleusercontent.com/a/ACg8ocK=s96-c")).toBe(true);
    expect(isAcceptableAvatar("http://lh3.googleusercontent.com/a/x")).toBe(false);
    expect(isAcceptableAvatar("https://lh3.googleusercontent.com.evil.fr/a")).toBe(false);
    expect(isAcceptableAvatar("https://evil.fr/lh3.googleusercontent.com")).toBe(false);
    expect(isAcceptableAvatar("https://lh3.googleusercontent.com:8443/a")).toBe(false);
    expect(isAcceptableAvatar("javascript:alert(1)")).toBe(false);
  });

  it("refuse ce qui n'est pas une chaîne", () => {
    expect(isAcceptableAvatar(42)).toBe(false);
    expect(isAcceptableAvatar({})).toBe(false);
  });
});
