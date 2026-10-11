# Melhoria de imagens paga pela plataforma

## Escopo

No workspace assistido do SUPER_ADMIN, fotos de produtos prontos, combos, banners, logo e capa possuem upload/colar imagem, melhoria com IA, comparação, aprovação ou descarte. Produtos personalizáveis continuam usando seus editores atuais nesta etapa. Em Configurações, logo e capa usam os campos seguros já existentes.

A imagem original só é substituída no formulário depois de `Usar imagem melhorada`. A publicação continua dependendo de `Salvar`. Falhas ou descarte da prévia não alteram a imagem publicada. A troca de restaurante remonta o workspace e descarta os rascunhos. Respostas atrasadas de outro item/restaurante não são aplicadas.

## Custo e configuração

O novo endpoint `POST /super-admin/managed-service/restaurants/:restaurantId/images/enhance` usa exclusivamente `OPENAI_API_KEY` do backend, já utilizado na integração existente. Não há nova chave, chave no frontend, nova carteira ou migração. Não registrar, retornar ou solicitar o valor do segredo.

O custo é da plataforma. Esse caminho não chama `AiCreditService`, `paidImageEdit`, nem debita/reserva/concede créditos do ADMIN. Os endpoints de IA existentes do ADMIN não foram alterados. `payer=PLATFORM` é uma decisão do servidor, não um campo aceito do navegador.

O provedor e os perfis aproveitam o modelo já utilizado no projeto (`gpt-image-2`), com uma imagem por solicitação e sem retries automáticos. Há limites conservadores distribuídos no PostgreSQL: 5 solicitações por operador a cada 15 minutos e 50 por plataforma a cada 24 horas. Contam tentativas, inclusive inválidas após autenticação. Esses limites são de quantidade, não um orçamento monetário nem garantia de preço máximo. Uma falha do armazenamento bloqueia a operação.

## Segurança

Autenticação e SUPER_ADMIN na rota, revalidação de usuário ativo no serviço, restaurante existente e política existente de workspace assistido. O corpo é estrito: finalidade, imagem data URL e UUID da operação. Não aceita escolha de pagador, usuário, tenant, prompt ou modelo no corpo. Formatos JPEG/PNG/WebP com tamanho, base64 canônico e assinatura compatível; SVG e URLs remotas não chegam ao provedor. A verificação local de assinatura não é um decodificador completo: o provedor ainda pode rejeitar um arquivo inválido.

Links HTTPS permanecem aceitos para o catálogo, mas para melhoria deve-se enviar o arquivo ou colar os bytes da imagem. Não foi criado proxy de download no backend, evitando uma nova superfície SSRF. As imagens são compactadas no navegador; logo + capa devem caber no limite de corpo já existente.

Idempotência: uma entrada durável `MANAGED_IMAGE_AI_REQUESTED`, com UUID, operador e restaurante, antecede a chamada. Advisory lock transacional torna o check/insert atômico entre réplicas; a transação termina antes de chamar a OpenAI. Repetições do mesmo UUID no mesmo operador/restaurante retornam 409, sem chamar o provedor. Uma nova ação explícita do operador cria outra operação e pode ter custo. Não existe cache persistente da imagem gerada; se a resposta for perdida, consultar a auditoria antes de gerar novamente.

Auditoria registra operador, restaurante, finalidade, digest da entrada, modelo, pagador, uso numérico e identificador seguro da requisição do provedor quando disponível. Não registra imagem, chave, prompt de usuário ou resposta bruta. Não foram criadas tabelas multi-tenant novas nem alteradas policies RLS. Consultas/escritas de auditoria usam o restaurante explicitamente e o contexto transacional existente.

## Falhas e conciliação

Timeout/conexão/erro inesperado não prova ausência de cobrança. Tentativas incertas são registradas como `UNKNOWN`, sem repetição automática. Solicitações que permanecerem `PENDING` após queda do processo exigem revisão manual. Custos `MEASURED` são calculados com uso informado e tabela interna do projeto; a fatura do provedor é a referência final. Não apresentar estimativas como valor de fatura confirmado.

Antes de repetir uma solicitação incerta, conferir a operação no log de auditoria e o uso no painel da OpenAI. Nenhuma falha pode criar débito na carteira do restaurante.

## Validação e publicação

Inclui testes de domínio, serviço, cliente HTTP e componente React; E2E com PostgreSQL descartável exercita autorização, concorrência/idempotência, limites distribuídos, auditoria por tenant e carteiras/ledger/reservas inalterados. O provedor é substituído por mock nos testes: CI não deve usar a chave de produção nem gerar imagens pagas.

Executar os checks existentes sem reduzir regras: lint, TypeCheck, testes, build, E2E de tenant/RLS e captura visual. Verificar a rolagem da nova seção no desktop/mobile. Validação real de qualidade/latência com a API configurada deve acontecer após revisão e deploy autorizado. Não fazer merge ou deploy automaticamente.
