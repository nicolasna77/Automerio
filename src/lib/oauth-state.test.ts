import { describe, expect, it } from "vitest";
import {
  OAUTH_STATE_TTL_MS,
  oauthNonceCookieOptions,
  signOAuthState,
  verifyOAuthState,
} from "./oauth-state";

const SECRET = "un-secret-de-test-assez-long-pour-etre-credible";
const ID = "clx0123456789abcdefghij";
const USER = "user_abc123";
const T0 = 1_800_000_000_000;

function issue(now = T0, id = ID, userId = USER) {
  return signOAuthState(SECRET, id, userId, now);
}

describe("signOAuthState / verifyOAuthState", () => {
  it("rend l'identifiant signé pour la même personne et le même nonce", () => {
    const { state, nonce } = issue();
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce }, T0)).toBe(ID);
  });

  it("ne produit jamais deux fois le même state ni le même nonce", () => {
    const a = issue();
    const b = issue();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("refuse un state rejoué par une autre personne connectée", () => {
    const { state, nonce } = issue();
    expect(verifyOAuthState(SECRET, state, { userId: "user_autre", nonce }, T0)).toBeNull();
  });

  it("refuse un state sans cookie de nonce, ou avec le nonce d'une autre connexion", () => {
    const { state } = issue();
    const autre = issue();
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce: undefined }, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce: null }, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce: "" }, T0)).toBeNull();
    expect(
      verifyOAuthState(SECRET, state, { userId: USER, nonce: autre.nonce }, T0)
    ).toBeNull();
  });

  it("refuse un state signé avec un autre secret", () => {
    const { state, nonce } = signOAuthState("un-autre-secret", ID, USER, T0);
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce }, T0)).toBeNull();
  });

  it("refuse un identifiant de solution ou de personne modifié après signature", () => {
    const { state, nonce } = issue();
    const parts = state.split(".");
    const victime = Buffer.from("clxvictime00000000000000").toString("base64url");
    const autreSolution = [victime, ...parts.slice(1)].join(".");
    expect(verifyOAuthState(SECRET, autreSolution, { userId: USER, nonce }, T0)).toBeNull();

    const attaquant = Buffer.from("user_attaquant").toString("base64url");
    const autrePersonne = [parts[0], attaquant, ...parts.slice(2)].join(".");
    expect(
      verifyOAuthState(SECRET, autrePersonne, { userId: "user_attaquant", nonce }, T0)
    ).toBeNull();
  });

  it("refuse un nonce remplacé dans le state", () => {
    const { state } = issue();
    const parts = state.split(".");
    const forge = "f".repeat(32);
    const falsifie = [...parts.slice(0, 3), forge, parts[4]].join(".");
    expect(verifyOAuthState(SECRET, falsifie, { userId: USER, nonce: forge }, T0)).toBeNull();
  });

  it("refuse un instant d'émission repoussé pour prolonger la validité", () => {
    const { state, nonce } = issue();
    const parts = state.split(".");
    const rajeuni = [parts[0], parts[1], String(T0 + OAUTH_STATE_TTL_MS), parts[3], parts[4]].join(".");
    expect(verifyOAuthState(SECRET, rajeuni, { userId: USER, nonce }, T0)).toBeNull();
  });

  it("accepte jusqu'à la limite, refuse au-delà", () => {
    const { state, nonce } = issue();
    const expected = { userId: USER, nonce };
    expect(verifyOAuthState(SECRET, state, expected, T0 + OAUTH_STATE_TTL_MS)).toBe(ID);
    expect(verifyOAuthState(SECRET, state, expected, T0 + OAUTH_STATE_TTL_MS + 1)).toBeNull();
  });

  it("refuse un state émis dans le futur", () => {
    const { state, nonce } = issue(T0 + 60_000);
    expect(verifyOAuthState(SECRET, state, { userId: USER, nonce }, T0)).toBeNull();
  });

  it("supporte un identifiant contenant un point", () => {
    const { state, nonce } = issue(T0, "id.avec.points", "user.point");
    expect(verifyOAuthState(SECRET, state, { userId: "user.point", nonce }, T0)).toBe(
      "id.avec.points"
    );
  });

  it("refuse une forme inattendue, dont l'ancien format à quatre segments", () => {
    const expected = { userId: USER, nonce: "nonce" };
    expect(verifyOAuthState(SECRET, "", expected, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, ID, expected, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, `${ID}.${T0}.nonce.sig`, expected, T0)).toBeNull();
    expect(verifyOAuthState(SECRET, `a.b.${T0}.nonce.sig.detrop`, expected, T0)).toBeNull();
  });
});

describe("oauthNonceCookieOptions", () => {
  it("pose un cookie HttpOnly, SameSite=Lax, limité au chemin et à la durée du state", () => {
    expect(oauthNonceCookieOptions("/api/instagram")).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/api/instagram",
      maxAge: OAUTH_STATE_TTL_MS / 1000,
    });
  });
});
