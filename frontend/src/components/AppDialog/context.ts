import { createContext, useContext } from "react";

export type DialogTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

export type PromptOptions = ConfirmOptions & {
  initialValue?: string;
  inputLabel: string;
  placeholder?: string;
};

export type DialogState =
  | ({ kind: "confirm"; resolve: (result: boolean) => void } & ConfirmOptions)
  | ({ kind: "prompt"; resolve: (result: string | null) => void } & PromptOptions);

export type DialogContextValue = {
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
  promptDialog: (options: PromptOptions) => Promise<string | null>;
};

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useAppDialog deve ser usado dentro de AppDialogProvider.");
  return context;
}
