/**
 * Widok wyników geometrii: wymiary krokwi, rozstaw, zaciosy i rysunki.
 *
 * Najważniejsze liczby są na górze i są duże, bo to je odczytuje się na
 * budowie. Wyprowadzenia i wzory pojawiają się dopiero po włączeniu
 * wyjaśnień, żeby nie zaśmiecać ekranu tym, co doświadczony cieśla wie.
 */

import type { Calculation } from '../core/materials'
import { SHAPE_LABELS, TRUSS_LABELS } from '../core/defaults'
import { Karta, Wynik, Komunikat, Wzor } from './controls'
import { RysunekPrzekroju, RysunekZaciosu } from './diagrams'
import { liczba, mm, stopnie, odmiana } from './format'
import { useDlugosc } from './units'

export function ViewKrokwie({
  wynik,
  wyjasnienia,
}: {
  wynik: Calculation
  wyjasnienia: boolean
}) {
  const { input, slope, layout, notchGeom, hip, collar, splice } = wynik
  const { dl, rozbita } = useDlugosc()
  const krokwiRazem = wynik.timber
    .filter((t) => t.name.startsWith('Krokiew') || t.name.startsWith('Kulawka'))
    .reduce((s, t) => s + t.count, 0)

  return (
    <div>
      {wynik.warnings.map((w, i) => (
        <Komunikat key={`w${i}`} rodzaj="blad">
          {w}
        </Komunikat>
      ))}
      {wynik.notes.map((n, i) => (
        <Komunikat key={`n${i}`} rodzaj="info">
          {n}
        </Komunikat>
      ))}

      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta={splice.active ? 'Krokiew razem' : 'Długość krokwi'}
          wartosc={rozbita(slope.rafterTotal).wartosc}
          jednostka={rozbita(slope.rafterTotal).jednostka}
          opis={`z okapem ${dl(input.eaves)}; sama połać ${dl(slope.rafterToRidge)}`}
          wyrozniony
        />
        <Wynik
          etykieta="Rozstaw krokwi"
          wartosc={rozbita(layout.spacing).wartosc}
          jednostka={rozbita(layout.spacing).jednostka}
          opis={`w osiach; w świetle ${dl(layout.clear)}`}
          wyrozniony
        />
        <Wynik
          etykieta="Liczba krokwi"
          wartosc={liczba(krokwiRazem)}
          jednostka={odmiana(krokwiRazem, 'sztuka', 'sztuki', 'sztuk')}
          opis={`${layout.countPerSlope} na połać, ${layout.bays} ${odmiana(layout.bays, 'pole', 'pola', 'pól')}`}
        />
        <Wynik
          etykieta="Wysokość kalenicy"
          wartosc={rozbita(slope.rise).wartosc}
          jednostka={rozbita(slope.rise).jednostka}
          opis="nad poziomem murłaty"
        />
        <Wynik
          etykieta="Powierzchnia połaci"
          wartosc={liczba(wynik.roofAreaM2, 1)}
          jednostka="m²"
          opis={`rzut ${liczba(wynik.planAreaM2, 1)} m²`}
        />
        <Wynik
          etykieta="Nachylenie"
          wartosc={stopnie(input.pitchDeg)}
          opis={`${SHAPE_LABELS[input.shape]}, więźba ${TRUSS_LABELS[input.truss].toLowerCase()}`}
        />
      </div>

      <Karta tytul="Przekrój więźby" podtytul="Rysunek odpowiada wpisanym wymiarom.">
        <RysunekPrzekroju input={input} slope={slope} collar={collar} splice={splice} />
      </Karta>

      {splice.active && (
        <Karta
          tytul="Łączenie krokwi"
          podtytul={`Styk opiera się na podporze: ${splice.supportLabel}.`}
        >
          <div className="wyniki">
            <Wynik
              etykieta="Odcinek dolny"
              wartosc={rozbita(splice.lower).wartosc}
              jednostka={rozbita(splice.lower).jednostka}
              opis="od okapu do podpory, z nakładką"
              wyrozniony
            />
            <Wynik
              etykieta="Odcinek górny"
              wartosc={rozbita(splice.upper).wartosc}
              jednostka={rozbita(splice.upper).jednostka}
              opis="od podpory do kalenicy"
              wyrozniony
            />
            <Wynik
              etykieta="Styk od okapu"
              wartosc={rozbita(splice.atLength).wartosc}
              jednostka={rozbita(splice.atLength).jednostka}
              opis="mierzone wzdłuż krokwi"
            />
            <Wynik
              etykieta="Nakładka"
              wartosc={mm(input.splice.overlap)}
              jednostka="mm"
              opis="o tyle kawałki zachodzą na siebie"
            />
          </div>
          <div className="odstep" />
          <Komunikat rodzaj="info">
            Odmierz styk wzdłuż krokwi od dolnego końca, nie od murłaty. Musi
            wypaść dokładnie nad podporą — inaczej połączenie nie przeniesie
            obciążenia.
          </Komunikat>
        </Karta>
      )}

      <Karta tytul="Zacios na murłacie" podtytul="Wymiary wycięcia i sprawdzenie normy.">
        <div className="wyniki" style={{ marginBottom: 16 }}>
          <Wynik
            etykieta="Głębokość zaciosu"
            wartosc={mm(notchGeom.depth)}
            jednostka="mm"
            opis={
              notchGeom.depthOk
                ? `norma dopuszcza do ${mm(notchGeom.maxDepth)} mm`
                : `za dużo! norma to ${mm(notchGeom.maxDepth)} mm`
            }
            wyrozniony={notchGeom.depthOk}
          />
          <Wynik
            etykieta="Siodło"
            wartosc={mm(notchGeom.seatLength)}
            jednostka="mm"
            opis="płaszczyzna pozioma, leży na murłacie"
            wyrozniony
          />
          <Wynik
            etykieta="Pięta"
            wartosc={mm(notchGeom.heelHeight)}
            jednostka="mm"
            opis="płaszczyzna pionowa, oparta o bok murłaty"
            wyrozniony
          />
          <Wynik
            etykieta="Krokiew nad zaciosem"
            wartosc={mm(notchGeom.remainingHeight)}
            jednostka="mm"
            opis="pozostała wysokość, mierzona w pionie"
          />
        </div>

        <RysunekZaciosu input={input} notch={notchGeom} />

        {wyjasnienia && (
          <Wzor>
            Naroże murłaty wchodzi w krokiew na głębokość {mm(notchGeom.depth)} mm,
            mierzoną prostopadle do krokwi.
            <br />
            siodło = {mm(notchGeom.depth)} ÷ sin({liczba(input.pitchDeg, 0)}°) ={' '}
            {mm(notchGeom.seatLength)} mm
            <br />
            pięta = {mm(notchGeom.depth)} ÷ cos({liczba(input.pitchDeg, 0)}°) ={' '}
            {mm(notchGeom.heelHeight)} mm
          </Wzor>
        )}
      </Karta>

      {collar?.valid && (
        <Karta tytul="Jętka" podtytul="Rygiel spinający parę krokwi.">
          <div className="wyniki">
            <Wynik
              etykieta="Długość jętki"
              wartosc={rozbita(collar.length).wartosc}
              jednostka={rozbita(collar.length).jednostka}
              opis={`rozpiętość w świetle ${dl(collar.span)}`}
              wyrozniony
            />
            <Wynik
              etykieta="Wysokość nad murłatą"
              wartosc={rozbita(collar.height).wartosc}
              jednostka={rozbita(collar.height).jednostka}
            />
            <Wynik
              etykieta="Liczba jętek"
              wartosc={liczba(layout.countPerSlope)}
              jednostka={odmiana(layout.countPerSlope, 'sztuka', 'sztuki', 'sztuk')}
              opis="po jednej na każdą parę krokwi"
            />
          </div>
          {wyjasnienia && (
            <Wzor>
              Na wysokości h dach zwęża się o 2h ÷ tg(kąt).
              <br />
              rozpiętość jętki = {mm(input.span)} − 2 × {mm(collar.height)} ÷ tg(
              {liczba(input.pitchDeg, 0)}°) = {mm(collar.span)} mm
            </Wzor>
          )}
        </Karta>
      )}

      {hip && (
        <Karta
          tytul="Naroża dachu kopertowego"
          podtytul="Krożyny, kulawki i kąty do nastawienia na pile."
        >
          <div className="wyniki" style={{ marginBottom: 16 }}>
            <Wynik
              etykieta="Długość krożyny"
              wartosc={rozbita(hip.hipTotal).wartosc}
              jednostka={rozbita(hip.hipTotal).jednostka}
              opis="z okapem, licząc po przekątnej"
              wyrozniony
            />
            <Wynik
              etykieta="Nachylenie krożyny"
              wartosc={stopnie(hip.hipPitchDeg)}
              opis={`łagodniejsze niż połać (${stopnie(input.pitchDeg)})`}
              wyrozniony
            />
            <Wynik
              etykieta="Ukos kulawki"
              wartosc={stopnie(hip.jackCheekAngleDeg)}
              opis="kąt nastawiany na pile ukosowej"
              wyrozniony
            />
            <Wynik
              etykieta="Sfazowanie krożyny"
              wartosc={stopnie(hip.hipBackingAngleDeg)}
              opis="ścięcie grzbietu pod płaszczyzny połaci"
            />
            <Wynik
              etykieta="Skok kulawek"
              wartosc={rozbita(hip.jackDifference).wartosc}
              jednostka={rozbita(hip.jackDifference).jednostka}
              opis="o tyle każda kolejna jest krótsza"
            />
            <Wynik
              etykieta="Długość kalenicy"
              wartosc={rozbita(hip.ridgeLength).wartosc}
              jednostka={rozbita(hip.ridgeLength).jednostka}
              opis={hip.ridgeLength < 1000 ? 'dach namiotowy — kalenica schodzi do punktu' : undefined}
            />
          </div>

          <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Kulawki — długości kolejnych sztuk</h3>
          <div className="tabela-otoczka">
            <table>
              <thead>
                <tr>
                  <th>Numer</th>
                  <th className="liczba">Długość</th>
                  <th className="liczba">Sztuk</th>
                </tr>
              </thead>
              <tbody>
                {hip.jackLengths.map((len, i) => (
                  <tr key={i}>
                    <td>Kulawka {i + 1}</td>
                    <td className="liczba">{dl(len)}</td>
                    <td className="liczba">8</td>
                  </tr>
                ))}
                {hip.jackLengths.length === 0 && (
                  <tr>
                    <td colSpan={3}>Przy tym rozstawie kulawki nie wychodzą.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="podpowiedz" style={{ marginTop: 8 }}>
            Po osiem sztuk, bo każda z czterech krożyn ma kulawki z dwóch stron.
          </p>

          {wyjasnienia && (
            <Wzor>
              tg(nachylenie krożyny) = tg(kąt połaci) ÷ √2
              <br />
              ukos kulawki = arctg(cos(kąt połaci))
              <br />
              sfazowanie krożyny = arctg(sin(nachylenie krożyny))
            </Wzor>
          )}
        </Karta>
      )}
    </div>
  )
}
