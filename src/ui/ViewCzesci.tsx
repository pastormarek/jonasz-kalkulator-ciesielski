/**
 * Lista części i instrukcja montażu krok po kroku.
 *
 * DLACZEGO CZĘŚCI MAJĄ LITERY
 * ---------------------------
 * Każda pozycja dostaje oznaczenie A, B, C… i tym oznaczeniem posługuje się
 * potem instrukcja. To nie jest ozdoba: przy meblu, w którym są trzy różne
 * deski 20 × 140 różniące się tylko długością, „przykręć B do C” jest
 * jednoznaczne, a „przykręć deskę siedziska do poprzeczki” już nie. Tak samo
 * robią to instrukcje składania mebli ze sklepu i z tego samego powodu.
 *
 * Kolejność kroków bierze się z etapów montażu — tej samej listy, po której
 * idzie stawianie dachu i wiaty.
 */

import type { FurnitureCalculation } from '../core/furnitureMaterials'
import type { PozycjaCzesci } from '../core/furniture'
import { WYKONCZENIE_INFO } from '../core/furniture'
import { Karta, Komunikat, Wynik } from './controls'
import { liczba, przekroj, odmiana } from './format'
import { useDlugosc } from './units'

export function ViewCzesci({ wynik }: { wynik: FurnitureCalculation }) {
  const { dl } = useDlugosc()
  const litery = oznaczenia(wynik.pozycje)
  const sztukRazem = wynik.pozycje.reduce((s, p) => s + p.count, 0)
  const wkretowRazem = wynik.fasteners.reduce((s, f) => s + f.count, 0)

  return (
    <div>
      <div className="wyniki" style={{ marginBottom: 16 }}>
        <Wynik
          etykieta="Części do docięcia"
          wartosc={liczba(sztukRazem)}
          jednostka={odmiana(sztukRazem, 'sztuka', 'sztuki', 'sztuk')}
          opis={`${wynik.pozycje.length} ${odmiana(wynik.pozycje.length, 'rodzaj', 'rodzaje', 'rodzajów')}`}
          wyrozniony
        />
        <Wynik
          etykieta="Kroków montażu"
          wartosc={liczba(wynik.kroki.length)}
          opis={wynik.przepis.czas}
        />
        <Wynik
          etykieta="Wkrętów"
          wartosc={`ok. ${liczba(wkretowRazem)}`}
          opis="z zapasem na zerwane łby"
        />
        <Wynik
          etykieta={WYKONCZENIE_INFO[wynik.input.wykonczenie].label}
          wartosc={wynik.wykonczenieLitry > 0 ? liczba(wynik.wykonczenieLitry, 1) : '—'}
          jednostka={wynik.wykonczenieLitry > 0 ? 'l' : undefined}
          opis={`${liczba(wynik.powierzchniaM2, 1)} m² powierzchni drewna`}
        />
      </div>

      {wynik.warnings.map((w, i) => (
        <Komunikat key={i} rodzaj="blad">
          {w}
        </Komunikat>
      ))}

      <Karta
        tytul="Lista części"
        podtytul="Dotnij wszystko naraz, zanim zaczniesz skręcać. Litery wracają potem w instrukcji."
      >
        <div className="tabela-otoczka">
          <table>
            <thead>
              <tr>
                <th style={{ width: 44 }}>Ozn.</th>
                <th>Część</th>
                <th>Przekrój</th>
                <th className="liczba">Długość</th>
                <th className="liczba">Sztuk</th>
              </tr>
            </thead>
            <tbody>
              {wynik.pozycje.map((p) => (
                <tr key={kluczPozycji(p)}>
                  <td>
                    <strong>{litery.get(kluczPozycji(p))}</strong>
                  </td>
                  <td>
                    {p.nazwa}
                    {p.gotowy && <small>element kupowany gotowy</small>}
                    {p.uwaga && <small>{p.uwaga}</small>}
                    {p.skos ? <small>końce ścięte pod {p.skos}°</small> : null}
                  </td>
                  <td>{p.gotowy ? '—' : przekroj(p.section.b, p.section.h)}</td>
                  <td className="liczba">{dl(p.length)}</td>
                  <td className="liczba">
                    <strong>{liczba(p.count)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="podpowiedz" style={{ marginTop: 8 }}>
          Długości są gotowe do cięcia — bez naddatku, który doliczamy dopiero przy
          zamawianiu drewna. Zanim dotniesz całą serię, sprawdź pierwszą sztukę
          na sucho w meblu.
        </p>
      </Karta>

      <Karta
        tytul="Montaż krok po kroku"
        podtytul="Kolejność nie jest przypadkowa — każdy krok opiera się na tym, co stoi po poprzednim."
        pelna
      >
        {wynik.kroki.map((krok) => (
          <div
            key={krok.numer}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              padding: '16px 0',
              borderTop: krok.numer === 1 ? 'none' : '1px solid var(--linia)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                flex: '0 0 auto',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--akcent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {krok.numer}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: '6px 0 6px', fontSize: 16 }}>
                Krok {krok.numer}: {krok.tytul}
              </h3>
              <p style={{ margin: '0 0 10px', lineHeight: 1.55 }}>{krok.opis}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {krok.pozycje.map((p) => (
                  <span
                    key={kluczPozycji(p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid var(--linia)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 13,
                      background: 'var(--tlo-karta)',
                    }}
                  >
                    <strong>{litery.get(kluczPozycji(p))}</strong>
                    <span style={{ color: 'var(--tekst-slaby)' }}>
                      {p.nazwa} · {liczba(p.count)} ×{' '}
                      {p.gotowy ? dl(p.length) : `${dl(p.length)} (${przekroj(p.section.b, p.section.h)})`}
                    </span>
                  </span>
                ))}
              </div>

              {krok.wkretow > 0 && (
                <p className="podpowiedz" style={{ margin: 0 }}>
                  Na ten krok pójdzie około {liczba(krok.wkretow)}{' '}
                  {odmiana(krok.wkretow, 'wkręt', 'wkręty', 'wkrętów')}.
                </p>
              )}
            </div>
          </div>
        ))}

        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            padding: '16px 0 0',
            borderTop: '1px solid var(--linia)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              flex: '0 0 auto',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--ok)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            ✓
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: '6px 0 6px', fontSize: 16 }}>Na koniec: szlif i wykończenie</h3>
            <p style={{ margin: '0 0 8px', lineHeight: 1.55 }}>
              {wynik.input.wykonczenie === 'brak' ? (
                <>
                  Przejdź papierem po wszystkich krawędziach, których będzie dotykać ręka,
                  i na tym kończysz — zostawiasz drewno surowe.
                </>
              ) : (
                <>
                  Zeszlifuj mebel papierem 120, odpyl go i nałóż{' '}
                  {WYKONCZENIE_INFO[wynik.input.wykonczenie].warstwy === 1
                    ? 'jedną warstwę'
                    : `${WYKONCZENIE_INFO[wynik.input.wykonczenie].warstwy} warstwy`}{' '}
                  preparatu — razem około {liczba(wynik.wykonczenieLitry, 1)} l. Między
                  warstwami odczekaj tyle, ile podaje producent, i przetrzyj powierzchnię
                  drobnym papierem: pierwsza warstwa zawsze podnosi włos drewna.
                </>
              )}
            </p>
            <p className="podpowiedz" style={{ margin: 0 }}>
              Krawędzie i czoła nasiąkają najmocniej — tam daj wyraźnie więcej preparatu
              niż na płaszczyznach. Od czoła zaczyna się każde gnicie.
            </p>
          </div>
        </div>
      </Karta>

      {(wynik.fasteners.length > 0 || wynik.laczniki.length > 0) && (
        <Karta tytul="Wkręty i okucia" podtytul="To trzeba mieć, zanim zaczniesz skręcać.">
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
              </tbody>
            </table>
          </div>
          <p className="podpowiedz" style={{ marginTop: 8 }}>
            Liczba wkrętów wynika z tego, ile części i iloma punktami jest mocowanych —
            po dwa w każde złącze, więcej tam, gdzie przenosi się ciężar. To
            oszacowanie, nie wykaz z projektu.
          </p>
        </Karta>
      )}

      {wynik.notes.length > 0 && (
        <Karta tytul="O czym pamiętać" pelna>
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

/** Klucz pozycji — ten sam, po którym rdzeń sklejał identyczne części. */
function kluczPozycji(p: PozycjaCzesci): string {
  return `${p.nazwa}|${p.section.b}x${p.section.h}|${p.length}`
}

/**
 * Nadaje częściom oznaczenia A, B, C… Po literze Z idzie AA, AB — meble
 * z ponad dwudziestoma sześcioma rodzajami części zdarzają się rzadko,
 * ale nie chcemy, żeby akurat wtedy dwie części dostały tę samą literę.
 */
function oznaczenia(pozycje: PozycjaCzesci[]): Map<string, string> {
  const map = new Map<string, string>()
  pozycje.forEach((p, i) => {
    map.set(kluczPozycji(p), litera(i))
  })
  return map
}

function litera(i: number): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (i < 26) return A[i]
  return `${A[Math.floor(i / 26) - 1]}${A[i % 26]}`
}
