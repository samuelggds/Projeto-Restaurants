import { useState } from 'react';
import { Bike, ChartNoAxesColumnIncreasing, Headphones, Utensils } from 'lucide-react';

const roles = [
  {
    name: 'Administrador', icon: ChartNoAxesColumnIncreasing, image: 'administracao',
    heading: 'Veja como estão as vendas.',
    text: 'Consulte os pedidos do dia, o ticket médio e as pendências que precisam de atenção.',
    alt: 'Visão geral da loja com prioridades e indicadores de vendas', width: 1050, height: 596,
  },
  {
    name: 'Atendente', icon: Headphones, image: 'atendimento', heading: 'Organize a fila do balcão.',
    text: 'Veja quais pedidos estão prontos, confira chamados e registre pedidos que chegam por telefone.',
    alt: 'Central de atendimento com pedidos prontos e fila prioritária', width: 1050, height: 647,
  },
  {
    name: 'Garçom', icon: Utensils, image: 'garcom', heading: 'Saiba qual mesa atender.',
    text: 'Confira as mesas livres e ocupadas, acompanhe os pedidos do salão e veja quem pediu a conta.',
    alt: 'Mapa de mesas da demonstração com a mesa 7 livre e a mesa 12 aberta', width: 1036, height: 700,
  },
  {
    name: 'Motoboy', icon: Bike, image: 'entrega', heading: 'Retire o pedido e acompanhe a rota.',
    text: 'O entregador vê o endereço, a distância e o pedido disponível para retirada pelo celular.',
    alt: 'Pedido disponível para o motoboy com endereço, distância e ação de retirada', width: 800, height: 700,
  },
];

export function RestaurantTeamPanels() {
  const [selected, setSelected] = useState(0);
  const role = roles[selected];

  return (
    <section className="gx-team" id="apresentacao" aria-labelledby="gx-team-heading">
      <div className="gx-team-inner">
        <div className="gx-team-copy">
          <h2 id="gx-team-heading">Quatro painéis para a <em>sua equipe.</em></h2>
          <p>Escolha uma função e veja a tela que essa pessoa usa no restaurante.</p>
          <div className="gx-team-options" role="group" aria-label="Escolher função">
            {roles.map(({ name, icon: Icon }, i) => (
              <button type="button" key={name} aria-pressed={i === selected}
                aria-controls="gx-team-example" onClick={() => setSelected(i)}>
                <Icon aria-hidden="true" size={20} />{name}
              </button>
            ))}
          </div>
        </div>
        <figure id="gx-team-example" className="gx-team-example">
          <div className="gx-team-display">
            <img key={role.image} src={`/marketing-vitrines/painel-${role.image}.webp`}
              width={role.width} height={role.height} alt={role.alt} loading="lazy" />
          </div>
          <figcaption aria-live="polite" aria-atomic="true">
            <strong>{role.heading}</strong><span>{role.text}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
