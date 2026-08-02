import { useContext } from "react";
import { WaiterContext } from "./WaiterContext";

export function useWaiterWorkspace() {
  const value = useContext(WaiterContext);
  if (!value)
    throw new Error("useWaiterWorkspace deve estar dentro de WaiterProvider");
  return value;
}
