import { useLayoutEffect, useMemo, useState } from 'react';
import { AttendantOperationCenterV2 } from '../../attendant/AttendantOperationCenterV2';
import { getDemoAccountByRole, type DemoState } from './demoDomain';
import { useDemoHomeData } from './useDemoHomeData';
import {
  createDemoAttendantServices,
  DEMO_ATTENDANT_ID,
  mapDemoAttendantSnapshot,
  type DemoAttendantProduct,
} from './demoAttendantAdapter';

export function DemoAttendant({
  state,
  onState,
  onLogout,
  products: suppliedProducts,
}: {
  state: DemoState;
  onState: (state: DemoState) => void;
  onLogout: () => void;
  products?: DemoAttendantProduct[];
}) {
  const data = useDemoHomeData();
  const products = suppliedProducts ?? data.products;
  const [bridge] = useState(() => {
    let currentState = state;
    let notify = onState;
    return {
      getState: () => currentState,
      replaceState: (next: DemoState) => {
        currentState = next;
        notify(next);
      },
      updateInputs: (next: DemoState, onChange: (state: DemoState) => void) => {
        currentState = next;
        notify = onChange;
      },
    };
  });
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  useLayoutEffect(() => {
    bridge.updateInputs(state, onState);
  }, [bridge, state, onState]);
  const services = useMemo(
    () =>
      createDemoAttendantServices({
        getState: bridge.getState,
        onState: bridge.replaceState,
        products,
      }),
    [bridge, products],
  );
  const snapshot = useMemo(() => mapDemoAttendantSnapshot(state, updatedAt), [state, updatedAt]);
  return (
    <AttendantOperationCenterV2
      attendantId={DEMO_ATTENDANT_ID}
      attendantName={getDemoAccountByRole(state, 'ATENDENTE')?.name || 'Atendente Demo'}
      restaurantId={1}
      restaurant={{
        name: data.brand.name,
        monogram: data.brand.monogram || 'GB',
        primaryColor: data.brand.primaryColor,
      }}
      snapshot={snapshot}
      workspaceState={{
        loading: false,
        refreshing: false,
        error: null,
        lastUpdatedAt: snapshot.generatedAt,
      }}
      onRefresh={() => setUpdatedAt(Date.now())}
      onLogout={onLogout}
      services={services}
    />
  );
}
