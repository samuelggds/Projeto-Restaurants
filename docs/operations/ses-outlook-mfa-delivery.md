# GastroNexa: Amazon SES -> Outlook/Hotmail: atraso de MFA (451 4.7.500)

## Interpretação
Um evento `DeliveryDelay` no Amazon SES com resposta remota `451 4.7.500 Server busy. Please try again later` indica adiamento temporário pelo servidor Microsoft. O sucesso da chamada SMTP indica aceite pelo SES, **não** entrega na caixa postal. O backend não consegue eliminar sozinho o throttling do destinatário.

## Diagnóstico operacional na região do SES usada em produção
1. Em Amazon SES > Configuration > Verified identities, conferir `gastronexa.com.br`: verificação, DKIM e MAIL FROM customizado quando configurado. Validar DNS de SPF e DMARC com o provedor DNS; não colocar senhas nem tokens nos logs.
2. Em Amazon SES > Account dashboard e Reputation metrics, conferir limites de envio, bounce, complaints e supressões da conta.
3. No destino de eventos SES, correlacionar o evento `DeliveryDelay` com os eventos posteriores `Delivery` ou `Bounce`, usando messageId, sem registrar código MFA nem conteúdo da mensagem. Distinguir atraso transitório de falha definitiva.
4. Verificar reputação e volume de envios ao Outlook/Hotmail, mudanças bruscas de volume e possíveis bloqueios de IP. Persistindo, abrir caso no AWS Support com horários UTC, messageId SES e diagnóstico SMTP do provedor, sem dados sensíveis.
5. Validar que as alternativas SMS/WhatsApp só são exibidas quando provedores realmente configurados e números estão cadastrados. Nunca desligar o MFA obrigatório nem contornar a confirmação de login.

## Experiência de usuário
- O código MFA dura 10 minutos por padrão; o reenvio tem cooldown de 60 segundos.
- O envio pode ser aceito pelo SES sem confirmação de recebimento pela Microsoft.
- Após novo envio, o código anterior deixa de ser válido. Evitar solicitar vários códigos sucessivamente.
- Se a mensagem chegar após expirar, solicitar um novo código; se houver canal secundário já habilitado, selecionar esse canal.

## Importante
Este procedimento não muda a política de autenticação, não manipula credenciais SMTP e não promete entrega garantida ao Outlook.
