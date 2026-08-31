import { AlertTriangle, CheckCircle2, CircleX, LoaderCircle, Save } from 'lucide-react';
import * as S from './UnsavedSettingsDialog.styles';

export type UnsavedSettingsDialogPhase = 'choice' | 'saving' | 'discarding' | 'saved' | 'discarded';

type Props = {
  phase: UnsavedSettingsDialogPhase;
  onSave: () => void;
  onDiscard: () => void;
};

export function UnsavedSettingsDialog({ phase, onSave, onDiscard }: Props) {
  const working = phase === 'saving' || phase === 'discarding';
  const result = phase === 'saved' || phase === 'discarded';

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
              {phase === 'saved' ? 'Alterações salvas com sucesso!' : 'Alterações não foram salvas'}
            </h2>
            <p id="unsaved-settings-description">
              {phase === 'saved'
                ? 'As novas configurações já foram aplicadas ao restaurante.'
                : 'As mudanças feitas nesta seção foram descartadas.'}
            </p>
            <small>Continuando para a próxima seção</small>
          </S.Result>
        ) : (
          <>
            <S.ChoiceIcon aria-hidden="true">
              <AlertTriangle />
            </S.ChoiceIcon>
            <S.ChoiceCopy>
              <h2 id="unsaved-settings-title">Você tem alterações pendentes</h2>
              <p id="unsaved-settings-description">
                Deseja salvar as configurações antes de mudar de seção?
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
