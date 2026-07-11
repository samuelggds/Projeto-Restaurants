import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "react-toastify";
import menuImportService from "../../../Services/menuImportService";
import * as S from "../styles";

type ImportMenuFromImageTabProps = {
  restaurantId?: number | null;
  onImported?: () => void | Promise<void>;
};

export default function ImportMenuFromImageTab({
  restaurantId,
  onImported,
}: ImportMenuFromImageTabProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<{
    restaurantName?: string | null;
    sourceImageUrl?: string | null;
    categoriesCreated?: number;
    productsCreated?: number;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedImageUrl = imageUrl.trim();
    if (!trimmedImageUrl) {
      toast.error("Informe a URL da imagem do cardapio.");
      return;
    }

    if (!restaurantId) {
      toast.error("Nao foi possivel identificar o restaurante logado.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await menuImportService.importMenuFromImage({
        imageUrl: trimmedImageUrl,
        restaurantId,
      });

      setSummary(response);
      toast.success(
        `Importacao por IA concluida: ${Number(response?.productsCreated || 0)} produto(s) e ${Number(response?.categoriesCreated || 0)} categoria(s).`,
      );

      if (onImported) {
        await onImported();
      }
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Erro ao importar cardapio pela IA",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <S.FormCard
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(59, 130, 246, 0.16)",
        boxShadow: "0 18px 44px rgba(15, 23, 42, 0.10)",
        background:
          "radial-gradient(circle at top right, rgba(59, 130, 246, 0.10) 0%, rgba(255,255,255,0) 28%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(59,130,246,0.04))",
        }}
      />

      <div style={{ position: "relative", display: "grid", gap: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{ display: "grid", gap: "0.6rem", flex: 1, minWidth: 260 }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "fit-content",
                padding: "0.35rem 0.7rem",
                borderRadius: 999,
                background: "rgba(59, 130, 246, 0.10)",
                color: "#1d4ed8",
                fontWeight: 800,
                fontSize: "0.76rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={14} /> Importação por IA
            </div>

            <S.PageHeader style={{ marginBottom: 0 }}>
              <h2>Importar cardápio por imagem</h2>
              <p>
                Cole a URL de uma imagem com o cardápio e deixe a IA extrair as
                categorias e produtos.
              </p>
            </S.PageHeader>
          </div>

          <div
            style={{
              minWidth: 250,
              borderRadius: 18,
              padding: "0.9rem 1rem",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.92), rgba(37,99,235,0.92))",
              color: "#fff",
              boxShadow: "0 16px 30px rgba(37, 99, 235, 0.18)",
              display: "grid",
              gap: "0.45rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.18)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wand2 size={18} />
              </div>
              <div style={{ display: "grid" }}>
                <strong style={{ fontSize: "0.96rem" }}>
                  Fluxo em 3 passos
                </strong>
                <small style={{ opacity: 0.9 }}>
                  imagem, leitura e salvamento
                </small>
              </div>
            </div>

            <div
              style={{ display: "grid", gap: "0.35rem", fontSize: "0.85rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <ImageIcon size={14} /> Envie a URL da imagem.
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <Sparkles size={14} /> A IA interpreta o cardápio.
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <CheckCircle2 size={14} /> Salve no catálogo do restaurante.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.75rem",
          }}
        >
          {[
            {
              title: "Leitura visual",
              text: "Extrai categorias e itens diretamente da imagem.",
            },
            {
              title: "JSON validado",
              text: "A resposta é filtrada antes de entrar no Prisma.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "rgba(255,255,255,0.86)",
                padding: "0.9rem",
                display: "grid",
                gap: "0.25rem",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                {item.title}
              </strong>
              <small style={{ color: "#64748b", lineHeight: 1.45 }}>
                {item.text}
              </small>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1rem",
            borderRadius: 20,
            padding: "1rem",
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
          }}
        >
          <S.FormGroup>
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
            >
              <LinkIcon size={14} /> URL da imagem do cardápio
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://.../cardapio.jpg"
              required
            />
          </S.FormGroup>

          <S.FormGroup>
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
            >
              <LinkIcon size={14} /> Restaurante de destino
            </label>
            <input
              type="text"
              value={restaurantId ? `ID ${restaurantId}` : "Nao identificado"}
              readOnly
              disabled
            />
          </S.FormGroup>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(59, 130, 246, 0.14)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(239,246,255,0.92))",
              padding: "0.95rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.8rem",
              color: "#475569",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(59, 130, 246, 0.12)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color="#2563eb" />
            </div>
            <div style={{ display: "grid", gap: "0.15rem" }}>
              <strong style={{ color: "#0f172a" }}>
                A IA lê a imagem e monta a estrutura
              </strong>
              <small style={{ lineHeight: 1.55 }}>
                O endpoint usa GPT-4o para extrair categorias, produtos e preços
                e salvar sem duplicar itens já existentes.
              </small>
            </div>
          </div>

          <S.SubmitBtn
            type="submit"
            style={{
              marginTop: 0,
              minHeight: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              boxShadow: "0 16px 28px rgba(37, 99, 235, 0.22)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.55rem",
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="loading-icon" /> Importando...
              </>
            ) : (
              <>
                Importar por IA <ArrowRight size={16} />
              </>
            )}
          </S.SubmitBtn>
        </form>

        {summary ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(34, 197, 94, 0.18)",
              background:
                "linear-gradient(135deg, rgba(240,253,244,0.96), rgba(255,255,255,0.96))",
              padding: "1rem",
              display: "grid",
              gap: "0.9rem",
              boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(34, 197, 94, 0.12)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#166534",
                }}
              >
                <CheckCircle2 size={18} />
              </div>
              <div>
                <strong style={{ fontSize: "0.98rem", color: "#0f172a" }}>
                  Resultado da importação por IA
                </strong>
                <div style={{ color: "#64748b", fontSize: "0.84rem" }}>
                  Cardápio processado com sucesso.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.75rem",
              }}
            >
              {[
                { label: "Categorias", value: summary.categoriesCreated || 0 },
                { label: "Produtos", value: summary.productsCreated || 0 },
                {
                  label: "Restaurante",
                  value: summary.restaurantName || "Nao identificado",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 14,
                    background: "#ffffff",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    padding: "0.9rem",
                    display: "grid",
                    gap: "0.2rem",
                  }}
                >
                  <small style={{ color: "#64748b", fontWeight: 700 }}>
                    {item.label}
                  </small>
                  <strong style={{ color: "#0f172a" }}>
                    {String(item.value)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </S.FormCard>
  );
}
