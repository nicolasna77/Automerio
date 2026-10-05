import { describe, expect, it } from "vitest";
import { TESTIMONIALS } from "./testimonials";

describe("avis clients", () => {
  it("ne publie que des avis courts, accordés et vérifiables", () => {
    for (const testimonial of TESTIMONIALS) {
      expect(testimonial.quote.length, testimonial.name).toBeLessThanOrEqual(220);
      expect(JSON.stringify(testimonial)).not.toMatch(/[—–]/);
      expect(testimonial.name.trim().length).toBeGreaterThan(2);
      expect(testimonial.role.trim().length).toBeGreaterThan(2);
      expect(testimonial.consentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(testimonial.consentDate).getTime()).toBeLessThanOrEqual(Date.now());
      expect(testimonial.consentSource.trim().length).toBeGreaterThan(5);
    }
  });
});
