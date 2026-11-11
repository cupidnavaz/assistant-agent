type AvatarProps = {
  name: string;
  url: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-20 text-2xl',
} as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
}

export default function Avatar({ name, url, size = 'md' }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  if (url) {
    return (
      <img
        src={url}
        alt={`${name} avatar`}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white transition-shadow duration-300 hover:shadow-[0_0_16px_-2px] hover:shadow-brand-orange/60`}
      />
    );
  }
  return (
    <span
      aria-label={`${name} avatar`}
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-indigo to-brand-deep font-display font-bold text-white ring-2 ring-white transition-shadow duration-300 hover:shadow-[0_0_16px_-2px] hover:shadow-brand-orange/60`}
    >
      {initialsOf(name)}
    </span>
  );
}