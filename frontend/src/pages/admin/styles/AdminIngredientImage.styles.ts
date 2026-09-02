import { css } from 'styled-components';

export const ingredientImageStyles = css`
  .ingredient-avatar {
    position: relative;
    overflow: hidden;
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 10%, white);
    font-size: 18px;
    font-weight: 900;
  }
  .ingredient-avatar > span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .ingredient-avatar > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .edit-image-actions {
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    grid-column: 1 / -1;
    gap: 7px;
  }
  .edit-image-actions label,
  .edit-image-actions button {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #ded7cf;
    border-radius: 7px;
    padding: 0 9px;
    color: #574f48;
    background: #fff;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }
  .edit-image-actions button {
    color: #a53a2f;
  }
  .edit-image-actions svg {
    width: 13px;
  }
  .edit-image-actions input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
`;
