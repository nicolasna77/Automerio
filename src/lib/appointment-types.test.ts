import { describe, expect, it } from "vitest";
import { readAppointmentTypes } from "./catalog";
import { buildSystemPrompt } from "./voice-agent/prompt";

describe("prestations et durées", () => {
  it("lit les prestations avec leur durée", () => {
    expect(
      readAppointmentTypes([
        { trigger: "Coupe femme", target: "45" },
        { trigger: "Couleur", target: "90" },
      ])
    ).toEqual([
      { name: "Coupe femme", minutes: 45 },
      { name: "Couleur", minutes: 90 },
    ]);
  });

  it("garde lisibles les anciens réglages, une simple liste de noms", () => {
    expect(readAppointmentTypes(["Devis", " Entretien "])).toEqual([
      { name: "Devis", minutes: null },
      { name: "Entretien", minutes: null },
    ]);
  });

  it("ignore les lignes sans nom et les durées invalides", () => {
    expect(
      readAppointmentTypes([
        { trigger: "  ", target: "30" },
        { trigger: "Brushing", target: "" },
      ])
    ).toEqual([{ name: "Brushing", minutes: null }]);
    expect(readAppointmentTypes(undefined)).toEqual([]);
  });

  it("donne à l'assistant la durée de chaque prestation, et la durée par défaut", () => {
    const prompt = buildSystemPrompt(
      "prise-rdv-telephone",
      {
        objectives: ["appointment"],
        slotDuration: "30",
        appointmentTypes: [
          { trigger: "Coupe femme", target: "45" },
          { trigger: "Brushing", target: "" },
        ],
      },
      { calendarConnected: true, companyName: "Salon Élégance" }
    );
    expect(prompt).toContain("Coupe femme (45 min), Brushing (30 min)");
    expect(prompt).toContain("utilise sa durée dans check_availability et book_appointment");
    expect(prompt).toContain("Pour une autre demande, compte 30 minutes.");
  });

  it("ne promet pas de durée par prestation quand l'agenda impose la sienne", () => {
    const prompt = buildSystemPrompt(
      "prise-rdv-telephone",
      { objectives: ["appointment"], appointmentTypes: [{ trigger: "Couleur", target: "90" }] },
      { calendarConnected: true, collectsEmail: true, fixedDurationMinutes: 30, companyName: "Salon" }
    );
    expect(prompt).toContain("Prestations proposées : Couleur.");
    expect(prompt).toContain("Chaque rendez-vous dure 30 minutes");
    expect(prompt).not.toContain("90 min");
  });
});
