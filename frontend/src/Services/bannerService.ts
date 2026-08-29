import api from './api';

export type BannerRecord = {
  id?: number;
  title: string;
  highlight: string;
  description: string;
  buttonLabel: string;
  image: string;
  active: boolean;
  position: number;
};

export type BannerPayload = Omit<BannerRecord, 'id'>;

class BannerService {
  async list(): Promise<BannerRecord[]> {
    const response = await api.get('/banners');
    return Array.isArray(response.data) ? response.data : [];
  }
  async create(payload: BannerPayload) {
    const response = await api.post('/banners', payload);
    return response.data as BannerRecord;
  }
  async update(id: number, payload: BannerPayload) {
    const response = await api.put(`/banners/${id}`, payload);
    return response.data as BannerRecord;
  }

  async delete(id: number) {
    await api.delete(`/banners/${id}`);
  }
}

export default new BannerService();
