import { createGlobalStyle } from 'styled-components';
import * as Cart from '../../../Home/FigmaCheckoutFlow.styles';
import * as Guest from '../../../Home/components/GuestAddressCheckout.styles';
import * as Saved from '../../../Home/components/AuthenticatedAddressCheckout.styles';
import * as NewAddress from '../../../Home/components/AuthenticatedEmptyAddressCheckout.styles';
import * as AddressMap from '../../../Home/components/AddressLocationMap.styles';
import * as Payment from '../../../Home/components/FigmaPaymentCheckout.styles';
import * as Methods from '../../../Home/components/PaymentOptions.styles';
import * as Login from '../../../Login/components/CustomerLoginExperience.styles';
import * as Register from '../../../Register/CustomerRegisterExperience.styles';
import * as Recovery from '../../../RecoverPassword/CustomerRecoveryExperience.styles';
import * as Orders from '../../../orders/GuestOrderHistory.styles';
import * as Tracking from '../../../tracking/DeliveryTracking.styles';
import * as MapView from '../../../tracking/CustomerDeliveryMap.styles';
import { AddressModalCard } from '../../../Profile/Profile.account.styles';
import * as Receipt from '../../../tracking/DeliveredOrderPage.styles';

// These overrides belong to the demonstration document. The home and profile use their native theme.
export const DemoDarkStyles = createGlobalStyle`
  :root[data-storefront-theme='dark'] {
    color-scheme: dark;
    --demo-bg: #151719;
    --demo-panel: #212427;
    --demo-field: #2b2e32;
    --demo-line: #484c51;
    --demo-text: #f5f4f1;
    --demo-muted: #bbbfc4;
    --demo-accent: color-mix(in srgb, var(--demo-store-color, #eb754b) 48%, #fff);
    --demo-tint: color-mix(in srgb, var(--demo-store-color, #eb754b) 23%, var(--demo-panel));
    background-color: var(--demo-bg);
  }
  :root[data-storefront-theme='dark'] body { background-color: var(--demo-bg); }
  :root[data-storefront-theme='dark'] #root {
    :focus-visible { outline: 2px solid #9fcbff; outline-offset: 3px; }
    ${AddressModalCard} {
      background: var(--demo-panel); color: var(--demo-text);
      h2, label, label span { color: var(--demo-text); }
      p { color: var(--demo-muted); }
      input, header button, button[type='button'] { background: var(--demo-field); color: var(--demo-text); border-color: var(--demo-line); }
    }

    /* The shared checkout uses both design tokens and individually styled native cards. */
    :is(${Cart.CartLayer}, ${Guest.Page}, ${Saved.Page}, ${NewAddress.Page}, ${Payment.Page}) {
      --checkout-bg: var(--demo-bg);
      --checkout-text: var(--demo-text);
      --checkout-muted: var(--demo-muted);
      --checkout-line: var(--demo-line);
      --checkout-primary: var(--demo-accent);
      background: var(--demo-bg);
      color: var(--demo-text);
    }
    :is(${Cart.CartSummarySidebar}, ${Cart.MobileCartAction}, ${Cart.CartDesktopHeader},
        ${Guest.MobileAction}, ${Saved.MobileAction}, ${NewAddress.MobileAction},
        ${Guest.DesktopHeader}, ${Saved.DesktopHeader}, ${NewAddress.DesktopHeader},
        ${Guest.GuestIdentity}, ${Saved.ContactCard}, ${NewAddress.ContactCard},
        ${Saved.SavedAddresses}, ${NewAddress.EmptyCard}, ${Guest.TotalCard},
        ${Guest.AddressCard}, ${Saved.NewAddressCard}, ${NewAddress.FormCard},
        ${Guest.MapCard}, ${Saved.MapCard}, ${NewAddress.MapCard},
        ${Saved.SummaryCard}, ${NewAddress.SummaryCard}, ${Payment.SummaryCard},
        ${Payment.MobileAction}, ${Payment.LoggedDesktopHeader},
        ${Orders.OrderCard}, ${Orders.MobileHeader}, ${Orders.Empty}, ${Orders.SearchBox},
        ${Tracking.Header}, ${Tracking.CourierCard}, ${Tracking.MobileTrackingDetails},
        ${Tracking.CourierSlot}, ${Tracking.DesktopStatusCard}, ${MapView.EtaCard}, ${MapView.LiveBadge}) {
      background-color: var(--demo-panel); border-color: var(--demo-line); color: var(--demo-text);
    }
    ${Cart.CartLayer} {
      article, .coupon-entry, [aria-label='Cupons promocionais'] {
        background: var(--demo-panel); border-color: var(--demo-line); color: var(--demo-text);
      }
      .item-heading > strong, .item-price, .picker-heading { color: var(--demo-text); }
      .remove, .item-details, .mobile-quantity-row > span, .picker-copy small { color: var(--demo-muted); }
      [data-quantity-stepper], .picker-icon { background: var(--demo-field); color: var(--demo-text); }
      [data-quantity-stepper] button { color: var(--demo-muted); }
      [data-quantity-stepper] strong { color: var(--demo-text); }
      [data-quantity-stepper] .increase { color: var(--demo-accent); }
      .coupon-entry input { background: transparent; color: var(--demo-text); }
      .coupon-error { color: #ffafa6; }
      .picker-option { --picker-ink: var(--demo-accent); --picker-bg: var(--demo-tint); --picker-border: var(--demo-line); }
      .picker-option[aria-pressed='true'] { border-color: var(--demo-accent); }
    }

    :is(${Guest.Page}, ${Saved.Page}, ${NewAddress.Page}) {
      :is(h1,h2,h3,label,strong,b), label > span, header button { color: var(--demo-text); }
      :is(p,small), .phone-warning span { color: var(--demo-muted); }
      .figma-guest-address, .figma-auth-empty-address { background: transparent; }
      :is(.figma-guest-address,.figma-auth-empty-address) label > span { color: var(--demo-text); }
      input, input:focus, :is(.figma-guest-address,.figma-auth-empty-address) label input {
        background: var(--demo-field); border-color: var(--demo-line); color: var(--demo-text);
      }
      input:focus, :is(.figma-guest-address,.figma-auth-empty-address) label input:focus { border-color: var(--demo-accent); }
      .phone-warning { background: #382628; border-color: #79504f; }
      .phone-warning strong { color: #ffafa6; }
      .success { color: #8cdbab; }
      .address-copy small { color: var(--demo-muted); }
    }
    :is(${Guest.Methods}, ${Saved.Methods}, ${NewAddress.Methods}) button,
    ${Saved.AddressList} button, ${NewAddress.EmptyCard} button, ${Saved.EmptyAddresses} button {
      background: var(--demo-field); color: var(--demo-muted); border-color: var(--demo-line);
    }
    :is(${Guest.Methods}, ${Saved.Methods}, ${NewAddress.Methods}) button.active,
    ${Saved.AddressList} button.selected, ${Guest.LoginCard}, ${Guest.LoginCard} .icon {
      background: var(--demo-tint); color: var(--demo-accent); border-color: var(--demo-accent);
    }
    :is(${Guest.LoginCard} button, ${Saved.SavedAddresses} .add-address) { color: var(--demo-accent); }
    ${AddressMap.MapFrame}, ${AddressMap.MapMeta}, ${AddressMap.StateOverlay} {
      background: var(--demo-field); border-color: var(--demo-line); color: var(--demo-muted);
    }
    ${AddressMap.Root} { --address-map-primary: var(--demo-accent); }
    ${AddressMap.Root} strong { color: var(--demo-text); }
    ${AddressMap.Root} small { color: var(--demo-muted); }

    ${Payment.Page} {
      header, header button { color: var(--demo-text); }
      :is(h1,h2,h3,strong) { color: var(--demo-text); }
      .unavailable, .method-detail, ${Payment.MobileRecap} span { color: var(--demo-muted); }
      :is(${Methods.FigmaPaymentOption}, ${Methods.FigmaCardSection}) {
        background: var(--demo-panel); color: var(--demo-text); border-color: var(--demo-line);
      }
      ${Methods.FigmaPaymentOption}[aria-pressed='true'] { border-color: var(--demo-accent); background: var(--demo-tint); }
      :is(.card-heading,.method-name) { color: var(--demo-text); }
      :disabled .method-name { color: var(--demo-muted); }
      .method-icon { background: var(--demo-field); color: var(--demo-muted); }
      .method-icon.pix { background: #183a32; color: #76d7b7; }
    }

    [data-payment-method='pix'] {
      --pix-primary: var(--demo-accent) !important; /* Brand is provided as an inline property by PixPaymentPanel. */
      background-color: var(--demo-bg); color: var(--demo-text);
      & > header, & > section:has(> small), section:has(> .eta), section:has(> .summary-total) {
        background-color: var(--demo-panel); border-color: var(--demo-line); color: var(--demo-text);
      }
      & > header button, h1, h2, code, .mobile-title, .prep b { color: var(--demo-text); }
      p, small, .muted, .eta span, .desktop-title p, section:has(> div code) > b { color: var(--demo-muted); border-color: var(--demo-line); }
      section:has(> [aria-label='QR Code PIX']), section:has(> [role='status']) { background: var(--demo-bg); border-color: var(--demo-line); }
      [aria-label='QR Code PIX'] { color-scheme: light; background: #fff; border-color: #fff; }
      div:has(> code), [aria-label='Simular confirmação do Pix'] { background: var(--demo-field); border-color: var(--demo-line); color: var(--demo-text); }
      [aria-label='Copiar código Pix'], [role='status']:has(b) { background: var(--demo-tint); color: var(--demo-accent); }
      .eta, .summary-total { border-color: var(--demo-line); }
      & > section:has(> small) > span { color: var(--demo-muted); }
    }

    ${Login.CustomerAuthLayout} {
      --auth-bg: var(--demo-bg); --auth-surface: var(--demo-panel); --auth-text: var(--demo-text);
      --auth-muted: var(--demo-muted); --auth-placeholder: #a4a9b0; --auth-border: var(--demo-line);
      --auth-control-border: var(--demo-line);
    }
    :is(${Login.ForgotButton}, ${Login.RegisterFooter} a, ${Register.Footer} a, ${Recovery.Back}) { color: var(--demo-accent); }
    :is(${Register.InputBox}, ${Recovery.InputBox}, ${Recovery.MobileHeader},
        ${Register.Verification} button, ${Recovery.SecondaryRow} button,
        ${Login.GoogleFallback}, ${Login.GoogleVisual}) {
      background: var(--demo-panel); color: var(--demo-text); border-color: var(--demo-line);
    }
    :is(${Register.Rules}, ${Recovery.Rules}) .rule { color: var(--demo-muted); }
    :is(${Register.Rules}, ${Recovery.Rules}) .met { color: #90d8aa; }
    ${Register.Verification}, ${Recovery.Illustration} .circle {
      background: var(--demo-tint); color: var(--demo-accent); border-color: var(--demo-line);
    }
    .gx-demo-auth-bar, .gx-demo-auth-bar button { background-color: var(--demo-panel); color: var(--demo-text); border-color: var(--demo-line); }
    :is(${Login.Feedback}[role='alert'], ${Register.Error}) { background: #392629; color: #ffb0a5; border-color: #79504f; }

    ${Orders.GuestOrdersFrame} {
      --guest-primary: var(--demo-accent); background: var(--demo-bg); color: var(--demo-text);
      header .search, .thumb { background: var(--demo-field); }
      header small, .restaurant-info small, .order-body p, .labels, ${Orders.TitleBlock} p { color: var(--demo-muted); }
      input, ${Orders.Empty} strong { color: var(--demo-text); }
      .status.preparing { color: #ffb88e; background: #452e20; }
      .status.on-the-way { color: #a1c7ff; background: #22364f; }
      .status.delivered { color: #96dcaa; background: #1d3a28; }
      .status.cancelled { color: #ffaba2; background: #452924; }
      .divider { background: var(--demo-line); }
    }
    ${Tracking.Page} {
      --tracking-ink: var(--demo-text); --tracking-muted: var(--demo-muted);
      --courier-line: var(--demo-line); --courier-primary: var(--demo-accent); background: var(--demo-bg);
      ${Tracking.BackButton}, ${Tracking.MobileHeaderTitle}, ${Tracking.DesktopTrackingTitle},
      ${Tracking.CourierCard} strong, ${Tracking.MapPlaceholder} h2 { color: var(--demo-text); }
      ${Tracking.CourierCard} .courier-waiting, .gx-demo-tracking-extra small, .gx-demo-item-note { color: var(--demo-muted); }
      ${Tracking.MobileStatusItem} { color: var(--demo-muted); }
      ${Tracking.MobileStatusItem}[aria-current='step'], ${MapView.EtaCard} strong { color: var(--demo-accent); }
      ${Tracking.MapPlaceholder} { background: var(--demo-field); border-color: var(--demo-line); }
      ${Tracking.CompletionNotice} { background: #1e362a; color: #a3e0b7; border-color: #40694e; }
      ${Tracking.CompletionNotice} small { color: #c2d9ca; }
      ${Receipt.OrderCard} { background: var(--demo-panel); border-color: var(--demo-line); }
      ${Receipt.Total} { border-color: var(--demo-line); }
      ${Receipt.SectionTitle} small, ${Receipt.ItemList} li, ${Receipt.Payment} { color: var(--demo-muted); }
      .gx-map-land { fill: #29333a; }
      .gx-map-building rect:first-child { fill: #22292e; }
      .gx-map-building rect:last-child { fill: #3a454a; stroke: #485458; }
      .gx-map-park { fill: #315745; }
      .gx-map-roads { stroke: #535d63; }
      .gx-route-map-labels { fill: #f2f1e8; }
      .gx-map-route-edge { stroke: #31383c; }
      .gx-map-route-guide { stroke: #d4bbb2; }
      .gx-route-traveled { stroke: #ff9773; }
    }
  }
`;
