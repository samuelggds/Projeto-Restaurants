import { useEffect, useId, useRef, useState, type ClipboardEvent } from 'react';
import { Check, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { enhanceManagedRestaurantImage, type ManagedImagePurpose } from '../../../Services/managedImageEnhancementService';
import { createPersistentImageDataUrl, optimizePersistentImageDataUrl } from '../../../utils/persistentImage';
import * as S from './ManagedImageEditor.styles';

export type ManagedImageEditorProps = {
  restaurantId: number;
  purpose: ManagedImagePurpose;
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
};

export function ManagedImageEditor({ restaurantId, purpose, value, onChange, label, required = false, disabled = false }: ManagedImageEditorProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ source: string; result: string } | null>(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const imageIsLocal = /^data:image\/(jpeg|png|webp);base64,/iu.test(value);
  const safePreview = imageIsLocal || /^https:\/\//iu.test(value);
  const candidate = preview?.source === value ? preview.result : '';
  const dimension = purpose === 'BANNER' ? 1600 : 1024;
  // Logo + cover must fit together in the existing 1 MB settings payload.
  const imageOptions = { maximumDataUrlLength: 300_000 };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sequence.current += 1; };
  }, []);
  useEffect(() => { sequence.current += 1; }, [restaurantId, purpose, value]);

  function changeImage(source: string) {
    sequence.current += 1;
    setPreview(null);
    setError('');
    setMessage('');
    onChange(source);
  }

  async function upload(file: File | undefined | null) {
    if (!file || disabled || inFlight.current) return;
    inFlight.current = true;
    const attempt = ++sequence.current;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const image = await createPersistentImageDataUrl(file, dimension, imageOptions);
      if (mounted.current && attempt === sequence.current) changeImage(image);
    } catch (failure) {
      if (mounted.current && attempt === sequence.current) setError(failure instanceof Error ? failure.message : 'Não foi possível ler a imagem.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function paste(event: ClipboardEvent<HTMLElement>) {
    if (disabled || busy) return;
    const item = Array.from(event.clipboardData.items).find((entry) => entry.kind === 'file' && entry.type.startsWith('image/'));
    if (item) { event.preventDefault(); void upload(item.getAsFile()); return; }
    const text = event.clipboardData.getData('text/plain').trim();
    if (/^https:\/\//iu.test(text)) { event.preventDefault(); changeImage(text); }
  }

  async function enhance() {
    if (!imageIsLocal || disabled || inFlight.current) return;
    inFlight.current = true;
    const attempt = ++sequence.current;
    setBusy(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      const response = await enhanceManagedRestaurantImage({ restaurantId, purpose, imageDataUrl: value, operationId: crypto.randomUUID() });
      const result = await optimizePersistentImageDataUrl(response, dimension, imageOptions);
      if (mounted.current && attempt === sequence.current) setPreview({ source: value, result });
    } catch (failure) {
      if (mounted.current && attempt === sequence.current) setError(failure instanceof Error ? failure.message : 'Não foi possível melhorar a imagem. A original foi mantida.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <S.Editor aria-label={`Imagem: ${label}`} aria-busy={busy}>
      <strong className="image-title"><Sparkles size={17} aria-hidden="true" />{label}</strong>
      <p className="image-cost">Custo pago pelo GastroNexa. Não desconta créditos de IA do restaurante.</p>
      <label>
        Link da imagem
        <input type="url" pattern="https://.*" placeholder="https://exemplo.com/imagem.jpg" value={imageIsLocal ? '' : value} required={required && !value} disabled={disabled || busy} onChange={(event) => changeImage(event.target.value)} onPaste={paste} />
      </label>
      <div className="image-paste" tabIndex={0} aria-label={`Colar imagem: ${label}`} onPaste={paste}>Cole a imagem aqui com Ctrl+V ou escolha um arquivo.</div>
      <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Arquivo: ${label}`} disabled={disabled || busy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; void upload(file); }} />
      <div className="image-actions">
        <button type="button" disabled={disabled || busy} onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" />Escolher arquivo</button>
        <button type="button" className="image-primary" disabled={disabled || busy || !imageIsLocal} aria-describedby={hintId} onClick={() => void enhance()}>{busy ? <Loader2 size={16} className="image-spinner" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{busy ? 'Processando imagem...' : 'Melhorar com IA'}</button>
        {value ? <button type="button" disabled={disabled || busy} onClick={() => changeImage('')}><X size={15} aria-hidden="true" />Remover imagem</button> : null}
      </div>
      <p id={hintId}>JPG, PNG ou WebP, até 5 MB. Para melhorar uma imagem de um link, envie o arquivo ou cole a própria imagem. A geração pode levar até 3 minutos.</p>
      {busy ? <p role="status">Processando. A imagem original não será substituída automaticamente.</p> : null}
      {error ? <p className="image-error" role="alert">{error} Uma nova tentativa pode gerar novo consumo da plataforma.</p> : null}
      {safePreview ? <div className="image-preview">
        <figure><figcaption>Imagem atual</figcaption><img src={value} alt={`${label}: imagem atual`} referrerPolicy="no-referrer" /></figure>
        {candidate ? <figure><figcaption>Prévia com IA</figcaption><img src={candidate} alt={`${label}: prévia melhorada com IA`} /></figure> : null}
      </div> : null}
      {candidate ? <>
        <p>Confira os ingredientes, as porções e a identidade da marca. Aplique somente se o resultado representar fielmente a imagem original.</p>
        <div className="image-actions">
          <button type="button" className="image-primary" disabled={disabled || busy} onClick={() => { changeImage(candidate); setMessage('Imagem melhorada aplicada ao formulário. Salve para publicar.'); }}><Check size={16} aria-hidden="true" />Usar imagem melhorada</button>
          <button type="button" disabled={disabled || busy} onClick={() => { setPreview(null); setMessage('Imagem original mantida.'); }}>Manter original</button>
        </div>
      </> : null}
      {message ? <p role="status">{message}</p> : null}
    </S.Editor>
  );
}
