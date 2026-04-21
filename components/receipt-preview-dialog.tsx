"use client";

import Image from "next/image";
import { useState } from "react";

type ReceiptPreviewDialogProps = {
  orderId: string;
  receiptUrl: string;
};

export function ReceiptPreviewDialog({ orderId, receiptUrl }: ReceiptPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-slate-300"
      >
        <Image
          src={receiptUrl}
          alt={`رسید پرداخت ${orderId}`}
          width={160}
          height={104}
          unoptimized
          className="h-24 w-full object-cover"
        />
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
      >
        مشاهده بزرگ‌تر
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-700">پیش‌نمایش رسید سفارش {orderId}</div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                بستن
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src={receiptUrl}
                alt={`رسید پرداخت ${orderId}`}
                width={800}
                height={600}
                unoptimized
                className="h-auto max-h-[60vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
