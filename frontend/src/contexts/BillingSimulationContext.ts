import { createContext } from 'react';
// Only the isolated demo entry provides this context. Production never enables it.
export const BillingSimulationContext = createContext(false);
