import type { LucideIcon } from 'lucide-react';
import {
  Beef,
  CakeSlice,
  CircleDot,
  CirclePlus,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Fish,
  Flame,
  IceCream,
  IceCreamBowl,
  Milk,
  Pizza,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  Wine,
} from 'lucide-react';

export function normalizeCategoryLabel(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function resolveCategoryIcon(categoryName: string): LucideIcon {
  const normalized = normalizeCategoryLabel(categoryName);

  if (/(borda|bordas|recheio de borda|recheios de borda)/.test(normalized)) {
    return CircleDot;
  }

  if (
    /(adicional|adicionais|extra|extras|complemento|complementos|opcional|opcionais)/.test(
      normalized,
    )
  ) {
    return CirclePlus;
  }

  if (/(queijo|queijos|laticinio|laticinios|derivado|derivados)/.test(normalized)) {
    return Milk;
  }

  if (/(molho|molhos|creme|cremes|calda|caldas|tempero|temperos)/.test(normalized)) {
    return CookingPot;
  }

  if (
    /(peixe|peixes|camarao|camaroes|fruto do mar|frutos do mar|marisco|mariscos)/.test(normalized)
  ) {
    return Fish;
  }

  if (
    /(proteina|proteinas|carne|carnes|churrasco|bovina|bovinas|suina|suinas|frango|frangos)/.test(
      normalized,
    )
  ) {
    return Beef;
  }

  if (/(massa|massas|macarrao|macarroes|lasanha|lasanhas|nhoque|nhoques)/.test(normalized)) {
    return Wheat;
  }

  if (
    /(entrada|entradas|petisco|petiscos|aperitivo|aperitivos|acompanhamento|acompanhamentos|porcao|porcoes|tira-gosto|tiragosto)/.test(
      normalized,
    )
  ) {
    return Soup;
  }

  if (/(vinho|vinhos|adega)/.test(normalized)) {
    return Wine;
  }

  if (/(cafe|cafeteria|espresso|cappuccino)/.test(normalized)) {
    return Coffee;
  }

  if (/(padaria|pao|paes|croissant|folhado|folhados)/.test(normalized)) {
    return Croissant;
  }

  if (/(doceria|confeitaria|bolo|bolos|torta|tortas|cupcake|cupcakes)/.test(normalized)) {
    return CakeSlice;
  }

  if (/(acai|acaiteria)/.test(normalized)) {
    return IceCreamBowl;
  }

  if (
    /(bebida|bebidas|drink|drinks|suco|sucos|refrigerante|refrigerantes|cerveja|cervejas|chopp|agua|energetico|cha|cafe)/.test(
      normalized,
    )
  ) {
    return CupSoda;
  }

  if (
    /(hamburguer|hamburgueres|burger|burgers|lanche|lanches|sanduiche|sanduiches|hot dog|cachorro-quente)/.test(
      normalized,
    )
  ) {
    return Sandwich;
  }

  if (/(pizza|pizzas|esfiha|esfihas|calzone)/.test(normalized)) {
    return Pizza;
  }

  if (
    /(sobremesa|sobremesas|doce|doces|acai|sorvete|sorvetes|milkshake|milkshakes|bolo|bolos|torta|tortas|brownie|pudim|mousse)/.test(
      normalized,
    )
  ) {
    return IceCream;
  }

  if (
    /(prato|pratos|refeicao|refeicoes|executivo|executivos|japones|sushi|temaki|yakisoba|almoco|jantar|marmita|marmitas)/.test(
      normalized,
    )
  ) {
    return Flame;
  }

  return Utensils;
}

const CATEGORY_ICON_COLORS = new Map<LucideIcon, string>([
  [Wheat, '#a96224'],
  [CookingPot, '#f05a24'],
  [Beef, '#ed4b3e'],
  [Fish, '#2788b8'],
  [Milk, '#f5a20b'],
  [CirclePlus, '#20a84b'],
  [CircleDot, '#a85c22'],
  [Soup, '#d97706'],
  [Wine, '#a23f62'],
  [Coffee, '#9a5f3b'],
  [Croissant, '#c87922'],
  [CakeSlice, '#d94f87'],
  [IceCreamBowl, '#7c4bb3'],
  [CupSoda, '#168c91'],
  [Sandwich, '#b7652a'],
  [Pizza, '#e4542f'],
  [IceCream, '#d94f87'],
  [Flame, '#e65335'],
  [Utensils, '#6b716f'],
]);

export function resolveCategoryIconColor(categoryName: string) {
  const icon = resolveCategoryIcon(categoryName);
  if (icon !== Utensils) return CATEGORY_ICON_COLORS.get(icon) || '#6b716f';

  const normalized = normalizeCategoryLabel(categoryName);
  const fallbackColors = ['#397f8f', '#7a62a3', '#2f8b72', '#b35f3d', '#986f24', '#a44e68'];
  const hash = [...normalized].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return fallbackColors[hash % fallbackColors.length];
}

export function resolveCategoryVisual(categoryName: string) {
  return {
    icon: resolveCategoryIcon(categoryName),
    color: resolveCategoryIconColor(categoryName),
  };
}
