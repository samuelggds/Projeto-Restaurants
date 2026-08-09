import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import * as S from "./styles";
import { ConfirmOptions, DialogContext, DialogState, PromptOptions } from "./context";

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmDialog = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ kind: "confirm", ...options, resolve });
      }),
    [],
  );

  const promptDialog = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(options.initialValue ?? "");
        setDialog({ kind: "prompt", ...options, resolve });
      }),
    [],
  );

  const cancel = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(false);
    else dialog.resolve(null);
    setDialog(null);
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    if (dialog.kind === "prompt") window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancel, dialog]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(true);
    else {
      const normalized = value.trim();
      if (!normalized) return;
      dialog.resolve(normalized);
    }
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ confirmDialog, promptDialog }}>
      {children}
      {dialog && (
        <S.Backdrop onMouseDown={(event) => event.target === event.currentTarget && cancel()}>
          <S.Dialog role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" onSubmit={submit}>
            <S.Icon $tone={dialog.tone ?? "default"}>
              {dialog.tone === "danger" ? <AlertTriangle /> : <HelpCircle />}
            </S.Icon>
            <S.Close type="button" aria-label="Fechar" onClick={cancel}><X /></S.Close>
            <S.Copy>
              <h2 id="app-dialog-title">{dialog.title}</h2>
              {dialog.description && <p>{dialog.description}</p>}
            </S.Copy>
            {dialog.kind === "prompt" && (
              <S.Field>
                {dialog.inputLabel}
                <input
                  ref={inputRef}
                  value={value}
                  placeholder={dialog.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                />
              </S.Field>
            )}
            <S.Actions>
              <button type="button" className="cancel" onClick={cancel}>{dialog.cancelLabel ?? "Cancelar"}</button>
              <button type="submit" className={dialog.tone === "danger" ? "danger" : "confirm"} disabled={dialog.kind === "prompt" && !value.trim()}>
                {dialog.confirmLabel ?? "Confirmar"}
              </button>
            </S.Actions>
          </S.Dialog>
        </S.Backdrop>
      )}
    </DialogContext.Provider>
  );
}
