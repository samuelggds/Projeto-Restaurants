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
        mustChangePassword?: boolean;
        isGuest?: boolean;
      };
      guestOrderTracking?: {
        orderId: number;
        publicId: string;
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
        phone: string | null;
        orderingBlocked: boolean;
        authenticated: boolean;
      };
      subscription?: unknown;
      printerAgent?: {
        id: number;
        publicId: string;
        restaurantId: number;
        name: string;
      };
    }
  }
}
