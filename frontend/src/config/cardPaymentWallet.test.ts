import { describe, expect, it } from "vitest";

import {
  getCardCheckoutFieldErrors,
  getExpectedCardCvvLength,
  normalizeCardNumberInput,
  sanitizeCardDraft,
} from "./cardPaymentWallet";

describe("card payment validation", () => {
  it("sanitizes the saved card fields", () => {
    expect(
      sanitizeCardDraft({
        holderName: "Ana Silva",
        brand: "Visa",
        lastFour: "12a345",
      }),
    ).toEqual({
      holderName: "Ana Silva",
      brand: "Visa",
      lastFour: "1234",
    });
  });

  it("formats a card number without keeping non-digits", () => {
    expect(normalizeCardNumberInput("4111-1111 1111.1111")).toBe(
      "4111 1111 1111 1111",
    );
  });

  it("requires four CVV digits for American Express", () => {
    expect(getExpectedCardCvvLength("American Express")).toBe(4);
    expect(getExpectedCardCvvLength("Visa")).toBe(3);
  });

  it("accepts a valid Visa checkout", () => {
    const errors = getCardCheckoutFieldErrors({
      cardDraft: {
        holderName: "Ana Silva",
        brand: "Visa",
        lastFour: "1111",
      },
      cardNumber: "4111 1111 1111 1111",
      cardExpiry: "12/99",
      cardCvv: "123",
    });

    expect(errors).toEqual({});
  });

  it("rejects a card number that fails the Luhn check", () => {
    const errors = getCardCheckoutFieldErrors({
      cardDraft: {
        holderName: "Ana Silva",
        brand: "Visa",
        lastFour: "1112",
      },
      cardNumber: "4111 1111 1111 1112",
      cardExpiry: "12/99",
      cardCvv: "123",
    });

    expect(errors.cardNumber).toBeDefined();
  });
});
