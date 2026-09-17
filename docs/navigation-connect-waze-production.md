# Navigation Connect + Waze em produção

Este documento descreve a integração do GastroNexa Entregas com a Navigation Connect API para que o motoqueiro navegue no Waze e o GastroNexa consulte localização, ETA e distância restante da viagem.

## Identidade do aplicativo

- Android application ID verificado: `br.com.gastronexa.courier`
- A verificação do app no Google Maps Platform precisa estar aprovada antes do uso real.
- No Android, o Waze deve ser aberto por um `Intent` nativo que inclua `Intent.EXTRA_REFERRER_NAME` com `android-app://br.com.gastronexa.courier`.
- O link web sozinho não substitui o `Intent` nativo para autenticar a origem do aplicativo no Navigation Connect.

## Variáveis do backend

```env
NAVIGATION_CONNECT_ENABLED=false
NAVIGATION_CONNECT_PROJECT_ID=project-d8ec95c4-282d-40f2-a9c
NAVIGATION_CONNECT_ANDROID_APP_ID=br.com.gastronexa.courier
NAVIGATION_CONNECT_HIGH_FREQUENCY_UPDATES=false
NAVIGATION_CONNECT_REMAINING_ROUTE_REPORTING=false
```

Mantenha `NAVIGATION_CONNECT_ENABLED=false` até a verificação do aplicativo estar aprovada e as credenciais ADC estarem disponíveis no container da API.

`NAVIGATION_CONNECT_HIGH_FREQUENCY_UPDATES=true` aumenta a frequência aproximada de atualização de 60 s para 5 s e coloca a viagem no nível Enterprise da API. Ative somente após validar custo e necessidade.

`NAVIGATION_CONNECT_REMAINING_ROUTE_REPORTING=true` também usa o nível Enterprise e deve ser habilitado apenas se a polilinha restante do Waze for realmente necessária.

## Autenticação no AWS Lightsail

O backend usa `google-auth-library` com Application Default Credentials (ADC). Não versionar nem copiar uma chave JSON de service account para o repositório.

A identidade Google escolhida para produção é a service account do Navigation Connect. Como o workload está no AWS Lightsail, a configuração recomendada é Workload Identity Federation (AWS -> Google Cloud) e um arquivo de configuração de credencial externa montado no container.

Exemplo de variável após criar o arquivo de configuração WIF:

```env
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/google-navigation-connect-wif.json
```

Esse arquivo de configuração não contém uma chave privada permanente, mas ainda deve ser tratado como configuração de infraestrutura e não deve ser commitado.

## Fluxo implementado no backend

1. O motoqueiro inicia a rota no endpoint existente `PATCH /orders/:id/start-route`.
2. O GastroNexa mantém sua regra atual de autorização, atribuição e status do pedido.
3. Se Navigation Connect estiver habilitado, o backend cria uma Trip UUIDv4 e recebe o `authToken`.
4. O token é criptografado com `CREDENTIAL_ENCRYPTION_KEY` e salvo em `DeliveryNavigationSession`.
5. A resposta de início de rota inclui `navigation.wazeUrl`, `navigation.googleMapsUrl`, `navigation.authToken`, `navigation.tripId` e os dados necessários ao launcher Android.
6. O aplicativo Android abre o Waze por `Intent`, define o pacote `com.waze`, passa `Intent.EXTRA_REFERRER_NAME` e um `PendingIntent` de retorno.
7. O endpoint de rastreamento consulta `GetTrip` e prioriza a telemetria do Navigation Connect para localização, ETA e distância restante. Se a API estiver indisponível, o fluxo atual de GPS/OSRM continua como fallback.

## Launcher Android do Waze

O shell Android deve construir a URL recebida do backend e abrir o Waze de forma nativa. Exemplo conceitual em Kotlin:

```kotlin
val intent = Intent(Intent.ACTION_VIEW, Uri.parse(wazeUrl))
intent.setPackage("com.waze")
intent.putExtra(
  Intent.EXTRA_REFERRER_NAME,
  "android-app://br.com.gastronexa.courier"
)
intent.putExtra("pendingIntent", getPendingIntent())
startActivity(intent)
```

Não registrar `authToken`, `wazeUrl` autenticada ou respostas completas de `CreateTrip` em logs.

## Migração

Antes de ativar o recurso em produção, execute as migrações normalmente. A migration `20260917152000_add_delivery_navigation_session` cria o armazenamento criptografado da sessão de navegação.

## Ativação segura

1. Aguardar a aprovação do app pelo Google.
2. Configurar Workload Identity Federation no Google Cloud para o workload da AWS.
3. Montar a configuração ADC no container da API.
4. Executar a migration.
5. Fazer um teste com um pedido real de homologação e `NAVIGATION_CONNECT_ENABLED=true`.
6. Validar consentimento no Waze, localização, ETA, distância restante e retorno ao app.
7. Só depois avaliar alta frequência e rota restante.
