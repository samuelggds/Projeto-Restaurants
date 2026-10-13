import api from './api';
export type TableReservation = {
  publicId: string;
  tableId: number;
  tableNumber: number | null;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startsAt: string;
  endsAt: string;
  status: 'CONFIRMED' | 'SEATED' | 'CANCELED' | 'NO_SHOW' | 'COMPLETED';
  note: string | null;
  checkedInAt: string | null;
  createdAt: string;
};
export type ReservationSettings = { enabled: boolean; toleranceMinutes: number };
export type ReservationSelectableTable = { id: number; number: number; active: boolean };
const root = '/table-reservations';
export default {
  async tables(): Promise<ReservationSelectableTable[]> {
    return (await api.get(`${root}/tables`)).data;
  },
  async settings(): Promise<ReservationSettings> {
    return (await api.get(`${root}/settings`)).data;
  },
  async updateSettings(payload: ReservationSettings): Promise<ReservationSettings> {
    return (await api.put(`${root}/settings`,payload)).data;
  },
  async list(): Promise<TableReservation[]> {
    return (await api.get(root)).data;
  },
  async history(status: 'ALL' | 'SEATED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW', skip: number): Promise<{total:number;rows:TableReservation[];skip:number;take:number}> {
    return (await api.get(`${root}/history`, { params: { status, skip } })).data;
  },
  async create(input: {
    tableId: number; guestName: string; guestPhone: string; guestCount: number;
    startsAt: string; endsAt: string; note?: string;
  }): Promise<TableReservation> { return (await api.post(root,input)).data; },
  async status(id: string, status: 'CANCELED' | 'NO_SHOW'): Promise<TableReservation> {
    return (await api.patch(`${root}/${id}/status`,{status})).data;
  },
  async checkIn(id: string): Promise<unknown> {
    return (await api.post(`${root}/${id}/check-in`)).data;
  },
};
