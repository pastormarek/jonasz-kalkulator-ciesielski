/**
 * Widok wczytywania projektu z pliku PDF.
 *
 * Układ jest celowo dwuczęściowy: po jednej stronie podgląd rysunku, po
 * drugiej lista znalezionych wymiarów. Użytkownik patrzy na rysunek i
 * zatwierdza wartości pojedynczo — nic nie wchodzi do obliczeń samo z siebie.
 */

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { RoofInput } from '../core/types'
import { analizujPdf, renderujStrone, ROLA_LABELS, type Kandydat, type Rola } from '../pdf/extract'
import { Karta, Komunikat } from './controls'
import { liczba, przekroj, stopnie } from './format'
import { useDlugosc } from './units'

export function ViewProjekt({
  input,
  onChange,
}: {
  input: RoofInput
  onChange: (patch: Partial<RoofInput>) => void
}) {
  const [dokument, setDokument] = useState<PDFDocumentProxy | null>(null)
  const [kandydaci, setKandydaci] = useState<Kandydat[]>([])
  const [maTekst, setMaTekst] = useState(true)
  const [strona, setStrona] = useState(1)
  const [stron, setStron] = useState(0)
  const [nazwaPliku, setNazwaPliku] = useState('')
  const [ladowanie, setLadowanie] = useState(false)
  const [blad, setBlad] = useState('')
  const [uzyte, setUzyte] = useState<Set<string>>(new Set())

  const { dl } = useDlugosc()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const otoczkaRef = useRef<HTMLDivElement>(null)

  async function wczytaj(plik: File) {
    setLadowanie(true)
    setBlad('')
    setUzyte(new Set())
    try {
      const analiza = await analizujPdf(plik)
      setDokument(analiza.dokument)
      setKandydaci(analiza.kandydaci)
      setMaTekst(analiza.maTekst)
      setStron(analiza.liczbaStron)
      setStrona(1)
      setNazwaPliku(plik.name)
    } catch (e) {
      setBlad(
        `Nie udało się otworzyć pliku. ${e instanceof Error ? e.message : 'Sprawdź, czy to na pewno PDF.'}`,
      )
      setDokument(null)
    } finally {
      setLadowanie(false)
    }
  }

  // Podgląd przerysowujemy przy każdej zmianie strony i przy zmianie szerokości okna.
  useEffect(() => {
    if (!dokument || !canvasRef.current) return
    const szerokosc = otoczkaRef.current?.clientWidth ?? 600
    let aktualne = true
    renderujStrone(dokument, strona, canvasRef.current, Math.min(szerokosc, 1000)).catch(() => {
      if (aktualne) setBlad('Nie udało się narysować podglądu tej strony.')
    })
    return () => {
      aktualne = false
    }
  }, [dokument, strona])

  function zastosuj(k: Kandydat, rola: Rola) {
    const patch = naPatch(k, rola)
    if (!patch) return
    onChange(patch)
    setUzyte((prev) => new Set(prev).add(k.id))
  }

  return (
    <div className="kolumny">
      <Karta tytul="Projekt PDF" podtytul="Wczytaj rysunek dachu, żeby mieć wymiary pod ręką." pelna>
        <PoleUpuszczania onPlik={wczytaj} nazwa={nazwaPliku} ladowanie={ladowanie} />
        {blad && <Komunikat rodzaj="blad">{blad}</Komunikat>}
        {dokument && !maTekst && (
          <Komunikat rodzaj="info">
            Ten plik to skan — nie ma w nim warstwy tekstowej, więc nie da się z niego
            odczytać liczb. Podgląd działa, przepisz wymiary z rysunku do zakładki
            „Dach".
          </Komunikat>
        )}
      </Karta>

      {dokument && (
        <>
          <Karta tytul="Podgląd rysunku">
            <div ref={otoczkaRef}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: 'auto',
                  border: '1px solid var(--linia)',
                  borderRadius: 8,
                  background: '#fff',
                }}
              />
            </div>
            {stron > 1 && (
              <div className="rzad" style={{ justifyContent: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  className="przycisk"
                  onClick={() => setStrona((s) => Math.max(1, s - 1))}
                  disabled={strona <= 1}
                >
                  ← Poprzednia
                </button>
                <span style={{ fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
                  {strona} z {stron}
                </span>
                <button
                  type="button"
                  className="przycisk"
                  onClick={() => setStrona((s) => Math.min(stron, s + 1))}
                  disabled={strona >= stron}
                >
                  Następna →
                </button>
              </div>
            )}
          </Karta>

          <Karta
            tytul="Znalezione wymiary"
            podtytul="Sprawdź każdą wartość na rysunku, zanim jej użyjesz."
          >
            {kandydaci.length === 0 ? (
              <p className="pusto">
                W tym pliku nie znalazłem liczb wyglądających na wymiary. Przepisz je
                ręcznie w zakładce „Dach".
              </p>
            ) : (
              <ul className="lista-projektow">
                {kandydaci.slice(0, 40).map((k) => (
                  <WierszKandydata
                    key={k.id}
                    kandydat={k}
                    uzyty={uzyte.has(k.id)}
                    onZastosuj={(rola) => zastosuj(k, rola)}
                  />
                ))}
              </ul>
            )}
            <Komunikat rodzaj="info">
              Aplikacja czyta tekst zapisany w pliku, a nie sam rysunek. Wartość bez
              opisu może pochodzić z zupełnie innego miejsca projektu — dlatego
              wszystko zatwierdzasz ręcznie.
            </Komunikat>
          </Karta>

          <Karta tytul="Dane w obliczeniach" podtytul="Tak wygląda dach po Twoich zatwierdzeniach.">
            <div className="tabela-otoczka">
              <table>
                <tbody>
                  <tr>
                    <td>Rozpiętość</td>
                    <td className="liczba">
                      <strong>{dl(input.span)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Długość budynku</td>
                    <td className="liczba">
                      <strong>{dl(input.length)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Kąt nachylenia</td>
                    <td className="liczba">
                      <strong>{stopnie(input.pitchDeg)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Okap</td>
                    <td className="liczba">
                      <strong>{dl(input.eaves)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Rozstaw krokwi</td>
                    <td className="liczba">
                      <strong>{dl(input.rafterSpacingMax)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Przekrój krokwi</td>
                    <td className="liczba">
                      <strong>{przekroj(input.rafterSection.b, input.rafterSection.h)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Karta>
        </>
      )}
    </div>
  )
}

/** Jeden znaleziony wymiar z możliwością wskazania, czym jest. */
function WierszKandydata({
  kandydat,
  uzyty,
  onZastosuj,
}: {
  kandydat: Kandydat
  uzyty: boolean
  onZastosuj: (rola: Rola) => void
}) {
  const [rola, setRola] = useState<Rola>(
    kandydat.rola === 'nieznana' ? 'span' : kandydat.rola,
  )
  const { dl } = useDlugosc()

  const opis = kandydat.przekroj
    ? przekroj(kandydat.przekroj.b, kandydat.przekroj.h)
    : kandydat.rola === 'pitch'
      ? stopnie(kandydat.wartosc)
      : dl(kandydat.wartosc)

  return (
    <li style={uzyty ? { borderColor: 'var(--ok)' } : undefined}>
      <div className="opis">
        <strong>{opis}</strong>
        <span>
          „{kandydat.tekstZrodlowy}" — str. {kandydat.strona}, pewność{' '}
          {liczba(kandydat.pewnosc * 100, 0)}%
          <br />
          {kandydat.kontekst}
        </span>
      </div>
      <div className="rzad" style={{ flexWrap: 'nowrap' }}>
        {kandydat.przekroj ? (
          <select
            value={rola}
            onChange={(e) => setRola(e.target.value as Rola)}
            style={{ minHeight: 40, borderRadius: 8, padding: '0 8px' }}
          >
            <option value="section">Krokiew</option>
            <option value="nieznana">Murłata</option>
          </select>
        ) : (
          <select
            value={rola}
            onChange={(e) => setRola(e.target.value as Rola)}
            style={{ minHeight: 40, borderRadius: 8, padding: '0 8px', maxWidth: 150 }}
          >
            {(['span', 'length', 'pitch', 'eaves', 'spacing', 'collarHeight'] as Rola[]).map(
              (r) => (
                <option key={r} value={r}>
                  {ROLA_LABELS[r]}
                </option>
              ),
            )}
          </select>
        )}
        <button
          type="button"
          className={uzyty ? 'przycisk' : 'przycisk glowny'}
          onClick={() => onZastosuj(rola)}
        >
          {uzyty ? 'Ponów' : 'Użyj'}
        </button>
      </div>
    </li>
  )
}

/** Pole do upuszczenia pliku albo wybrania go z dysku. */
function PoleUpuszczania({
  onPlik,
  nazwa,
  ladowanie,
}: {
  onPlik: (plik: File) => void
  nazwa: string
  ladowanie: boolean
}) {
  const [nad, setNad] = useState(false)

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setNad(true)
      }}
      onDragLeave={() => setNad(false)}
      onDrop={(e) => {
        e.preventDefault()
        setNad(false)
        const plik = e.dataTransfer.files?.[0]
        if (plik) onPlik(plik)
      }}
      style={{
        display: 'block',
        border: `2px dashed ${nad ? 'var(--akcent)' : 'var(--linia)'}`,
        borderRadius: 12,
        padding: '28px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        background: nad ? 'var(--akcent-jasny)' : 'var(--tlo-wglebienie)',
      }}
    >
      <input
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const plik = e.target.files?.[0]
          if (plik) onPlik(plik)
          e.target.value = ''
        }}
      />
      <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">
        📄
      </div>
      <strong style={{ display: 'block', fontSize: 16 }}>
        {ladowanie ? 'Wczytuję…' : nazwa || 'Wybierz plik PDF albo przeciągnij go tutaj'}
      </strong>
      <span className="podpowiedz">
        Plik nie jest nigdzie wysyłany — wszystko dzieje się w Twoim telefonie.
      </span>
    </label>
  )
}

/** Zamienia zatwierdzoną wartość na zmianę w danych dachu. */
function naPatch(k: Kandydat, rola: Rola): Partial<RoofInput> | null {
  if (k.przekroj) {
    return rola === 'section'
      ? { rafterSection: k.przekroj }
      : { wallPlateSection: k.przekroj }
  }
  switch (rola) {
    case 'span':
      return { span: Math.round(k.wartosc) }
    case 'length':
      return { length: Math.round(k.wartosc) }
    case 'pitch':
      return { pitchDeg: k.wartosc }
    case 'eaves':
      return { eaves: Math.round(k.wartosc) }
    case 'spacing':
      return { rafterSpacingMax: Math.round(k.wartosc) }
    case 'collarHeight':
      return { collarHeight: Math.round(k.wartosc) }
    default:
      return null
  }
}
