"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { CopyButton } from "@/components/copy-button";
import { truncateConfig } from "@/lib/format";

type DeliveredConfigCardProps = {
  config: string;
};

export function DeliveredConfigCard({ config }: DeliveredConfigCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function buildQrCode() {
      try {
        const url = await QRCode.toDataURL(config, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 132,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        if (isMounted) {
          setQrCodeUrl(url);
        }
      } catch {
        if (isMounted) {
          setQrCodeUrl("");
        }
      }
    }

    buildQrCode();

    return () => {
      isMounted = false;
    };
  }, [config]);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-emerald-900">کانفیگ تحویل‌شده</div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_112px] lg:items-start">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-emerald-100 bg-white/90 p-2.5 text-[11px] leading-5 text-slate-700">
          {truncateConfig(config, 150)}
        </pre>

        <div className="flex flex-col items-center rounded-lg border border-emerald-100 bg-white/90 p-2.5">
          {qrCodeUrl ? (
            <Image
              src={qrCodeUrl}
              alt="QR کانفیگ"
              width={88}
              height={88}
              unoptimized
              className="rounded-md"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-md bg-slate-100 text-center text-[10px] text-slate-500">
              QR آماده نشد
            </div>
          )}

          <div className="mt-1.5 text-center text-[10px] text-slate-500">اسکن سریع</div>
        </div>
      </div>

      <div>
        <CopyButton value={config} />
      </div>
    </div>
  );
}
