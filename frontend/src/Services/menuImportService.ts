import api from "./api";

type ImportIfoodMenuPayload = {
  url: string;
  restaurantId?: number | string;
};

type ImportMenuFromImagePayload = {
  imageUrl: string;
  restaurantId?: number | string;
};

class MenuImportService {
  async importIfoodMenu(payload: ImportIfoodMenuPayload) {
    const response = await api.post("/menu-import/ifood", payload);
    return response.data;
  }

  async importMenuFromImage(payload: ImportMenuFromImagePayload) {
    const response = await api.post("/menu-import/image", payload);
    return response.data;
  }
}

export default new MenuImportService();
