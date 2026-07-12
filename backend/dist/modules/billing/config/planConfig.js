import { PlanType } from "@prisma/client";
export const PLAN_CONFIG = {
    [PlanType.BASICO]: {
        name: "Básico",
        monthlyFee: 100,
        trialDays: 30,
    },
    [PlanType.PROFISSIONAL]: {
        name: "Profissional",
        monthlyFee: 200,
        trialDays: 30,
    },
    [PlanType.PREMIUM]: {
        name: "Premium",
        monthlyFee: 300,
        trialDays: 30,
    },
};
