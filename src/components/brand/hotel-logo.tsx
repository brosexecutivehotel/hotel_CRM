import Image from "next/image";

type HotelLogoProps = {
  className?: string;
  size?: number;
};

export function HotelLogo({ className, size = 40 }: HotelLogoProps) {
  return (
    <Image
      alt="Bros Executive Hotel"
      className={className}
      height={size}
      priority
      src="/brand/bros-executive-logo.jpg"
      width={size}
    />
  );
}
