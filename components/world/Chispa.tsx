"use client";
import { useTranslate } from "@/components/GameProvider";

export type ChispaMood = "happy" | "alert" | "celebrate";

export function Chispa({ mood = "happy" }: { mood?: ChispaMood }) {
  const tr = useTranslate();
  return (
    <svg
      className={`chispa chispa-${mood}`}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Chispa ${mood === "alert" ? tr("en alerta") : mood === "celebrate" ? "celebrando" : "feliz"}`}
      shapeRendering="crispEdges"
    >
      {mood === "alert" && (
        <g fill="none" stroke="#ffab73" strokeWidth="2" aria-hidden="true">
          <path className="chispa-wave" d="M16 0h-3v7h3m16-7h3v7h-3" />
          <path
            className="chispa-wave chispa-wave-outer"
            d="M10-3H7v13h3m28-13h3v13h-3"
          />
        </g>
      )}
      <path fill="#241d46" d="M10 10h28v3h4v23h-4v5H10v-5H6V13h4z" />
      <path fill="#ffd451" d="M12 12h24v3h4v19h-4v5H12v-5H8V15h4z" />
      <path fill="#fff0a2" d="M12 12h24v4H12zm-4 4h5v15H8z" />
      <path fill="#1e4258" d="M13 19h22v13H13z" />
      <g className="chispa-eyes">
        {mood === "celebrate" ? (
          <path d="M18 19h2v3h3v2h-3v3h-2v-3h-3v-2h3zm11 0h2v3h3v2h-3v3h-2v-3h-3v-2h3z" />
        ) : (
          <path d="M16 21h5v7h-5zm12 0h5v7h-5z" />
        )}
      </g>
      <path
        fill={mood === "alert" ? "#ffb98b" : "#a4fff1"}
        d={
          mood === "alert"
            ? "M23 28h3v3h-3z"
            : "M21 28h2v2h4v-2h2v2h-2v1h-4v-1h-2z"
        }
      />
      <path
        fill="#a8a2df"
        d="M9 41h8v5H9zm22 0h8v5h-8zM2 23h4v10H2zm40 0h4v10h-4z"
      />
      <path fill="#f6a0c6" d="M22 5h4v7h-4z" />
      <path
        className="chispa-antenna"
        fill={mood === "alert" ? "#ff7654" : "#7effc3"}
        d="M20 1h8v6h-8z"
      />
      {mood === "celebrate" && (
        <g className="chispa-spark" aria-hidden="true">
          <path fill="#fff298" d="M0 5h4v4H0zm42-2h4v4h-4zm1 37h4v4h-4z" />
          <path fill="#89ffc0" d="M6 0h3v3H6zM0 39h3v3H0zm46-26h3v3h-3z" />
        </g>
      )}
    </svg>
  );
}
