import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig<_D = any> {
    /**
     * Impede a troca automática de endereço da API para operações que não
     * podem ser repetidas com segurança, como uma geração paga de imagem.
     */
    skipBaseUrlFallback?: boolean;
  }
}

export {};
