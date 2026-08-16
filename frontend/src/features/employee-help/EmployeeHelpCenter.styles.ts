import styled from 'styled-components';

export const Root = styled.section`
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  gap: 18px;
`;
export const Hero = styled.header`
  padding: 28px;
  border: 1px solid #eadfd7;
  border-radius: 20px;
  background: #fffdfa;
  box-shadow: 0 14px 35px rgba(65, 43, 26, 0.06);
  small {
    display: flex;
    gap: 7px;
    align-items: center;
    color: #cc5e3b;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    margin: 13px 0 7px;
    font-size: 30px;
    color: #24211f;
  }
  p {
    margin: 0;
    color: #766e68;
    line-height: 1.55;
  }
`;
export const Guide = styled.article`
  border: 1px solid #eadfd7;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
`;
export const GuideButton = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 18px;
  text-align: left;
  cursor: pointer;
  color: #28231f;
  .icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: #fff0e8;
    color: #d35d37;
  }
  strong {
    display: block;
    font-size: 16px;
  }
  small {
    color: #837a74;
  }
  .chevron {
    margin-left: auto;
  }
`;
export const GuideContent = styled.div`
  display: grid;
  grid-template-columns: minmax(250px, 0.8fr) minmax(360px, 1.35fr);
  gap: 18px;
  padding: 0 18px 18px;
  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;
export const Steps = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  li {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 12px;
    border: 1px solid #f1ddd2;
    background: #fffaf7;
    border-radius: 11px;
    color: #605750;
    font-size: 14px;
    line-height: 1.45;
  }
  b {
    flex: 0 0 23px;
    height: 23px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #d25f39;
    color: #fff;
    font-size: 12px;
  }
`;
export const Preview = styled.div`
  display: grid;
  min-height: 250px;
  grid-template-columns: 110px minmax(0, 1fr);
  overflow: hidden;
  background: #fcfaf8;
  border: 1px solid #e9ddd5;
  border-radius: 14px;

  .side {
    padding: 14px 10px;
    color: #d7dde0;
    font-size: 10px;
    background: #202b33;
  }

  .brand {
    margin-bottom: 13px;
    color: #fff;
    font-weight: 800;
  }

  .side span {
    position: relative;
    display: block;
    padding: 7px 5px;
    border-radius: 6px;
  }

  .side span.active {
    padding-left: 31px;
    color: #fff;
    background: #a85034;
  }

  .sidebar-badge {
    position: absolute;
    top: 50%;
    left: 5px;
    display: grid;
    width: 20px;
    height: 20px;
    color: #d25f39;
    font-size: 10px;
    font-style: normal;
    font-weight: 800;
    place-items: center;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px #0003;
    transform: translateY(-50%);
  }

  .canvas {
    position: relative;
    padding: 18px;
  }

  .crumb {
    color: #d05b38;
    font-size: 10px;
    font-weight: 800;
  }

  .canvas h4 {
    position: relative;
    width: max-content;
    max-width: calc(100% - 22px);
    margin: 5px 0;
    padding-right: 26px;
    font-size: 17px;
  }

  .canvas p {
    margin: 0;
    color: #81766f;
    font-size: 11px;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 17px;
  }

  .field {
    height: 42px;
    padding: 8px;
    color: #9b918b;
    font-size: 10px;
    background: #fff;
    border: 1px solid #e6d9d1;
    border-radius: 8px;
  }

  .action {
    position: relative;
    width: max-content;
    margin: 14px 14px 0 auto;
    padding: 8px 11px;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    background: #d35d37;
    border-radius: 7px;
  }

  .badge {
    position: absolute;
    display: grid;
    width: 22px;
    height: 22px;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    place-items: center;
    background: #de6338;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px #0003;
  }

  .badge.two {
    top: -8px;
    right: 0;
  }

  .badge.three {
    top: -10px;
    right: -10px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 86px minmax(0, 1fr);

    .side {
      padding: 10px 7px;
      font-size: 9px;
    }

    .side span.active {
      padding-left: 27px;
    }

    .sidebar-badge {
      left: 3px;
      width: 18px;
      height: 18px;
    }

    .canvas {
      padding: 12px;
    }

    .canvas h4 {
      padding-right: 22px;
      font-size: 14px;
    }

    .fields {
      grid-template-columns: 1fr;
    }

    .field:nth-child(n + 3) {
      display: none;
    }

    .action {
      margin-right: 12px;
    }
  }
`;
export const Report = styled.form`
  padding: 20px;
  border-radius: 18px;
  border: 1px solid #eadfd7;
  background: #fff;
  display: grid;
  gap: 12px;
  h3 {
    margin: 0;
    font-size: 19px;
  }
  .sub {
    margin: 0;
    color: #766e68;
    font-size: 14px;
  }
  input,
  textarea {
    font: inherit;
    border: 1px solid #dfd5ce;
    border-radius: 10px;
    padding: 11px 12px;
    outline: none;
  }
  textarea {
    min-height: 96px;
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    border-color: #d35d37;
    box-shadow: 0 0 0 3px #d35d3720;
  }
  button {
    justify-self: start;
    border: 0;
    border-radius: 9px;
    padding: 11px 15px;
    background: #d35d37;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .success {
    color: #287d3c;
    font-size: 13px;
  }
  .error {
    color: #bf3333;
    font-size: 13px;
  }
`;
