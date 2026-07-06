import {
  Utensils,
  Soup,
  Flame,
  Pizza,
  Sandwich,
  CupSoda,
  IceCream,
  Wine,
} from "lucide-react";

export function normalizeCategoryLabel(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function resolveCategoryIcon(categoryName) {
  const normalized = normalizeCategoryLabel(categoryName);

  if (
    /(entrada|entradas|petisco|petiscos|aperitivo|aperitivos|acompanhamento|acompanhamentos|porcao|porcoes|porção|porções|tira-gosto|tiragosto)/.test(
      normalized,
    )
  ) {
    return Soup;
  }

  if (/(vinho|vinhos|adega)/.test(normalized)) {
    return Wine;
  }

  if (
    /(bebida|bebidas|drink|drinks|suco|sucos|refrigerante|refrigerantes|cerveja|cervejas|chopp|agua|água|energetico|energético|cha|chá|cafe|café)/.test(
      normalized,
    )
  ) {
    return CupSoda;
  }

  if (
    /(hamburguer|hamburgueres|burger|burgers|lanche|lanches|sanduiche|sanduiches|sanduíche|sanduíches|hot dog|cachorro-quente)/.test(
      normalized,
    )
  ) {
    return Sandwich;
  }

  if (/(pizza|pizzas|massa|massas|esfiha|esfihas|calzone)/.test(normalized)) {
    return Pizza;
  }

  if (
    /(sobremesa|sobremesas|doce|doces|acai|açaí|sorvete|sorvetes|milkshake|milkshakes|bolo|bolos|torta|tortas|brownie|pudim|mousse)/.test(
      normalized,
    )
  ) {
    return IceCream;
  }

  if (
    /(prato|pratos|refeicao|refeição|refeicoes|refeições|executivo|executivos|carne|carnes|churrasco|frango|frangos|peixe|peixes|camarao|camarão|japones|japonês|sushi|temaki|yakisoba|almoco|almoço|jantar|marmita|marmitas)/.test(
      normalized,
    )
  ) {
    return Flame;
  }

  return Utensils;
}
