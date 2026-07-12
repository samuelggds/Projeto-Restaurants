import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  Grid2x2,
  House,
  Image as ImageIcon,
  Menu,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Square,
  Trash2,
} from "lucide-react";

import * as S from "../styles";
import * as DM from "../../DigitalMenu/styles";

type SettingsForm = {
  restaurantName: string;
  restaurantSlug?: string;
  restaurantLogo: string;
  restaurantCoverImage: string;
};

type BrandingUploadState = {
  restaurantLogo: boolean;
  restaurantCoverImage: boolean;
};

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  description?: string;
  image?: string;
  price?: number | string;
  categoryId?: number | null;
  category?: {
    id?: number;
    name?: string;
  };
};

type StudioSectionKind =
  | "featured"
  | "banner"
  | "launches"
  | "favorites"
  | "specials"
  | "combos";

type StudioSection = {
  id: string;
  title: string;
  type: string;
  accent: string;
  kind: StudioSectionKind;
};

type PreviewCategory = {
  id: string;
  label: string;
  coverImage: string;
};

type DigitalMenuStudioTabProps = {
  settingsForm: SettingsForm;
  brandingUploadState: BrandingUploadState;
  isSavingSettings: boolean;
  isBrandingUploadInProgress: boolean;
  categories: Category[];
  products: Product[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onBrandingFileChange: (
    field: "restaurantLogo" | "restaurantCoverImage",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
};

const DEFAULT_SECTION_KINDS: StudioSectionKind[] = [
  "featured",
  "banner",
  "launches",
  "favorites",
  "specials",
  "combos",
];

function getPriceLabel(price?: number | string) {
  const numericPrice = Number(price || 0);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericPrice);
}

function createSpecialSection(kind: StudioSectionKind) {
  if (kind === "banner") {
    return {
      id: `banner-${Date.now()}`,
      title: "Banner",
      type: "Imagem",
      accent: "#16a34a",
      kind,
    } satisfies StudioSection;
  }

  if (kind === "favorites") {
    return {
      id: `favorites-${Date.now()}`,
      title: "Favoritos",
      type: "Carrossel",
      accent: "#2563eb",
      kind,
    } satisfies StudioSection;
  }

  if (kind === "launches") {
    return {
      id: `launches-${Date.now()}`,
      title: "Lançamentos",
      type: "Lista",
      accent: "#8b5cf6",
      kind,
    } satisfies StudioSection;
  }

  if (kind === "specials") {
    return {
      id: `specials-${Date.now()}`,
      title: "Especiais",
      type: "Lista",
      accent: "#a855f7",
      kind,
    } satisfies StudioSection;
  }

  if (kind === "combos") {
    return {
      id: `combos-${Date.now()}`,
      title: "Combos",
      type: "Lista",
      accent: "#7c3aed",
      kind,
    } satisfies StudioSection;
  }

  return {
    id: `featured-${Date.now()}`,
    title: "Destaque",
    type: "Carrossel",
    accent: "#7c3aed",
    kind,
  } satisfies StudioSection;
}

function createInitialSections() {
  return [
    {
      id: "featured-base",
      title: "Destaque",
      type: "Carrossel",
      accent: "#7c3aed",
      kind: "featured" as const,
    },
    {
      id: "banner-base",
      title: "Banner",
      type: "Imagem",
      accent: "#16a34a",
      kind: "banner" as const,
    },
    {
      id: "launches-base",
      title: "Lançamentos",
      type: "Lista",
      accent: "#8b5cf6",
      kind: "launches" as const,
    },
    {
      id: "favorites-base",
      title: "Favoritos",
      type: "Carrossel",
      accent: "#2563eb",
      kind: "favorites" as const,
    },
    {
      id: "specials-base",
      title: "Especiais",
      type: "Lista",
      accent: "#a855f7",
      kind: "specials" as const,
    },
    {
      id: "combos-base",
      title: "Combos",
      type: "Lista",
      accent: "#7c3aed",
      kind: "combos" as const,
    },
  ];
}

export default function DigitalMenuStudioTab({
  settingsForm,
  brandingUploadState,
  isSavingSettings,
  isBrandingUploadInProgress,
  categories,
  products,
  onSubmit,
  onFieldChange,
  onBrandingFileChange,
}: DigitalMenuStudioTabProps) {
  const previewViewportClassName = "digital-menu-studio-phone-scroll";

  const importedSections = useMemo(() => createInitialSections(), []);
  const [sections, setSections] = useState<StudioSection[]>(
    () => importedSections,
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    importedSections[0]?.id || "featured-base",
  );

  useEffect(() => {
    setSelectedSectionId((current) => {
      if (sections.some((section) => section.id === current)) {
        return current;
      }

      return sections[0]?.id || "";
    });
  }, [sections]);

  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) || sections[0];

  const sectionProductsMap = useMemo(() => {
    return sections.reduce<Record<string, Product[]>>((acc, section, index) => {
      if (section.kind === "banner") {
        acc[section.id] = [];
        return acc;
      }

      const offset =
        section.kind === "favorites"
          ? 1
          : section.kind === "launches"
            ? 2
            : section.kind === "specials"
              ? 3
              : section.kind === "combos"
                ? 4
                : index;
      acc[section.id] = products.slice(offset, offset + 4);
      return acc;
    }, {});
  }, [products, sections]);

  const previewCategories = useMemo<PreviewCategory[]>(() => {
    const categoryMap = new Map<string, PreviewCategory>();

    products.forEach((item) => {
      const categoryName = String(item?.category?.name || "").trim();

      if (!categoryName) {
        return;
      }

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: categoryName,
          label: categoryName,
          coverImage: String(item?.image || "").trim(),
        });
      }
    });

    return [
      {
        id: "all",
        label: "Categorias",
        coverImage: String(products[0]?.image || "").trim(),
      },
      ...Array.from(categoryMap.values()),
    ];
  }, [products]);

  const addSectionOptions = useMemo(() => {
    const existingKinds = new Set(sections.map((section) => section.kind));

    return DEFAULT_SECTION_KINDS.filter((kind) => !existingKinds.has(kind)).map(
      (kind) => ({ value: kind, label: kind }),
    );
  }, [sections]);

  const restaurantName = settingsForm.restaurantName || "Seu Restaurante";
  const restaurantSlug = String(settingsForm.restaurantSlug || "").trim();
  const coverImage = settingsForm.restaurantCoverImage || "";
  const logoImage = settingsForm.restaurantLogo || "";
  const selectedSectionTotal = useMemo(
    () =>
      (sectionProductsMap[selectedSection?.id || ""] || []).reduce(
        (acc, item) => acc + Number(item.price || 0),
        0,
      ),
    [sectionProductsMap, selectedSection],
  );

  function handleAddSection() {
    const nextKind = addSectionOptions[0]?.value as
      | StudioSectionKind
      | undefined;

    if (!nextKind) {
      return;
    }

    const nextSection = createSpecialSection(nextKind);
    setSections((current) => [...current, nextSection]);
    setSelectedSectionId(nextSection.id);
  }

  function handleRemoveSelectedSection() {
    if (!selectedSection) {
      return;
    }

    setSections((current) =>
      current.filter((section) => section.id !== selectedSection.id),
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <style>
        {`
          .${previewViewportClassName} {
            scrollbar-width: thin;
            scrollbar-color: rgba(109, 40, 217, 0.38) rgba(15, 23, 42, 0.06);
          }

          .digital-menu-studio-layout {
            display: grid;
            grid-template-columns: minmax(280px, 340px) minmax(0, 1.35fr);
            gap: 1.25rem;
            align-items: start;
          }

          @media (max-width: 980px) {
            .digital-menu-studio-layout {
              grid-template-columns: 1fr;
            }
          }

          .${previewViewportClassName}::-webkit-scrollbar {
            width: 7px;
          }

          .${previewViewportClassName}::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.04);
            border-radius: 999px;
          }

          .${previewViewportClassName}::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(109, 40, 217, 0.5), rgba(91, 33, 182, 0.72));
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.55);
          }

          .${previewViewportClassName}::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(109, 40, 217, 0.62), rgba(91, 33, 182, 0.82));
          }
        `}
      </style>

      <S.FormCard style={{ maxWidth: "100%" }}>
        <S.PageHeader>
          <h2>Editor Visual do Cardapio</h2>
          <p>
            Esta aba usa os mesmos dados reais do seu cardapio digital para
            editar branding e visualizar a experiencia do cliente.
          </p>
        </S.PageHeader>

        <form onSubmit={onSubmit}>
          <div className="digital-menu-studio-layout">
            <div
              style={{
                border: "1px solid rgba(148, 163, 184, 0.26)",
                borderRadius: 20,
                padding: "1rem",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
                boxShadow: "0 14px 28px rgba(15, 23, 42, 0.08)",
                display: "grid",
                gap: "0.9rem",
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(14, 165, 233, 0.2)",
                  borderRadius: 14,
                  padding: "0.9rem 0.95rem",
                  background: "rgba(14, 165, 233, 0.06)",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>
                  Integrado com o cardapio digital
                </strong>
                <small style={{ color: "#0369a1", lineHeight: 1.45 }}>
                  Nome, logo e banner salvos aqui aparecem no cardapio publico
                  do cliente.
                </small>
              </div>

              <S.FormGroup>
                <label>Nome do Restaurante</label>
                <input
                  type="text"
                  name="restaurantName"
                  placeholder="Ex: Pizzaria Mesa"
                  value={settingsForm.restaurantName}
                  onChange={onFieldChange}
                />
              </S.FormGroup>

              <S.FormGroup>
                <label>URL da Logo</label>
                <input
                  type="url"
                  name="restaurantLogo"
                  placeholder="https://..."
                  value={settingsForm.restaurantLogo}
                  onChange={onFieldChange}
                />
                <div
                  style={{
                    marginTop: "0.55rem",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      onBrandingFileChange("restaurantLogo", event)
                    }
                  />
                  {brandingUploadState.restaurantLogo ? (
                    <small style={{ opacity: 0.85 }}>Processando logo...</small>
                  ) : null}
                </div>
              </S.FormGroup>

              <S.FormGroup>
                <label>URL do Banner</label>
                <input
                  type="url"
                  name="restaurantCoverImage"
                  placeholder="https://..."
                  value={settingsForm.restaurantCoverImage}
                  onChange={onFieldChange}
                />
                <div
                  style={{
                    marginTop: "0.55rem",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      onBrandingFileChange("restaurantCoverImage", event)
                    }
                  />
                  {brandingUploadState.restaurantCoverImage ? (
                    <small style={{ opacity: 0.85 }}>
                      Processando banner...
                    </small>
                  ) : null}
                </div>
              </S.FormGroup>

              <div
                style={{
                  border: "1px solid rgba(226, 232, 240, 0.96)",
                  borderRadius: 20,
                  padding: "0.95rem 0.9rem 0.85rem",
                  background: "#ffffff",
                  boxShadow: "0 14px 26px rgba(15, 23, 42, 0.06)",
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleAddSection}
                  disabled={addSectionOptions.length === 0}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#0f172a",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    justifyContent: "flex-start",
                    cursor:
                      addSectionOptions.length === 0
                        ? "not-allowed"
                        : "pointer",
                    opacity: addSectionOptions.length === 0 ? 0.55 : 1,
                    padding: 0,
                  }}
                >
                  <Plus size={16} />
                  Adicionar Seção
                </button>

                <small
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Seções especiais
                </small>

                <div style={{ display: "grid", gap: "0.05rem" }}>
                  {sections.map((section) => {
                    const isActive = section.id === selectedSection?.id;
                    const badgeStyle =
                      section.type === "Imagem"
                        ? {
                            background: "#dcfce7",
                            color: "#15803d",
                          }
                        : section.type === "Carrossel"
                          ? {
                              background: "#dbeafe",
                              color: "#2563eb",
                            }
                          : {
                              background: "#ede9fe",
                              color: "#7c3aed",
                            };

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setSelectedSectionId(section.id)}
                        style={{
                          border: "none",
                          background: isActive
                            ? "rgba(248, 250, 252, 0.95)"
                            : "transparent",
                          borderRadius: 14,
                          padding: "0.72rem 0.45rem",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.65rem",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "flex-start",
                            gap: 9,
                          }}
                        >
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 9,
                              background: "#f3e8ff",
                              color: "#7c3aed",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.76rem",
                              flexShrink: 0,
                            }}
                          >
                            ☆
                          </span>
                          <span style={{ display: "grid", gap: 3 }}>
                            <strong
                              style={{
                                fontSize: "0.88rem",
                                color: "#0f172a",
                                fontWeight: 700,
                              }}
                            >
                              {section.title}
                            </strong>
                            <small
                              style={{
                                width: "fit-content",
                                padding: "0.12rem 0.42rem",
                                borderRadius: 999,
                                ...badgeStyle,
                                fontWeight: 700,
                                fontSize: "0.64rem",
                                lineHeight: 1.2,
                              }}
                            >
                              {section.type}
                            </small>
                          </span>
                        </span>

                        <span
                          style={{
                            color: isActive ? "#64748b" : "#94a3b8",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            flexShrink: 0,
                            paddingTop: "0.15rem",
                          }}
                        >
                          +
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveSelectedSection}
                disabled={!selectedSection}
                style={{
                  border: "1px solid rgba(220, 38, 38, 0.22)",
                  background: "rgba(220, 38, 38, 0.06)",
                  color: "#b91c1c",
                  borderRadius: 12,
                  padding: "0.75rem 0.85rem",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  cursor: selectedSection ? "pointer" : "not-allowed",
                  opacity: selectedSection ? 1 : 0.55,
                }}
              >
                <Trash2 size={14} />
                Remover secao selecionada
              </button>

              <S.SubmitBtn
                type="submit"
                disabled={isSavingSettings || isBrandingUploadInProgress}
              >
                {isSavingSettings
                  ? "Salvando..."
                  : "Salvar no Cardapio Digital"}
              </S.SubmitBtn>
            </div>

            <div
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 24,
                padding: "1.1rem",
                background:
                  "radial-gradient(circle at top right, rgba(234, 29, 44, 0.08), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
                display: "grid",
                gap: "1rem",
                justifyItems: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <strong style={{ fontSize: "0.98rem" }}>
                    Preview do celular
                  </strong>
                  <small style={{ color: "#64748b" }}>
                    Mesmo layout-base do seu cardapio digital atual.
                  </small>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    borderRadius: 999,
                    padding: "0.4rem 0.7rem",
                    background: "rgba(234, 29, 44, 0.08)",
                    color: "#b8141f",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                  }}
                >
                  <Smartphone size={14} />
                  Preview real
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  width: "min(100%, 332px)",
                  borderRadius: 42,
                  padding: "0.72rem",
                  background:
                    "linear-gradient(180deg, #111827 0%, #020617 100%)",
                  boxShadow:
                    "0 28px 54px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 118,
                    left: -3,
                    width: 4,
                    height: 54,
                    borderRadius: 999,
                    background: "rgba(51, 65, 85, 0.95)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 182,
                    left: -3,
                    width: 4,
                    height: 54,
                    borderRadius: 999,
                    background: "rgba(51, 65, 85, 0.95)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 145,
                    right: -3,
                    width: 4,
                    height: 82,
                    borderRadius: 999,
                    background: "rgba(51, 65, 85, 0.95)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  className={previewViewportClassName}
                  style={{
                    position: "relative",
                    borderRadius: 34,
                    overflow: "hidden",
                    height: 600,
                    overflowY: "auto",
                    overflowX: "hidden",
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-y",
                    overscrollBehavior: "contain",
                    background: "var(--dm-light-bg)",
                    border: "2px solid rgba(15, 23, 42, 0.9)",
                    ["--dm-light-bg" as const]: "#f5f2f8",
                    ["--dm-light-surface" as const]: "#ffffff",
                    ["--dm-light-muted" as const]: "#6b7280",
                    ["--dm-purple" as const]: "#6d28d9",
                    ["--dm-line" as const]: "rgba(90, 39, 87, 0.12)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 112,
                      height: 26,
                      borderRadius: 999,
                      background: "#0f172a",
                      zIndex: 2,
                      boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.06)",
                      pointerEvents: "none",
                    }}
                  />

                  <DM.ProfileHeaderSection>
                    <DM.ProfileCover $image={coverImage} />

                    <DM.ProfileInfoCard>
                      <DM.ProfileLogoWrap>
                        <DM.ProfileLogoImage $image={logoImage} />
                      </DM.ProfileLogoWrap>

                      <DM.ProfileIdentity>
                        <h1>{restaurantName}</h1>
                        <DM.ProfileActionsRow>
                          <button type="button" aria-label="Inicio">
                            <House size={22} />
                          </button>
                          <button type="button" aria-label="Instagram">
                            <AtSign size={22} />
                          </button>
                          <button type="button" aria-label="Buscar">
                            <Search size={22} />
                          </button>
                        </DM.ProfileActionsRow>
                        <DM.ProfileRateText>Avaliar ★</DM.ProfileRateText>
                      </DM.ProfileIdentity>
                    </DM.ProfileInfoCard>
                  </DM.ProfileHeaderSection>

                  <DM.MobileTopBar>
                    <DM.MobileBrand>
                      <strong>{restaurantName}</strong>
                    </DM.MobileBrand>

                    <DM.MobileActions>
                      <button type="button" aria-label="Lista">
                        <Menu size={18} />
                      </button>
                      <button type="button" aria-label="Grade">
                        <Grid2x2 size={18} />
                      </button>
                      <button type="button" aria-label="Blocos">
                        <Square size={18} />
                      </button>
                    </DM.MobileActions>
                  </DM.MobileTopBar>

                  <DM.CategoryCircleRail>
                    {previewCategories.map((category) => (
                      <DM.CategoryCircleButton
                        type="button"
                        key={category.id}
                        $active={selectedSection?.title === category.label}
                        onClick={() => {
                          const matchedSection = sections.find(
                            (section) => section.title === category.label,
                          );

                          if (matchedSection) {
                            setSelectedSectionId(matchedSection.id);
                          }
                        }}
                      >
                        <DM.CategoryCircleThumb $image={category.coverImage} />
                        <span>{category.label}</span>
                      </DM.CategoryCircleButton>
                    ))}
                  </DM.CategoryCircleRail>

                  <DM.Section style={{ padding: "0.9rem 0.8rem 5.4rem" }}>
                    {sections.map((section) => {
                      const sectionProducts =
                        sectionProductsMap[section.id] || [];
                      const isActive = section.id === selectedSection?.id;

                      if (section.kind === "banner") {
                        return (
                          <div
                            key={section.id}
                            style={{
                              marginBottom: "1rem",
                              borderRadius: 22,
                              padding: "1rem",
                              background: coverImage
                                ? `linear-gradient(180deg, rgba(15,23,42,0.1), rgba(15,23,42,0.42)), url(${coverImage}) center / cover`
                                : "linear-gradient(135deg, #ea1d2c 0%, #7f1d1d 55%, #f97316 100%)",
                              color: "#ffffff",
                              border: isActive
                                ? `2px solid ${section.accent}`
                                : "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            <small style={{ opacity: 0.86, fontWeight: 800 }}>
                              {section.title}
                            </small>
                            <div
                              style={{
                                marginTop: "0.45rem",
                                fontSize: "1.2rem",
                                fontWeight: 900,
                                lineHeight: 1.05,
                              }}
                            >
                              Personalize do seu jeito
                            </div>
                          </div>
                        );
                      }

                      return (
                        <DM.MenuCategoryBlock key={section.id}>
                          <DM.MenuCategoryHeader>
                            {section.title}
                          </DM.MenuCategoryHeader>

                          {sectionProducts.length > 0 ? (
                            <DM.MenuList>
                              {sectionProducts.map((product) => (
                                <DM.MenuItemCard
                                  key={`${section.id}-${product.id}`}
                                  style={
                                    isActive
                                      ? {
                                          outline: `1px solid ${section.accent}35`,
                                          borderRadius: 18,
                                        }
                                      : undefined
                                  }
                                >
                                  <DM.MenuItemText>
                                    <h3>{product.name}</h3>
                                    <p>
                                      {product.description ||
                                        "Personalize a descricao e monte o cardapio do seu jeito."}
                                    </p>
                                    <DM.MenuItemBottom>
                                      <DM.Price>
                                        {getPriceLabel(product.price)}
                                      </DM.Price>
                                      <DM.AddButton
                                        type="button"
                                        $added={false}
                                      >
                                        Adicionar
                                      </DM.AddButton>
                                    </DM.MenuItemBottom>
                                  </DM.MenuItemText>

                                  <DM.MenuItemImageWrap>
                                    <DM.MenuItemImage
                                      $image={String(
                                        product.image || "",
                                      ).trim()}
                                    />
                                  </DM.MenuItemImageWrap>
                                </DM.MenuItemCard>
                              ))}
                            </DM.MenuList>
                          ) : (
                            <DM.EmptyHint
                              style={{ marginTop: "0.55rem", borderRadius: 18 }}
                            >
                              Cadastre produtos nesta categoria para ver a
                              previa completa desta secao.
                            </DM.EmptyHint>
                          )}
                        </DM.MenuCategoryBlock>
                      );
                    })}
                  </DM.Section>

                  <div style={{ position: "absolute", right: 12, bottom: 12 }}>
                    <DM.FloatingCart type="button">
                      <ShoppingBag size={18} /> Pedido
                      <b>{getPriceLabel(selectedSectionTotal)}</b>
                    </DM.FloatingCart>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </S.FormCard>
    </div>
  );
}
