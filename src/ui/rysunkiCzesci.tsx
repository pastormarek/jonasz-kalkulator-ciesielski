/**
 * Rysunki warsztatowe pojedynczych części mebla.
 *
 * DLACZEGO TO POWSTAŁO
 * --------------------
 * Cieśla obejrzał katalog i napisał: „wielu ludzi zamiast czytać instrukcje
 * będzie patrzyć na rysunek celem znalezienia dokładnie, jak co zrobić",
 * a zapytany, czego brakuje obok listy części, odpowiedział krótko: „każda
 * deska, element drewniany — dokładnie wymiarowana z rysunkiem w każdej
 * płaszczyźnie".
 *
 * Stąd trzy rzuty: z góry, z boku i przekrój. Tyle wystarczy, żeby wziąć
 * deskę i odmierzyć — a każdy wymiar pochodzi z tych samych liczb, co tabela
 * części i plan cięcia, więc nie da się ich rozjechać.
 *
 * SKALA
 * -----
 * Deska 150 × 2 cm narysowana w jednej skali dawałaby włos zamiast rzutu,
 * więc długość i przekrój mają skale osobne. Rysunek nie służy do
 * odmierzania linijką — służy do zrozumienia kształtu, a wymiary są przy
 * każdej krawędzi liczbami. Dlatego przy rysunku stoi to napisane wprost.
 *
 * Ale W OBRĘBIE JEDNEGO MEBLA długości są w jednej skali: noga 43 cm jest
 * wtedy widocznie krótsza od deski 150 cm i od razu widać, co z czym się
 * łączy. Bez tego wszystkie części wyglądały jednakowo długo, a to myli
 * bardziej, niż pomaga.
 */

import type { PozycjaCzesci } from '../core/furniture'
import { przekroj } from './format'
import { useDlugosc } from './units'

/** Wysokość rzutu w pikselach — na tyle gruba kreska, żeby coś było widać. */
const MIN_GRUBOSC = 10
const MAX_GRUBOSC = 46

export function RysunekCzesci({
  pozycja,
  oznaczenie,
  najdluzsza,
}: {
  pozycja: PozycjaCzesci
  oznaczenie: string
  /** Najdłuższa część mebla [mm] — wspólna miara dla wszystkich rysunków. */
  najdluzsza?: number
}) {
  const { dl } = useDlugosc()

  const W = 460
  const marginesX = 44
  const gora = 34
  const odstep = 26

  const pelnaDlugosc = W - 2 * marginesX - 78
  // Krótkie części rysujemy krócej, w tej samej skali co reszta mebla.
  // Poniżej jednej piątej kadru rzut przestaje być czytelny, więc tam
  // proporcja ustępuje czytelności.
  const udzial = najdluzsza && najdluzsza > 0 ? pozycja.length / najdluzsza : 1
  const dlugoscPx = pelnaDlugosc * Math.max(0.2, Math.min(1, udzial))
  // Przekrój dostaje własną skalę: przy desce 150 × 2 cm wspólna dałaby
  // kreskę cieńszą od linii wymiarowej.
  const wiekszy = Math.max(pozycja.section.b, pozycja.section.h)
  const skalaPrzekroju = Math.min(MAX_GRUBOSC / Math.max(wiekszy, 1), 0.5)
  const szerPx = Math.max(MIN_GRUBOSC, pozycja.section.h * skalaPrzekroju)
  const grubPx = Math.max(MIN_GRUBOSC, pozycja.section.b * skalaPrzekroju)

  const yGora = gora
  const yBok = yGora + szerPx + odstep + 18
  const H = yBok + grubPx + 42

  // Skos ścina końce, więc rzut z boku przestaje być prostokątem. Ścięcie
  // rysujemy poglądowo — kąt jest przy rysunku liczbą.
  const scin = pozycja.skos ? Math.min(dlugoscPx / 4, grubPx * Math.tan((pozycja.skos * Math.PI) / 180)) : 0
  const x0 = marginesX
  const x1 = marginesX + dlugoscPx

  return (
    <figure className="rysunek-czesci">
      <figcaption>
        <strong>{oznaczenie}</strong> {pozycja.nazwa}
        <span>
          {pozycja.count} × {przekroj(pozycja.section.b, pozycja.section.h)} · {dl(pozycja.length)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rysunek części ${pozycja.nazwa}`}>
        {/* --- widok z góry: długość na szerokość deski --- */}
        <text x={x0} y={yGora - 8} className="rys-opis">
          z góry
        </text>
        <rect x={x0} y={yGora} width={dlugoscPx} height={szerPx} className="rys-drewno" />
        <Wymiar
          od={[x0, yGora + szerPx + 12]}
          do={[x1, yGora + szerPx + 12]}
          etykieta={dl(pozycja.length)}
          pion={false}
        />
        <Wymiar
          od={[x1 + 14, yGora]}
          do={[x1 + 14, yGora + szerPx]}
          etykieta={dl(pozycja.section.h)}
          pion
        />

        {/* --- widok z boku: długość na grubość deski --- */}
        <text x={x0} y={yBok - 8} className="rys-opis">
          z boku
        </text>
        {scin > 0 ? (
          <polygon
            points={`${x0},${yBok} ${x1},${yBok} ${x1 - scin},${yBok + grubPx} ${x0 + scin},${yBok + grubPx}`}
            className="rys-drewno"
          />
        ) : (
          <rect x={x0} y={yBok} width={dlugoscPx} height={grubPx} className="rys-drewno" />
        )}
        <Wymiar
          od={[x1 + 14, yBok]}
          do={[x1 + 14, yBok + grubPx]}
          etykieta={dl(pozycja.section.b)}
          pion
        />

        {/* --- przekrój --- */}
        <text x={W - 60} y={yGora - 8} className="rys-opis">
          przekrój
        </text>
        <rect
          x={W - 60}
          y={yGora}
          width={Math.max(MIN_GRUBOSC, pozycja.section.b * skalaPrzekroju)}
          height={szerPx}
          className="rys-drewno rys-przekroj"
        />

        {pozycja.skos ? (
          <text x={x0} y={H - 8} className="rys-uwaga">
            końce ścięte pod {pozycja.skos}°
          </text>
        ) : null}
      </svg>
      {pozycja.uwaga && <p className="rys-uwaga-pod">{pozycja.uwaga}</p>}
    </figure>
  )
}

/** Linia wymiarowa z odbiciami na końcach i opisem pośrodku. */
function Wymiar({
  od,
  do: doo,
  etykieta,
  pion,
}: {
  od: [number, number]
  do: [number, number]
  etykieta: string
  pion: boolean
}) {
  const [x1, y1] = od
  const [x2, y2] = doo
  const sx = (x1 + x2) / 2
  const sy = (y1 + y2) / 2
  const odbicie = 4

  return (
    <g className="rys-wymiar">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {pion ? (
        <>
          <line x1={x1 - odbicie} y1={y1} x2={x1 + odbicie} y2={y1} />
          <line x1={x2 - odbicie} y1={y2} x2={x2 + odbicie} y2={y2} />
          <text x={sx + 8} y={sy} className="rys-liczba" dominantBaseline="middle">
            {etykieta}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - odbicie} x2={x1} y2={y1 + odbicie} />
          <line x1={x2} y1={y2 - odbicie} x2={x2} y2={y2 + odbicie} />
          <text x={sx} y={sy + 14} className="rys-liczba" textAnchor="middle">
            {etykieta}
          </text>
        </>
      )}
    </g>
  )
}
