-- A comanda sem consumo cancelada pelo administrador nao representa pagamento.
-- Mantem registros e auditorias e permite distinguir cancelamento de PAID.
ALTER TYPE "NfcComandaStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
