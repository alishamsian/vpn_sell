type PurchaseErrorCode = "INVALID_PLAN" | "OUT_OF_STOCK" | "PURCHASE_FAILED";

export class PurchaseError extends Error {
  code: PurchaseErrorCode;

  constructor(code: PurchaseErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type PurchaseInput = {
  planId: string;
  userId: string;
};

export async function purchasePlan({ planId, userId }: PurchaseInput) {
  void planId;
  void userId;

  throw new PurchaseError(
    "PURCHASE_FAILED",
    "خرید فوری غیرفعال شده است. ابتدا سفارش بسازید و سپس رسید پرداخت را ثبت کنید.",
  );
}
