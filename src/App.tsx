/**
 * Główny komponent aplikacji: stan projektu, zakładki i akcje w nagłówku.
 *
 * Cały stan sprowadza się do jednego obiektu `projekt`. Wynik obliczeń jest
 * z niego wyprowadzany przy każdym renderze — nie trzymamy go w stanie, żeby
 * nie dało się doprowadzić do sytuacji, w której dane i wynik się rozjeżdżają.
 */

import { useEffect, useMemo, useState } from 'react'
import type { RoofInput } from './core/types'
import { calculate } from './core/materials'
import {
  newProject,
  loadProjects,
  saveProject,
  deleteProject,
  rememberLast,
  recallLast,
  encodeToUrl,
  decodeFromUrl,
  type Project,
} from './state/project'
import { ViewDach } from './ui/ViewDach'
import { ViewKrokwie } from './ui/ViewKrokwie'
import { ViewMaterial } from './ui/ViewMaterial'
import { ViewProjekt } from './ui/ViewProjekt'
import { ViewModel } from './ui/ViewModel'
import { Przelacznik } from './ui/controls'
import { DostawcaJednostek, type Jednostka } from './ui/units'
import { dataCzas, liczba, mNaMetry } from './ui/format'
import { SHAPE_LABELS } from './core/defaults'

type Zakladka = 'dach' | 'krokwie' | 'model' | 'material' | 'projekt'

const ZAKLADKI: Array<{ id: Zakladka; label: string; ikona: string }> = [
  { id: 'dach', label: 'Dach', ikona: '📐' },
  { id: 'krokwie', label: 'Krokwie', ikona: '📏' },
  { id: 'model', label: 'Model', ikona: '🏠' },
  { id: 'material', label: 'Materiał', ikona: '🪵' },
  { id: 'projekt', label: 'Projekt', ikona: '📄' },
]

export default function App() {
  const [projekt, setProjekt] = useState<Project>(() => decodeFromUrl() ?? recallLast() ?? newProject())
  const [zakladka, setZakladka] = useState<Zakladka>('dach')
  const [wyjasnienia, setWyjasnienia] = useState(false)
  // Jednostka to preferencja czytania, nie cecha dachu — zostaje w tym
  // urządzeniu i nie wędruje razem z projektem w linku.
  const [jednostka, setJednostka] = useState<Jednostka>(() => {
    try {
      return localStorage.getItem('jonasz.jednostka') === 'm' ? 'm' : 'cm'
    } catch {
      return 'cm'
    }
  })
  const [oknoProjektow, setOknoProjektow] = useState(false)
  const [oknoLinku, setOknoLinku] = useState(false)
  const [projekty, setProjekty] = useState<Project[]>(() => loadProjects())
  const [komunikat, setKomunikat] = useState('')

  const wynik = useMemo(() => calculate(projekt.input), [projekt.input])

  // Ostatni stan pamiętamy zawsze, żeby odświeżenie strony nic nie gubiło.
  useEffect(() => {
    rememberLast(projekt)
  }, [projekt])

  // Krótkie potwierdzenia same znikają.
  useEffect(() => {
    if (!komunikat) return
    const t = setTimeout(() => setKomunikat(''), 2600)
    return () => clearTimeout(t)
  }, [komunikat])

  const zmienJednostke = (nowa: Jednostka) => {
    setJednostka(nowa)
    try {
      localStorage.setItem('jonasz.jednostka', nowa)
    } catch {
      // Tryb prywatny — ustawienie po prostu nie przetrwa zamknięcia karty.
    }
  }

  const zmien = (patch: Partial<RoofInput>) =>
    setProjekt((p) => ({ ...p, input: { ...p.input, ...patch } }))

  const zapisz = () => {
    setProjekty(saveProject(projekt))
    setKomunikat('Projekt zapisany.')
  }

  const otworz = (p: Project) => {
    setProjekt(p)
    setOknoProjektow(false)
    setZakladka('dach')
  }

  const usun = (id: string) => {
    setProjekty(deleteProject(id))
  }

  return (
    <div className="app">
      <header className="naglowek">
        <div className="marka">
          Jonasz<span>·</span>
          <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--tekst-slaby)' }}>
            kalkulator ciesielski
          </span>
        </div>

        <input
          className="nazwa-projektu"
          value={projekt.name}
          onChange={(e) => setProjekt((p) => ({ ...p, name: e.target.value }))}
          aria-label="Nazwa projektu"
          placeholder="Nazwa dachu"
        />

        <div className="naglowek-akcje">
          <button type="button" className="przycisk glowny" onClick={zapisz}>
            Zapisz
          </button>
          <button type="button" className="przycisk" onClick={() => setOknoProjektow(true)}>
            Projekty
          </button>
          <button type="button" className="przycisk" onClick={() => setOknoLinku(true)}>
            Udostępnij
          </button>
          <button type="button" className="przycisk" onClick={() => window.print()}>
            Drukuj / PDF
          </button>
        </div>
      </header>

      {komunikat && (
        <div
          className="bez-druku"
          style={{
            background: 'var(--ok)',
            color: '#fff',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {komunikat}
        </div>
      )}

      <div className="zakladki" role="tablist">
        {ZAKLADKI.map((z) => (
          <button
            key={z.id}
            type="button"
            role="tab"
            className="zakladka"
            aria-selected={zakladka === z.id}
            onClick={() => setZakladka(z.id)}
          >
            <span aria-hidden="true" style={{ fontSize: 20 }}>
              {z.ikona}
            </span>
            {z.label}
          </button>
        ))}
      </div>

      <main>
        <NaglowekWydruku projekt={projekt} />

        <div
          className="bez-druku"
          style={{
            marginBottom: 12,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Przelacznik
            label="Pokaż wyjaśnienia"
            opis="Wzory i wyprowadzenia przy wynikach — przydatne przy nauce i przy sprawdzaniu."
            checked={wyjasnienia}
            onChange={setWyjasnienia}
          />
          <div className="rzad" role="group" aria-label="Jednostka wymiarów">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
              Wymiary w:
            </span>
            {(['cm', 'm'] as Jednostka[]).map((j) => (
              <button
                key={j}
                type="button"
                className={jednostka === j ? 'przycisk glowny' : 'przycisk'}
                aria-pressed={jednostka === j}
                onClick={() => zmienJednostke(j)}
                style={{ minWidth: 56, justifyContent: 'center' }}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        <DostawcaJednostek jednostka={jednostka}>
          {zakladka === 'dach' && (
            <ViewDach input={projekt.input} onChange={zmien} wyjasnienia={wyjasnienia} />
          )}
          {zakladka === 'krokwie' && <ViewKrokwie wynik={wynik} wyjasnienia={wyjasnienia} />}
          {zakladka === 'model' && <ViewModel wynik={wynik} nazwaProjektu={projekt.name} />}
          {zakladka === 'material' && <ViewMaterial wynik={wynik} />}
          {zakladka === 'projekt' && <ViewProjekt input={projekt.input} onChange={zmien} />}
        </DostawcaJednostek>

        <StopkaOdpowiedzialnosci />
      </main>

      {oknoProjektow && (
        <OknoProjektow
          projekty={projekty}
          biezacy={projekt}
          onOtworz={otworz}
          onUsun={usun}
          onNowy={() => {
            setProjekt(newProject())
            setOknoProjektow(false)
            setZakladka('dach')
          }}
          onZamknij={() => setOknoProjektow(false)}
        />
      )}

      {oknoLinku && (
        <OknoLinku projekt={projekt} onZamknij={() => setOknoLinku(false)} />
      )}
    </div>
  )
}

/** Nagłówek widoczny tylko na wydruku — żeby kartka miała opis. */
function NaglowekWydruku({ projekt }: { projekt: Project }) {
  return (
    <div style={{ display: 'none' }} className="tylko-druk">
      <h1 style={{ margin: 0, fontSize: '16pt' }}>{projekt.name}</h1>
      <p style={{ margin: '2pt 0 12pt', fontSize: '9pt' }}>
        {SHAPE_LABELS[projekt.input.shape]} · rozpiętość {mNaMetry(projekt.input.span)} m ·
        długość {mNaMetry(projekt.input.length)} m · nachylenie{' '}
        {liczba(projekt.input.pitchDeg, 0)}° · zestawienie z {dataCzas(new Date().toISOString())}
      </p>
    </div>
  )
}

/** Zastrzeżenie — kalkulator liczy geometrię, nie zastępuje konstruktora. */
function StopkaOdpowiedzialnosci() {
  return (
    <p
      style={{
        fontSize: 12,
        color: 'var(--tekst-slaby)',
        lineHeight: 1.5,
        marginTop: 24,
        paddingTop: 16,
        borderTop: '1px solid var(--linia)',
      }}
    >
      Kalkulator liczy geometrię i ilości materiału na podstawie wpisanych wymiarów.
      Nie sprawdza nośności ani przekrojów — te muszą wynikać z projektu
      konstrukcyjnego. Przed zamówieniem drewna porównaj wyniki z rysunkami.
    </p>
  )
}

/** Okno z listą zapisanych projektów. */
function OknoProjektow({
  projekty,
  biezacy,
  onOtworz,
  onUsun,
  onNowy,
  onZamknij,
}: {
  projekty: Project[]
  biezacy: Project
  onOtworz: (p: Project) => void
  onUsun: (id: string) => void
  onNowy: () => void
  onZamknij: () => void
}) {
  return (
    <div className="nakladka" onClick={onZamknij}>
      <div className="okno" onClick={(e) => e.stopPropagation()}>
        <h2>Zapisane projekty</h2>
        {projekty.length === 0 ? (
          <p className="pusto">
            Nie masz jeszcze zapisanych projektów. Nadaj dachowi nazwę i naciśnij
            „Zapisz".
          </p>
        ) : (
          <ul className="lista-projektow">
            {projekty.map((p) => (
              <li key={p.id}>
                <div className="opis">
                  <strong>{p.name}</strong>
                  <span>
                    {SHAPE_LABELS[p.input.shape]} · {mNaMetry(p.input.span)} ×{' '}
                    {mNaMetry(p.input.length)} m · {dataCzas(p.updatedAt)}
                    {p.id === biezacy.id ? ' · otwarty' : ''}
                  </span>
                </div>
                <button type="button" className="przycisk" onClick={() => onOtworz(p)}>
                  Otwórz
                </button>
                <button
                  type="button"
                  className="przycisk niebezpieczny"
                  onClick={() => onUsun(p.id)}
                  aria-label={`Usuń projekt ${p.name}`}
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="okno-akcje">
          <button type="button" className="przycisk" onClick={onNowy}>
            Nowy dach
          </button>
          <button type="button" className="przycisk glowny" onClick={onZamknij}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}

/** Okno z linkiem do projektu. */
function OknoLinku({ projekt, onZamknij }: { projekt: Project; onZamknij: () => void }) {
  const link = useMemo(() => encodeToUrl(projekt), [projekt])
  const [skopiowane, setSkopiowane] = useState(false)

  const kopiuj = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setSkopiowane(true)
      setTimeout(() => setSkopiowane(false), 2000)
    } catch {
      // Starsze przeglądarki i brak uprawnień — użytkownik zaznaczy tekst sam.
      setSkopiowane(false)
    }
  }

  return (
    <div className="nakladka" onClick={onZamknij}>
      <div className="okno" onClick={(e) => e.stopPropagation()}>
        <h2>Link do projektu</h2>
        <p className="podtytul">
          Cały dach jest zapisany w samym adresie. Link nie wygasa i działa bez
          logowania — kto go ma, otworzy dokładnie te obliczenia.
        </p>
        <textarea className="link-do-kopiowania" readOnly value={link} onFocus={(e) => e.target.select()} />
        <div className="okno-akcje">
          <button type="button" className="przycisk glowny" onClick={kopiuj}>
            {skopiowane ? 'Skopiowano' : 'Kopiuj link'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              className="przycisk"
              onClick={() =>
                navigator
                  .share({ title: projekt.name, url: link })
                  .catch(() => undefined)
              }
            >
              Wyślij
            </button>
          )}
          <button type="button" className="przycisk" onClick={onZamknij}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
