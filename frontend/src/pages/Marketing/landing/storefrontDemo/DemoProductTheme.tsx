import { createGlobalStyle } from 'styled-components';
import * as Ready from '../../../Home/components/ReadyProductDetail.styles';

export const DemoProductTheme = createGlobalStyle`
  html[data-storefront-theme='dark'] {
    ${Ready.Screen}, [data-testid='product-configurator'] {
      --product-surface: #202833;
      --product-control: #283340;
      --product-ink: #f4f5f8;
      --product-muted: #bdc6d2;
      --product-line: #4a5768;
      --product-highlight: #ff9999;
      --product-action: #bb303e;
      background: #161b23;
      color: var(--product-ink);
    }

    ${Ready.Screen} {
      --ink: var(--product-ink);
      --muted: var(--product-muted);
      --line: var(--product-line);
      --accent: var(--product-highlight);

      ${Ready.Layout}, ${Ready.DesktopHeader}, ${Ready.ProductPanel}, ${Ready.BottomAction} {
        background: var(--product-surface);
        border-color: var(--product-line);
      }
      ${Ready.Facts}, textarea, textarea:focus, [data-quantity-stepper],
      ${Ready.MobileActions} button {
        background: var(--product-control);
        border-color: var(--product-line);
        color: var(--product-ink);
      }
      h1, ${Ready.Facts} strong, [data-quantity-stepper] > strong { color: var(--product-ink); }
      .description, .eyebrow-row > small, ${Ready.Facts} small, ${Ready.Observation} small,
      textarea::placeholder, ${Ready.Assurance} { color: var(--product-muted); }
      ${Ready.Facts} .composition, ${Ready.Facts} .summary-grid article { border-color: var(--product-line); }
      ${Ready.AddButton}, .eyebrow-row .ready, .cart i {
        background: var(--product-action);
        color: #fff;
      }
      textarea:focus { border-color: var(--product-highlight); }
    }

    [data-testid='product-configurator'] {
      --config-primary: var(--product-highlight);

      .product-form, .product-details, .product-group, .product-observation, .product-bottom-bar {
        background: var(--product-surface);
        border-color: var(--product-line);
        color: var(--product-ink);
      }
      .product-details h1, .product-group h3 { color: var(--product-ink); }
      .product-details p, .product-group-header p, .product-image-caption,
      .product-group > div:last-child, textarea::placeholder { color: var(--product-muted); }
      .product-observation textarea, .product-quantity [data-quantity-stepper],
      .product-summary button[aria-label], .product-option {
        background: var(--product-control);
        color: var(--product-ink);
        border-color: var(--product-line);
      }
      .product-quantity [data-quantity-stepper] strong { color: var(--product-ink); }
      .product-quantity [data-quantity-stepper] button { color: var(--product-highlight); }
      .product-option:has(input:checked), .product-group-header > span {
        background: #48303a;
        border-color: var(--product-highlight);
        color: #ffc0c0;
      }
      .product-option:focus-within, textarea:focus { outline: 2px solid var(--product-highlight); }
      .product-bottom-bar > button:not(:disabled) { background: var(--product-action); color: #fff; }
    }
  }
`;
