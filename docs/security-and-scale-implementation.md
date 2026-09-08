# Segurança, confiabilidade e escala — execução iniciada em 08/09/2026

Base: auditoria em `artifacts/AUDITORIA-COMPLETA-RESTAURANTES-2026-09-08.md`, HEAD inicial `7e27903`.

Meta de carga confirmada pelo usuário: 120 restaurantes, cada um com 5 pedidos por minuto no pico (600/minuto), mais leituras e eventos operacionais. O resultado deve informar ambiente, duração, latência, erros e isolamento; quantidade de restaurantes cadastrados sozinha não comprova capacidade.

## Trabalho autorizado

- [ ] Preservar pedidos e referência financeira em falhas ambíguas PIX/cartão.
- [ ] Corrigir confirmação, concorrência e retomada do pagamento na retirada.
- [ ] Corrigir cancelamento/estorno de conta da mesa e pagamento tardio.
- [ ] Concluir paginação de filas/históricos e integrar relatórios agregados.
- [ ] Filtrar metadados internos em todas as fronteiras HTTP/Socket de pedidos.
- [ ] Preservar bloqueio manual de produto ao devolver estoque.
- [ ] Entrega recuperável/deduplicada das notificações e timeouts externos.
- [ ] Recuperação por telefone com comportamento explícito e seguro.
- [ ] Corrigir CSP/Google, hosts de desenvolvimento e validar proteções HTTP/Socket.
- [ ] Corrigir storage restrito, semântica de cards e ações flutuantes móveis.
- [ ] Compartilhar eventos e proteção de requisições entre instâncias.
- [ ] Criar e executar carga isolada de 120 restaurantes e validação entre réplicas.
- [ ] Atualizar E2Es para contratos atuais e executar verificações completas.
- [ ] Registrar critérios de implantação, restauração, impressão e evidências operacionais.

## Regras de execução

Preservar dados e alterações existentes. Testes que alteram banco usam apenas instância descartável. Não realizar cobrança ou envio de mensagens reais durante testes. Não declarar proteção absoluta contra ataques nem homologação de integrações/hardware sem executá-las. Configuração de chaves externas já é conhecida pelo usuário e não é tratada como defeito de código.

## Evidências e pendências

Em execução. O relatório de auditoria é histórico; este documento acompanha as correções e será atualizado com resultados observados.
