import { describe, expect, it } from "vitest";
import {
  OAUTH_STATE_TTL_MS,
  signOAuthState,
  verifyOAuthState,
} from "./oauth-state";

const SECRET = "un-secret-de-test-assez-long-pour-etre-credible";
const ID = "clx0123456789abcdefghij";
const T0 = 1_800_000_000_000;

describe("signOAuthState / verifyOAuthState", () => {
  it("rend l'identifiant qu'il a signé", () => {
    expect(verifyOAuthState(SECRET, signOAuthState(SECRET, ID, T0), T0)).toBe(ID);
  });

  it("ne produit jamais deux fois la même chaîne pour un même identifiant", () => {
    // C'est l'apport de l'aléa : un state intercepté ne dit rien des suivants.
    const a = signOAuthState(SECRET, ID, T0);
    const b = signOAuthState(SECRET, ID, T0);
    expect(a).not.toBe(b);
    expect(verifyOAuthState(SECRET, a, T0)).toBe(ID);
    expect(verifyOAuthState(SECRET, b, T0)).toBe(ID);
  });

  it("refuse un state signé avec un autre secret", () => {
    const state = signOAuthState("un-autre-secret", ID, T0);
    expect(verifyOAuthState(SECRET, state, T0)).toBeNull();
  });

  it("refuse un identifiant modifié après signature", () => {
    const state = signOAuthState(SECRET, ID, T0);
    const falsifie = state.replace(ID, "clxvictime00000000000000");
    expect(verifyOAuthState(SECRET, falsifie, T0)).toBeNull();
  });

  it("refuse un instant d'émission repoussé pour prolonger la validité", () => {
    const state = signOAuthState(SECRET, ID, T0);
    const [id, , nonce, signature] = state.split(".");
    const rajeuni = [id, String(T0 + OAUTH_STATE_TTL_MS), nonce, signature].join(".");
    expect(verifyOAuthState(SECRET, rajeuni, T0)).toBeNull();
  });

  it("accepte jusqu'à la limite, refuse au-delà", () => {
    const state = signOAuthState(SECRET, ID, T0);
    expect(verifyOAuthState(SECRET, state, T0 + OAUTH_STATE_TTL_MS)).toBe(ID);
    expect(verifyOAuthState(SECRET, state, T0 + OAUTH_STATE_TTL_MS + 1)).toBeNull();
  });

  it("refuse un state émis dans le futur", () => {
    const state = signOAuthState(SECRET, ID, T0 + 60_000);
    expect(verifyOAuthState(SECRET, state, T0)).toBeNull();
  });

  it("refuse une forme inattendue", () => {
    expect(verifyOAuthState(SECRET, "", T0)).toBeNull();
    expect(verifyOAuthState(SECRET, ID, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, `${ID}.signature`, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, `${ID}.${T0}.nonce`, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, `${ID}.${T0}.nonce.sig.detrop`, T0)).toBeNull();
  });

  it("refuse un ancien state à deux segments, celui d'avant l'expiration", () => {
    // Les jetons émis par l'ancienne forme ne doivent plus être honorés.
    expect(verifyOAuthState(SECRET, `${ID}.abcdef0123456789`, T0)).toBeNull();
  });
});
