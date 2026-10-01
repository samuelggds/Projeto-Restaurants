export type CartFlyOrigin = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type AnimateProductToCartInput = {
  origin?: CartFlyOrigin | null;
  sourceElement?: HTMLElement | null;
  imageUrl?: string;
  accentColor?: string;
};

function visibleCartTarget() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-cart-fly-target]')).find(
    (candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = window.getComputedStyle(candidate);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight
      );
    },
  );
}

export function captureCartFlyOrigin(element?: HTMLElement | null): CartFlyOrigin | null {
  if (!element) return null;
  const image = element.matches('img') ? element : element.querySelector<HTMLElement>('img');
  const source = image || element;
  const rect = source.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function cartFlyMidpoint(
  origin: CartFlyOrigin,
  target: CartFlyOrigin,
) {
  const sourceX = origin.left + origin.width / 2;
  const sourceY = origin.top + origin.height / 2;
  const targetX = target.left + target.width / 2;
  const targetY = target.top + target.height / 2;
  const distance = Math.hypot(targetX - sourceX, targetY - sourceY);
  return {
    x: (sourceX + targetX) / 2,
    y: Math.min(sourceY, targetY) - Math.max(70, Math.min(180, distance * 0.24)),
  };
}

export function animateProductToCart({
  origin,
  sourceElement,
  imageUrl,
  accentColor = '#e85a2b',
}: AnimateProductToCartInput) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ) {
    return false;
  }

  const target = visibleCartTarget();
  const source = origin || captureCartFlyOrigin(sourceElement);
  if (!target || !source) return false;

  const targetRect = target.getBoundingClientRect();
  const targetBox: CartFlyOrigin = {
    left: targetRect.left,
    top: targetRect.top,
    width: targetRect.width,
    height: targetRect.height,
  };

  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const targetCenterX = targetBox.left + targetBox.width / 2;
  const targetCenterY = targetBox.top + targetBox.height / 2;
  const midpoint = cartFlyMidpoint(source, targetBox);
  const size = Math.max(42, Math.min(72, Math.min(source.width, source.height) || 56));
  const startLeft = sourceCenterX - size / 2;
  const startTop = sourceCenterY - size / 2;

  const preview = imageUrl
    ? document.createElement('img')
    : document.createElement('div');

  preview.setAttribute('data-cart-fly-preview', 'true');
  preview.setAttribute('aria-hidden', 'true');
  if (preview instanceof HTMLImageElement) {
    preview.src = imageUrl || '';
    preview.alt = '';
    preview.decoding = 'async';
    preview.style.objectFit = 'cover';
  } else {
    preview.textContent = '✓';
    preview.style.display = 'grid';
    preview.style.placeItems = 'center';
    preview.style.background = accentColor;
    preview.style.color = '#fff';
    preview.style.fontWeight = '800';
  }

  Object.assign(preview.style, {
    position: 'fixed',
    left: `${startLeft}px`,
    top: `${startTop}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: '2147483000',
    pointerEvents: 'none',
    borderRadius: '16px',
    border: '2px solid rgba(255,255,255,.94)',
    boxShadow: '0 18px 38px rgba(24, 19, 15, .26)',
    transformOrigin: '50% 50%',
    willChange: 'transform, opacity, filter',
  });

  document.body.appendChild(preview);

  if (typeof preview.animate !== 'function') {
    preview.remove();
    return false;
  }

  const middleX = midpoint.x - sourceCenterX;
  const middleY = midpoint.y - sourceCenterY;
  const endX = targetCenterX - sourceCenterX;
  const endY = targetCenterY - sourceCenterY;

  const animation = preview.animate(
    [
      {
        transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
        opacity: 1,
        filter: 'brightness(1)',
      },
      {
        offset: 0.5,
        transform: `translate3d(${middleX}px, ${middleY}px, 0) scale(.86) rotate(6deg)`,
        opacity: 1,
        filter: 'brightness(1.04)',
      },
      {
        offset: 0.86,
        transform: `translate3d(${endX * 0.93}px, ${endY * 0.93}px, 0) scale(.38) rotate(-4deg)`,
        opacity: 0.94,
        filter: 'brightness(1.06)',
      },
      {
        transform: `translate3d(${endX}px, ${endY}px, 0) scale(.12) rotate(0deg)`,
        opacity: 0.16,
        filter: 'brightness(1.12)',
      },
    ],
    {
      duration: 1_150,
      easing: 'cubic-bezier(.18,.76,.2,1)',
      fill: 'forwards',
    },
  );

  void animation.finished
    .catch(() => undefined)
    .finally(() => {
      preview.remove();
      const currentTarget = visibleCartTarget() || target;
      if (typeof currentTarget.animate === 'function') {
        currentTarget.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.14)' },
            { transform: 'scale(.96)' },
            { transform: 'scale(1)' },
          ],
          {
            duration: 420,
            easing: 'cubic-bezier(.22,1,.36,1)',
          },
        );
      }
    });

  return true;
}
