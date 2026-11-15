"use client";
import { useTranslate } from "@/components/GameProvider";
import { useId, useState, type ReactNode } from "react";
type Mission = "origin" | "water" | "storm" | "signal" | "rover";
const FACTS: Record<Mission, { text: string[]; links: [string, string][] }> = {
  origin: {
    text: [
      "NASA POWER guarda datos del clima de muchos lugares.",
      "Nuestra transformación a Marte es una historia inventada.",
      "Cambiar los polos magnéticos no vuelve la Tierra un Marte.",
      "Usamos el clima del 15/01/2024. No es un pronóstico.",
      "Si la consulta falla, mostramos datos reales guardados.",
    ],
    links: [
      [
        "Los polos magnéticos según NASA",
        "https://science.nasa.gov/science-research/earth-science/flip-flop-why-variations-in-earths-magnetic-field-arent-causing-todays-climate-change/",
      ],
      [
        "NASA POWER",
        "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
      ],
    ],
  },
  water: {
    text: [
      "En la estación espacial, Sabatier ayuda a recuperar agua.",
      "Combina hidrógeno y CO₂. No quema el aire de la cabina.",
      "Aquí usamos una versión de juego: más agua cuesta aire.",
      "La tierra de Marte necesita limpiarse antes de plantar.",
    ],
    links: [
      [
        "Sabatier en NASA",
        "https://www.nasa.gov/spacecraft-oxygen-recovery-scor/",
      ],
      ["Cultivar en Marte", "https://www.nasa.gov/general/detoxifying-mars/"],
    ],
  },
  storm: {
    text: [
      "Una gran tormenta dejó sin luz al rover Opportunity.",
      "NASA anunció el fin de su misión en febrero de 2019.",
      "Salir al exterior requiere protección contra la radiación.",
      "Los porcentajes y las rondas son reglas de este juego.",
    ],
    links: [
      [
        "Opportunity en NASA",
        "https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end/",
      ],
    ],
  },
  signal: {
    text: [
      "La sonda del juego se inspira en Mars Pathfinder.",
      "NASA DONKI publica datos reales de llamaradas solares.",
      "Si no responde, usamos una real: X8.7 del 14/05/2024.",
      "La señal y el Escudo Anti-Radiación son parte del juego.",
    ],
    links: [
      ["Mars Pathfinder", "https://science.nasa.gov/mission/mars-pathfinder/"],
      ["Datos NASA DONKI", "https://ccmc.gsfc.nasa.gov/tools/DONKI/"],
    ],
  },
  rover: {
    text: [
      "Jezero es el cráter que explora el rover Perseverance.",
      "NASA Mars Trek permite recorrer mapas reales de Marte.",
      "Nuestro mapa y sus caminos están dibujados por código.",
      "El frío y los consumos son reglas para aprender jugando.",
    ],
    links: [
      [
        "Jezero en NASA",
        "https://science.nasa.gov/mission/mars-2020-perseverance/location-map/",
      ],
      ["Mapas NASA Mars Trek", "https://trek.nasa.gov/mars/"],
    ],
  },
};
export function NasaFact({
  mission,
  children,
  onOpen,
  disabled = false,
  initialOpen = false,
}: {
  mission: Mission;
  children?: ReactNode;
  onOpen?: () => void;
  disabled?: boolean;
  initialOpen?: boolean;
}) {
  const tr = useTranslate();
  const [open, setOpen] = useState(initialOpen),
    id = useId(),
    fact = FACTS[mission];
  return (
    <section className="nasa-fact">
      {!initialOpen && (
        <button
          type="button"
          className="nasa-fact-button"
          aria-expanded={open}
          aria-controls={id}
          disabled={disabled}
          onClick={() => {
            if (!open) onOpen?.();
            setOpen(!open);
          }}
        >
          {tr("[?] Info NASA")}
        </button>
      )}
      <div className="nasa-fact-content" id={id} hidden={!open}>
        {fact.text.map((text) => (
          <p className="short-copy" key={tr(text)}>
            {tr(text)}
          </p>
        ))}
        {children}
        {fact.links.map(([label, url]) => (
          <a href={url} key={url} target="_blank" rel="noreferrer">
            {tr(label)} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
