/**
 * Widok zestawienia materiału — to, co realnie zamawia się w składzie.
 *
 * Rozróżniamy dwie liczby, które łatwo pomylić:
 *  - ZAPOTRZEBOWANIE: ile drewna wchodzi w dach,
 *  - ZAKUP: ile trzeba kupić, bo belek nie da się kupić na centymetry.
 * Różnica między nimi to odpad i właśnie ona kosztuje pieniądze.
 */

import type { Calculation, TimberGroup } from '../core/materials'
import { Karta, Wynik, Komunikat } from './controls'
import { liczba, przekroj, odmiana } from './format'
import { useDlugosc, belka } from './units'

export function ViewMaterial({ wynik }: { wynik: Calculation }) {
  const { input } = wynik
  const odpadM3 = wynik.purchaseVolumeM3 - wynik.totalVolumeM3
  const odpadPct = wynik.purchaseVolumeM3 > 0 ? (odpadM3 / wynik.purchaseVolumeM3) * 100 : 0

  return (
    <div>
      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta="Drewno do kupienia"
          wartosc={liczba(wynik.purchaseVolumeM3, 2)}
          jednostka="m³"
          opis={`w dach wchodzi ${liczba(wynik.totalVolumeM3, 2)} m³`}
          wyrozniony
        />
        <Wynik
          etykieta="Odpad z rozkroju"
          wartosc={liczba(odpadM3, 2)}
          jednostka="m³"
          opis={`${liczba(odpadPct, 0)}% kupionego drewna`}
        />
        <Wynik
          etykieta="Powierzchnia połaci"
          wartosc={liczba(wynik.roofAreaM2, 1)}
          jednostka="m²"
        />
        <Wynik
          etykieta="Impregnat"
          wartosc={wynik.impregnationLitres > 0 ? liczba(wynik.impregnationLitres, 1) : '—'}
          jednostka={wynik.impregnationLitres > 0 ? 'l' : undefined}
          opis={
            wynik.impregnationLitres > 0
              ? 'dwie warstwy, 0,2 l/m² powierzchni drewna'
              : 'zamów drewno już impregnowane'
          }
        />
      </div>

      {wynik.warnings.map((w, i) => (
        <Komunikat key={i} rodzaj="blad">
          {w}
        </Komunikat>
      ))}

      <Karta
        tytul="Drewno konstrukcyjne"
        podtytul={
          input.stockMode === 'handlowe'
            ? 'Belki z półki w składzie, do 6 m.'
            : 'Belki cięte na wymiar w tartaku, do 12 m.'
        }
      >
        {wynik.groups.map((g) => (
          <GrupaDrewna key={g.label} grupa={g} />
        ))}
      </Karta>

      <Karta tytul="Lista zakupów — drewno" podtytul="Tyle sztuk zamów w składzie.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Przekrój</th>
                <th>Długość</th>
                <th className="liczba">Sztuk</th>
                <th className="liczba">Objętość</th>
              </tr>
            </thead>
            <tbody>
              {wynik.groups.flatMap((g) =>
                g.plan.purchase.map((p) => (
                  <tr key={`${g.label}-${p.length}`}>
                    <td>{g.label}</td>
                    <td>{belka(p.length)}</td>
                    <td className="liczba">{liczba(p.count)}</td>
                    <td className="liczba">
                      {liczba(
                        ((g.section.b / 1000) * (g.section.h / 1000) * (p.length / 1000)) * p.count,
                        3,
                      )}{' '}
                      m³
                    </td>
                  </tr>
                )),
              )}
              <tr className="suma">
                <td colSpan={2}>Razem</td>
                <td className="liczba">
                  {liczba(
                    wynik.groups.reduce(
                      (s, g) => s + g.plan.purchase.reduce((n, p) => n + p.count, 0),
                      0,
                    ),
                  )}
                </td>
                <td className="liczba">{liczba(wynik.purchaseVolumeM3, 2)} m³</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Karta>

      <Karta tytul="Łaty, membrana, ocieplenie" podtytul="Warstwy układane na krokwiach.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Pozycja</th>
                <th className="liczba">Netto</th>
                <th className="liczba">Z zapasem</th>
              </tr>
            </thead>
            <tbody>
              {wynik.areas.map((a) => {
                const jednostka = a.name === 'Łaty' || a.name === 'Kontrłaty' ? 'mb' : 'm²'
                return (
                  <tr key={a.name}>
                    <td>
                      {a.name}
                      {a.note && <small>{a.note}</small>}
                    </td>
                    <td className="liczba">
                      {liczba(a.net, 1)} {jednostka}
                    </td>
                    <td className="liczba">
                      <strong>
                        {liczba(a.gross, 1)} {jednostka}
                      </strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="podpowiedz" style={{ marginTop: 10 }}>
          Łaty {przekroj(input.battenSection.b, input.battenSection.h)}, kontrłaty{' '}
          {przekroj(input.counterBattenSection.b, input.counterBattenSection.h)}.
        </p>
      </Karta>

      <Karta tytul="Łączniki i impregnat" podtytul="Drobnica, o której najłatwiej zapomnieć.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Pozycja</th>
                <th className="liczba">Ilość</th>
              </tr>
            </thead>
            <tbody>
              {wynik.fasteners.map((f) => (
                <tr key={f.name}>
                  <td>
                    {f.name}
                    {f.note && <small>{f.note}</small>}
                  </td>
                  <td className="liczba">
                    <strong>
                      {liczba(f.count)} {f.unit}
                    </strong>
                  </td>
                </tr>
              ))}
              {wynik.impregnationLitres > 0 && (
                <tr>
                  <td>
                    Impregnat do drewna
                    <small>dwie warstwy na całej powierzchni drewna</small>
                  </td>
                  <td className="liczba">
                    <strong>{liczba(wynik.impregnationLitres, 1)} l</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Karta>
    </div>
  )
}

/**
 * Jedna grupa drewna: elementy o tym samym przekroju plus plan cięcia.
 * Wspólna dla zestawienia dachu i wiaty — plan cięcia wygląda tak samo.
 */
export function GrupaDrewna({ grupa }: { grupa: TimberGroup }) {
  const { dl } = useDlugosc()
  const sztuk = grupa.items.reduce((s, i) => s + i.count, 0)

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>
        {grupa.label}{' '}
        <span style={{ color: 'var(--tekst-slaby)', fontWeight: 500 }}>
          — {liczba(sztuk)} {odmiana(sztuk, 'element', 'elementy', 'elementów')},{' '}
          {liczba(grupa.volumeM3, 2)} m³
        </span>
      </h3>

      <div className="tabela-otoczka">
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th className="liczba">Długość</th>
              <th className="liczba">Sztuk</th>
            </tr>
          </thead>
          <tbody>
            {grupa.items.map((it, i) => (
              <tr key={i}>
                <td>
                  {it.name}
                  {it.note && <small>{it.note}</small>}
                </td>
                <td className="liczba">{dl(it.length)}</td>
                <td className="liczba">
                  <strong>{liczba(it.count)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--akcent)',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Plan cięcia — {liczba(grupa.plan.bars.length)}{' '}
          {odmiana(grupa.plan.bars.length, 'belka', 'belki', 'belek')}, odpad{' '}
          {liczba(grupa.plan.wastePct, 0)}%
        </summary>
        <div className="tabela-otoczka" style={{ marginTop: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Belka</th>
                <th>Co wyciąć</th>
                <th className="liczba">Zostaje</th>
              </tr>
            </thead>
            <tbody>
              {grupa.plan.bars.map((bar, i) => (
                <tr key={i}>
                  <td>
                    {i + 1}. {belka(bar.stockLength)}
                  </td>
                  <td>{bar.pieces.map((p) => dl(p)).join(' + ')}</td>
                  <td className="liczba">{dl(bar.waste)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {grupa.plan.impossible.length > 0 && (
          <Komunikat rodzaj="blad">
            Nie da się wyciąć: {grupa.plan.impossible.map((p) => dl(p)).join(', ')}.
            Zamów drewno na wymiar albo włącz łączenie krokwi.
          </Komunikat>
        )}
      </details>
    </div>
  )
}
