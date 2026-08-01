import menuService from "../../../Services/menuService";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import tableSessionService from "../../../Services/tableSessionService";
import type { IHomeGateway } from "../application/ports/IHomeGateway";

const homeGateway: IHomeGateway = {
  listProducts: (restaurantId) => menuService.listProducts(restaurantId),
  listProductsBySlug: (slug) => menuService.listProductsBySlug(slug),
  getPublicSettingsBySlug: (slug) =>
    restaurantSettingsService.getPublicSettingsBySlug(slug),
  validateTablePin: (payload) => tableSessionService.validatePin(payload),
  login: () => {
    // implementado via contexto — injetado pela página
    throw new Error("login deve ser provido pelo contexto de auth");
  },
};

export default homeGateway;
