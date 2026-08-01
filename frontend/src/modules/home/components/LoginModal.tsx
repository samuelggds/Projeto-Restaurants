import { useNavigate } from "react-router-dom";

type LoginModalProps = { open: boolean; onClose: () => void };

export function LoginModal({ open, onClose }: LoginModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <section
        className="login-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close" type="button" onClick={onClose}>
          ×
        </button>
        <span className="lock">🔒</span>
        <h2>Acompanhe seu pedido</h2>
        <p>Entre para visualizar o preparo, a entrega e seu histórico.</p>
        <button
          className="submit"
          type="button"
          onClick={() => {
            onClose();
            navigate("/login");
          }}
        >
          Entrar com e-mail
        </button>
        <button
          className="register"
          type="button"
          onClick={() => {
            onClose();
            navigate("/register");
          }}
        >
          Ainda não tenho uma conta
        </button>
      </section>
    </div>
  );
}
