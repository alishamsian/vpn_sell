import Image from "next/image";

/** بدون query string — Next.js 16 برای `next/image` به `localPatterns` نیاز دارد. برای کش: فایل را عوض کن یا نامش را عوض کن. */
const LOGO_SRC = "/vpn-alish-logo.png";

type BrandLogoProps = {
  /** عرض منطقی تصویر (نسبت با height حفظ می‌شود) */
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

/** لوگوی کامل برند (`public/vpn-alish-logo.png`) */
export function BrandLogo({
  width = 200,
  height = 72,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="VPN Alish"
      width={width}
      height={height}
      sizes="(max-width: 640px) 180px, (max-width: 1024px) 200px, 240px"
      className={`h-auto w-auto object-contain object-center ${className}`}
      priority={priority}
    />
  );
}

/** نشان کوچک برای بج‌ها (مثلاً ادمین) */
export function BrandMark({ className = "h-3.5 w-auto max-w-[4.5rem]" }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt=""
      width={72}
      height={28}
      className={`object-contain object-right ${className}`}
      aria-hidden
    />
  );
}
