import { FormEvent, useState } from "react";
import { BookOpenCheck, ChevronDown, CircleHelp, CreditCard, Headphones, MapPin, PackageCheck, Send, ShoppingBag, Store, Users } from "lucide-react";
import * as S from "./HelpCenter.styles";

type HelpCenterProps = { onReport: (payload: { subject: string; message: string }) => Promise<void> };

const guideSections = [
  { title: "Primeiros passos", icon: Store, steps: ["Abra Configurações > Marca e identidade e informe nome, descrição, cores e imagens.", "Em Dados do negócio, preencha telefone e e-mail que serão exibidos no rodapé da loja.", "Cadastre o endereço e os horários. Marque os dias de folga para bloquear pedidos nesses períodos."] },
  { title: "Cardápio e estoque", icon: ShoppingBag, steps: ["No Cardápio, crie categorias antes de cadastrar produtos.", "Em cada produto, informe foto, descrição, preço e estoque. Com estoque zero, ele fica indisponível automaticamente.", "Use o menu de três pontos do produto para editar ou excluir sem perder a organização da tela."] },
  { title: "Pedidos e entrega", icon: PackageCheck, steps: ["Em Configurações > Pedidos, escolha se novos pedidos devem entrar automaticamente em preparo.", "Defina o tempo médio de preparo e o limite de pedidos simultâneos para proteger sua operação.", "Acompanhe os pedidos no painel; cozinha, garçom e motoqueiro recebem somente as rotas próprias de trabalho."] },
  { title: "Pagamentos e mensalidade", icon: CreditCard, steps: ["Em Pagamentos, conecte o provedor disponível e confira os dados antes de aceitar pedidos online.", "Em Cobranças e assinaturas, acompanhe sua fatura, prazo de tolerância e escolha o plano após o pagamento.", "Pedidos pagos online só devem ser estornados pelo painel quando houver necessidade real de cancelamento."] },
  { title: "Equipe e atendimento", icon: Users, steps: ["Cadastre funcionários na aba Funcionários e escolha a função correta para liberar apenas o painel necessário.", "Desative um funcionário quando ele não estiver mais na operação; é possível reativá-lo depois.", "O motoqueiro deve ativar a localização no próprio aparelho para compartilhar a rota durante a entrega."] },
  { title: "Loja e clientes", icon: MapPin, steps: ["Confira a loja pelo botão Ver loja antes de divulgar o link ao cliente.", "Quando o restaurante estiver fechado, a loja mostra o aviso e bloqueia novos pedidos e pagamentos.", "O cliente escolhe um endereço salvo antes de fechar o pedido e acompanha a entrega depois de entrar na conta."] },
] as const;

export function HelpCenter({ onReport }: HelpCenterProps) {
  const [openSection, setOpenSection] = useState(0);
  const [subject, setSubject] = useState("Dúvida sobre o sistema");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim().length < 10 || status === "sending") return;
    setStatus("sending"); setErrorMessage("");
    try { await onReport({ subject, message: message.trim() }); setMessage(""); setStatus("success"); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar agora. Tente novamente."); setStatus("error"); }
  };
  return <S.Root>
    <S.Hero><span><CircleHelp /> Central de ajuda</span><h2>Manual rápido do seu restaurante</h2><p>Encontre o passo a passo das principais tarefas do painel e mantenha sua operação organizada.</p></S.Hero>
    <S.Guide aria-label="Manual de configurações">
      {guideSections.map(({ title, icon: Icon, steps }, index) => { const isOpen = openSection === index; return <article key={title} className={isOpen ? "open" : ""}>
        <button type="button" aria-expanded={isOpen} onClick={() => setOpenSection(isOpen ? -1 : index)}><i><Icon /></i><span><b>{title}</b><small>{steps.length} passos essenciais</small></span><ChevronDown /></button>
        {isOpen && <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>}
      </article>; })}
    </S.Guide>
    <S.ReportCard><div className="heading"><i><Headphones /></i><div><h2>Não encontrou o que precisava?</h2><p>Envie um relato ao Super Admin. Sua mensagem ficará registrada no suporte do sistema.</p></div></div>
      <form onSubmit={submit}><label>Assunto<select value={subject} onChange={(event) => setSubject(event.target.value)}><option>Dúvida sobre o sistema</option><option>Problema em pedido</option><option>Problema em pagamento</option><option>Problema técnico</option><option>Outro assunto</option></select></label>
        <label>Descreva o que aconteceu<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={1100} placeholder="Inclua o número do pedido, se houver, e os passos que levaram ao problema." required /></label>
        <footer>{status === "success" && <span className="success">Relato enviado ao Super Admin.</span>}{status === "error" && <span className="error">{errorMessage}</span>}<button type="submit" disabled={status === "sending" || message.trim().length < 10}><Send /> {status === "sending" ? "Enviando..." : "Reportar ao Super Admin"}</button></footer>
      </form>
    </S.ReportCard>
    <S.Tip><BookOpenCheck /> Dica: salve as alterações em Configurações antes de conferir o resultado na loja.</S.Tip>
  </S.Root>;
}
