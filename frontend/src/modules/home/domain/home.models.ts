import type { Product } from "../../../shared/domain/models";

export type Address = {
  id: number;
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento: string;
};

export type { Product };

export type ProductRipplePoint = {
  x: number;
  y: number;
};
