// Pure commercial fallback menu: no database, provider or HTTP dependencies.
function menuMessage() {
  return [
    'Olá! 👋 Você está falando com a GastroNexa.',
    '',
    'Como podemos ajudar?',
    '1. Conhecer a plataforma',
    '2. Planos e valores',
    '3. Ver uma demonstração',
    '4. Já sou cliente e preciso de suporte',
    '5. Falar com uma pessoa',
  ].join('\n');
}

function normalizeBotChoice(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .trim()
    .toLowerCase();
}

export function botReplyForMessage(message: string) {
  const choice = normalizeBotChoice(message);

  if (choice === '1' || choice.includes('conhecer a plataforma')) {
    return {
      handoff: false,
      body: [
        'Claro! 😊 A GastroNexa ajuda o restaurante a centralizar pedidos, cardápio digital, mesas, delivery, pagamentos e operação da equipe em um só sistema.',
        '',
        'Se quiser, responda *3* para ver uma demonstração ou *2* para falar sobre planos e valores.',
      ].join('\n'),
    };
  }

  if (choice === '2' || choice.includes('planos') || choice.includes('valores')) {
    return {
      handoff: false,
      body: [
        'Posso te ajudar com os planos e valores. 💳',
        '',
        'Para indicarmos a melhor opção, me diga quantas unidades/restaurantes você pretende usar e quais recursos são mais importantes para você.',
        '',
        'Se preferir falar com uma pessoa, responda *5*.',
      ].join('\n'),
    };
  }

  if (choice === '3' || choice.includes('demonstracao') || choice.includes('demo')) {
    return {
      handoff: false,
      body: [
        'Perfeito! 👌 Podemos te apresentar uma demonstração da GastroNexa.',
        '',
        'Me diga o melhor período para você: manhã, tarde ou noite. Nossa equipe comercial acompanha a conversa por aqui.',
        '',
        'Se quiser atendimento humano agora, responda *5*.',
      ].join('\n'),
    };
  }

  if (
    choice === '4' ||
    choice.includes('sou cliente') ||
    choice.includes('suporte') ||
    choice.includes('problema')
  ) {
    return {
      handoff: false,
      body: [
        'Entendi. Se você já é cliente GastroNexa, descreva resumidamente o que está acontecendo e informe o nome do restaurante.',
        '',
        'Se precisar falar diretamente com uma pessoa, responda *5*.',
      ].join('\n'),
    };
  }

  if (
    choice === '5' ||
    choice.includes('falar com uma pessoa') ||
    choice.includes('atendente') ||
    choice.includes('humano')
  ) {
    return {
      handoff: true,
      body: [
        'Certo! 🙋 Vou encaminhar esta conversa para atendimento humano.',
        '',
        'Sua mensagem ficou registrada e a equipe pode continuar por aqui.',
      ].join('\n'),
    };
  }

  return { handoff: false, body: menuMessage() };
}

