import { AlertTriangle, CheckCircle2, CircleX, LoaderCircle, Save } from 'lucide-react';
import * as S from './UnsavedSettingsDialog.styles';

export type UnsavedSettingsDialogPhase = 'choice' | 'saving' | 'discarding' | 'saved' | 'discarded';

type Props = {
  phase: UnsavedSettingsDialogPhase;
  subject?: 'settings' | 'product';
  onSave: () => void;
  onDiscard: () => void;
};

export function UnsavedSettingsDialog({ phase, subject = 'settings', onSave, onDiscard }: Props) {
  const working = phase === 'saving' || phase === 'discarding';
  const result = phase === 'saved' || phase === 'discarded';
  const isProduct = subject === 'product';

  return (
    <S.Backdrop>
      <S.Dialog
        key={result ? phase : 'choice'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-settings-title"
        aria-describedby="unsaved-settings-description"
        aria-busy={working}
      >
        {result ? (
          <S.Result $tone={phase === 'saved' ? 'success' : 'discarded'} role="status">
            <span className="result-icon" aria-hidden="true">
              {phase === 'saved' ? <CheckCircle2 /> : <CircleX />}
            </span>
            <h2 id="unsaved-settings-title">
              {phase === 'saved'
                ? isProduct
                  ? 'Produto salvo com sucesso!'
                  : 'Alterações salvas com sucesso!'
                : isProduct
                  ? 'Produto não foi salvo'
                  : 'Alterações não foram salvas'}
            </h2>
            <p id="unsaved-settings-description">
              {phase === 'saved'
                ? isProduct
                  ? 'As alterações do produto já foram aplicadas ao cardápio.'
                  : 'As novas configurações já foram aplicadas ao restaurante.'
                : isProduct
                  ? 'As mudanças feitas no produto foram descartadas.'
                  : 'As mudanças feitas nesta seção foram descartadas.'}
            </p>
            <small>Abrindo a seção selecionada</small>
          </S.Result>
        ) : (
          <>
            <S.ChoiceIcon aria-hidden="true">
              <AlertTriangle />
            </S.ChoiceIcon>
            <S.ChoiceCopy>
              <h2 id="unsaved-settings-title">
                {isProduct
                  ? 'Este produto tem alterações pendentes'
                  : 'Você tem alterações pendentes'}
              </h2>
              <p id="unsaved-settings-description">
                {isProduct
                  ? 'Deseja salvar o produto antes de abrir outra seção?'
                  : 'Deseja salvar as configurações antes de mudar de seção?'}
              </p>
            </S.ChoiceCopy>
            <S.Actions>
              <button
                className="discard"
                type="button"
                disabled={working}
                data-progress={phase === 'discarding' ? 'true' : 'false'}
                onClick={onDiscard}
              >
                {phase === 'discarding' ? <LoaderCircle size={16} /> : null}
                <span>{phase === 'discarding' ? 'Descartando...' : 'Não salvar'}</span>
              </button>
              <button
                className="save"
                type="button"
                disabled={working}
                data-progress={phase === 'saving' ? 'true' : 'false'}
                onClick={onSave}
              >
                {phase === 'saving' ? <LoaderCircle size={16} /> : <Save size={16} />}
                <span>{phase === 'saving' ? 'Salvando...' : 'Salvar alterações'}</span>
              </button>
            </S.Actions>
          </>
        )}
      </S.Dialog>
    </S.Backdrop>
  );
}
