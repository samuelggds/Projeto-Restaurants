export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: number | null;
        restaurantId: number | null;
        role: string;
        subRole?: string | null;
        email?: string | null;
        isGuest?: boolean;
      };
      tableSession?: {
        id: number;
        publicId: string;
        tableId: number;
        restaurantId: number;
        status: string;
      };
      tableParticipant?: {
        id: number;
        publicId: string;
        tableSessionId: number;
        restaurantId: number;
        userId: number | null;
        displayName: string | null;
        authenticated: boolean;
      };
      subscription?: unknown;
    }
  }
}
