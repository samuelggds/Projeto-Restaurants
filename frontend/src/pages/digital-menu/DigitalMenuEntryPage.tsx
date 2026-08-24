import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import tablesService from '../../Services/tablesService';
import Home from '../Home/Home';
import { TableAccessGate } from '../Home/components/TableAccessGate';

type ResolvedTable = {
  id: number;
  number: number;
  restaurantId: number;
  restaurantSlug: string;
  tableOrderingEnabled: boolean;
  waiterCallEnabled: boolean;
  billRequestEnabled: boolean;
};

type ResolutionState =
  | { status: 'loading'; key: ''; table: null; error: '' }
  | { status: 'ready'; key: string; table: ResolvedTable; error: '' }
  | { status: 'error'; key: string; table: null; error: string };

const Loading = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #fffdf9;
  color: #6f6a63;
  font:
    600 14px Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
`;

function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function apiErrorMessage(error: unknown) {
  const typed = error as { response?: { data?: { error?: string } }; message?: string };
  return (
    typed.response?.data?.error ||
    typed.message ||
    'Não foi possível validar esta mesa. Escaneie o QR Code oficial novamente.'
  );
}

export default function DigitalMenuEntryPage() {
  const { tableNumber, restaurantSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resolution, setResolution] = useState<ResolutionState>({
    status: 'loading',
    key: '',
    table: null,
    error: '',
  });
  const lastResolvedKeyRef = useRef('');
  const routeTableNumber = positiveInteger(tableNumber);
  const queryTableId = positiveInteger(searchParams.get('tableId') || searchParams.get('tid'));
  const queryRestaurantId = positiveInteger(
    searchParams.get('restaurantId') || searchParams.get('rid'),
  );
  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();
  const hasValidRestaurantReference = Boolean(queryRestaurantId || normalizedSlug);
  const searchParamsString = searchParams.toString();
  const resolutionKey = [
    routeTableNumber || '',
    queryTableId || '',
    queryRestaurantId || '',
    normalizedSlug,
  ].join(':');

  useEffect(() => {
    let active = true;

    if (
      !routeTableNumber ||
      !hasValidRestaurantReference ||
      lastResolvedKeyRef.current === resolutionKey
    ) {
      return undefined;
    }

    tablesService
      .resolvePublicTable({
        tableNumber: routeTableNumber,
        tableId: queryTableId,
        restaurantId: queryRestaurantId,
        slug: normalizedSlug,
      })
      .then((raw: ResolvedTable) => {
        if (!active) return;
        const table: ResolvedTable = {
          ...raw,
          id: Number(raw.id),
          number: Number(raw.number),
          restaurantId: Number(raw.restaurantId),
        };

        if (
          !positiveInteger(table.id) ||
          table.number !== routeTableNumber ||
          !positiveInteger(table.restaurantId) ||
          (queryTableId && table.id !== queryTableId) ||
          (queryRestaurantId && table.restaurantId !== queryRestaurantId) ||
          (normalizedSlug && table.restaurantSlug !== normalizedSlug)
        ) {
          throw new Error('A mesa retornada não corresponde ao QR Code escaneado.');
        }

        const canonicalParams = new URLSearchParams(searchParamsString);
        canonicalParams.set('tid', String(table.id));
        canonicalParams.set('rid', String(table.restaurantId));
        canonicalParams.delete('tableId');
        canonicalParams.delete('restaurantId');
        const canonicalKey = [table.number, table.id, table.restaurantId, normalizedSlug].join(':');

        if (canonicalParams.toString() !== searchParamsString) {
          setSearchParams(canonicalParams, { replace: true });
        }
        lastResolvedKeyRef.current = canonicalKey;
        setResolution({ status: 'ready', key: canonicalKey, table, error: '' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResolution({
          status: 'error',
          key: resolutionKey,
          table: null,
          error: apiErrorMessage(error),
        });
      });

    return () => {
      active = false;
    };
  }, [
    hasValidRestaurantReference,
    normalizedSlug,
    queryRestaurantId,
    queryTableId,
    resolutionKey,
    routeTableNumber,
    searchParamsString,
    setSearchParams,
  ]);

  if (!routeTableNumber || !hasValidRestaurantReference) {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        invalidQr
        invalidTitle="Não foi possível abrir esta mesa"
        invalidMessage="O QR Code não identifica uma mesa e um restaurante válidos."
        tableLabel={routeTableNumber || ''}
        pin=""
        pinError=""
        validating={false}
        onPinChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />
    );
  }

  if (resolution.status === 'loading' || resolution.key !== resolutionKey) {
    return <Loading role="status">Validando a mesa e o restaurante...</Loading>;
  }

  if (resolution.status === 'error') {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        invalidQr
        invalidTitle="Não foi possível abrir esta mesa"
        invalidMessage={resolution.error}
        tableLabel={routeTableNumber || ''}
        pin=""
        pinError={resolution.error}
        validating={false}
        onPinChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />
    );
  }

  if (!resolution.table.tableOrderingEnabled) {
    return (
      <TableAccessGate
        primaryColor="#d64d08"
        invalidQr
        invalidTitle="Cardápio de mesa indisponível"
        invalidMessage="O restaurante desativou temporariamente os pedidos pelo cardápio de mesa."
        tableLabel={resolution.table.number}
        pin=""
        pinError="O restaurante desativou temporariamente os pedidos pelo cardápio de mesa."
        validating={false}
        onPinChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />
    );
  }

  return <Home />;
}
