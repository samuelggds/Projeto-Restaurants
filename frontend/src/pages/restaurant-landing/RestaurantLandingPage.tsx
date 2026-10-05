import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Clock3, MapPin, MessageCircle, UtensilsCrossed } from 'lucide-react';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { useCustomDomainTenant } from '../../shared/tenant/useCustomDomainTenant';
import * as S from './RestaurantLandingPage.styles';

type PublicSettings = {
  primaryColor?: string;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  whatsapp?: string | null;
  businessHours?: unknown;
  restaurant?: {
    name?: string | null;
    logo?: string | null;
    coverImage?: string | null;
    description?: string | null;
    address?: string | null;
    addressNumber?: string | null;
    addressDistrict?: string | null;
    city?: string | null;
    state?: string | null;
  };
};

function safeSocialHref(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https:\/\//iu.test(raw)) return raw;
  return '';
}

export default function RestaurantLandingPage() {
  const customDomain = useCustomDomainTenant();
  const slug = customDomain.tenant?.restaurantSlug || '';
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!slug) return;
    void restaurantSettingsService
      .getPublicSettingsBySlug(slug)
      .then((value) => {
        if (active) setSettings(value as PublicSettings);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const restaurant = settings?.restaurant;
  const menuHost = customDomain.tenant?.menuHost || '';
  const menuUrl = menuHost ? `https://${menuHost}` : '';
  const address = useMemo(
    () =>
      [
        restaurant?.address,
        restaurant?.addressNumber,
        restaurant?.addressDistrict,
        restaurant?.city,
        restaurant?.state,
      ]
        .filter(Boolean)
        .join(', '),
    [restaurant],
  );
  const whatsappDigits = String(settings?.whatsapp || '').replace(/\D/gu, '');
  const whatsappNumber = /^[1-9]\d{9,10}$/u.test(whatsappDigits)
    ? `55${whatsappDigits}`
    : whatsappDigits;
  const socialLinks = [
    ['Instagram', safeSocialHref(settings?.instagram)],
    ['Facebook', safeSocialHref(settings?.facebook)],
    ['TikTok', safeSocialHref(settings?.tiktok)],
    ['YouTube', safeSocialHref(settings?.youtube)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (!slug || failed) {
    return (
      <S.Centered>
        <h1>Site temporariamente indisponível</h1>
        <p>Não foi possível carregar as informações deste restaurante.</p>
      </S.Centered>
    );
  }

  if (!settings || !restaurant) {
    return (
      <S.Centered role="status">
        <p>Carregando site do restaurante…</p>
      </S.Centered>
    );
  }

  return (
    <S.Page style={{ '--restaurant-color': settings.primaryColor || '#ff4b4b' } as CSSProperties}>
      <S.Hero $image={restaurant.coverImage || ''}>
        <S.HeroOverlay />
        <S.Header>
          <S.Brand>
            {restaurant.logo ? <img src={restaurant.logo} alt="" /> : <UtensilsCrossed />}
            <span>{restaurant.name || customDomain.tenant?.restaurantName}</span>
          </S.Brand>
          {menuUrl ? (
            <S.MenuButton href={menuUrl}>
              Ver cardápio
            </S.MenuButton>
          ) : null}
        </S.Header>
        <S.HeroContent>
          <span>Bem-vindo</span>
          <h1>{restaurant.name || customDomain.tenant?.restaurantName}</h1>
          <p>
            {restaurant.description ||
              'Conheça nosso restaurante, confira nossas informações e acesse o cardápio online.'}
          </p>
          {menuUrl ? (
            <S.PrimaryAction href={menuUrl}>
              <UtensilsCrossed size={18} /> Abrir cardápio
            </S.PrimaryAction>
          ) : null}
        </S.HeroContent>
      </S.Hero>

      <S.Content>
        <S.InfoGrid>
          {address ? (
            <S.InfoCard>
              <MapPin />
              <div>
                <h2>Onde estamos</h2>
                <p>{address}</p>
              </div>
            </S.InfoCard>
          ) : null}
          <S.InfoCard>
            <Clock3 />
            <div>
              <h2>Atendimento</h2>
              <p>Consulte os horários e a disponibilidade diretamente no cardápio.</p>
            </div>
          </S.InfoCard>
          {whatsappNumber ? (
            <S.InfoCard as="a" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
              <MessageCircle />
              <div>
                <h2>WhatsApp</h2>
                <p>Fale diretamente com o restaurante.</p>
              </div>
            </S.InfoCard>
          ) : null}
        </S.InfoGrid>

        {socialLinks.length ? (
          <S.SocialSection>
            <h2>Siga o restaurante</h2>
            <div>
              {socialLinks.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              ))}
            </div>
          </S.SocialSection>
        ) : null}
      </S.Content>

      <S.Footer>
        <span>{restaurant.name || customDomain.tenant?.restaurantName}</span>
        {menuUrl ? <a href={menuUrl}>Cardápio online</a> : null}
      </S.Footer>
    </S.Page>
  );
}
