import { z } from 'zod';

// HTTP validation belongs to the boundary; this pure schema never opens the database.
export const customerAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().min(3).max(160),
  number: z.string().trim().regex(/^\d+[A-Za-z]?$/).max(10),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => value.length === 8),
  complement: z.string().trim().max(160).optional().default(''),
  isDefault: z.boolean().optional().default(false),
});

export type CustomerAddressInput = z.output<typeof customerAddressSchema>;

export type CustomerAddressRecord = {
  id: number;
  userId: number;
  label: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCustomerAddressRecord = Omit<CustomerAddressRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
