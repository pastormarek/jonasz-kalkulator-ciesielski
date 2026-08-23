/**
 * Odczyt projektu z pliku PDF.
 *
 * CO TA FUNKCJA ROBI, A CZEGO NIE
 * -------------------------------
 * Nie „rozumie" rysunku. Wyciąga z pliku warstwę tekstową, grupuje ją w linie
 * i szuka liczb, które wyglądają na wymiary — razem ze słowami stojącymi
 * obok. Efekt to LISTA PROPOZYCJI do zatwierdzenia przez człowieka, nigdy
 * gotowe dane wejściowe. Przy drewnie kosztującym kilkanaście tysięcy złotych
 * automat, któremu się ślepo ufa, jest gorszy niż brak automatu.
 *
 * Skan bez warstwy tekstowej nie da nic — wtedy zostaje podgląd i przepisanie
 * wymiarów ręcznie, co też jest w aplikacji przewidziane.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * pdf.js waży ponad 2 MB, a większość użytkowników nigdy nie otworzy PDF-a —
 * na budowie liczy się głównie krokwie. Dlatego wczytujemy go dopiero przy
 * pierwszym pliku i zapamiętujemy obietnicę, żeby nie robić tego dwa razy.
 */
let bibliotekaPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function biblioteka(): Promise<typeof import('pdfjs-dist')> {
  if (!bibliotekaPromise) {
    bibliotekaPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjs
    })()
  }
  return bibliotekaPromise
}

/** Do czego może się odnosić znaleziona liczba. */
export type Rola =
  | 'span'
  | 'length'
  | 'pitch'
  | 'eaves'
  | 'spacing'
  | 'section'
  | 'collarHeight'
  | 'nieznana'

/** Pojedyncza wartość znaleziona w pliku. */
export interface Kandydat {
  id: string
  /** Wartość po zamianie na milimetry (albo stopnie, gdy rola to 'pitch'). */
  wartosc: number
  /** Tekst tak, jak stał w pliku. */
  tekstZrodlowy: string
  /** Cała linia, w której wartość wystąpiła — daje kontekst. */
  kontekst: string
  rola: Rola
  /** Numer strony, licząc od 1. */
  strona: number
  /** Na ile pewne jest przypisanie roli: 0–1. */
  pewnosc: number
  /** Rozpoznany przekrój, gdy rola to 'section'. */
  przekroj?: { b: number; h: number }
}

/** Wynik analizy całego pliku. */
export interface AnalizaPdf {
  liczbaStron: number
  kandydaci: Kandydat[]
  /** Czy plik w ogóle ma warstwę tekstową. */
  maTekst: boolean
  dokument: PDFDocumentProxy
}

/** Słowa kluczowe przypisujące liczbie znaczenie. */
const SLOWA: Array<{ rola: Rola; wzorce: RegExp }> = [
  { rola: 'span', wzorce: /rozpi[eę]to[sś][cć]|szeroko[sś][cć]\s*budynku|rozstaw\s*mur[lł]at|w\s*osiach\s*[sś]cian/i },
  { rola: 'length', wzorce: /d[lł]ugo[sś][cć]\s*budynku|d[lł]ugo[sś][cć]\s*kalenicy|d[lł]ugo[sś][cć]\s*dachu/i },
  { rola: 'pitch', wzorce: /k[aą]t|nachylen|spadek|pochylen/i },
  { rola: 'eaves', wzorce: /okap|wysi[eę]g|wysuni[eę]cie|nadwieszen/i },
  { rola: 'spacing', wzorce: /rozstaw|co\s*\d+\s*(cm|mm)|osiowo/i },
  { rola: 'collarHeight', wzorce: /j[eę]tk/i },
  { rola: 'section', wzorce: /przekr[oó]j|krokw|mur[lł]at|p[lł]atew|s[lł]up|belk/i },
]

/** Wczytuje plik PDF i wyszukuje w nim wymiary. */
export async function analizujPdf(plik: File): Promise<AnalizaPdf> {
  const pdfjs = await biblioteka()
  const bufor = await plik.arrayBuffer()
  const dokument = await pdfjs.getDocument({ data: bufor }).promise

  const kandydaci: Kandydat[] = []
  let znakow = 0

  for (let nr = 1; nr <= dokument.numPages; nr++) {
    const strona = await dokument.getPage(nr)
    const tekst = await strona.getTextContent()

    // pdf.js miesza w jednej liście fragmenty tekstu i znaczniki struktury;
    // interesują nas tylko te pierwsze, czyli mające pole `str`.
    const linie = grupujWLinie(
      tekst.items.flatMap((it) => {
        if (!('str' in it)) return []
        const { str, transform } = it
        return [{ tekst: str, x: transform[4], y: transform[5] }]
      }),
    )

    for (const linia of linie) {
      znakow += linia.length
      kandydaci.push(...szukajWLinii(linia, nr))
    }
  }

  return {
    liczbaStron: dokument.numPages,
    kandydaci: odsiejPowtorki(kandydaci),
    maTekst: znakow > 20,
    dokument,
  }
}

/** Renderuje stronę PDF na element canvas — do podglądu obok formularza. */
export async function renderujStrone(
  dokument: PDFDocumentProxy,
  numer: number,
  canvas: HTMLCanvasElement,
  szerokoscDocelowa: number,
): Promise<void> {
  const strona = await dokument.getPage(numer)
  const bazowy = strona.getViewport({ scale: 1 })
  const skala = Math.max(0.2, szerokoscDocelowa / bazowy.width)
  const viewport = strona.getViewport({ scale: skala })

  const kontekst = canvas.getContext('2d')
  if (!kontekst) return

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  await strona.render({ canvas, canvasContext: kontekst, viewport }).promise
}

/**
 * Skleja pojedyncze fragmenty tekstu w linie.
 * pdf.js zwraca tekst w kawałkach, często rozbitych w środku wyrazu, więc bez
 * takiego sklejenia kontekst („rozpiętość" obok „8,00") by przepadł.
 */
function grupujWLinie(elementy: Array<{ tekst: string; x: number; y: number }>): string[] {
  if (elementy.length === 0) return []

  const posortowane = [...elementy].sort((a, b) => b.y - a.y || a.x - b.x)
  const linie: string[] = []
  let biezaca: string[] = []
  let ostatnieY = posortowane[0].y

  for (const el of posortowane) {
    // Różnica ponad 3 punkty w pionie to już nowa linia.
    if (Math.abs(el.y - ostatnieY) > 3) {
      if (biezaca.length) linie.push(biezaca.join(' ').replace(/\s+/g, ' ').trim())
      biezaca = []
      ostatnieY = el.y
    }
    if (el.tekst.trim()) biezaca.push(el.tekst.trim())
  }
  if (biezaca.length) linie.push(biezaca.join(' ').replace(/\s+/g, ' ').trim())

  return linie.filter((l) => l.length > 0)
}

/** Wyszukuje w jednej linii wymiary, kąty i przekroje. */
function szukajWLinii(linia: string, strona: number): Kandydat[] {
  const wynik: Kandydat[] = []
  const rola = rozpoznajRole(linia)

  // --- przekroje w rodzaju "8x18", "80 x 180", "8/18" ---
  const przekroje = linia.matchAll(/(\d{1,3})\s*[x×\/]\s*(\d{1,3})(?!\d)/gi)
  for (const m of przekroje) {
    const b = doMilimetrow(Number(m[1]), linia, true)
    const h = doMilimetrow(Number(m[2]), linia, true)
    if (b >= 20 && h >= 20 && b <= 400 && h <= 500) {
      wynik.push({
        id: `${strona}-${m.index}-s`,
        wartosc: b,
        przekroj: { b, h },
        tekstZrodlowy: m[0],
        kontekst: skroc(linia),
        rola: 'section',
        strona,
        pewnosc: rola === 'section' ? 0.85 : 0.5,
      })
    }
  }

  // --- kąty ---
  const katy = linia.matchAll(/(\d{1,2}(?:[.,]\d+)?)\s*(?:°|st\.?|stopni)/gi)
  for (const m of katy) {
    const v = Number(m[1].replace(',', '.'))
    if (v > 0 && v < 90) {
      wynik.push({
        id: `${strona}-${m.index}-k`,
        wartosc: v,
        tekstZrodlowy: m[0],
        kontekst: skroc(linia),
        rola: 'pitch',
        strona,
        pewnosc: 0.9,
      })
    }
  }

  // --- wymiary liniowe ---
  const wymiary = linia.matchAll(/(\d{1,3}(?:[.,]\d{1,3})?)\s*(mm|cm|m)(?![a-ząćęłńóśźż])/gi)
  for (const m of wymiary) {
    const surowa = Number(m[1].replace(',', '.'))
    const jednostka = m[2].toLowerCase()
    const wMm = jednostka === 'm' ? surowa * 1000 : jednostka === 'cm' ? surowa * 10 : surowa
    if (wMm >= 30 && wMm <= 40000) {
      wynik.push({
        id: `${strona}-${m.index}-w`,
        wartosc: wMm,
        tekstZrodlowy: m[0],
        kontekst: skroc(linia),
        rola: rola === 'section' ? 'nieznana' : rola,
        strona,
        pewnosc: rola === 'nieznana' ? 0.4 : 0.8,
      })
    }
  }

  // --- liczby bez jednostki, ale w linii z wyraźnym słowem kluczowym ---
  if (rola !== 'nieznana' && rola !== 'section' && wynik.length === 0) {
    const gole = linia.matchAll(/(?<![\d.,°])(\d{2,5}(?:[.,]\d{1,2})?)(?![\d.,°])/g)
    for (const m of gole) {
      const wMm = doMilimetrow(Number(m[1].replace(',', '.')), linia, false)
      if (wMm >= 100 && wMm <= 40000) {
        wynik.push({
          id: `${strona}-${m.index}-g`,
          wartosc: wMm,
          tekstZrodlowy: m[0],
          kontekst: skroc(linia),
          rola,
          strona,
          pewnosc: 0.45,
        })
      }
    }
  }

  return wynik
}

/** Zgaduje rolę liczby na podstawie słów w linii. */
function rozpoznajRole(linia: string): Rola {
  for (const { rola, wzorce } of SLOWA) {
    if (wzorce.test(linia)) return rola
  }
  return 'nieznana'
}

/**
 * Zamienia liczbę bez jednostki na milimetry.
 * Projekty bywają opisane w metrach (8,00), centymetrach (800) i milimetrach
 * (8000), więc zgadujemy po rzędzie wielkości — i dlatego wynik zawsze wymaga
 * potwierdzenia przez człowieka.
 */
function doMilimetrow(v: number, linia: string, przekroj: boolean): number {
  if (/\bmm\b/i.test(linia)) return v
  if (/\bcm\b/i.test(linia)) return v * 10
  if (przekroj) return v < 40 ? v * 10 : v // 8x18 to centymetry, 80x180 to milimetry
  if (v < 30) return v * 1000 // 8,00 to metry
  if (v < 1500) return v * 10 // 800 to centymetry
  return v
}

/** Skraca linię do czytelnego kontekstu. */
function skroc(linia: string): string {
  const czysta = linia.replace(/\s+/g, ' ').trim()
  return czysta.length > 90 ? `${czysta.slice(0, 87)}…` : czysta
}

/** Usuwa powtórzone wartości, zostawiając te o najwyższej pewności. */
function odsiejPowtorki(kandydaci: Kandydat[]): Kandydat[] {
  const mapa = new Map<string, Kandydat>()
  for (const k of kandydaci) {
    const klucz = `${k.rola}:${Math.round(k.wartosc)}:${k.przekroj?.h ?? ''}`
    const stary = mapa.get(klucz)
    if (!stary || k.pewnosc > stary.pewnosc) mapa.set(klucz, k)
  }
  return [...mapa.values()].sort((a, b) => b.pewnosc - a.pewnosc || a.strona - b.strona)
}

/** Nazwy ról widoczne w interfejsie. */
export const ROLA_LABELS: Record<Rola, string> = {
  span: 'Rozpiętość budynku',
  length: 'Długość budynku',
  pitch: 'Kąt nachylenia',
  eaves: 'Wysunięcie okapu',
  spacing: 'Rozstaw krokwi',
  section: 'Przekrój drewna',
  collarHeight: 'Wysokość jętki',
  nieznana: 'Wymiar bez opisu',
}
