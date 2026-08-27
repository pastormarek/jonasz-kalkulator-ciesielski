/**
 * Rzut dachu z góry — kartka do zabrania na budowę.
 *
 * DLACZEGO WŁAŚNIE TEN RYSUNEK
 * ----------------------------
 * Cieśla prosił o „projekt 2D z wymiarowaniem, w wersji do druku na budowę",
 * a zapytany wprost, co ma być na takiej kartce, odpowiedział krótko: „rzut
 * z góry z wymiarami, rozstawami krokwi". Nie przekrój, nie detal zaciosu,
 * nie tabela — rzut z góry.
 *
 * Rysunek pokazuje więc to, po czym rozmierza się dach sznurem: obrys
 * z okapami, murłaty, każdą krokiew w jej rzeczywistym rozstawie, kalenicę,
 * a przy kopercie naroża i kulawki. Wszystkie liczby pochodzą z tych samych
 * obliczeń, co zestawienie materiału.
 *
 * FORMAT
 * ------
 * „Oba do wyboru. Większość wybierze A4." — stąd przełącznik i A4 jako
 * wartość domyślna. Rysunek idzie w poziomie, bo dach jest szerszy niż
 * głębszy i tak mieści się większy.
 */

import { useState } from 'react'
import type { Calculation } from '../core/materials'
import { deg2rad } from '../core/geometry'
import { Karta } from './controls'
import { liczba } from './format'
import { useDlugosc } from './units'

export type FormatWydruku = 'A4' | 'A3'

export function KartaRzutuZGory({ wynik }: { wynik: Calculation }) {
  const [format, setFormat] = useState<FormatWydruku>('A4')

  return (
    <Karta
      tytul="Rzut z góry — do wydruku"
      podtytul="Rozstaw krokwi i wymiary obrysu. To ta kartka jedzie na budowę."
      pelna
    >
      {/* Rozmiar strony ustawiamy z poziomu komponentu, bo zależy od wyboru. */}
      <style>{`@page { size: ${format} landscape; margin: 12mm; }`}</style>

      <div className="rzad bez-druku" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
          Format kartki:
        </span>
        {(['A4', 'A3'] as FormatWydruku[]).map((f) => (
          <button
            key={f}
            type="button"
            className={format === f ? 'przycisk glowny' : 'przycisk'}
            aria-pressed={format === f}
            onClick={() => setFormat(f)}
            style={{ minWidth: 64, justifyContent: 'center' }}
          >
            {f}
          </button>
        ))}
        <button type="button" className="przycisk" onClick={() => window.print()}>
          Drukuj
        </button>
      </div>

      <RzutZGory wynik={wynik} />

      <p className="podpowiedz" style={{ marginTop: 10 }}>
        Rozstaw krokwi jest wyliczony tak, żeby nie przekroczyć zadanego maksimum
        i żeby wszystkie pola wyszły równe. Skrajne krokwie licują z krawędziami
        ścian szczytowych, więc ich osie są cofnięte o pół grubości krokwi.
      </p>
    </Karta>
  )
}

export function RzutZGory({ wynik }: { wynik: Calculation }) {
  const { dl } = useDlugosc()
  const { input, layout, hip } = wynik

  const isHip = input.shape === 'hip'
  const isShed = input.shape === 'shed'
  const wysunięcieSzczytu = isHip ? input.eaves : input.gableOverhang

  // Obrys pokrycia w rzucie: budynek plus okapy dookoła.
  const obrysX = input.length + 2 * wysunięcieSzczytu
  const obrysY = input.span + 2 * input.eaves

  const W = 900
  const marginX = 96
  const marginGora = 54
  const marginDol = 92
  const skala = Math.min(
    (W - 2 * marginX) / Math.max(obrysX, 1),
    // Wysokość kadru dobieramy do rysunku, więc ograniczamy tylko proporcję.
    (W * 0.62 - marginGora - marginDol) / Math.max(obrysY, 1),
  )
  const H = obrysY * skala + marginGora + marginDol

  // Układ współrzędnych: x wzdłuż kalenicy, y w poprzek. Zero w narożu
  // budynku, czyli tam, gdzie leży murłata — nie na krawędzi okapu.
  const px = (x: number) => marginX + (x + wysunięcieSzczytu) * skala
  const py = (y: number) => marginGora + (y + input.eaves) * skala

  const kalenicaY = isShed ? 0 : input.span / 2
  const halfSpan = input.span / 2

  // Krokwie w rzeczywistym rozstawie — tak jak rozłożył je rdzeń.
  const osie: number[] = []
  for (let i = 0; i < layout.countPerSlope; i++) {
    osie.push(input.rafterSection.b / 2 + i * layout.spacing)
  }
  // Przy kopercie krokwie zwykłe stoją tylko pod kalenicą; resztę wypełniają
  // kulawki opierające się o krożyny.
  const zwykle = isHip ? osie.filter((x) => x >= halfSpan && x <= input.length - halfSpan) : osie

  return (
    <svg className="rysunek" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rzut dachu z góry">
      {/* --- obrys pokrycia --- */}
      <rect
        x={px(-wysunięcieSzczytu)}
        y={py(-input.eaves)}
        width={obrysX * skala}
        height={obrysY * skala}
        className="beton"
      />

      {/* --- murłaty --- */}
      {(isShed ? [0] : [0, input.span]).map((y) => (
        <line key={y} x1={px(0)} y1={py(y)} x2={px(input.length)} y2={py(y)} className="drewno" />
      ))}

      {/* --- krokwie zwykłe: od końca okapu przez kalenicę po drugi okap --- */}
      {zwykle.map((x) => (
        <line
          key={`k${x}`}
          x1={px(x)}
          y1={py(-input.eaves)}
          x2={px(x)}
          y2={py(input.span + input.eaves)}
          className="rzut-krokiew"
        />
      ))}

      {/* --- kalenica --- */}
      {!isShed && (
        <line
          x1={px(isHip ? halfSpan : -wysunięcieSzczytu)}
          y1={py(kalenicaY)}
          x2={px(isHip ? input.length - halfSpan : input.length + wysunięcieSzczytu)}
          y2={py(kalenicaY)}
          className="rzut-kalenica"
        />
      )}

      {/* --- naroża i kulawki koperty --- */}
      {isHip && hip && (
        <>
          {[
            [px(-input.eaves), py(-input.eaves), px(halfSpan), py(halfSpan)],
            [px(-input.eaves), py(input.span + input.eaves), px(halfSpan), py(halfSpan)],
            [
              px(input.length + input.eaves),
              py(-input.eaves),
              px(input.length - halfSpan),
              py(halfSpan),
            ],
            [
              px(input.length + input.eaves),
              py(input.span + input.eaves),
              px(input.length - halfSpan),
              py(halfSpan),
            ],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={`n${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="rzut-krozyna" />
          ))}
          {kulawkiKoperty(input.length, input.span, layout.spacing, input.eaves).map(([x1, y1, x2, y2], i) => (
            <line
              key={`ku${i}`}
              x1={px(x1)}
              y1={py(y1)}
              x2={px(x2)}
              y2={py(y2)}
              className="rzut-kulawka"
            />
          ))}
        </>
      )}

      {/* --- otwory w połaci --- */}
      {input.openings.map((o) => {
        const wzdluzSpadku = o.height * Math.cos(deg2rad(input.pitchDeg))
        const yOtworu = o.slope === 'A' ? input.eaves / 2 : input.span - input.eaves / 2 - wzdluzSpadku
        return (
          <g key={o.id}>
            <rect
              x={px(o.offsetAlong)}
              y={py(Math.max(0, yOtworu))}
              width={o.width * skala}
              height={wzdluzSpadku * skala}
              className="rzut-otwor"
            />
            <text
              x={px(o.offsetAlong) + (o.width * skala) / 2}
              y={py(Math.max(0, yOtworu)) + (wzdluzSpadku * skala) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="podpis"
            >
              {o.kind === 'komin' ? 'komin' : 'okno'}
            </text>
          </g>
        )
      })}

      {/* --- wymiar rozstawu krokwi: między dwiema pierwszymi osiami --- */}
      {zwykle.length > 1 && (
        <WymiarPoziomy
          x1={px(zwykle[0])}
          x2={px(zwykle[1])}
          y={py(kalenicaY) - 16}
          etykieta={dl(layout.spacing)}
        />
      )}

      {/* --- wymiary obrysu --- */}
      <WymiarPoziomy
        x1={px(0)}
        x2={px(input.length)}
        y={py(input.span + input.eaves) + 34}
        etykieta={`długość ${dl(input.length)}`}
      />
      <WymiarPionowy
        x={px(-wysunięcieSzczytu) - 30}
        y1={py(0)}
        y2={py(input.span)}
        etykieta={`rozpiętość ${dl(input.span)}`}
      />
      <WymiarPionowy
        x={px(input.length + wysunięcieSzczytu) + 30}
        y1={py(-input.eaves)}
        y2={py(0)}
        etykieta={`okap ${dl(input.eaves)}`}
      />

      <text x={marginX} y={H - 30} className="podpis">
        {liczba(layout.countPerSlope)} krokwi na połaci, rozstaw {dl(layout.spacing)} w osiach,
        prześwit {dl(layout.clear)}
      </text>
      <text x={marginX} y={H - 12} className="rzut-stopka">
        Wymiary w rzucie poziomym. Długości krokwi mierzone po połaci są w zestawieniu materiału.
      </text>
    </svg>
  )
}

/**
 * Kulawki koperty w rzucie: od murłaty do krożyny.
 *
 * Krożyna biegnie w rzucie pod 45°, więc kulawka postawiona w odległości `t`
 * od naroża kończy się dokładnie na `t` — ta sama zależność, po której model
 * przestrzenny układa je w przestrzeni.
 */
function kulawkiKoperty(
  dlugosc: number,
  span: number,
  spacing: number,
  eaves: number,
): Array<[number, number, number, number]> {
  const halfSpan = span / 2
  const linie: Array<[number, number, number, number]> = []
  for (let i = 1; i * spacing < halfSpan; i++) {
    const t = i * spacing
    // Połacie wzdłużne: kulawki przy obu narożach, po obu stronach dachu.
    // Zaczynają się na końcu okapu, tak jak krokwie zwykłe.
    for (const x of [t, dlugosc - t]) {
      linie.push([x, -eaves, x, t])
      linie.push([x, span + eaves, x, span - t])
    }
    // Skosy szczytowe: kulawki biegnące w poprzek.
    for (const y of [t, span - t]) {
      linie.push([-eaves, y, t, y])
      linie.push([dlugosc + eaves, y, dlugosc - t, y])
    }
  }
  return linie
}

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
      <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" className="podpis">
        {etykieta}
      </text>
    </g>
  )
}

function WymiarPionowy({
  x,
  y1,
  y2,
  etykieta,
}: {
  x: number
  y1: number
  y2: number
  etykieta: string
}) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} className="wymiar" />
      <line x1={x - 5} y1={y1} x2={x + 5} y2={y1} className="wymiar" />
      <line x1={x - 5} y1={y2} x2={x + 5} y2={y2} className="wymiar" />
      <text
        x={x}
        y={(y1 + y2) / 2}
        textAnchor="middle"
        className="podpis"
        transform={`rotate(-90 ${x} ${(y1 + y2) / 2})`}
        dy={-8}
      >
        {etykieta}
      </text>
    </g>
  )
}
