import api from "./api";

export type BannerRecord = { id: number; title: string; image: string };

class BannerService {
  async list(): Promise<BannerRecord[]> {
    const response = await api.get("/banners");
    return Array.isArray(response.data) ? response.data : [];
  }
  async create(payload: Pick<BannerRecord, "title" | "image">) {
    const response = await api.post("/banners", payload);
    return response.data as BannerRecord;
  }
  async update(id: number, payload: Pick<BannerRecord, "title" | "image">) {
    const response = await api.put(`/banners/${id}`, payload);
    return response.data as BannerRecord;
  }
}

export default new BannerService();
