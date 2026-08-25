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
import type { ShelterInput } from './core/shelter'
import { calculateShelter } from './core/shelterMaterials'
import { zbudujModel } from './core/model3d'
import { zbudujModelWiaty } from './core/shelterModel3d'
import type { FurnitureInput } from './core/furniture'
import { calculateFurniture } from './core/furnitureMaterials'
import { zbudujModelMebla } from './core/furnitureModel3d'
import { przepisDla } from './core/furnitureCatalog'
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
  type ProjectKind,
} from './state/project'
import { ViewDach } from './ui/ViewDach'
import { ViewKrokwie } from './ui/ViewKrokwie'
import { ViewMaterial } from './ui/ViewMaterial'
import { ViewProjekt } from './ui/ViewProjekt'
import { ViewModel } from './ui/ViewModel'
import { ViewWiata } from './ui/ViewWiata'
import { ViewKonstrukcjaWiaty } from './ui/ViewKonstrukcjaWiaty'
import { ViewMaterialWiaty } from './ui/ViewMaterialWiaty'
import { ViewMebel } from './ui/ViewMebel'
import { ViewCzesci } from './ui/ViewCzesci'
import { ViewMaterialMebla } from './ui/ViewMaterialMebla'
import { Przelacznik } from './ui/controls'
import { DostawcaJednostek, type Jednostka } from './ui/units'
import { dataCzas, liczba, mNaMetry } from './ui/format'
import { SHAPE_LABELS } from './core/defaults'
import { SHELTER_KIND_LABELS } from './core/shelter'

type Zakladka =
  | 'dach'
  | 'krokwie'
  | 'model'
  | 'material'
  | 'projekt'
  | 'wiata'
  | 'konstrukcja'
  | 'mebel'
  | 'czesci'

/**
 * Zakładki zależą od tego, co się liczy. Dach ma import wymiarów z PDF-a,
 * wiata zamiast tego osobny ekran konstrukcji ze słupami i fundamentem,
 * a mebel — listę części z instrukcją montażu krok po kroku.
 */
const ZAKLADKI: Record<ProjectKind, Array<{ id: Zakladka; label: string; ikona: string }>> = {
  dach: [
    { id: 'dach', label: 'Dach', ikona: '📐' },
    { id: 'krokwie', label: 'Krokwie', ikona: '📏' },
    { id: 'model', label: 'Model', ikona: '🏠' },
    { id: 'material', label: 'Materiał', ikona: '🪵' },
    { id: 'projekt', label: 'Projekt', ikona: '📄' },
  ],
  wiata: [
    { id: 'wiata', label: 'Wiata', ikona: '🛖' },
    { id: 'konstrukcja', label: 'Konstrukcja', ikona: '📏' },
    { id: 'model', label: 'Model', ikona: '🏠' },
    { id: 'material', label: 'Materiał', ikona: '🪵' },
  ],
  mebel: [
    { id: 'mebel', label: 'Mebel', ikona: '🪑' },
    { id: 'czesci', label: 'Części i montaż', ikona: '🔩' },
    { id: 'model', label: 'Model', ikona: '🧊' },
    { id: 'material', label: 'Materiał', ikona: '🪵' },
  ],
}

/** Pierwsza zakładka po przełączeniu rodzaju — ta, na której się coś wpisuje. */
const PIERWSZA_ZAKLADKA: Record<ProjectKind, Zakladka> = {
  dach: 'dach',
  wiata: 'wiata',
  mebel: 'mebel',
}

/** Nazwy rodzajów projektu w przełączniku nagłówka. */
const RODZAJE: Array<{ id: ProjectKind; label: string }> = [
  { id: 'dach', label: 'Dach' },
  { id: 'wiata', label: 'Wiata' },
  { id: 'mebel', label: 'Meble' },
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

  const wiata = projekt.kind === 'wiata'
  const mebel = projekt.kind === 'mebel'
  const zakladki = ZAKLADKI[projekt.kind]

  const wynik = useMemo(() => calculate(projekt.input), [projekt.input])
  const wynikWiaty = useMemo(() => calculateShelter(projekt.shelter), [projekt.shelter])
  const wynikMebla = useMemo(() => calculateFurniture(projekt.furniture), [projekt.furniture])

  // Model przestrzenny powstaje dopiero wtedy, gdy ktoś go ogląda — przy każdej
  // zmianie wymiaru budowanie kilkuset brył byłoby czystą stratą.
  const model = useMemo(() => {
    if (zakladka !== 'model') return null
    if (mebel) return zbudujModelMebla(wynikMebla)
    return wiata ? zbudujModelWiaty(wynikWiaty) : zbudujModel(wynik)
  }, [zakladka, wiata, mebel, wynik, wynikWiaty, wynikMebla])

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

  const zmienWiate = (patch: Partial<ShelterInput>) =>
    setProjekt((p) => ({ ...p, shelter: { ...p.shelter, ...patch } }))

  const zmienMebel = (patch: Partial<FurnitureInput>) =>
    setProjekt((p) => ({ ...p, furniture: { ...p.furniture, ...patch } }))

  /**
   * Przełączenie rodzaju nie kasuje drugiego kompletu danych — projekt trzyma
   * oba naraz, więc powrót do dachu zastaje go dokładnie tam, gdzie był.
   */
  const zmienRodzaj = (kind: ProjectKind) => {
    if (kind === projekt.kind) return
    setProjekt((p) => ({ ...p, kind }))
    setZakladka(PIERWSZA_ZAKLADKA[kind])
  }

  const zapisz = () => {
    setProjekty(saveProject(projekt))
    setKomunikat('Projekt zapisany.')
  }

  const otworz = (p: Project) => {
    setProjekt(p)
    setOknoProjektow(false)
    setZakladka(PIERWSZA_ZAKLADKA[p.kind])
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

        <div className="rzad" role="group" aria-label="Rodzaj konstrukcji">
          {RODZAJE.map((r) => (
            <button
              key={r.id}
              type="button"
              className={projekt.kind === r.id ? 'przycisk glowny' : 'przycisk'}
              aria-pressed={projekt.kind === r.id}
              onClick={() => zmienRodzaj(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <input
          className="nazwa-projektu"
          value={projekt.name}
          onChange={(e) => setProjekt((p) => ({ ...p, name: e.target.value }))}
          aria-label="Nazwa projektu"
          placeholder={mebel ? 'Nazwa mebla' : wiata ? 'Nazwa wiaty' : 'Nazwa dachu'}
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
        {zakladki.map((z) => (
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
          {!wiata && zakladka === 'dach' && (
            <ViewDach input={projekt.input} onChange={zmien} wyjasnienia={wyjasnienia} />
          )}
          {!wiata && zakladka === 'krokwie' && (
            <ViewKrokwie wynik={wynik} wyjasnienia={wyjasnienia} />
          )}
          {!wiata && zakladka === 'material' && <ViewMaterial wynik={wynik} />}
          {!wiata && zakladka === 'projekt' && (
            <ViewProjekt input={projekt.input} onChange={zmien} />
          )}

          {wiata && zakladka === 'wiata' && (
            <ViewWiata input={projekt.shelter} onChange={zmienWiate} wyjasnienia={wyjasnienia} />
          )}
          {wiata && zakladka === 'konstrukcja' && (
            <ViewKonstrukcjaWiaty wynik={wynikWiaty} wyjasnienia={wyjasnienia} />
          )}
          {wiata && zakladka === 'material' && <ViewMaterialWiaty wynik={wynikWiaty} />}

          {mebel && zakladka === 'mebel' && (
            <ViewMebel input={projekt.furniture} onChange={zmienMebel} wynik={wynikMebla} />
          )}
          {mebel && zakladka === 'czesci' && <ViewCzesci wynik={wynikMebla} />}
          {mebel && zakladka === 'material' && <ViewMaterialMebla wynik={wynikMebla} />}

          {zakladka === 'model' && model && (
            <ViewModel
              model={model}
              nazwaProjektu={projekt.name}
              etykietaCalosci={mebel ? 'Gotowy mebel' : wiata ? 'Cała wiata' : 'Cały dach'}
              opisPlotna={
                mebel
                  ? 'Przestrzenny model mebla'
                  : wiata
                    ? 'Przestrzenny model wiaty'
                    : 'Przestrzenny model więźby dachowej'
              }
              wskazowka={
                mebel ? (
                  <>
                    Tryb montażu pokazuje mebel składany krok po kroku — w tej samej
                    kolejności co instrukcja w zakładce „Części i montaż". Oznaczenia
                    części i długości do docięcia znajdziesz właśnie tam.
                  </>
                ) : wiata ? (
                  <>
                    Model pokazuje rozmieszczenie i wymiary elementów wraz ze stopami
                    fundamentowymi. Kąty cięć i sposób osadzenia słupa znajdziesz
                    w zakładce „Konstrukcja".
                  </>
                ) : undefined
              }
            />
          )}
        </DostawcaJednostek>

        <StopkaOdpowiedzialnosci mebel={mebel} />
      </main>

      {oknoProjektow && (
        <OknoProjektow
          projekty={projekty}
          biezacy={projekt}
          onOtworz={otworz}
          onUsun={usun}
          onNowy={(kind) => {
            setProjekt(newProject(undefined, kind))
            setOknoProjektow(false)
            setZakladka(PIERWSZA_ZAKLADKA[kind])
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
        {opisProjektu(projekt)}
        {projekt.kind !== 'mebel' && (
          <>
            {' · nachylenie '}
            {liczba(
              projekt.kind === 'wiata' ? projekt.shelter.pitchDeg : projekt.input.pitchDeg,
              0,
            )}
            °
          </>
        )}
        {' · zestawienie z '}
        {dataCzas(new Date().toISOString())}
      </p>
    </div>
  )
}

/** Krótkie nazwy gatunków — do jednolinijkowego opisu projektu. */
const GATUNEK_KROTKO: Record<string, string> = {
  sosna: 'sosna',
  'sosna-impregnowana': 'sosna impregnowana',
  swierk: 'świerk',
  modrzew: 'modrzew',
  dab: 'dąb',
  akacja: 'akacja',
}

/** Jednolinijkowy opis projektu — ten sam na wydruku i na liście zapisanych. */
function opisProjektu(projekt: Project): string {
  if (projekt.kind === 'mebel') {
    const przepis = przepisDla(projekt.furniture.model)
    return `${przepis.nazwa} · ${GATUNEK_KROTKO[projekt.furniture.gatunek] ?? ''}`.trim()
  }
  if (projekt.kind === 'wiata') {
    const w = projekt.shelter
    return `${SHELTER_KIND_LABELS[w.kind].label} · ${mNaMetry(w.width)} × ${mNaMetry(w.length)} m`
  }
  const d = projekt.input
  return `${SHAPE_LABELS[d.shape]} · ${mNaMetry(d.span)} × ${mNaMetry(d.length)} m`
}

/** Zastrzeżenie — kalkulator liczy geometrię, nie zastępuje konstruktora. */
function StopkaOdpowiedzialnosci({ mebel }: { mebel: boolean }) {
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
      {mebel ? (
        <>
          Kalkulator liczy geometrię, ilości materiału i kolejność montażu. Przekroje
          w przepisach są sprawdzone w praktyce, ale nie są wynikiem obliczeń
          wytrzymałościowych — przy meblu, na którym ktoś usiądzie wysoko albo który
          ma wisieć, kieruj się zdrowym rozsądkiem i nie oszczędzaj na drewnie.
          Zmierz materac, kubeł albo psa, zanim dotniesz pierwszą deskę.
        </>
      ) : (
        <>
          Kalkulator liczy geometrię i ilości materiału na podstawie wpisanych wymiarów.
          Nie sprawdza nośności ani przekrojów — te muszą wynikać z projektu
          konstrukcyjnego. Przed zamówieniem drewna porównaj wyniki z rysunkami.
        </>
      )}
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
  onNowy: (kind: ProjectKind) => void
  onZamknij: () => void
}) {
  return (
    <div className="nakladka" onClick={onZamknij}>
      <div className="okno" onClick={(e) => e.stopPropagation()}>
        <h2>Zapisane projekty</h2>
        {projekty.length === 0 ? (
          <p className="pusto">
            Nie masz jeszcze zapisanych projektów. Nadaj projektowi nazwę i naciśnij
            „Zapisz".
          </p>
        ) : (
          <ul className="lista-projektow">
            {projekty.map((p) => (
              <li key={p.id}>
                <div className="opis">
                  <strong>{p.name}</strong>
                  <span>
                    {opisProjektu(p)} · {dataCzas(p.updatedAt)}
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
          <button type="button" className="przycisk" onClick={() => onNowy('dach')}>
            Nowy dach
          </button>
          <button type="button" className="przycisk" onClick={() => onNowy('wiata')}>
            Nowa wiata
          </button>
          <button type="button" className="przycisk" onClick={() => onNowy('mebel')}>
            Nowy mebel
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
          Cały projekt jest zapisany w samym adresie. Link nie wygasa i działa bez
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
