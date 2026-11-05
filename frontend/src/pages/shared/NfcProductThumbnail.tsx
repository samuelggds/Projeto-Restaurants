import styled from 'styled-components';
import { UtensilsCrossed } from 'lucide-react';
import api from '../../Services/api';
import { resolvePublicMediaSource } from '../../Services/publicMediaSource';
import { isPersistentImageSource } from '../../utils/persistentImage';

const Thumbnail = styled.span`
  display: inline-flex; flex: 0 0 46px; width: 46px; height: 46px;
  align-items: center; justify-content: center; overflow: hidden;
  background: #f5f6f8; color: #a3aeb8; border: 1px solid #e5e9ee; border-radius: 9px;
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
  svg { width: 19px; height: 19px; }
`;

export function NfcProductThumbnail({ source, className }: { source?: string | null; className?: string }) {
  // Only URLs/images delivered by the current restaurant's backend are shown.
  const resolved = resolvePublicMediaSource(source, api.defaults.baseURL || '');
  const url = isPersistentImageSource(resolved) ? String(resolved).trim() : null;
  return <Thumbnail className={className} aria-hidden="true">{url
    ? <><img alt="" src={url} loading="lazy" decoding="async" onError={event => {
      event.currentTarget.style.display = 'none';
      const placeholder = event.currentTarget.nextElementSibling;
      if (placeholder instanceof SVGElement) placeholder.style.display = '';
    }} /><UtensilsCrossed style={{ display: 'none' }} /></>
    : <UtensilsCrossed />}</Thumbnail>;
}
