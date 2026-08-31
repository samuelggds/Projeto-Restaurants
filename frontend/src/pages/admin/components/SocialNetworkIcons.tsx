type SocialNetworkIconProps = {
  className?: string;
  size?: number;
};

function iconProps(brand: string, className: string | undefined, size: number) {
  return {
    'aria-hidden': true as const,
    className,
    'data-brand': brand,
    focusable: false as const,
    height: size,
    viewBox: '0 0 24 24',
    width: size,
  };
}

export function InstagramBrandIcon({ className, size = 20 }: SocialNetworkIconProps) {
  return (
    <svg {...iconProps('instagram', className, size)}>
      <defs>
        <linearGradient id="admin-instagram-gradient" x1="2" x2="22" y1="22" y2="2">
          <stop offset="0" stopColor="#ffdc80" />
          <stop offset="0.3" stopColor="#fcaf45" />
          <stop offset="0.52" stopColor="#f77737" />
          <stop offset="0.72" stopColor="#e1306c" />
          <stop offset="1" stopColor="#833ab4" />
        </linearGradient>
      </defs>
      <rect width="20" height="20" x="2" y="2" rx="5.8" fill="url(#admin-instagram-gradient)" />
      <circle cx="12" cy="12" r="4.25" fill="none" stroke="#fff" strokeWidth="1.9" />
      <circle cx="17.65" cy="6.35" r="1.2" fill="#fff" />
    </svg>
  );
}

export function FacebookBrandIcon({ className, size = 20 }: SocialNetworkIconProps) {
  return (
    <svg {...iconProps('facebook', className, size)}>
      <circle cx="12" cy="12" r="10" fill="#1877f2" />
      <path
        fill="#fff"
        d="M13.45 21v-8h2.7l.4-3.12h-3.1v-2c0-.9.25-1.52 1.56-1.52h1.66V3.57c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.15v2.28H7.5V13h2.71v8h3.24Z"
      />
    </svg>
  );
}

const tiktokGlyph =
  'M14.1 2.4h-3v12.03a2.35 2.35 0 1 1-2.03-2.33V9.06a5.35 5.35 0 1 0 5.03 5.33V8.25a7.72 7.72 0 0 0 4.4 1.39V6.57a4.68 4.68 0 0 1-4.4-4.17Z';

export function TikTokBrandIcon({ className, size = 20 }: SocialNetworkIconProps) {
  return (
    <svg {...iconProps('tiktok', className, size)}>
      <path d={tiktokGlyph} fill="#25f4ee" transform="translate(-0.65 0.35)" />
      <path d={tiktokGlyph} fill="#fe2c55" transform="translate(0.65 -0.15)" />
      <path d={tiktokGlyph} fill="#161616" />
    </svg>
  );
}

export function YouTubeBrandIcon({ className, size = 20 }: SocialNetworkIconProps) {
  return (
    <svg {...iconProps('youtube', className, size)}>
      <rect width="22" height="15.5" x="1" y="4.25" rx="4.4" fill="#ff0033" />
      <path fill="#fff" d="m10 8.35 5.9 3.65-5.9 3.65V8.35Z" />
    </svg>
  );
}
