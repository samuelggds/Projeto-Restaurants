import styled from 'styled-components';

export const HalfHalfBuilder = styled.section<{ $error?: boolean }>`
  display:grid;
  gap:22px;

  .half-section{
    display:grid;
    gap:10px;
  }

  .half-section > header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }

  .half-section h3{
    margin:0;
    font-size:16px;
    line-height:1.2;
  }

  .half-options{
    display:grid;
    gap:8px;
  }

  .half-options label{
    min-height:48px;
    padding:7px 10px;
    border:1px solid #ece6e0;
    border-radius:9px;
    background:#fff;
    display:grid;
    grid-template-columns:auto auto minmax(0,1fr) auto;
    align-items:center;
    gap:10px;
    cursor:pointer;
    transition:border-color 150ms ease,background-color 150ms ease,transform 150ms ease;
  }

  .half-options label:hover{
    transform:translateY(-1px);
    border-color:var(--config-primary);
  }

  .half-options label.selected{
    border-color:var(--config-primary);
    background:color-mix(in srgb,var(--config-primary) 6%,#fff);
  }

  .half-options input{
    position:absolute;
    opacity:0;
    pointer-events:none;
  }

  .half-options i{
    width:18px;
    height:18px;
    border:1.5px solid #cbc2ba;
    border-radius:50%;
    display:grid;
    place-items:center;
    background:#fff;
  }

  .half-options label.selected i{
    border-color:var(--config-primary);
  }

  .half-options i span{
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--config-primary);
  }

  .half-options strong{
    color:#5b534c;
    font-size:12px;
    white-space:nowrap;
  }

  @media(max-width:620px){
    gap:20px;
    padding:0 16px 4px;

    .half-section{
      gap:8px;
    }

    .half-section h3{
      font-size:15px;
    }

    .half-options label{
      min-height:46px;
      padding:6px 8px;
      grid-template-columns:auto auto minmax(0,1fr) auto;
      gap:8px;
    }

    .half-options strong{
      font-size:11px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .half-options label{transition:none}
  }
`;

export const PortionStatus = styled.span<{ $selected: boolean }>`
  flex:0 0 auto;
  padding:4px 7px;
  border-radius:7px;
  background:${({ $selected }) => ($selected ? '#eaf8ed' : '#fff1ec')};
  color:${({ $selected }) => ($selected ? '#2d9a51' : 'var(--config-primary)')};
  font-size:9px;
  font-weight:900;
  letter-spacing:.04em;
  text-transform:uppercase;
`;

export const HalfHalfNotice = styled.div`
  min-height:38px;
  padding:9px 11px;
  border-radius:8px;
  background:#fff0ee;
  color:#df4b3e;
  display:flex;
  align-items:center;
  gap:8px;
  font-size:11px;
  font-weight:750;

  svg{
    width:14px;
    height:14px;
    flex:0 0 14px;
  }
`;
