"use client";

import { useGame } from "../GameProvider";

export function LanguageButton() {
  const { lang, toggleLang } = useGame();
  return (
    <button
      type="button"
      className="iso-icon-button lang-toggle"
      aria-label={
        lang === "es"
          ? "Switch language to English"
          : "Cambiar idioma a Español"
      }
      onClick={toggleLang}
    >
      <span aria-hidden="true">🌐</span>
      <span>{lang.toUpperCase()}</span>
    </button>
  );
}
