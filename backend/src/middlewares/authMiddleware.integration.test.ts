// @ts-nocheck
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { authMiddleware } from "./authMiddleware.js";

const previousSecret = process.env.JWT_SECRET;
const originalMethods = {
  invoiceFindMany: prisma.invoice.findMany,
  subscriptionFindUnique: prisma.subscription.findUnique,
  restaurantUpdate: prisma.restaurant.update,
};

afterEach(() => {
  process.env.JWT_SECRET = previousSecret;
  prisma.invoice.findMany = originalMethods.invoiceFindMany;
  prisma.subscription.findUnique = originalMethods.subscriptionFindUnique;
  prisma.restaurant.update = originalMethods.restaurantUpdate;
});

function createToken(role = "ADMIN", restaurantId = 1) {
  process.env.JWT_SECRET = "billing-middleware-test-secret";
  return jwt.sign({ id: 1, role, restaurantId }, process.env.JWT_SECRET);
}

async function request(path, role = "ADMIN") {
  const app = express();
  app.get(path, authMiddleware, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { Authorization: `Bearer ${createToken(role)}` },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("bloqueia qualquer rota privada do restaurante após a tolerância", async () => {
  prisma.invoice.findMany = async () => [
    {
      id: 41,
      status: "ATRASADO",
      dueDate: new Date("2026-06-01T12:00:00.000Z"),
      paymentLink: null,
    },
  ];
  prisma.subscription.findUnique = async () => null;
  prisma.restaurant.update = async () => ({ id: 1, active: false });

  const response = await request("/private-operation");
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "BILLING_BLOCKED");
});

test("mantém cobrança acessível para o admin inadimplente pagar", async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const response = await request("/billing/invoices");
  assert.equal(response.status, 200);
  assert.equal(queriedInvoices, false);
});

test("SUPER_ADMIN nunca é bloqueado pela cobrança do restaurante", async () => {
  let queriedInvoices = false;
  prisma.invoice.findMany = async () => {
    queriedInvoices = true;
    return [];
  };

  const response = await request("/private-operation", "SUPER_ADMIN");
  assert.equal(response.status, 200);
  assert.equal(queriedInvoices, false);
});
