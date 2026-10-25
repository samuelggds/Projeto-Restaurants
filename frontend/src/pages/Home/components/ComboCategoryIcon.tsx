/**
 * Compact menu-category pictogram: sandwich, fries and drink.
 *
 * Kept in one SVG so the three items stay grouped on narrow mobile tabs.
 * Inherits the restaurant's currentColor; no new palette or brand assets.
 */
export function ComboCategoryIcon() {
  return (
    <svg
      className="combo-category-icon"
      width="42"
      height="24"
      viewBox="0 0 42 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Sandwich */}
      <path d="M1.5 10.4c.2-3.5 3.1-6 6.9-6s6.7 2.5 6.9 6H1.5Z" />
      <path d="M1.7 12.7h13.4M3.5 15.5h9.8M2.4 17.8h12.1" />
      {/* Fries */}
      <path d="M20 5.4v5.1M23.4 4.2v6.3M26.8 5.2v5.3" />
      <path d="M18.7 10.3H28l-1.3 9h-6.8l-1.2-9Z" />
      {/* Drink with a straw */}
      <path d="M30.7 8h9.5l-1.1 11.3H32L30.7 8Z" />
      <path d="M29.9 8h11M35 8V3.9l4.2-2.1M32 12.2h6.9" />
    </svg>
  );
}
