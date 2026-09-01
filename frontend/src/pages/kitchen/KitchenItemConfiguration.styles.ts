import { css } from 'styled-components';

export const kitchenItemConfigurationStyles = css`
  .portion-group,
  .removal-group {
    margin-top: 2px;
    padding-top: 5px;
    padding-bottom: 5px;
    border-radius: 6px;
    background: #f0f5f5;
  }
  .portion-group b {
    color: #176477;
  }
  .removal-group {
    background: #fff0ee;
  }
  .removal-group b,
  .removal-group span {
    color: #9d2d25;
  }
  .portion-observation {
    background: #eef7fb;
    color: #18576a;
  }
`;
