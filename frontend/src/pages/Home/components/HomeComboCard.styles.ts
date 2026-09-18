import styled from 'styled-components';

export const Section = styled.section`
  margin: 30px 0 10px;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--home-primary) 18%, transparent), transparent 36%),
    linear-gradient(135deg, #fff8f3 0%, #ffffff 58%, #fff 100%);
  border: 1px solid color-mix(in srgb, var(--home-primary) 18%, #ece7e2);
`;

export const Header = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--home-primary);
    font-size: .72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .06em;
  }

  h2 { margin: 5px 0 4px; font-size: clamp(1.45rem, 3vw, 2rem); }
  p { margin: 0; color: #756d66; line-height: 1.45; }
  .count {
    padding: 8px 12px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #eee4db;
    color: #625b55;
    font-size: .78rem;
    font-weight: 800;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    align-items: start;
    flex-direction: column;
    .count { display: none; }
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1050px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 620px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 6px;
    margin-inline: -8px;
    padding-inline: 8px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
`;

export const Card = styled.article`
  position: relative;
  overflow: hidden;
  min-width: 0;
  border-radius: 20px;
  background: #fff;
  border: 1px solid #eee7e1;
  box-shadow: 0 14px 36px rgba(65, 44, 28, .08);

  .image {
    position: relative;
    aspect-ratio: 16 / 11;
    overflow: hidden;
    background: #f3eee9;
  }
  .image img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform .3s ease;
  }
  &:hover .image img { transform: scale(1.025); }
  .badge {
    position: absolute;
    left: 12px;
    top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(24, 22, 20, .82);
    color: #fff;
    backdrop-filter: blur(8px);
    font-size: .7rem;
    font-weight: 900;
  }
  .content { padding: 15px; display: grid; gap: 9px; }
  h3 { margin: 0; font-size: 1.05rem; }
  p {
    margin: 0;
    color: #766d65;
    font-size: .83rem;
    line-height: 1.42;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    min-height: 2.35em;
  }
  .items {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .items span {
    max-width: 100%;
    padding: 5px 8px;
    border-radius: 999px;
    background: #faf5f0;
    color: #6b625b;
    font-size: .7rem;
    font-weight: 700;
  }
  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
  }
  .price small { display: block; color: #8a817a; font-size: .68rem; }
  .price strong { color: var(--home-primary); font-size: 1.08rem; }
  button {
    border: 0;
    border-radius: 11px;
    padding: 10px 12px;
    background: var(--home-primary);
    color: #fff;
    font-weight: 900;
    cursor: pointer;
  }
  button:disabled { opacity: .5; cursor: not-allowed; }

  @media (max-width: 620px) {
    flex: 0 0 min(82vw, 330px);
    scroll-snap-align: start;
  }
`;
