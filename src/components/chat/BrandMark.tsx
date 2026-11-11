import { Heart } from 'lucide-react';

type BrandMarkProps = { size?: 'sm' | 'md'; className?: string; logoUrl?: string | null };

export default function BrandMark({ size = 'md', className = '', logoUrl }: BrandMarkProps) {
  const box = size === 'sm' ? 'size-7 rounded-xl' : 'size-10 rounded-2xl';
  if (logoUrl) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white p-1 shadow-[0_0_14px_-2px] shadow-brand-orange/50 transition-shadow duration-300 hover:shadow-[0_0_20px_-2px] hover:shadow-brand-orange/70 ${box} ${className}`}
      >
        <img src={logoUrl} alt="" className="size-full object-contain" />
      </span>
    );
  }
  const icon = size === 'sm' ? 'size-3.5' : 'size-5';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-orange to-brand-indigo text-white shadow-[0_0_14px_-2px] shadow-brand-orange/50 transition-shadow duration-300 hover:shadow-[0_0_20px_-2px] hover:shadow-brand-orange/70 ${box} ${className}`}
    >
      <Heart className={icon} strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}