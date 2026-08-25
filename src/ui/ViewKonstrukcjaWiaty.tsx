/**
 * Widok wyników wiaty: wymiary konstrukcji, rysunki i kąty cięć.
 *
 * To jest ekran, z którym idzie się do drewna. Dlatego najpierw liczby, które
 * trzeba odmierzyć, potem rysunek, na którym widać, gdzie te liczby są, a na
 * końcu ostrzeżenia — bo tych i tak nikt nie czyta, dopóki coś nie zgrzyta.
 */

import type { ShelterCalculation } from '../core/shelterMaterials'
import { SHELTER_KIND_LABELS, SHELTER_COVERING_INFO, POST_BASE_INFO } from '../core/shelter'
import { Karta, Wynik, Komunikat, Wzor } from './controls'
import { RysunekPrzekrojuWiaty, RysunekRzutuWiaty } from './diagramsWiata'
import { liczba, przekroj, stopnie, odmiana } from './format'
import { useDlugosc } from './units'

export function ViewKonstrukcjaWiaty({
  wynik,
  wyjasnienia,
}: {
  wynik: ShelterCalculation
  wyjasnienia: boolean
}) {
  const { dl, rozbita } = useDlugosc()
  const { input, geom, posts, rafters, brace, footing, gutter } = wynik
  const pokrycie = SHELTER_COVERING_INFO[input.covering]
  const dwuspadowy = geom.slopes === 2
  const pergola = input.kind === 'pergola'

  const wSwietle = rozbita(geom.lowPostHeight)
  const wysokosc = rozbita(geom.topHeight)
  const krokiew = rozbita(geom.rafterLength)

  return (
    <div>
      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta={pergola ? 'Belka poprzeczna' : 'Długość krokwi'}
          wartosc={krokiew.wartosc}
          jednostka={krokiew.jednostka}
          opis={`${rafters.countPerSlope * geom.slopes} szt., rozstaw ${dl(rafters.spacing)}`}
          wyrozniony
        />
        <Wynik
          etykieta="Wysokość w świetle"
          wartosc={wSwietle.wartosc}
          jednostka={wSwietle.jednostka}
          opis={`pod okapem ${dl(geom.eavesClearHeight)}`}
        />
        <Wynik
          etykieta="Wysokość całkowita"
          wartosc={wysokosc.wartosc}
          jednostka={wysokosc.jednostka}
          opis="od posadzki do wierzchu połaci"
        />
        <Wynik
          etykieta="Słupy"
          wartosc={liczba(posts.total)}
          jednostka="szt."
          opis={`${posts.rows} ${odmiana(posts.rows, 'rząd', 'rzędy', 'rzędów')} po ${posts.perRow}, co ${dl(posts.spacing)}`}
        />
        <Wynik
          etykieta="Powierzchnia dachu"
          wartosc={liczba(geom.roofAreaM2, 1)}
          jednostka="m²"
          opis={`w rzucie ${liczba(geom.planAreaM2, 1)} m²`}
        />
        <Wynik
          etykieta="Beton na stopy"
          wartosc={liczba(footing.volumeWithSpareM3, 2)}
          jednostka="m³"
          opis={`${footing.count} ${odmiana(footing.count, 'stopa', 'stopy', 'stóp')} po ${liczba(footing.volumeEachM3, 3)} m³`}
        />
      </div>

      {wynik.warnings.map((w, i) => (
        <Komunikat key={`w${i}`} rodzaj="blad">
          {w}
        </Komunikat>
      ))}

      <Karta tytul="Przekrój poprzeczny" podtytul="Widok w poprzek: słupy, oczepy i połać." pelna>
        <RysunekPrzekrojuWiaty wynik={wynik} />
        <div className="podpowiedz" style={{ marginTop: 8 }}>
          {SHELTER_KIND_LABELS[input.kind].label} ·{' '}
          {dwuspadowy ? 'dwie połacie' : 'jedna połać'} · spadek {stopnie(input.pitchDeg)} ·{' '}
          {pokrycie.label.toLowerCase()}
        </div>
      </Karta>

      <Karta tytul="Rzut z góry" podtytul="Rozstaw słupów i rozkład krokwi." pelna>
        <RysunekRzutuWiaty wynik={wynik} />
      </Karta>

      <Karta tytul="Wymiary do odmierzenia" podtytul="Te liczby idą na drewno.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Element</th>
                <th className="liczba">Wymiar</th>
                <th>Uwaga</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Słup {dwuspadowy || input.kind === 'zadaszenie' ? '' : 'niski'}</td>
                <td className="liczba">{dl(geom.lowPostHeight)}</td>
                <td>
                  <small>od posadzki do spodu oczepu</small>
                </td>
              </tr>
              {!dwuspadowy && input.kind !== 'zadaszenie' && (
                <tr>
                  <td>Słup wysoki</td>
                  <td className="liczba">{dl(geom.highPostHeight)}</td>
                  <td>
                    <small>
                      o {dl(geom.highPostHeight - geom.lowPostHeight)} dłuższy od niskiego
                    </small>
                  </td>
                </tr>
              )}
              {input.hasRidgeBeam && dwuspadowy && (
                <tr>
                  <td>Słup kalenicowy</td>
                  <td className="liczba">{dl(geom.ridgePostHeight)}</td>
                  <td>
                    <small>do spodu belki kalenicowej</small>
                  </td>
                </tr>
              )}
              <tr>
                <td>Oczep</td>
                <td className="liczba">{dl(geom.roofLength)}</td>
                <td>
                  <small>na całą długość dachu, łączony nad słupem</small>
                </td>
              </tr>
              <tr>
                <td>{pergola ? 'Belka poprzeczna' : 'Krokiew'}</td>
                <td className="liczba">{dl(geom.rafterLength)}</td>
                <td>
                  <small>
                    z okapem; bieg w poziomie {dl(geom.run)}
                  </small>
                </td>
              </tr>
              {input.hasBraces && (
                <tr>
                  <td>Miecz</td>
                  <td className="liczba">{dl(brace.length)}</td>
                  <td>
                    <small>
                      ramię {dl(brace.arm)}, oba końce pod {stopnie(brace.cutAngleDeg, 0)}
                    </small>
                  </td>
                </tr>
              )}
              <tr>
                <td>Stopa fundamentowa</td>
                <td className="liczba">
                  {przekroj(input.footingSize, input.footingSize)}
                </td>
                <td>
                  <small>głębokość {dl(input.footingDepth)}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {wyjasnienia && (
          <Wzor>
            {dwuspadowy
              ? 'długość krokwi = (połowa szerokości + okap) ÷ cos(kąt)'
              : 'długość krokwi = (szerokość + 2 × okap) ÷ cos(kąt)'}
            <br />
            długość miecza = ramię × √2
            <br />
            liczba pól między słupami = długość ÷ największy rozstaw, zaokrąglona w górę
          </Wzor>
        )}
      </Karta>

      <Karta tytul="Kąty cięć" podtytul="Co ustawić na pile.">
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th>Cięcie</th>
                <th className="liczba">Kąt</th>
                <th>Gdzie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Czoło krokwi przy okapie</td>
                <td className="liczba">{stopnie(90 - input.pitchDeg)}</td>
                <td>
                  <small>cięcie pionowe po zamontowaniu, pod deskę czołową</small>
                </td>
              </tr>
              {dwuspadowy && (
                <tr>
                  <td>Czoło krokwi w kalenicy</td>
                  <td className="liczba">{stopnie(90 - input.pitchDeg)}</td>
                  <td>
                    <small>krokwie stykają się czołowo w osi wiaty</small>
                  </td>
                </tr>
              )}
              <tr>
                <td>Oparcie krokwi na oczepie</td>
                <td className="liczba">{stopnie(input.pitchDeg)}</td>
                <td>
                  <small>zacios albo podkładka klinowa pod krokwią</small>
                </td>
              </tr>
              {input.hasBraces && (
                <tr>
                  <td>Końce miecza</td>
                  <td className="liczba">{stopnie(brace.cutAngleDeg, 0)}</td>
                  <td>
                    <small>przy równych ramionach zawsze 45°, niezależnie od spadku</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Karta>

      <Karta tytul="Posadowienie" podtytul="Jak wiata trzyma się gruntu.">
        <p className="podpowiedz" style={{ marginTop: 0 }}>
          {POST_BASE_INFO[input.postBase].hint}
        </p>
        <div className="wyniki">
          <Wynik
            etykieta="Wykop"
            wartosc={liczba(footing.excavationM3, 2)}
            jednostka="m³"
            opis="razem, szerszy od stóp"
          />
          <Wynik
            etykieta="Beton netto"
            wartosc={liczba(footing.volumeM3, 2)}
            jednostka="m³"
            opis="bez zapasu"
          />
          <Wynik
            etykieta="Ciężar konstrukcji"
            wartosc={liczba(wynik.roofWeightKg, 0)}
            jednostka="kg"
            opis="drewno wraz z pokryciem"
          />
        </div>
      </Karta>

      {gutter && (
        <Karta tytul="Odwodnienie" podtytul="Rynny biegną po każdym okapie.">
          <div className="wyniki">
            <Wynik
              etykieta="Rynna"
              wartosc={liczba(gutter.gutterLength / 1000, 1)}
              jednostka="m"
              opis={`${gutter.hooks} ${odmiana(gutter.hooks, 'hak', 'haki', 'haków')} co 60 cm`}
            />
            <Wynik
              etykieta="Rury spustowe"
              wartosc={liczba(gutter.downpipes)}
              jednostka="szt."
              opis={`po ${liczba(gutter.areaPerDownpipeM2, 0)} m² połaci na rurę`}
            />
          </div>
        </Karta>
      )}

      {wynik.notes.length > 0 && (
        <Karta tytul="Uwagi wykonawcze" podtytul="Rzeczy, o które najczęściej rozbija się robota.">
          {wynik.notes.map((n, i) => (
            <Komunikat key={`n${i}`} rodzaj="info">
              {n}
            </Komunikat>
          ))}
        </Karta>
      )}
    </div>
  )
}
