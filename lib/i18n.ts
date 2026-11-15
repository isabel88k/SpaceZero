import en from "./i18n-text.json";

export type Lang = "es" | "en";
export const GAME_TITLES: Record<Lang, string> = {
  es: "MISIÓN RESCATE — Espejo Marciano",
  en: "RESCUE MISSION — Martian Mirror",
};
export const GAME_DESCRIPTIONS: Record<Lang, string> = {
  es: "Explora islas mágicas de Bolivia y Marte con Chispa. Aprende ciencia con datos reales de NASA.",
  en: "Explore magical islands in Bolivia and on Mars with Chispa. Learn science with real NASA data.",
};

const english: Record<string, string> = en;
const messagePatterns: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /^Salimos de (.+)\. ¡Tu viaje empieza aquí!$/u,
    "We’re leaving from $1. Your journey starts here!",
  ],
  [
    /^NASA avisa: llamarada (.+)\. ¡Activa el escudo!$/u,
    "NASA alert: $1 flare. Turn on the shield!",
  ],
  [/^Ronda (\d+) de 3\. (.+)$/u, "Round $1 of 3. $2"],
  [/^TORMENTA (\d+)\/3$/u, "STORM $1/3"],
  [/^Llevamos (\d+) de (\d+) km\. (.+)$/u, "We’ve gone $1 of $2 km. $3"],
  [/^INFORME FINAL · (.+)$/u, "FINAL REPORT · $1"],
];

export function t(lang: Lang, source: string): string {
  if (lang === "es") return source;
  if (Object.hasOwn(english, source)) return english[source];
  for (const [pattern, template] of messagePatterns) {
    const match = pattern.exec(source);
    if (match)
      return template.replace(/\$(\d)/g, (_, i: string) =>
        t(lang, match[Number(i)]),
      );
  }
  return source;
}
