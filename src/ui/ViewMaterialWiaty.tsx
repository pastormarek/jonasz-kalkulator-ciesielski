/**
 * Widok zestawienia materiału wiaty.
 *
 * Ta sama zasada co przy dachu: osobno ZAPOTRZEBOWANIE (ile wchodzi
 * w konstrukcję) i osobno ZAKUP (ile trzeba kupić, bo belek nie sprzedają na
 * centymetry). Do tego dochodzi beton, którego przy dachu nie ma wcale.
 */

import type { ShelterCalculation } from '../core/shelterMaterials'
import { SHELTER_COVERING_INFO } from '../core/shelter'
import { Karta, Wynik, Komunikat } from './controls'
import { GrupaDrewna } from './ViewMaterial'
import { liczba, przekroj, odmiana } from './format'
import { belka } from './units'

export function ViewMaterialWiaty({ wynik }: { wynik: ShelterCalculation }) {
  const { input, footing } = wynik
  const odpadM3 = wynik.purchaseVolumeM3 - wynik.totalVolumeM3
  const odpadPct = wynik.purchaseVolumeM3 > 0 ? (odpadM3 / wynik.purchaseVolumeM3) * 100 : 0
  const pokrycie = SHELTER_COVERING_INFO[input.covering]

  return (
    <div>
      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta="Drewno do kupienia"
          wartosc={liczba(wynik.purchaseVolumeM3, 2)}
          jednostka="m³"
          opis={`w konstrukcję wchodzi ${liczba(wynik.totalVolumeM3, 2)} m³`}
          wyrozniony
        />
        <Wynik
          etykieta="Odpad z rozkroju"
          wartosc={liczba(odpadM3, 2)}
          jednostka="m³"
          opis={`${liczba(odpadPct, 0)}% kupionego drewna`}
        />
        <Wynik
          etykieta="Beton na stopy"
          wartosc={liczba(footing.volumeWithSpareM3, 2)}
          jednostka="m³"
          opis={`${footing.count} ${odmiana(footing.count, 'stopa', 'stopy', 'stóp')}, z 10% zapasu`}
        />
        <Wynik
          etykieta="Impregnat"
          wartosc={wynik.impregnationLitres > 0 ? liczba(wynik.impregnationLitres, 1) : '—'}
          jednostka={wynik.impregnationLitres > 0 ? 'l' : undefined}
          opis={
            wynik.impregnationLitres > 0
              ? 'dwie warstwy, 0,2 l/m² powierzchni drewna'
              : 'zamów drewno już impregnowane ciśnieniowo'
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
                        (g.section.b / 1000) * (g.section.h / 1000) * (p.length / 1000) * p.count,
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

      <Karta tytul="Fundamenty" podtytul="Beton i wykop pod słupami.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Pozycja</th>
                <th className="liczba">Ilość</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Stopa fundamentowa
                  <small>
                    {przekroj(input.footingSize, input.footingSize)}, głębokość{' '}
                    {liczba(input.footingDepth / 1000, 2)} m
                  </small>
                </td>
                <td className="liczba">
                  <strong>{liczba(footing.count)} szt.</strong>
                </td>
              </tr>
              <tr>
                <td>
                  Beton
                  <small>z 10% zapasu na nierówny wykop</small>
                </td>
                <td className="liczba">
                  <strong>{liczba(footing.volumeWithSpareM3, 2)} m³</strong>
                </td>
              </tr>
              <tr>
                <td>
                  Wykop
                  <small>szerszy od stopy o 10 cm z każdej strony</small>
                </td>
                <td className="liczba">
                  <strong>{liczba(footing.excavationM3, 2)} m³</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Karta>

      {wynik.areas.length > 0 && (
        <Karta tytul="Pokrycie i warstwy" podtytul="Liczone w metrach kwadratowych połaci.">
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
                {wynik.areas.map((a) => (
                  <tr key={a.name}>
                    <td>
                      {a.name}
                      {a.note && <small>{a.note}</small>}
                    </td>
                    <td className="liczba">{liczba(a.net, 1)} m²</td>
                    <td className="liczba">
                      <strong>{liczba(a.gross, 1)} m²</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {input.covering !== 'brak' && (
            <p className="podpowiedz" style={{ marginTop: 10 }}>
              {pokrycie.label} waży około {liczba(pokrycie.weightKgM2, 1)} kg/m², więc samo
              pokrycie to {liczba(pokrycie.weightKgM2 * wynik.geom.roofAreaM2, 0)} kg na tej
              wiacie.
            </p>
          )}
        </Karta>
      )}

      <Karta
        tytul="Łączniki, odwodnienie i impregnat"
        podtytul="Drobnica, przez którą wychodzi się ze składu drugi raz."
      >
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

      {wynik.notes.length > 0 && (
        <Karta tytul="Uwagi do zamówienia" podtytul="Warto przeczytać przed telefonem do składu.">
          {wynik.notes.map((n, i) => (
            <Komunikat key={i} rodzaj="info">
              {n}
            </Komunikat>
          ))}
        </Karta>
      )}
    </div>
  )
}
