import { ArrowLeft, ArrowRight, PackageOpen } from 'lucide-react';
import type { ProductWizardSaleMode, ProductWizardStep } from '../domain/productWizard';

type ProductWizardFooterProps = {
  busy: boolean;
  currentStep: ProductWizardStep;
  editing: boolean;
  linkedOptionCount: number;
  name: string;
  optionGroupCount: number;
  saleMode: ProductWizardSaleMode;
  onBack: () => void;
  onContinue: () => void;
};

export function ProductWizardFooter({
  busy,
  currentStep,
  editing,
  linkedOptionCount,
  name,
  optionGroupCount,
  saleMode,
  onBack,
  onContinue,
}: ProductWizardFooterProps) {
  return (
    <footer className="drawer-footer">
      <div className="footer-summary">
        <span className="footer-summary-icon">
          <PackageOpen />
        </span>
        <span>
          <b>{name || (editing ? 'Produto em edição' : 'Novo produto')}</b>
          <small>
            {saleMode === 'BUILDABLE'
              ? `${optionGroupCount} etapa(s) · ${linkedOptionCount} opção(ões) vinculada(s)`
              : 'Produto pronto · sem etapas de montagem'}
          </small>
        </span>
      </div>
      <div className="footer-actions">
        <button disabled={currentStep === 'TYPE' || busy} type="button" onClick={onBack}>
          <ArrowLeft /> Voltar
        </button>
        {currentStep === 'REVIEW' ? (
          <button key="submit" className="primary" disabled={busy} type="submit">
            {busy ? 'Salvando produto...' : editing ? 'Salvar alterações' : 'Criar produto'}
          </button>
        ) : (
          <button
            key="advance"
            aria-label="Continuar"
            className="primary"
            disabled={busy}
            type="button"
            onClick={(event) => {
              // Changing from Next to Submit during this event must not trigger
              // a native form submission before the user confirms the review.
              event.preventDefault();
              onContinue();
            }}
          >
            Continuar <ArrowRight />
          </button>
        )}
      </div>
    </footer>
  );
}
