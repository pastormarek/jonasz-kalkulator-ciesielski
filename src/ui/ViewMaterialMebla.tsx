/**
 * Zestawienie materiału mebla — lista zakupów na kartkę do składu.
 *
 * Ta sama zasada co przy dachu i wiacie: osobno ZAPOTRZEBOWANIE, czyli ile
 * drewna wchodzi w mebel, i osobno ZAKUP, czyli ile trzeba kupić, bo desek
 * nie sprzedają na centymetry. Różnica jest tu jednak większa niż na budowie:
 * mebel to dużo krótkich elementów, więc z jednej deski schodzi ich kilka,
 * a odpad zależy głównie od tego, jak sprytnie ułoży się plan cięcia.
 *
 * Tarcicę meblową liczymy dodatkowo w METRACH BIEŻĄCYCH, bo tak jest wyceniana
 * w markecie: deska 20 × 140 kosztuje tyle a tyle za metr, nie za m³.
 */

import type { FurnitureCalculation } from '../core/furnitureMaterials'
import { GATUNEK_INFO, WYKONCZENIE_INFO } from '../core/furniture'
import { Karta, Wynik, Komunikat } from './controls'
import { GrupaDrewna } from './ViewMaterial'
import { liczba, odmiana } from './format'
import { belka } from './units'

export function ViewMaterialMebla({ wynik }: { wynik: FurnitureCalculation }) {
  const odpadM3 = wynik.purchaseVolumeM3 - wynik.totalVolumeM3
  const odpadPct = wynik.purchaseVolumeM3 > 0 ? (odpadM3 / wynik.purchaseVolumeM3) * 100 : 0
  const sztukRazem = wynik.groups.reduce(
    (s, g) => s + g.plan.purchase.reduce((n, p) => n + p.count, 0),
    0,
  )
  const gatunek = GATUNEK_INFO[wynik.input.gatunek]
  const wykonczenie = WYKONCZENIE_INFO[wynik.input.wykonczenie]

  return (
    <div>
      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta="Tarcica do kupienia"
          wartosc={liczba(wynik.metryBiezace, 1)}
          jednostka="mb"
          opis={`${liczba(sztukRazem)} ${odmiana(sztukRazem, 'sztuka', 'sztuki', 'sztuk')}, ${liczba(wynik.purchaseVolumeM3, 3)} m³`}
          wyrozniony
        />
        <Wynik
          etykieta="Wchodzi w mebel"
          wartosc={liczba(wynik.totalVolumeM3, 3)}
          jednostka="m³"
          opis={`odpad z rozkroju ${liczba(odpadPct, 0)}%`}
        />
        <Wynik
          etykieta={wykonczenie.label}
          wartosc={wynik.wykonczenieLitry > 0 ? liczba(wynik.wykonczenieLitry, 1) : '—'}
          jednostka={wynik.wykonczenieLitry > 0 ? 'l' : undefined}
          opis={
            wynik.wykonczenieLitry > 0
              ? `${wykonczenie.warstwy} ${odmiana(wykonczenie.warstwy, 'warstwa', 'warstwy', 'warstw')} na ${liczba(wynik.powierzchniaM2, 1)} m²`
              : 'drewno zostaje surowe'
          }
        />
        <Wynik
          etykieta="Masa mebla"
          wartosc={liczba(wynik.masaKg, 0)}
          jednostka="kg"
          opis={`${gatunek.label}, ${liczba(gatunek.gestosc)} kg/m³`}
        />
      </div>

      {wynik.warnings.map((w, i) => (
        <Komunikat key={i} rodzaj="blad">
          {w}
        </Komunikat>
      ))}

      <Karta
        tytul="Lista zakupów — drewno"
        podtytul={
          wynik.input.stockMode === 'handlowe'
            ? 'Tyle sztuk weź z półki. Długości typowe dla tarcicy meblowej.'
            : 'Tyle sztuk zamów w tartaku, docięte na te długości.'
        }
      >
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Przekrój</th>
                <th>Długość</th>
                <th className="liczba">Sztuk</th>
                <th className="liczba">Metrów</th>
              </tr>
            </thead>
            <tbody>
              {wynik.groups.flatMap((g) =>
                g.plan.purchase.map((p) => (
                  <tr key={`${g.label}-${p.length}`}>
                    <td>{g.label}</td>
                    <td>{belka(p.length)}</td>
                    <td className="liczba">
                      <strong>{liczba(p.count)}</strong>
                    </td>
                    <td className="liczba">{liczba((p.length / 1000) * p.count, 1)} mb</td>
                  </tr>
                )),
              )}
              <tr className="suma">
                <td colSpan={2}>Razem</td>
                <td className="liczba">{liczba(sztukRazem)}</td>
                <td className="liczba">{liczba(wynik.metryBiezace, 1)} mb</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="podpowiedz" style={{ marginTop: 8 }}>
          Kupuj z niewielkim zapasem, szczególnie deski widoczne. W paczce z marketu
          zawsze trafia się sztuka skrzywiona albo z sękiem dokładnie tam, gdzie
          wypada cięcie.
        </p>
      </Karta>

      {(wynik.fasteners.length > 0 || wynik.laczniki.length > 0) && (
        <Karta tytul="Lista zakupów — reszta" podtytul="Wkręty, okucia i wykończenie.">
          <div className="tabela-otoczka">
            <table>
              <thead>
                <tr>
                  <th>Pozycja</th>
                  <th className="liczba">Ilość</th>
                </tr>
              </thead>
              <tbody>
                {wynik.fasteners.map((f, i) => (
                  <tr key={`w${i}`}>
                    <td>
                      {f.name}
                      {f.note && <small>{f.note}</small>}
                    </td>
                    <td className="liczba">
                      <strong>{liczba(f.count)}</strong> {f.unit}
                    </td>
                  </tr>
                ))}
                {wynik.laczniki.map((l, i) => (
                  <tr key={`l${i}`}>
                    <td>
                      {l.nazwa}
                      {l.uwaga && <small>{l.uwaga}</small>}
                    </td>
                    <td className="liczba">
                      <strong>{liczba(l.sztuk)}</strong> {l.jednostka ?? 'szt.'}
                    </td>
                  </tr>
                ))}
                {wynik.wykonczenieLitry > 0 && (
                  <tr>
                    <td>
                      {wykonczenie.label}
                      <small>{wykonczenie.warstwy} warstwy, z zapasem na krawędzie</small>
                    </td>
                    <td className="liczba">
                      <strong>{liczba(Math.ceil(wynik.wykonczenieLitry * 2) / 2, 1)}</strong> l
                    </td>
                  </tr>
                )}
                <tr>
                  <td>
                    Papier ścierny
                    <small>gradacja 80 i 120, po arkuszu na każdy metr kwadratowy</small>
                  </td>
                  <td className="liczba">
                    <strong>{Math.max(4, Math.ceil(wynik.powierzchniaM2))}</strong> ark.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Karta>
      )}

      <Karta
        tytul="Plan cięcia"
        podtytul="Co z której deski wyciąć, żeby zostało jak najmniej odpadu."
      >
        {wynik.groups.map((g) => (
          <GrupaDrewna key={g.label} grupa={g} />
        ))}
        <p className="podpowiedz">
          Plan układa najdłuższe elementy pierwsze, bo one są najtrudniejsze do
          upchnięcia. Nie jest matematycznie optymalny, ale wypada blisko — i da się
          go przeczytać przy pilarce.
        </p>
      </Karta>

      {wynik.notes.length > 0 && (
        <Karta tytul="Uwagi do materiału" pelna>
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
