import { Globe, Link2, Mail, MapPin, Phone, Utensils } from "lucide-react";
import * as S from "../styles";

type HomeFooterProps = {
  onScrollMenu: () => void;
  onNavigateCart: () => void;
};

export default function HomeFooter({
  onScrollMenu,
  onNavigateCart,
}: HomeFooterProps) {
  return (
    <S.Footer>
      <S.FooterGrid>
        <S.FooterBrandColumn>
          <S.Brand>
            <Utensils size={24} strokeWidth={2.5} />
            <span>Peça Já Food</span>
          </S.Brand>
          <p>Uma experiência gastronômica integrada ao seu painel.</p>
          <S.SocialLinks>
            <a href="https://github.com/" target="_blank" rel="noreferrer">
              <Link2 size={20} />
            </a>
            <a href="https://linkedin.com/" target="_blank" rel="noreferrer">
              <Globe size={20} />
            </a>
          </S.SocialLinks>
        </S.FooterBrandColumn>

        <S.FooterColumn>
          <h5>Navegação</h5>
          <ul>
            <li>
              <S.CategoryButton
                as="button"
                type="button"
                $active={false}
                onClick={onScrollMenu}
              >
                Cardápio
              </S.CategoryButton>
            </li>
            <li>
              <S.CategoryButton
                as="button"
                type="button"
                $active={false}
                onClick={onNavigateCart}
              >
                Carrinho
              </S.CategoryButton>
            </li>
          </ul>
        </S.FooterColumn>

        <S.FooterColumn>
          <h5>Contatos & Reservas</h5>
          <ul>
            <li>
              <a href="mailto:contato@SgSolutions.com">
                <Mail size={16} /> reservas@SgSolutions.com
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/5585999998888"
                target="_blank"
                rel="noreferrer"
              >
                <Phone size={16} /> (85) 99999-8888
              </a>
            </li>
            <li>
              <span>
                <MapPin size={16} /> Fortaleza, CE - Brasil
              </span>
            </li>
          </ul>
        </S.FooterColumn>
      </S.FooterGrid>

      <S.FooterCopy>
        <span>© 2026 Peça Já Food. Todos os direitos reservados.</span>
        <span>Desenvolvido por SgSolutions</span>
      </S.FooterCopy>
    </S.Footer>
  );
}
