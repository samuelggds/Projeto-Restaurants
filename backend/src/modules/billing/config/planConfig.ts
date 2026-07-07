import { PlanType } from "@prisma/client";

export const PLAN_CONFIG = {
  [PlanType.BASICO]: {
    name: "Básico",
    monthlyFee: 100,
    splitRate: 0.04,
    trialDays: 30,
  },

  [PlanType.PROFISSIONAL]: {
    name: "Profissional",
    monthlyFee: 200,
    splitRate: 0.03,
    trialDays: 30,
  },

  [PlanType.PREMIUM]: {
    name: "Premium",
    monthlyFee: 300,
    splitRate: 0.02,
    trialDays: 30,
  },
};
