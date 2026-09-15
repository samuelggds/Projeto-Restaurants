import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  FileImage,
  FolderOpen,
  ImagePlus,
  Link2,
  LockKeyhole,
  PackageOpen,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import menuImportService, {
  type MenuImportDraft,
  type MenuImportDraftItem,
  type MenuImportSummary,
} from '../../../Services/menuImportService';
import aiGuideService, { type AiImageBatch } from '../../../Services/aiGuideService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import * as I from '../styles/AdminMenuImport.styles';

type AdminMenuImportProps = {
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

function importErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return 'Não foi possível importar o cardápio.';
  const response = (error as { response?: { data?: { error?: unknown } } }).response;
  return String(response?.data?.error || (error as Error).message || 'Não foi possível importar o cardápio.');
}

function isPublicIfoodUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase('pt-BR');
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      (hostname === 'ifood.com.br' || hostname.endsWith('.ifood.com.br'))
    );
  } catch {
    return false;
  }
}

function itemNeedsReview(item: MenuImportDraftItem) {
  return item.uncertainFields.length > 0 || Boolean(item.duplicateProductId) || !item.description || !item.image;
}

export function AdminMenuImport({ onClose, onImported }: AdminMenuImportProps) {
  const [method, setMethod] = useState<'ifood' | 'photo'>('ifood');
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MenuImportSummary | null>(null);
  const [draft, setDraft] = useState<MenuImportDraft | null>(null);
  const [generateProductImages, setGenerateProductImages] = useState(true);
  const [imageEstimate, setImageEstimate] = useState<{ productIds: number[]; estimatedCreditUsd: number; note: string } | null>(null);
  const [imageBatch, setImageBatch] = useState<AiImageBatch | null>(null);

  const changeMethod = (nextMethod: 'ifood' | 'photo') => {
    setMethod(nextMethod);
    setError('');
    setResult(null);
    setDraft(null);
    setImageEstimate(null);
    setImageBatch(null);
  };

  const prepareImageBatch = async (productIds: number[]) => {
    if (!generateProductImages || !productIds.length) return;
    try {
      const estimate = await aiGuideService.estimateImageBatch(productIds);
      setImageEstimate({ productIds, estimatedCreditUsd: estimate.estimatedCreditUsd, note: estimate.note });
    } catch (estimateError) {
      setError(importErrorMessage(estimateError));
    }
  };

  const confirmImageBatch = async () => {
    if (!imageEstimate) return;
    setBusy(true);
    setError('');
    try {
      setImageBatch(await aiGuideService.createImageBatch(imageEstimate.productIds));
      setImageEstimate(null);
    } catch (batchError) {
      setError(importErrorMessage(batchError));
    } finally {
      setBusy(false);
    }
  };

  const finishLegacyImport = async (summary: MenuImportSummary) => {
    setResult(summary);
    await Promise.resolve(onImported()).catch(() => undefined);
    await prepareImageBatch(summary.createdProducts.map((product) => product.id));
  };

  const importFromIfood = async () => {
    const url = ifoodUrl.trim();
    if (!isPublicIfoodUrl(url)) {
      setError('Cole um link público HTTPS válido do restaurante no iFood.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    setImageEstimate(null);
    setImageBatch(null);
    try {
      await finishLegacyImport(await menuImportService.importIfoodMenu({ url }));
    } catch (importError) {
      setError(importErrorMessage(importError));
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setProcessingPhoto(true);
    setError('');
    setResult(null);
    setDraft(null);
    setImageEstimate(null);
    setImageBatch(null);
    try {
      setPhoto(await createPersistentImageDataUrl(file, 1600));
      setPhotoName(file.name);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Não foi possível ler esta imagem.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const analyzePhoto = async () => {
    if (!photo) {
      setError('Selecione uma foto nítida do cardápio para continuar.');
      return;
    }
    setBusy(true);
    setError('');
    setDraft(null);
    try {
      setDraft(await menuImportService.previewMenuFromImage({ imageUrl: photo }));
    } catch (importError) {
      setError(importErrorMessage(importError));
    } finally {
      setBusy(false);
    }
  };

  const updateDraftItem = async (
    item: MenuImportDraftItem,
    patch: Partial<Pick<MenuImportDraftItem, 'selected' | 'action' | 'category' | 'name' | 'description' | 'price' | 'image' | 'duplicateProductId'>>,
  ) => {
    if (!draft) return;
    setError('');
    try {
      setDraft(await menuImportService.updateDraftItem(draft.publicId, item.publicId, patch));
    } catch (updateError) {
      setError(importErrorMessage(updateError));
    }
  };

  const publishPhotoDraft = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const publication = await menuImportService.publishDraft(draft.publicId);
      const productIds = publication.results
        .filter((item) => item.status === 'PUBLISHED' && item.productId)
        .map((item) => Number(item.productId));
      await Promise.resolve(onImported()).catch(() => undefined);
      setDraft(await menuImportService.getDraft(draft.publicId));
      if (publication.status === 'PARTIAL') {
        const failures = publication.results.filter((item) => item.status === 'FAILED');
        setError(`${failures.length} item(ns) não puderam ser publicados. Revise os erros antes de tentar novamente.`);
      }
      await prepareImageBatch(productIds);
    } catch (publishError) {
      setError(importErrorMessage(publishError));
    } finally {
      setBusy(false);
    }
  };

  const imageGenerationOption = (
    <I.ImportNotice role="note">
      <CircleAlert />
      <span>
        <b>Imagens automáticas com IA</b>
        <small>
          Depois da publicação, mostramos a estimativa de créditos antes da confirmação. O processamento
          continua em segundo plano mesmo se você sair desta tela. Produtos com marcas conhecidas continuam
          exigindo foto oficial/manual.
        </small>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
          <input checked={generateProductImages} disabled={busy} type="checkbox" onChange={(event) => setGenerateProductImages(event.target.checked)} />
          Preparar geração de imagens para produtos sem foto
        </label>
      </span>
    </I.ImportNotice>
  );

  const imageBatchPanel = (
    <>
      {imageEstimate && (
        <I.ImportNotice role="status">
          <ChatGptLogo />
          <span>
            <b>Confirmar geração em lote</b>
            <small>{imageEstimate.productIds.length} produto(s) · estimativa máxima US$ {imageEstimate.estimatedCreditUsd.toFixed(4)}. {imageEstimate.note}</small>
            <button type="button" disabled={busy} onClick={() => void confirmImageBatch()} style={{ marginTop: 8 }}>Confirmar geração em segundo plano</button>
          </span>
        </I.ImportNotice>
      )}
      {imageBatch && (
        <I.ImportNotice $tone="success" role="status">
          <CheckCircle2 />
          <span><b>Job de imagens criado</b><small>{imageBatch.progress.completed}/{imageBatch.progress.total} concluído(s). Você pode sair da tela e acompanhar depois pelo assistente.</small></span>
        </I.ImportNotice>
      )}
    </>
  );

  const legacyResultPanel = (
    <>
      <I.StatGrid>
        <article><span><FolderOpen /></span><div><strong>{result?.categoriesCreated ?? '—'}</strong><b>Categorias novas</b><small>Agrupamentos criados</small></div></article>
        <article><span><PackageOpen /></span><div><strong>{result?.productsCreated ?? '—'}</strong><b>Produtos novos</b><small>Itens adicionados ao cardápio</small></div></article>
      </I.StatGrid>
      {result ? (
        <I.ImportNotice $tone="success" role="status"><CheckCircle2 /><span><b>Importação concluída</b><small>{result.demoNotice ?? 'Os itens novos foram persistidos no catálogo.'}</small></span></I.ImportNotice>
      ) : <I.ImportNotice><Sparkles /><span><b>Resultado da importação</b><small>Depois da análise, mostramos o que foi criado.</small></span></I.ImportNotice>}
      {imageBatchPanel}
    </>
  );

  const draftPanel = draft && (
    <div style={{ display: 'grid', gap: 10 }}>
      <I.StatGrid>
        <article><span><PackageOpen /></span><div><strong>{draft.summary.total}</strong><b>Itens encontrados</b><small>{draft.summary.selected} selecionado(s)</small></div></article>
        <article><span><CircleAlert /></span><div><strong>{draft.summary.uncertain + draft.summary.duplicates}</strong><b>Precisam de atenção</b><small>{draft.summary.duplicates} possível(is) duplicação(ões)</small></div></article>
      </I.StatGrid>
      <I.ImportNotice role="note"><Sparkles /><span><b>Prévia editável — nada foi publicado ainda</b><small>Revise os dados extraídos, escolha criar/atualizar/pular e só depois publique os itens selecionados. Campos marcados como incertos vieram da leitura da imagem.</small></span></I.ImportNotice>
      <div style={{ display: 'grid', gap: 8 }}>
        {draft.items.map((item) => (
          <article key={item.publicId} style={{ border: itemNeedsReview(item) ? '1px solid #f0b98f' : '1px solid #e5dfdb', borderRadius: 12, padding: 10, background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'start' }}>
              <input aria-label={`Selecionar ${item.name}`} type="checkbox" checked={item.selected} disabled={draft.status !== 'REVIEW'} onChange={(event) => void updateDraftItem(item, { selected: event.target.checked })} />
              <div style={{ display: 'grid', gap: 6 }}>
                <input aria-label="Nome do produto" defaultValue={item.name} disabled={draft.status !== 'REVIEW'} onBlur={(event) => event.target.value !== item.name && void updateDraftItem(item, { name: event.target.value })} />
                <input aria-label="Descrição do produto" defaultValue={item.description || ''} disabled={draft.status !== 'REVIEW'} placeholder="Descrição não informada" onBlur={(event) => event.target.value !== (item.description || '') && void updateDraftItem(item, { description: event.target.value || null })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 6 }}>
                  <input aria-label="Categoria do produto" defaultValue={item.category} disabled={draft.status !== 'REVIEW'} onBlur={(event) => event.target.value !== item.category && void updateDraftItem(item, { category: event.target.value })} />
                  <input aria-label="Preço do produto" type="number" min="0.01" step="0.01" defaultValue={item.price} disabled={draft.status !== 'REVIEW'} onBlur={(event) => Number(event.target.value) !== item.price && void updateDraftItem(item, { price: Number(event.target.value) })} />
                </div>
                {item.uncertainFields.length > 0 && <small style={{ color: '#9a5b24' }}>Confira: {item.uncertainFields.join(', ')}</small>}
                {!item.description && <small>Descrição ausente — a IA não inventou composição ou ingredientes.</small>}
              </div>
              <select aria-label={`Ação para ${item.name}`} value={item.action} disabled={draft.status !== 'REVIEW'} onChange={(event) => void updateDraftItem(item, { action: event.target.value as MenuImportDraftItem['action'] })}>
                {!item.duplicateProductId && <option value="CREATE">Criar</option>}
                {item.duplicateProductId && <option value="UPDATE">Atualizar existente</option>}
                <option value="SKIP">Pular</option>
              </select>
            </div>
            {item.duplicateProductId && <small style={{ display: 'block', marginTop: 6, color: '#8a4f23' }}>Possível duplicação: produto #{item.duplicateProductId}. Nenhum produto existente será sobrescrito sem selecionar “Atualizar existente”.</small>}
          </article>
        ))}
      </div>
      {draft.status === 'REVIEW' ? (
        <button className="analyze-photo" type="button" disabled={busy || draft.summary.selected === 0} onClick={() => void publishPhotoDraft()}><Check /> {busy ? 'Publicando itens selecionados...' : `Publicar ${draft.summary.selected} item(ns) revisado(s)`}</button>
      ) : <I.ImportNotice $tone="success"><CheckCircle2 /><span><b>Prévia publicada</b><small>Os itens concluídos foram enviados ao catálogo. Alterações futuras continuam disponíveis no cadastro normal.</small></span></I.ImportNotice>}
      {imageGenerationOption}
      {imageBatchPanel}
    </div>
  );

  return (
    <I.Workspace aria-label="Importação de cardápio">
      <I.MethodBar>
        <button className="back" type="button" onClick={onClose}><ArrowLeft /> Voltar ao cardápio</button>
        <div className="methods" role="tablist" aria-label="Origem do cardápio">
          <button aria-selected={method === 'ifood'} className={method === 'ifood' ? 'active' : ''} role="tab" type="button" onClick={() => changeMethod('ifood')}><Link2 /> Link do iFood</button>
          <button aria-selected={method === 'photo'} className={method === 'photo' ? 'active' : ''} role="tab" type="button" onClick={() => changeMethod('photo')}><FileImage /> Foto do cardápio</button>
        </div>
      </I.MethodBar>

      <I.StepBanner>
        <div className="step-icon">{method === 'ifood' ? <Link2 /> : <ScanLine />}</div>
        <div><small>PASSO 1 DE 2</small><b>{method === 'ifood' ? 'Informe o link público do iFood' : 'Envie a foto e revise a prévia'}</b><span>{method === 'ifood' ? 'Analisaremos categorias e produtos disponíveis publicamente.' : 'A IA extrai os dados, mas o ADMIN decide exatamente o que será publicado.'}</span></div>
        <div className="step-track" aria-label="Progresso da importação"><i className={result || draft ? 'done' : 'active'}>1</i><em /><i className={result || draft ? 'active' : ''}>2</i></div>
      </I.StepBanner>

      {error && <I.ImportNotice $tone="error" role="alert"><CircleAlert /><span><b>Não foi possível concluir</b><small>{error}</small></span></I.ImportNotice>}

      {method === 'ifood' ? (
        <I.ImportGrid>
          <I.SourceCard onSubmit={(event) => { event.preventDefault(); void importFromIfood(); }}>
            <div><h3>Link do restaurante no iFood</h3><p>Use o endereço público que seus clientes já acessam.</p></div>
            <div className="ifood-mark" aria-label="iFood">iFood</div>
            <label>Link do restaurante<span className="url-field"><Link2 /><input aria-label="Link público do restaurante no iFood" inputMode="url" placeholder="https://www.ifood.com.br/delivery/..." value={ifoodUrl} onChange={(event) => setIfoodUrl(event.target.value)} /></span></label>
            <div className="security-note"><LockKeyhole /><span><b>Seus dados estão seguros</b><small>A análise aceita somente páginas públicas HTTPS do domínio oficial do iFood.</small></span></div>
            {imageGenerationOption}
            <button className="submit-import" disabled={busy} type="submit"><Search /> {busy ? 'Analisando cardápio...' : 'Analisar e importar'}</button>
          </I.SourceCard>
          <I.ResultCard aria-live="polite"><header><h3>Resumo do cardápio encontrado</h3><p>Mostramos apenas os registros efetivamente persistidos.</p></header>{legacyResultPanel}</I.ResultCard>
        </I.ImportGrid>
      ) : (
        <I.PhotoLayout>
          <I.PhotoSource>
            <h3>Foto do cardápio</h3>
            {photo ? (
              <><div className="photo-preview"><img src={photo} alt={`Prévia de ${photoName || 'cardápio enviado'}`} /></div><div className="photo-actions"><label><Upload /> Trocar foto<input accept="image/jpeg,image/png,image/webp" disabled={processingPhoto || busy} type="file" onChange={(event) => void choosePhoto(event.target.files?.[0])} /></label><button disabled={busy} type="button" onClick={() => { setPhoto(null); setPhotoName(''); setDraft(null); }}><Trash2 /> Remover</button></div></>
            ) : (
              <label className="photo-picker"><ImagePlus /><b>{processingPhoto ? 'Preparando imagem...' : 'Arraste ou selecione uma foto'}</b><span>JPG, PNG ou WEBP</span><small>Tamanho máximo processado pela interface</small><input accept="image/jpeg,image/png,image/webp" disabled={processingPhoto || busy} type="file" onChange={(event) => void choosePhoto(event.target.files?.[0])} /></label>
            )}
          </I.PhotoSource>
          <I.AnalysisCard aria-live="polite">
            <header><ChatGptLogo /> <h3>Revisão dos itens identificados</h3></header>
            {!draft ? (
              <><div className="analysis-stages"><div className={photo ? 'done' : ''}><i>{photo ? <Check /> : 1}</i><span><b>Lendo imagem</b><small>{photo ? 'Imagem pronta para análise.' : 'Aguardando uma foto nítida.'}</small></span></div><div className={busy ? 'active' : ''}><i>2</i><span><b>Extraindo sem publicar</b><small>{busy ? 'Lendo nomes, categorias, descrições e preços...' : 'A IA marca campos incertos para conferência.'}</small></span></div><div><i>3</i><span><b>Revisar e publicar</b><small>Nenhum cadastro existente é sobrescrito silenciosamente.</small></span></div></div><button className="analyze-photo" disabled={!photo || busy || processingPhoto} type="button" onClick={() => void analyzePhoto()}><ScanLine /> {busy ? 'Analisando imagem...' : 'Analisar para revisão'}</button></>
            ) : draftPanel}
          </I.AnalysisCard>
        </I.PhotoLayout>
      )}
    </I.Workspace>
  );
}
