/**
 * Wspólne elementy interfejsu: pola, przełączniki, kafelki wyboru, wyniki.
 *
 * Wszystko jest tu celowo duże. Ta aplikacja bywa obsługiwana jedną ręką,
 * w rękawicy, na drabinie — drobne kontrolki po prostu się nie sprawdzają.
 */

import { useEffect, useId, useState, type ReactNode } from 'react'

/** Pole liczbowe z jednostką i podpowiedzią. */
export function PoleLiczbowe({
  label,
  value,
  onChange,
  jednostka = 'mm',
  krok = 10,
  min = 0,
  max,
  podpowiedz,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  jednostka?: string
  krok?: number
  min?: number
  max?: number
  podpowiedz?: ReactNode
}) {
  const id = useId()

  // W trakcie pisania polem rządzi tekst wpisany przez użytkownika, a nie
  // wartość z obliczeń. Bez tego skasowanie zawartości natychmiast wstawiałoby
  // z powrotem liczbę wyliczoną z pustego pola i doklejało do niej kolejne
  // cyfry — pole spadku dawało w ten sposób 1100% zamiast 100%.
  const [tekst, setTekst] = useState(() => sformatuj(value))
  const [edytowane, setEdytowane] = useState(false)

  useEffect(() => {
    if (!edytowane) setTekst(sformatuj(value))
  }, [value, edytowane])

  return (
    <div className="pole">
      <label htmlFor={id}>{label}</label>
      <div className="pole-wejscie">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={tekst}
          step={krok}
          min={min}
          max={max}
          onChange={(e) => {
            setTekst(e.target.value)
            const v = e.target.valueAsNumber
            if (!Number.isNaN(v)) onChange(v)
          }}
          onFocus={(e) => {
            setEdytowane(true)
            e.target.select()
          }}
          onBlur={() => {
            setEdytowane(false)
            // Puste pole po wyjściu wraca do ostatniej poprawnej wartości.
            setTekst(sformatuj(value))
          }}
        />
        <span className="jednostka">{jednostka}</span>
      </div>
      {podpowiedz && <div className="podpowiedz">{podpowiedz}</div>}
    </div>
  )
}

/** Zamienia liczbę na tekst pola, obcinając nieistotne końcówki po przecinku. */
function sformatuj(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(Math.round(value * 100) / 100)
}

/** Pole wyboru z listy. */
export function PoleWyboru<T extends string>({
  label,
  value,
  onChange,
  opcje,
  podpowiedz,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  opcje: Array<{ value: T; label: string }>
  podpowiedz?: ReactNode
}) {
  const id = useId()
  return (
    <div className="pole">
      <label htmlFor={id}>{label}</label>
      <div className="pole-wejscie">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {opcje.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {podpowiedz && <div className="podpowiedz">{podpowiedz}</div>}
    </div>
  )
}

/** Para pól na przekrój drewna: szerokość i wysokość. */
export function PolePrzekroju({
  label,
  b,
  h,
  onChange,
  podpowiedz,
}: {
  label: string
  b: number
  h: number
  onChange: (sekcja: { b: number; h: number }) => void
  podpowiedz?: ReactNode
}) {
  return (
    <div className="pole" style={{ gridColumn: 'span 2' }}>
      <label>{label}</label>
      <div className="rzad" style={{ flexWrap: 'nowrap' }}>
        <div className="pole-wejscie" style={{ flex: 1 }}>
          <input
            type="number"
            inputMode="numeric"
            value={b}
            step={5}
            min={20}
            onChange={(e) => onChange({ b: e.target.valueAsNumber || 0, h })}
            onFocus={(e) => e.target.select()}
            aria-label={`${label} — szerokość`}
          />
          <span className="jednostka">mm</span>
        </div>
        <span style={{ color: 'var(--tekst-slaby)', fontWeight: 700 }}>×</span>
        <div className="pole-wejscie" style={{ flex: 1 }}>
          <input
            type="number"
            inputMode="numeric"
            value={h}
            step={5}
            min={20}
            onChange={(e) => onChange({ b, h: e.target.valueAsNumber || 0 })}
            onFocus={(e) => e.target.select()}
            aria-label={`${label} — wysokość`}
          />
          <span className="jednostka">mm</span>
        </div>
      </div>
      {podpowiedz && <div className="podpowiedz">{podpowiedz}</div>}
    </div>
  )
}

/** Przełącznik tak/nie z opisem. */
export function Przelacznik({
  label,
  opis,
  checked,
  onChange,
}: {
  label: string
  opis?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="przelacznik">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="przelacznik-opis">
        <strong>{label}</strong>
        {opis && <span>{opis}</span>}
      </span>
    </label>
  )
}

/** Wybór jednej z kilku opcji, pokazany jako duże kafelki. */
export function WyborKafelkowy<T extends string>({
  value,
  onChange,
  opcje,
}: {
  value: T
  onChange: (v: T) => void
  opcje: Array<{ value: T; label: string; opis?: string }>
}) {
  return (
    <div className="wybor">
      {opcje.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.opis && <small>{o.opis}</small>}
        </button>
      ))}
    </div>
  )
}

/** Kafelek z pojedynczym wynikiem obliczeń. */
export function Wynik({
  etykieta,
  wartosc,
  jednostka,
  opis,
  wyrozniony = false,
}: {
  etykieta: string
  wartosc: string
  jednostka?: string
  opis?: ReactNode
  wyrozniony?: boolean
}) {
  return (
    <div className={wyrozniony ? 'wynik wyrozniony' : 'wynik'}>
      <div className="wynik-etykieta">{etykieta}</div>
      <div className="wynik-wartosc">
        {wartosc}
        {jednostka && <small>{jednostka}</small>}
      </div>
      {opis && <div className="wynik-opis">{opis}</div>}
    </div>
  )
}

/** Karta grupująca sekcję ustawień albo wyników. */
export function Karta({
  tytul,
  podtytul,
  children,
  pelna = false,
}: {
  tytul?: string
  podtytul?: string
  children: ReactNode
  pelna?: boolean
}) {
  return (
    <section className={pelna ? 'karta pelna' : 'karta'}>
      {tytul && <h2>{tytul}</h2>}
      {podtytul && <p className="podtytul">{podtytul}</p>}
      {children}
    </section>
  )
}

/** Komunikat o błędzie albo uwaga wykonawcza. */
export function Komunikat({ rodzaj, children }: { rodzaj: 'blad' | 'info'; children: ReactNode }) {
  return (
    <div className={`komunikat ${rodzaj}`} role={rodzaj === 'blad' ? 'alert' : undefined}>
      <span className="komunikat-ikona" aria-hidden="true">
        {rodzaj === 'blad' ? '⚠' : 'ℹ'}
      </span>
      <div>{children}</div>
    </div>
  )
}

/** Blok ze wzorem, pokazywany tylko w trybie wyjaśnień. */
export function Wzor({ children }: { children: ReactNode }) {
  return <div className="wzor">{children}</div>
}
