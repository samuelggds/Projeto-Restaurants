type CepLookupResult = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

type CepLookupOptions = {
  timeoutMs?: number;
  retries?: number;
  cacheTtlMs?: number;
};

const CEP_REQUEST_TIMEOUT_MS = 6000;
const CEP_MAX_RETRIES = 1;
const CEP_CACHE_TTL_MS = 5 * 60 * 1000;

const cepLookupCache = new Map<
  string,
  {
    data: CepLookupResult;
    expiresAt: number;
  }
>();

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export function extractCepDigits(value: string) {
  return onlyDigits(value).slice(0, 8);
}

export function normalizeCepInput(value: string) {
  const digits = extractCepDigits(value);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

async function lookupViaCepOnce(
  cepDigits: string,
  timeoutMs: number,
): Promise<CepLookupResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${cepDigits}/json/`,
      {
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("Não foi possível consultar o CEP agora.");
    }

    const data = await response.json();

    if (data?.erro) {
      throw new Error("CEP não encontrado.");
    }

    return {
      logradouro: String(data?.logradouro || ""),
      bairro: String(data?.bairro || ""),
      localidade: String(data?.localidade || ""),
      uf: String(data?.uf || ""),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Consulta de CEP demorou demais. Tente novamente.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchAddressByCep(
  cep: string,
  options: CepLookupOptions = {},
): Promise<CepLookupResult> {
  const cepDigits = extractCepDigits(cep);
  const timeoutMs = Number(options.timeoutMs || CEP_REQUEST_TIMEOUT_MS);
  const retries = Math.max(0, Number(options.retries ?? CEP_MAX_RETRIES));
  const cacheTtlMs = Math.max(
    0,
    Number(options.cacheTtlMs ?? CEP_CACHE_TTL_MS),
  );

  if (cepDigits.length !== 8) {
    throw new Error("CEP inválido. Informe 8 dígitos.");
  }

  if (cacheTtlMs > 0) {
    const cached = cepLookupCache.get(cepDigits);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (cached && cached.expiresAt <= Date.now()) {
      cepLookupCache.delete(cepDigits);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await lookupViaCepOnce(cepDigits, timeoutMs);

      if (cacheTtlMs > 0) {
        cepLookupCache.set(cepDigits, {
          data: result,
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      return result;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Não foi possível consultar o CEP agora.");

      if (attempt >= retries) {
        break;
      }

      await wait(250 * (attempt + 1));
    }
  }

  throw lastError || new Error("Não foi possível consultar o CEP agora.");
}
