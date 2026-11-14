import type { AdminSection, SettingsSection } from '../types';

export type AdminScreenGuide = { description: string; steps: [string, string, string] };
const guide = (description: string, ...steps: [string, string, string]): AdminScreenGuide => ({
  description,
  steps,
});

export const adminAreaGuides: Record<
  Exclude<AdminSection, 'settings' | 'overview'>,
  AdminScreenGuide
> = {
  orders: guide(
    'Acompanhe os pedidos, os pagamentos e cada etapa do atendimento.',
    'Use as filas e os filtros para localizar os pedidos que precisam de atenção.',
    'Abra um pedido para conferir os itens, o pagamento e os detalhes do cliente.',
    'Avance o status conforme o andamento real. Revise as confirmações antes de cancelar ou estornar.',
  ),
  support: guide(
    'Converse com seus clientes e resolva solicitações relacionadas aos pedidos.',
    'Escolha uma conversa na lista de atendimentos abertos ou resolvidos.',
    'Leia o histórico e confira o pedido antes de responder. Revise qualquer sugestão de resposta.',
    'Envie a orientação ao cliente e marque o atendimento como resolvido quando concluir.',
  ),
  catalog: guide(
    'Organize categorias, produtos, ingredientes e opções do seu cardápio.',
    'Organize as categorias e cadastre os ingredientes utilizados nos produtos.',
    'Adicione ou edite produtos. Confira fotos, preços, adicionais e disponibilidade em cada etapa.',
    'Revise a prévia e salve o cadastro. Use os filtros para conferir o que está disponível para venda.',
  ),
  customers: guide(
    'Consulte seus clientes e acompanhe o histórico de compras.',
    'Pesquise pelo nome ou use os filtros para encontrar o cliente.',
    'Confira os pedidos e os valores apresentados no histórico.',
    'Use as informações para organizar o atendimento e entender quem compra no seu restaurante.',
  ),
  coupons: guide(
    'Crie cupons e organize as condições das suas campanhas.',
    'Confira os cupons existentes antes de criar uma nova campanha.',
    'Defina código, benefício, validade e condições de uso nos campos do cadastro.',
    'Revise o público e os limites antes de salvar. Acompanhe a disponibilidade dos cupons na lista.',
  ),
  reservations: guide(
    'Organize os horários, as mesas e os pedidos de reserva do salão.',
    'Revise as regras de reserva e os horários de atendimento disponíveis.',
    'Consulte a agenda e confira o cliente, o horário e a quantidade de pessoas.',
    'Confirme ou atualize cada reserva conforme a disponibilidade real das mesas.',
  ),
  employees: guide(
    'Cadastre sua equipe e controle os acessos de cada função.',
    'Consulte a lista para conferir quem já possui acesso ao restaurante.',
    'Adicione ou edite um funcionário e revise os dados e a função atribuída.',
    'Salve o cadastro. Ao desativar um acesso, confira o nome na confirmação antes de continuar.',
  ),
  subscriptions: guide(
    'Confira seu plano, a forma de pagamento e as cobranças da GastroNexa.',
    'Em Pagamento, confira a situação da assinatura e a forma de cobrança.',
    'Em Planos, compare os recursos e revise as condições antes de solicitar uma mudança.',
    'Em Cobranças, consulte vencimentos, pagamentos e detalhes das mensalidades.',
  ),
  'managed-service': guide(
    'Acompanhe a implantação e as solicitações à equipe GastroNexa.',
    'Confira os serviços disponíveis e a situação do atendimento contratado.',
    'Descreva a solicitação com as informações necessárias para a equipe realizar o trabalho.',
    'Acompanhe as atualizações e responda quando forem solicitados mais detalhes.',
  ),
  help: guide(
    'Encontre orientações e entre em contato com o suporte.',
    'Abra o guia relacionado à tarefa que deseja realizar no painel.',
    'Leia as etapas e confira os exemplos antes de ajustar a configuração.',
    'Se precisar de suporte, descreva o que ocorreu e inclua os detalhes solicitados no formulário.',
  ),
};

export const adminSettingsGuides: Record<SettingsSection, AdminScreenGuide> = {
  brand: guide(
    'Defina como seu restaurante será apresentado aos clientes.',
    'Revise o nome e a descrição do restaurante.',
    'Escolha a logo, a capa e os banners. Confira as prévias antes de continuar.',
    'Ao trocar de seção, confirme o salvamento das alterações. Abra a loja para revisar o resultado.',
  ),
  business: guide(
    'Mantenha os dados do estabelecimento e os contatos atualizados.',
    'Selecione o tipo de documento e preencha os dados do responsável ou da empresa.',
    'Confira os contatos usados pelo restaurante e corrija os campos destacados.',
    'Revise os dados e confirme o salvamento ao trocar de seção.',
  ),
  address: guide(
    'Informe onde seu restaurante está localizado.',
    'Preencha o CEP e confira os dados de endereço apresentados.',
    'Revise número, complemento, bairro, cidade e estado.',
    'Confira a localização e confirme o salvamento ao trocar de seção.',
  ),
  hours: guide(
    'Defina os dias e horários em que o restaurante recebe pedidos.',
    'Selecione os dias de funcionamento e confira se o recebimento de pedidos está habilitado.',
    'Ajuste os períodos de cada dia e revise os horários que terminam no dia seguinte.',
    'Confirme o salvamento ao trocar de seção e confira a situação da loja na visão geral.',
  ),
  orders: guide(
    'Configure como os pedidos entram e são acompanhados na operação.',
    'Leia as opções de recebimento e aceite de pedidos antes de ativá-las.',
    'Ajuste as notificações e os limites apresentados de acordo com a capacidade da equipe.',
    'Revise as regras e confirme o salvamento ao trocar de seção.',
  ),
  promotions: guide(
    'Aplique descontos aos produtos sem perder a referência dos preços.',
    'Localize os produtos que participarão da promoção.',
    'Defina o desconto e confira o preço final e as condições exibidas.',
    'Confirme a aplicação e revise o resultado na lista de produtos.',
  ),
  delivery: guide(
    'Organize as opções de entrega, retirada, taxas e prazos.',
    'Habilite as modalidades de atendimento que seu restaurante oferece.',
    'Revise taxas, regiões atendidas, pedido mínimo e estimativas de prazo.',
    'Confira as integrações utilizadas e confirme as alterações nos controles correspondentes.',
  ),
  table: guide(
    'Prepare o cardápio e a identificação das mesas do salão.',
    'Revise as opções do cardápio de mesa disponíveis no seu plano.',
    'Confira as mesas, a identificação e os recursos apresentados ao cliente.',
    'Revise a prévia e os códigos de acesso antes de disponibilizá-los nas mesas.',
  ),
  'table-account': guide(
    'Defina as regras de consumo e de pagamento das mesas.',
    'Confira as opções de abertura, acompanhamento e fechamento da conta.',
    'Revise divisão de pagamentos, limites e condições de pagamento antecipado.',
    'Confirme as alterações e oriente a equipe sobre as regras escolhidas.',
  ),
  'nfc-registration': guide(
    'Cadastre clientes e vincule os cartões utilizados no atendimento.',
    'Pesquise o cliente para conferir se já existe um cadastro.',
    'Revise os dados e siga a leitura do cartão para realizar a vinculação.',
    'Confira o cartão associado e use as ações de recuperação ou pagamento apenas quando necessário.',
  ),
  whatsapp: guide(
    'Configure o canal de WhatsApp e as mensagens do restaurante.',
    'Confira o número, o nome e as informações de contato.',
    'Revise a conexão e escolha quais notificações e mensagens deseja utilizar.',
    'Siga as orientações de conexão exibidas e confira a situação do canal antes de usá-lo.',
  ),
  printing: guide(
    'Prepare a impressão dos pedidos para a equipe da cozinha.',
    'Confira a conexão entre o computador, a impressora e o sistema.',
    'Defina o papel, o número de cópias e o momento da impressão automática.',
    'Salve a configuração e use as opções de teste e prévia para conferir o resultado.',
  ),
  'employee-payments': guide(
    'Organize as regras e os registros de pagamento dos funcionários.',
    'Selecione o funcionário e confira o período que deseja administrar.',
    'Revise as regras de remuneração, os lançamentos e os valores calculados.',
    'Confira o detalhamento antes de confirmar um lançamento ou registrar um pagamento.',
  ),
  'courier-payments': guide(
    'Acompanhe as entregas e os valores devidos aos motoqueiros.',
    'Selecione o profissional e o período de apuração.',
    'Confira as regras, as entregas consideradas e os ajustes apresentados.',
    'Revise o total e o histórico antes de registrar ou confirmar o pagamento.',
  ),
  payments: guide(
    'Escolha as formas de pagamento e confira as conexões de recebimento.',
    'Revise as formas de pagamento oferecidas aos clientes.',
    'Confira o provedor utilizado e siga as instruções para conectar a conta.',
    'Verifique a situação da conexão e a disponibilidade de cada forma de pagamento.',
  ),
  social: guide(
    'Adicione os canais oficiais do seu restaurante.',
    'Escolha as redes sociais que deseja mostrar aos clientes.',
    'Informe os endereços dos perfis e confira as prévias dos links.',
    'Confirme o salvamento ao trocar de seção e revise os links na loja.',
  ),
  appearance: guide(
    'Personalize a apresentação e as informações de busca da sua loja.',
    'Escolha as opções de aparência e acompanhe as prévias disponíveis.',
    'Revise os textos e as informações de apresentação nos mecanismos de busca.',
    'Confirme o salvamento ao trocar de seção e confira a loja em computador e celular.',
  ),
  security: guide(
    'Revise os acessos e a proteção da conta administrativa.',
    'Confira quem possui acesso ao painel e as funções atribuídas à equipe.',
    'Revise as opções de autenticação e siga as instruções de confirmação.',
    'Mantenha os dados de acesso protegidos e confira as confirmações antes de alterar a segurança.',
  ),
};
