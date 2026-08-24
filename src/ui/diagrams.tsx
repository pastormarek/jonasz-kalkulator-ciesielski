/**
 * Rysunki techniczne generowane z tych samych liczb, co tabele.
 *
 * Rysunek nie jest ozdobą — na budowie zwykle szybciej sprawdza się kształt
 * niż kolumnę liczb. Dlatego każdy wymiar na rysunku pochodzi wprost z
 * obliczeń i nie da się go rozjechać z zestawieniem.
 *
 * UWAGA O UKŁADZIE WSPÓŁRZĘDNYCH: liczymy w milimetrach z osią Y skierowaną
 * do góry (tak jak myśli człowiek), a dopiero funkcja `pkt` odwraca ją na
 * układ SVG, w którym Y rośnie w dół.
 */

import { deg2rad, type SlopeGeometry, type Notch, type CollarGeometry } from '../core/geometry'
import type { RoofInput } from '../core/types'
import type { SpliceResult } from '../core/materials'
import { mm, stopnie } from './format'
import { useDlugosc } from './units'

/** Przekrój poprzeczny więźby z podstawowymi wymiarami. */
export function RysunekPrzekroju({
  input,
  slope,
  collar,
  splice,
}: {
  input: RoofInput
  slope: SlopeGeometry
  collar: CollarGeometry | null
  splice: SpliceResult
}) {
  const { dl } = useDlugosc()
  const isShed = input.shape === 'shed'
  const span = input.span
  const rise = slope.rise
  const eaves = input.eaves

  // Dobieramy skalę tak, żeby dach z okapami i miejscem na wymiary zmieścił się w kadrze.
  const W = 720
  const H = 420
  const marginX = 70
  const marginTop = 40
  const marginBottom = 70
  const szerokoscRys = span + 2 * eaves
  const skala = Math.min(
    (W - 2 * marginX) / Math.max(szerokoscRys, 1),
    (H - marginTop - marginBottom) / Math.max(rise + 300, 1),
  )

  const baseY = H - marginBottom
  const leftX = (W - szerokoscRys * skala) / 2 + eaves * skala
  const pkt = (xmm: number, ymm: number): [number, number] => [
    leftX + xmm * skala,
    baseY - ymm * skala,
  ]

  const a = deg2rad(input.pitchDeg)
  const kalenicaX = isShed ? span : span / 2
  const [xL, yL] = pkt(0, 0)
  const [xK, yK] = pkt(kalenicaX, rise)
  const [xR, yR] = pkt(span, isShed ? rise : 0)

  // Okap przedłuża krokiew poza murłatę wzdłuż tej samej linii.
  const okapDX = eaves * skala
  const okapDY = eaves * Math.tan(a) * skala
  const grubosc = Math.max(4, input.rafterSection.h * skala)

  return (
    <svg className="rysunek" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Przekrój więźby">
      {/* mury pod murłatami */}
      <rect x={xL - 26} y={yL} width={26} height={44} className="mur" />
      <rect x={xR} y={yR} width={26} height={44} className="mur" />

      {/* murłaty */}
      <rect x={xL - 13} y={yL - 13} width={26} height={13} className="drewno" />
      <rect x={xR - 13} y={yR - 13} width={26} height={13} className="drewno" />

      {/* krokwie wraz z okapem */}
      <g className="drewno" strokeLinejoin="round">
        <line
          x1={xL - okapDX}
          y1={yL + okapDY}
          x2={xK}
          y2={yK}
          strokeWidth={grubosc}
          stroke="var(--akcent)"
          opacity={0.85}
        />
        {!isShed && (
          <line
            x1={xR + okapDX}
            y1={yR + okapDY}
            x2={xK}
            y2={yK}
            strokeWidth={grubosc}
            stroke="var(--akcent)"
            opacity={0.85}
          />
        )}
      </g>

      {/* jętka */}
      {collar?.valid && (
        <JetkaNaRysunku collar={collar} input={input} pkt={pkt} skala={skala} />
      )}

      {/* punkt styku krokwi */}
      {splice.active && (
        <StykNaRysunku input={input} pkt={pkt} isShed={isShed} />
      )}

      {/* oś kalenicy */}
      <line x1={xK} y1={yK - 24} x2={xK} y2={baseY + 24} className="os" />

      {/* wymiar rozpiętości */}
      <WymiarPoziomy
        x1={xL}
        x2={isShed ? xR : xK}
        y={baseY + 34}
        etykieta={dl(isShed ? span : span / 2)}
      />
      {!isShed && (
        <WymiarPoziomy x1={xK} x2={xR} y={baseY + 34} etykieta={dl(span / 2)} />
      )}

      {/* wymiar wysokości kalenicy */}
      <WymiarPionowy
        x={isShed ? xR + 44 : xK + 8}
        y1={baseY}
        y2={yK}
        etykieta={dl(rise)}
        przesunTekst={isShed ? 0 : 14}
      />

      {/* kąt nachylenia */}
      <path
        d={`M ${xL + 52} ${baseY} A 52 52 0 0 0 ${xL + 52 * Math.cos(a)} ${baseY - 52 * Math.sin(a)}`}
        className="wymiar"
      />
      <text x={xL + 60} y={baseY - 14} className="podpis">
        {stopnie(input.pitchDeg)}
      </text>

      {/* opis krokwi wzdłuż połaci */}
      <text
        x={(xL - okapDX + xK) / 2}
        y={(yL + okapDY + yK) / 2 - 16}
        className="podpis"
        textAnchor="middle"
        transform={`rotate(${-input.pitchDeg} ${(xL - okapDX + xK) / 2} ${(yL + okapDY + yK) / 2 - 16})`}
      >
        krokiew {dl(slope.rafterTotal)}
      </text>

      {/* opis okapu */}
      {eaves > 0 && (
        <text x={xL - okapDX} y={baseY + 58} textAnchor="start">
          okap {dl(eaves)}
        </text>
      )}
    </svg>
  )
}

/** Jętka narysowana między krokwiami. */
function JetkaNaRysunku({
  collar,
  input,
  pkt,
  skala,
}: {
  collar: CollarGeometry
  input: RoofInput
  pkt: (x: number, y: number) => [number, number]
  skala: number
}) {
  const lewa = (input.span - collar.span) / 2
  const [x1, y1] = pkt(lewa, collar.height)
  const [x2] = pkt(lewa + collar.span, collar.height)
  const grubosc = Math.max(3, input.collarSection.h * skala)
  const { dl } = useDlugosc()
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke="var(--akcent)" strokeWidth={grubosc} opacity={0.85} />
      <text x={(x1 + x2) / 2} y={y1 - 10} textAnchor="middle" className="podpis">
        jętka {dl(collar.length)}
      </text>
    </g>
  )
}

/** Zaznaczenie miejsca, w którym krokiew jest łączona. */
function StykNaRysunku({
  input,
  pkt,
  isShed,
}: {
  input: RoofInput
  pkt: (x: number, y: number) => [number, number]
  isShed: boolean
}) {
  const a = deg2rad(input.pitchDeg)
  const x = input.splice.atRun
  const y = x * Math.tan(a)
  const punkty: Array<[number, number]> = [pkt(x, y)]
  if (!isShed) punkty.push(pkt(input.span - x, y))

  return (
    <g>
      {punkty.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r={7} fill="none" stroke="var(--ostrzezenie)" strokeWidth={2.5} />
          <line x1={px} y1={py} x2={px} y2={py + 40} className="wymiar" stroke="var(--ostrzezenie)" />
        </g>
      ))}
      <text
        x={punkty[0][0]}
        y={punkty[0][1] + 56}
        textAnchor="middle"
        className="podpis"
        fill="var(--ostrzezenie)"
      >
        styk nad podporą
      </text>
    </g>
  )
}

/** Zacios krokwi na murłacie, w powiększeniu. */
export function RysunekZaciosu({
  input,
  notch,
}: {
  input: RoofInput
  notch: Notch
}) {
  const W = 460
  const H = 320
  const a = deg2rad(input.pitchDeg)
  const sin = Math.sin(a)
  const cos = Math.cos(a)

  const plateB = input.wallPlateSection.b
  const plateH = input.wallPlateSection.h
  const rafterH = input.rafterSection.h
  const depth = input.notchDepth

  // Skala dobrana do murłaty i krokwi razem, z zapasem na opisy.
  const zasieg = Math.max(plateB * 2.4, rafterH * 3)
  const skala = Math.min((W - 150) / zasieg, (H - 120) / (plateH + rafterH * 2.2))
  const ox = 90
  const oy = H - 90
  const pkt = (xmm: number, ymm: number): [number, number] => [ox + xmm * skala, oy - ymm * skala]

  // Naroże oparcia to zewnętrzny górny róg murłaty.
  const [nx, ny] = pkt(0, plateH)

  // Linia dolnej krawędzi krokwi biegnie o `depth` poniżej naroża, prostopadle do krokwi.
  const seat = notch.seatLength
  const heel = notch.heelHeight
  const [ax, ay] = pkt(seat, plateH) // koniec siodła
  const [bx, by] = pkt(0, plateH - heel) // dół pięty

  // Kierunki wzdłuż i w poprzek krokwi, w pikselach.
  const ux = cos * skala
  const uy = -sin * skala
  const nX = sin * skala
  const nY = cos * skala

  const przodDl = 620 // ile milimetrów krokwi pokazujemy w górę
  const tylDl = 260 // i ile w dół, w stronę okapu

  const kontur = [
    // dolna krawędź od strony okapu do pięty
    [bx - (ux * tylDl) / skala, by - (uy * tylDl) / skala],
    [bx, by],
    [nx, ny], // pięta w górę do naroża
    [ax, ay], // siodło w prawo
    [ax + (ux * przodDl) / skala, ay + (uy * przodDl) / skala], // dalej w górę połaci
    // górna krawędź, z powrotem
    [
      ax + (ux * przodDl) / skala - (nX * rafterH) / skala,
      ay + (uy * przodDl) / skala - (nY * rafterH) / skala,
    ],
    [
      bx - (ux * tylDl) / skala - (nX * rafterH) / skala,
      by - (uy * tylDl) / skala - (nY * rafterH) / skala,
    ],
  ]

  return (
    <svg className="rysunek" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Zacios na murłacie">
      {/* mur */}
      <rect x={pkt(0, 0)[0]} y={pkt(0, 0)[1]} width={plateB * skala} height={46} className="mur" />

      {/* murłata */}
      <rect
        x={pkt(0, plateH)[0]}
        y={pkt(0, plateH)[1]}
        width={plateB * skala}
        height={plateH * skala}
        className="drewno"
      />

      {/* krokiew z wycięciem */}
      <polygon
        points={kontur.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="var(--akcent-jasny)"
        stroke="var(--akcent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* podświetlenie płaszczyzn zaciosu */}
      <line x1={nx} y1={ny} x2={ax} y2={ay} stroke="var(--ostrzezenie)" strokeWidth={3} />
      <line x1={nx} y1={ny} x2={bx} y2={by} stroke="var(--ostrzezenie)" strokeWidth={3} />

      {/* wymiary zaciosu */}
      <text x={ax + 8} y={ay - 8} className="podpis" fill="var(--ostrzezenie)">
        siodło {mm(seat)} mm
      </text>
      <text x={bx - 8} y={by + 16} textAnchor="end" className="podpis" fill="var(--ostrzezenie)">
        pięta {mm(heel)} mm
      </text>

      {/* głębokość zaciosu, mierzona prostopadle do krokwi */}
      <text x={nx + 16} y={ny + 34} className="podpis">
        zacios {mm(depth)} mm
      </text>

      <text x={pkt(plateB / 2, 0)[0]} y={oy + 40} textAnchor="middle">
        murłata {mm(plateB)} × {mm(plateH)} mm
      </text>
      <text x={W - 12} y={22} textAnchor="end">
        krokiew {mm(input.rafterSection.b)} × {mm(rafterH)} mm
      </text>
      <text x={W - 12} y={40} textAnchor="end">
        nachylenie {stopnie(input.pitchDeg)}
      </text>
    </svg>
  )
}

/** Pozioma linia wymiarowa ze strzałkami i opisem. */
function WymiarPoziomy({
  x1,
  x2,
  y,
  etykieta,
}: {
  x1: number
  x2: number
  y: number
  etykieta: string
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} className="wymiar" />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} className="wymiar" />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} className="wymiar" />
      <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" className="podpis">
        {etykieta}
      </text>
    </g>
  )
}

/** Pionowa linia wymiarowa ze strzałkami i opisem. */
function WymiarPionowy({
  x,
  y1,
  y2,
  etykieta,
  przesunTekst = 0,
}: {
  x: number
  y1: number
  y2: number
  etykieta: string
  przesunTekst?: number
}) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} className="wymiar" />
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} className="wymiar" />
      <line x1={x - 5} y1={y2} x2={x + 5} y2={y2} className="wymiar" />
      <text
        x={x + 8 + przesunTekst}
        y={(y1 + y2) / 2}
        className="podpis"
        dominantBaseline="middle"
      >
        {etykieta}
      </text>
    </g>
  )
}
