export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: number | null;
        restaurantId: number | null;
        role: string;
        email?: string | null;
        isGuest?: boolean;
      };
      tableSession?: {
        id: number;
        tableId: number;
        restaurantId: number;
      };
      subscription?: unknown;
    }
  }
}
