/**
 * Defense-in-depth for the public commercial WhatsApp assistant.
 * An allowlisted product knowledge base and public plan catalog are the
 * ONLY information sources. These checks reject attempts to retrieve
 * individual or sensitive information rather than public feature questions.
 */
function normalize(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase();
}

const SECRET_REQUEST = /(?:\.env\b|process\.env|database_url|postgres(?:ql)?:\/\/|(?:api[_ -]?key|client[_ -]?secret|access[_ -]?token|jwt|senha|password|credencial|token|chave privada|chave de api|segredo|secret|otp|codigo de verificacao|codigo de acesso|mfa))/iu;
const EXTRACT = /(?:\b(?:me\s+)?(?:envie|passe|mostre|revele|exiba|liste|retorne|forneca|consulte|acesse|extraia|exporte|compartilhe|detalhe|descubra|copie)\b|quais sao|qual e|quem e|como acesso)/iu;
const PRIVATE_DATA = /(?:\b(?:cpfs?|rgs?|cnpjs?|telefones?|e-mail|email|endereco|identidade|nome completo|conta bancaria|dados bancarios|dados financeiros|dados pessoais|dados privados|dados cadastrais|faturamento real|historico de pedidos|pedido numero|pedido #|transacao real|fatura real|saldo|credenciais|logins|dados dos clientes|dados de funcionarios|dados dos funcionarios|dados dos donos|dados do super.?admin)\b)/iu;
const INTERNAL_DETAILS = /(?:\b(?:codigo fonte|repositorio|github privado|banco de dados|sql|schema|tabela do banco|logs internos|logs do servidor|servidor de producao|ip interno|ip do servidor|infraestrutura interna|endpoint interno|rota privada|api interna|backups|configuracao interna|arquitetura interna|permissoes internas|regras de autorizacao|burlar seguranca|contornar acesso|invadir|explorar vulnerabilidade|chave de criptografia)\b)/iu;
const PRIVATE_PERSON = /(?:\b(?:cliente|clientes|funcionario|funcionarios|colaborador|colaboradores|dono|donos|proprietario|proprietarios|super.?admin|administrador|administradores|restaurante especifico|outro restaurante)\b)/iu;
const INDIVIDUAL_DETAIL = /(?:\b(?:dados|conta|pedidos|pedido|comanda|pagamento|fatura|historico|acesso|senha|identidade|cpfs?|email|telefones?|endereco|nome|permissao|permissoes|informacoes pessoais|financeiro pessoal|extrato)\b)/iu;

export function isRestrictedCommercialDisclosureRequest(value: string) {
  const text = normalize(value).slice(0, 2400);
  if (SECRET_REQUEST.test(text)) return true;
  if (INTERNAL_DETAILS.test(text) && EXTRACT.test(text)) return true;
  if (PRIVATE_DATA.test(text) && EXTRACT.test(text)) return true;
  if (PRIVATE_PERSON.test(text) && INDIVIDUAL_DETAIL.test(text) && EXTRACT.test(text)) return true;
  // No single identifier or credential may be requested, even in indirect phrasing.
  if (/\b(?:cpfs?|senha|credencial|api.?key|chave privada|dados bancarios|token de acesso)\b/u.test(text)) return true;
  return false;
}

const UNSAFE_OUTPUT = /(?:\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?55\s*)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b|\b\d{11,19}\b|postgres(?:ql)?:\/\/|(?:sk-|gh[pousr]_|AKIA|-----BEGIN)|(?:password|senha|token|secret|api[_ -]?key|client[_ -]?secret|database_url)\s*[:=])/iu;

export function isUnsafeCommercialAiOutput(value: string) {
  const text = String(value || '');
  if (UNSAFE_OUTPUT.test(text)) return true;
  const normalized = normalize(text);
  return /(?:\b(?:codigo fonte|api interna|rota privada|endpoint interno|logs internos|chave de criptografia|configuracao interna|credenciais|dados pessoais|dados privados)\b)/u.test(normalized) &&
    /(?:\b(?:segue|aqui esta|sao os|o valor e|e o seguinte|e a seguinte|acesso)\b)/u.test(normalized);
}
