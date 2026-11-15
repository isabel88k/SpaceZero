"use client";
import { useTranslate } from "@/components/GameProvider";
import { useEffect, useRef, type ReactNode } from "react";
import { LanguageButton } from "./LanguageButton";
export function TacticalModal({
  title,
  tag,
  onClose,
  onInfo,
  children,
  action,
  preview,
  kind = "info",
}: {
  title: string;
  tag: string;
  onClose: () => void;
  onInfo?: () => void;
  children: ReactNode;
  action?: ReactNode;
  preview?: ReactNode;
  kind?: string;
}) {
  const tr = useTranslate();
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const d = ref.current,
      previous = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    return () => {
      d?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`world-tactical tactical-${kind}`}
      aria-label={tr(title)}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close.current();
        }
      }}
    >
      <div className="tactical-header">
        <div>
          <span>{tr(tag)}</span>
          <h2>{tr(title)}</h2>
        </div>
        <div className="tactical-header-actions">
          <LanguageButton />
          {onInfo && (
            <button className="tactical-nasa-button" onClick={onInfo}>
              {tr("[?] Info NASA")}
            </button>
          )}
          <button
            className="tactical-close"
            onClick={onClose}
            aria-label={tr("Volver al mapa")}
          >
            ×<small>{tr("Volver")}</small>
          </button>
        </div>
      </div>
      {preview && <div className="tactical-preview">{preview}</div>}
      <div className="tactical-body">{children}</div>
      <div
        className={`tactical-footer ${action ? "tactical-footer-action" : ""}`}
      >
        {action}
        <span className="tactical-footer-hint">
          {tr("PUEDES VOLVER AL MAPA CON ESC")}
        </span>
      </div>
    </dialog>
  );
}
