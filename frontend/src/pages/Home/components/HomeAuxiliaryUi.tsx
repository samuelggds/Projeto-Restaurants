import { lazy, Suspense } from 'react';
import type { ProductConfiguration } from '../domain/productCustomization';
import type { HomeProduct } from '../types';
import { HomeFeedback, type HomeNotification } from './HomeFeedback';
import { TableServiceActions } from './TableServiceActions';

const ProductConfigurator = lazy(() =>
  import('./ProductConfigurator').then((module) => ({ default: module.ProductConfigurator })),
);

const ComboConfigurator = lazy(() =>
  import('./ComboConfigurator').then((module) => ({ default: module.ComboConfigurator })),
);

export function HomeAuxiliaryUi({
  crossSellProduct,
  crossSellCombo,
  primaryColor,
  notifications,
  onDismissNotification,
  onCloseProduct,
  onCloseCombo,
  onConfirmProduct,
  onConfirmCombo,
  tableService,
}: {
  crossSellProduct: HomeProduct | null;
  crossSellCombo: HomeProduct | null;
  primaryColor: string;
  notifications: HomeNotification[];
  onDismissNotification: (id: number) => void;
  onCloseProduct: () => void;
  onCloseCombo: () => void;
  onConfirmProduct: (configuration: ProductConfiguration, quantity: number) => void;
  onConfirmCombo: (configuration: ProductConfiguration) => void;
  tableService?: {
    tableNumber: string | number;
    waiterEnabled: boolean;
    loading: 'WAITER' | 'BILL' | null;
    onCallWaiter: () => void;
  };
}) {
  return (
    <>
      {crossSellProduct ? (
        <Suspense fallback={null}>
          <ProductConfigurator
            product={crossSellProduct}
            primaryColor={primaryColor}
            enableProductQuantity
            onClose={onCloseProduct}
            onConfirm={(configuration, quantity) =>
              onConfirmProduct(configuration, quantity || 1)
            }
          />
        </Suspense>
      ) : null}

      {crossSellCombo ? (
        <Suspense fallback={null}>
          <ComboConfigurator
            product={crossSellCombo}
            primaryColor={primaryColor}
            onClose={onCloseCombo}
            onConfirm={onConfirmCombo}
          />
        </Suspense>
      ) : null}

      <HomeFeedback
        notifications={notifications}
        onDismissNotification={onDismissNotification}
      />

      {tableService ? (
        <TableServiceActions
          tableNumber={tableService.tableNumber}
          waiterEnabled={tableService.waiterEnabled}
          loading={tableService.loading}
          onCallWaiter={tableService.onCallWaiter}
        />
      ) : null}
    </>
  );
}
