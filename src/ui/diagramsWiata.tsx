/**
 * Rysunki wiaty: przekrój poprzeczny i rzut z góry.
 *
 * Tak jak przy dachu, wszystkie wymiary pochodzą wprost z obliczeń — rysunek
 * nie jest osobną wersją prawdy. Liczymy w milimetrach z osią Y skierowaną do
 * góry, a funkcja `pkt` odwraca ją na układ SVG.
 */

import type { ShelterCalculation } from '../core/shelterMaterials'
import { deg2rad } from '../core/geometry'
import { useDlugosc } from './units'
import { WymiarPoziomy, WymiarPionowy } from './diagrams'
import { stopnie } from './format'

/** Przekrój poprzeczny wiaty ze słupami, oczepami i fundamentem. */
export function RysunekPrzekrojuWiaty({ wynik }: { wynik: ShelterCalculation }) {
  const { dl } = useDlugosc()
  const { input, geom } = wynik

  const dwuspadowy = geom.slopes === 2
  const przyscienne = input.kind === 'zadaszenie'
  const a = deg2rad(input.pitchDeg)
  const tan = Math.tan(a)

  const W = 720
  const H = 460
  const marginX = 90
  const marginTop = 46
  const marginBottom = 64

  const szerokoscRys = geom.roofWidth
  const wysokoscRys = geom.topHeight + input.footingDepth
  const skala = Math.min(
    (W - 2 * marginX) / Math.max(szerokoscRys, 1),
    (H - marginTop - marginBottom) / Math.max(wysokoscRys, 1),
  )

  // Poziom posadzki wypada tak, żeby zmieściła się jeszcze stopa pod nim.
  const poziomY = H - marginBottom - input.footingDepth * skala
  const lewyX = (W - szerokoscRys * skala) / 2 + input.eavesFront * skala
  const pkt = (xmm: number, ymm: number): [number, number] => [
    lewyX + xmm * skala,
    poziomY - ymm * skala,
  ]

  const szer = input.width
  const oczepGora = input.clearHeight + input.beamSection.h
  /** Wysokość linii połaci w danym miejscu przekroju. */
  const zPolaci = (y: number): number =>
    dwuspadowy ? oczepGora + (geom.run - Math.abs(y - szer / 2)) * tan : oczepGora + y * tan

  const grubosc = Math.max(3, input.rafterSection.h * skala)
  const slupSzer = Math.max(4, input.postSection.b * skala)
  const oczepSzer = Math.max(4, input.beamSection.b * skala)
  const oczepWys = Math.max(4, input.beamSection.h * skala)

  const rzedy = przyscienne ? [0] : [0, szer]
  const wysokoscSlupa = (y: number) => (y === 0 ? geom.lowPostHeight : geom.highPostHeight)

  // Krokiew rysujemy jako grubą linię wzdłuż połaci, z okapem po obu stronach.
  const krokwie: Array<[[number, number], [number, number]]> = dwuspadowy
    ? [
        [pkt(-input.eavesFront, zPolaci(-input.eavesFront)), pkt(szer / 2, zPolaci(szer / 2))],
        [
          pkt(szer + input.eavesFront, zPolaci(szer + input.eavesFront)),
          pkt(szer / 2, zPolaci(szer / 2)),
        ],
      ]
    : [
        [
          pkt(-input.eavesFront, zPolaci(-input.eavesFront)),
          pkt(szer + input.eavesFront, zPolaci(szer + input.eavesFront)),
        ],
      ]

  const [xLewy] = pkt(0, 0)
  const [xPrawy] = pkt(szer, 0)
  const [, yPoziom] = pkt(0, 0)

  return (
    <svg
      className="rysunek"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Przekrój poprzeczny wiaty"
    >
      {/* ściana budynku przy zadaszeniu przyściennym */}
      {przyscienne && (
        <rect
          x={pkt(szer, 0)[0]}
          y={marginTop - 10}
          width={30}
          height={yPoziom - marginTop + 10}
          className="mur"
        />
      )}

      {/* grunt */}
      <line x1={20} y1={yPoziom} x2={W - 20} y2={yPoziom} className="wymiar" strokeWidth={2} />

      {/* stopy fundamentowe */}
      {rzedy.map((y) => {
        const [x] = pkt(y, 0)
        const szerStopy = Math.max(6, input.footingSize * skala)
        return (
          <rect
            key={`stopa-${y}`}
            x={x - szerStopy / 2}
            y={yPoziom}
            width={szerStopy}
            height={input.footingDepth * skala}
            className="beton"
          />
        )
      })}

      {/* słupy */}
      {rzedy.map((y) => {
        const [x] = pkt(y, 0)
        const wys = wysokoscSlupa(y) * skala
        return (
          <rect
            key={`slup-${y}`}
            x={x - slupSzer / 2}
            y={yPoziom - wys}
            width={slupSzer}
            height={wys}
            className="drewno"
          />
        )
      })}

      {/* oczepy, a przy zadaszeniu także belka na ścianie */}
      {[...rzedy, ...(przyscienne ? [szer] : [])].map((y) => {
        const [x] = pkt(y, 0)
        const spod = y === 0 ? geom.lowPostHeight : geom.highPostHeight
        return (
          <rect
            key={`oczep-${y}`}
            x={x - oczepSzer / 2}
            y={yPoziom - (spod + input.beamSection.h) * skala}
            width={oczepSzer}
            height={oczepWys}
            className="drewno"
          />
        )
      })}

      {/* krokwie */}
      <g strokeLinecap="butt">
        {krokwie.map(([od, doPkt], i) => (
          <line
            key={`krokiew-${i}`}
            x1={od[0]}
            y1={od[1] - grubosc / 2}
            x2={doPkt[0]}
            y2={doPkt[1] - grubosc / 2}
            stroke="var(--akcent)"
            strokeWidth={grubosc}
            opacity={0.85}
          />
        ))}
      </g>

      {/* miecze */}
      {input.hasBraces &&
        rzedy.map((y) => {
          const spod = wysokoscSlupa(y)
          const znak = y === 0 ? 1 : -1
          const [x1, y1] = pkt(y, spod - input.braceArm)
          const [x2, y2] = pkt(y + znak * input.braceArm, spod)
          return (
            <line
              key={`miecz-${y}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="drewno"
              strokeWidth={Math.max(3, input.braceSection.b * skala)}
            />
          )
        })}

      {/* oś symetrii wiaty dwuspadowej */}
      {dwuspadowy && (
        <line
          x1={pkt(szer / 2, 0)[0]}
          y1={yPoziom + 12}
          x2={pkt(szer / 2, 0)[0]}
          y2={pkt(szer / 2, zPolaci(szer / 2))[1] - 18}
          className="os"
        />
      )}

      {/* wymiary */}
      <WymiarPoziomy x1={xLewy} x2={xPrawy} y={yPoziom + 34} etykieta={dl(input.width)} />
      <WymiarPionowy
        x={xLewy - 34}
        y1={yPoziom}
        y2={pkt(0, geom.lowPostHeight)[1]}
        etykieta={dl(geom.lowPostHeight)}
        przesunTekst={-72}
      />
      <WymiarPionowy
        x={xPrawy + 40}
        y1={yPoziom}
        y2={pkt(szer, geom.topHeight)[1]}
        etykieta={dl(geom.topHeight)}
      />

      <text x={W / 2} y={marginTop - 20} textAnchor="middle" className="podpis">
        spadek {stopnie(input.pitchDeg)}
      </text>
      <text x={pkt(0, 0)[0]} y={yPoziom + input.footingDepth * skala + 22} textAnchor="middle">
        stopa {dl(input.footingDepth)}
      </text>
    </svg>
  )
}

/** Rzut z góry: siatka słupów i rozkład krokwi. */
export function RysunekRzutuWiaty({ wynik }: { wynik: ShelterCalculation }) {
  const { dl } = useDlugosc()
  const { input, geom, posts, rafters } = wynik
  const przyscienne = input.kind === 'zadaszenie'

  const W = 720
  const H = 420
  const marginX = 80
  const marginY = 64

  const skala = Math.min(
    (W - 2 * marginX) / Math.max(geom.roofLength, 1),
    (H - 2 * marginY) / Math.max(geom.roofWidth, 1),
  )

  const rysX = (W - geom.roofLength * skala) / 2
  const rysY = (H - geom.roofWidth * skala) / 2
  // Współrzędne liczymy w układzie dachu: 0 to koniec okapu.
  const pkt = (dlugoscMm: number, szerokoscMm: number): [number, number] => [
    rysX + dlugoscMm * skala,
    rysY + szerokoscMm * skala,
  ]

  const osieX = Array.from({ length: posts.perRow }, (_, i) => input.eavesSide + i * posts.spacing)
  const rzedyY = (przyscienne ? [0] : [0, input.width]).map((y) => y + input.eavesFront)
  const osKalenicy = input.eavesFront + input.width / 2

  const osieKrokwi = Array.from(
    { length: rafters.countPerSlope },
    (_, i) => input.rafterSection.b / 2 + i * rafters.spacing,
  )

  return (
    <svg className="rysunek" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rzut wiaty z góry">
      {/* obrys dachu */}
      <rect
        x={rysX}
        y={rysY}
        width={geom.roofLength * skala}
        height={geom.roofWidth * skala}
        fill="none"
        className="wymiar"
        strokeDasharray="6 4"
      />

      {/* krokwie */}
      {osieKrokwi.map((x, i) => (
        <line
          key={`krokiew-${i}`}
          x1={pkt(x, 0)[0]}
          y1={pkt(x, 0)[1]}
          x2={pkt(x, geom.roofWidth)[0]}
          y2={pkt(x, geom.roofWidth)[1]}
          stroke="var(--akcent)"
          strokeWidth={Math.max(1.5, input.rafterSection.b * skala)}
          opacity={0.5}
        />
      ))}

      {/* oczepy */}
      {rzedyY.map((y) => (
        <line
          key={`oczep-${y}`}
          x1={pkt(0, y)[0]}
          y1={pkt(0, y)[1]}
          x2={pkt(geom.roofLength, y)[0]}
          y2={pkt(geom.roofLength, y)[1]}
          className="drewno"
          strokeWidth={Math.max(3, input.beamSection.b * skala)}
        />
      ))}

      {/* kalenica */}
      {geom.slopes === 2 && (
        <line
          x1={pkt(0, osKalenicy)[0]}
          y1={pkt(0, osKalenicy)[1]}
          x2={pkt(geom.roofLength, osKalenicy)[0]}
          y2={pkt(geom.roofLength, osKalenicy)[1]}
          className="os"
        />
      )}

      {/* słupy */}
      {rzedyY.map((y) =>
        osieX.map((x) => {
          const [cx, cy] = pkt(x, y)
          const bok = Math.max(6, input.postSection.b * skala)
          return (
            <rect
              key={`slup-${x}-${y}`}
              x={cx - bok / 2}
              y={cy - bok / 2}
              width={bok}
              height={bok}
              className="drewno"
            />
          )
        }),
      )}

      {/* wymiary */}
      <WymiarPoziomy
        x1={pkt(input.eavesSide, 0)[0]}
        x2={pkt(input.eavesSide + input.length, 0)[0]}
        y={rysY - 24}
        etykieta={dl(input.length)}
      />
      {posts.perRow > 1 && (
        <WymiarPoziomy
          x1={pkt(osieX[0], 0)[0]}
          x2={pkt(osieX[1], 0)[0]}
          y={rysY + geom.roofWidth * skala + 34}
          etykieta={`słupy co ${dl(posts.spacing)}`}
        />
      )}
      <WymiarPionowy
        x={rysX - 30}
        y1={pkt(0, input.eavesFront)[1]}
        y2={pkt(0, input.eavesFront + input.width)[1]}
        etykieta={dl(input.width)}
        przesunTekst={-86}
      />
      {osieKrokwi.length > 1 && (
        <text x={W - 24} y={rysY - 24} textAnchor="end">
          krokwie co {dl(rafters.spacing)}
        </text>
      )}
    </svg>
  )
}
