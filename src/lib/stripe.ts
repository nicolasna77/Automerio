import Stripe from "stripe";
import { envWithDevFallback } from "@/lib/env";

export const stripeClient = new Stripe(
  envWithDevFallback(["STRIPE_SECRET_KEY"], "sk_test_placeholder"),
  { apiVersion: "2026-08-26.dahlia" }
);
