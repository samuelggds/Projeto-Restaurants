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

type ResolvedCartTarget = {
  element: HTMLElement | null;
  box: CartFlyOrigin;
};

function elementBox(candidate: HTMLElement): CartFlyOrigin {
  const rect = candidate.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function isRenderedElement(candidate: HTMLElement) {
  const rect = candidate.getBoundingClientRect();
  const style = window.getComputedStyle(candidate);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function isElementInViewport(candidate: HTMLElement) {
  if (!isRenderedElement(candidate)) return false;
  const rect = candidate.getBoundingClientRect();
  return (
    rect.right > 0 &&
    rect.left < window.innerWidth &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight
  );
}

function clampBoxToViewport(box: CartFlyOrigin, margin = 12): CartFlyOrigin {
  const width = Math.max(1, Math.min(box.width || 48, Math.max(1, window.innerWidth - margin * 2)));
  const height = Math.max(
    1,
    Math.min(box.height || 48, Math.max(1, window.innerHeight - margin * 2)),
  );
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);

  return {
    left: Math.min(maxLeft, Math.max(margin, box.left)),
    top: Math.min(maxTop, Math.max(margin, box.top)),
    width,
    height,
  };
}

function fallbackCartTargetBox(): CartFlyOrigin {
  const size = 48;
  const margin = 18;
  const mobile = window.innerWidth <= 760;
  return {
    left: Math.max(margin, window.innerWidth - size - margin),
    top: mobile
      ? Math.max(margin, window.innerHeight - size - 88)
      : margin,
    width: size,
    height: size,
  };
}

function resolveCartTarget(): ResolvedCartTarget {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('[data-cart-fly-target]'),
  );
  const visible = candidates.find(isElementInViewport);
  if (visible) {
    return {
      element: visible,
      box: elementBox(visible),
    };
  }

  const rendered = candidates.find(isRenderedElement);
  if (rendered) {
    return {
      element: null,
      box: clampBoxToViewport(elementBox(rendered)),
    };
  }

  return {
    element: null,
    box: fallbackCartTargetBox(),
  };
}

function visibleCartTarget() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-cart-fly-target]')).find(
    isElementInViewport,
  );
}

function visibleCartSource() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-cart-fly-source]')).find(
    isElementInViewport,
  );
}

function fallbackCartFlyOrigin(): CartFlyOrigin {
  const size = 56;
  const maxLeft = Math.max(12, window.innerWidth - size - 12);
  const maxTop = Math.max(12, window.innerHeight - size - 12);
  return {
    left: Math.min(maxLeft, Math.max(12, window.innerWidth / 2 - size / 2)),
    top: Math.min(maxTop, Math.max(12, window.innerHeight * 0.56 - size / 2)),
    width: size,
    height: size,
  };
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

export function cartFlyMidpoint(origin: CartFlyOrigin, target: CartFlyOrigin) {
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

function createCartFlyPreview(imageUrl: string | undefined, accentColor: string) {
  const preview = document.createElement('div');
  preview.setAttribute('data-cart-fly-preview', 'true');
  preview.setAttribute('aria-hidden', 'true');
  preview.style.display = 'grid';
  preview.style.placeItems = 'center';
  preview.style.overflow = 'hidden';
  preview.style.background = accentColor;
  preview.style.color = '#fff';
  preview.style.fontWeight = '800';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    image.decoding = 'async';
    Object.assign(image.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: 'cover',
    });
    image.addEventListener(
      'error',
      () => {
        image.remove();
        preview.textContent = '✓';
      },
      { once: true },
    );
    preview.appendChild(image);
  } else {
    preview.textContent = '✓';
  }

  return preview;
}

function bounceVisibleCartTarget() {
  const target = visibleCartTarget();
  if (!target || typeof target.animate !== 'function') return;

  target.animate(
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

  const source =
    origin ||
    captureCartFlyOrigin(sourceElement) ||
    captureCartFlyOrigin(visibleCartSource()) ||
    fallbackCartFlyOrigin();
  const target = resolveCartTarget();
  const targetBox = target.box;

  const sourceCenterX = source.left + source.width / 2;
  const sourceCenterY = source.top + source.height / 2;
  const targetCenterX = targetBox.left + targetBox.width / 2;
  const targetCenterY = targetBox.top + targetBox.height / 2;
  const midpoint = cartFlyMidpoint(source, targetBox);
  const size = Math.max(42, Math.min(72, Math.min(source.width, source.height) || 56));
  const startLeft = sourceCenterX - size / 2;
  const startTop = sourceCenterY - size / 2;
  const middleX = midpoint.x - sourceCenterX;
  const middleY = midpoint.y - sourceCenterY;
  const endX = targetCenterX - sourceCenterX;
  const endY = targetCenterY - sourceCenterY;

  const preview = createCartFlyPreview(imageUrl, accentColor);
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

  const finish = () => {
    preview.remove();
    bounceVisibleCartTarget();
  };

  const keyframes: Keyframe[] = [
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
  ];

  if (typeof preview.animate === 'function') {
    const animation = preview.animate(keyframes, {
      duration: 1_150,
      easing: 'cubic-bezier(.18,.76,.2,1)',
      fill: 'forwards',
    });

    void animation.finished
      .catch(() => undefined)
      .finally(finish);
    return true;
  }

  preview.style.transition =
    'transform 700ms cubic-bezier(.18,.76,.2,1), opacity 700ms ease';
  window.requestAnimationFrame(() => {
    preview.style.transform = `translate3d(${endX}px, ${endY}px, 0) scale(.12)`;
    preview.style.opacity = '0.16';
  });
  window.setTimeout(finish, 740);
  return true;
}

export function scheduleProductToCartAnimation(input: AnimateProductToCartInput) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ) {
    return false;
  }

  const capturedOrigin =
    input.origin ||
    captureCartFlyOrigin(input.sourceElement) ||
    captureCartFlyOrigin(visibleCartSource()) ||
    fallbackCartFlyOrigin();

  window.requestAnimationFrame(() => {
    animateProductToCart({
      ...input,
      origin: capturedOrigin,
    });
  });

  return true;
}
