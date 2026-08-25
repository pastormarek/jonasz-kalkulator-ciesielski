/**
 * Projekt użytkownika: zapis lokalny i udostępnianie linkiem.
 *
 * DLACZEGO LINK, A NIE SERWER
 * ---------------------------
 * Cały projekt mieści się w kilkuset bajtach, więc pakujemy go do samego
 * adresu URL. Nie ma bazy danych, nie ma kosztów utrzymania, a link nie
 * wygasa po pół roku — działa tak długo, jak długo ktoś go ma zapisanego.
 * Kiedy dojdą konta użytkowników, ten sam format wejdzie do bazy bez zmian.
 */

import LZString from 'lz-string'
import type { RoofInput } from '../core/types'
import { defaultInput } from '../core/defaults'
import { defaultShelter, type ShelterInput } from '../core/shelter'

/**
 * Co liczy ten projekt: dach budynku czy wiatę.
 * To dwa różne komplety danych i dwa różne zestawy zakładek.
 */
export type ProjectKind = 'dach' | 'wiata'

/** Zapisany projekt. */
export interface Project {
  /** Identyfikator lokalny. */
  id: string
  /** Nazwa nadana przez użytkownika, np. "Dom Kowalscy, Wólka". */
  name: string
  /** Data ostatniego zapisu w formacie ISO. */
  updatedAt: string
  /** Rodzaj konstrukcji — decyduje, które dane są tu istotne. */
  kind: ProjectKind
  input: RoofInput
  /**
   * Dane wiaty. Projekt trzyma oba komplety naraz, żeby przełączenie rodzaju
   * niczego nie kasowało — ktoś, kto liczy dom i wiatę obok, wraca do jednego
   * i drugiego bez utraty pracy.
   */
  shelter: ShelterInput
}

const STORAGE_KEY = 'jonasz.projects.v1'
const LAST_KEY = 'jonasz.last.v1'

/** Tworzy pusty projekt z domyślnymi danymi. */
export function newProject(name?: string, kind: ProjectKind = 'dach'): Project {
  return {
    id: makeId(),
    name: name ?? (kind === 'wiata' ? 'Nowa wiata' : 'Nowy dach'),
    updatedAt: new Date().toISOString(),
    kind,
    input: defaultInput(),
    shelter: defaultShelter(),
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Uzupełnia zapis o pola, których w nim jeszcze nie ma.
 *
 * Projekty zapisane przed dołożeniem wiat mają samo `input` — bez tego
 * uzupełnienia aplikacja wywracałaby się na starych danych użytkownika.
 */
function uzupelnij(zapis: Partial<Project>): Project {
  return {
    id: zapis.id ?? makeId(),
    name: zapis.name ?? 'Projekt',
    updatedAt: zapis.updatedAt ?? new Date().toISOString(),
    kind: zapis.kind === 'wiata' ? 'wiata' : 'dach',
    input: { ...defaultInput(), ...zapis.input },
    shelter: { ...defaultShelter(), ...zapis.shelter },
  }
}

/** Wczytuje listę zapisanych projektów. */
export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<Project>[]
    return Array.isArray(parsed) ? parsed.map(uzupelnij) : []
  } catch {
    // Uszkodzony wpis nie może zablokować całej aplikacji.
    return []
  }
}

/** Dopisuje albo nadpisuje projekt na liście. */
export function saveProject(project: Project): Project[] {
  const all = loadProjects()
  const stamped = { ...project, updatedAt: new Date().toISOString() }
  const idx = all.findIndex((p) => p.id === project.id)
  if (idx >= 0) all[idx] = stamped
  else all.unshift(stamped)
  persist(all)
  return all
}

/** Usuwa projekt z listy. */
export function deleteProject(id: string): Project[] {
  const all = loadProjects().filter((p) => p.id !== id)
  persist(all)
  return all
}

function persist(all: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Brak miejsca albo tryb prywatny — obliczenia mają działać mimo to.
  }
}

/** Zapamiętuje ostatnio otwarty projekt, żeby wrócić do niego po odświeżeniu. */
export function rememberLast(project: Project): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(project))
  } catch {
    /* jak wyżej */
  }
}

/** Odtwarza ostatnio otwarty projekt. */
export function recallLast(): Project | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? uzupelnij(JSON.parse(raw) as Partial<Project>) : null
  } catch {
    return null
  }
}

/**
 * Pakuje projekt do fragmentu adresu URL.
 * Fragment (po #) nigdy nie trafia na serwer, więc dane zostają u użytkownika.
 *
 * Do linku wchodzi tylko ten komplet danych, który jest w projekcie aktywny —
 * link do wiaty nie musi wozić ze sobą nieużywanego dachu.
 */
export function encodeToUrl(project: Project): string {
  const payload = JSON.stringify(
    project.kind === 'wiata'
      ? { n: project.name, k: 'w', s: project.shelter }
      : { n: project.name, i: project.input },
  )
  const packed = LZString.compressToEncodedURIComponent(payload)
  const base = `${location.origin}${location.pathname}`
  return `${base}#p=${packed}`
}

/** Odczytuje projekt z adresu URL. Zwraca null, gdy w adresie nic nie ma. */
export function decodeFromUrl(hash = location.hash): Project | null {
  const match = /[#&]p=([^&]+)/.exec(hash)
  if (!match) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(match[1])
    if (!json) return null
    const parsed = JSON.parse(json) as {
      n?: string
      k?: string
      i?: Partial<RoofInput>
      s?: Partial<ShelterInput>
    }
    const wiata = parsed.k === 'w' && !!parsed.s
    if (!parsed.i && !wiata) return null
    return {
      id: makeId(),
      name: parsed.n ?? (wiata ? 'Wiata z linku' : 'Projekt z linku'),
      updatedAt: new Date().toISOString(),
      kind: wiata ? 'wiata' : 'dach',
      // Scalamy z domyślnymi, żeby starszy link nie wywrócił się po dodaniu pól.
      input: { ...defaultInput(), ...parsed.i },
      shelter: { ...defaultShelter(), ...parsed.s },
    }
  } catch {
    return null
  }
}
