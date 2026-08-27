/**
 * Meble ogrodowe i domowe — model danych i warsztat do pisania przepisów.
 *
 * DLACZEGO INACZEJ NIŻ DACH I WIATA
 * ---------------------------------
 * Dach i wiata to jedna konstrukcja z pokrętłami: zmieniasz rozpiętość i kąt,
 * a wynik jest wciąż tym samym dachem. Meble tak nie działają — ławka, donica
 * i budka dla ptaków nie mają wspólnych parametrów poza tym, że są z drewna.
 * Dlatego nie ma tu jednego `MebelInput` z setką pól, tylko KATALOG PRZEPISÓW:
 * każdy mebel jest funkcją, która z kilku swoich wymiarów układa listę części
 * w przestrzeni. Wspólne zostaje to, co i tak jest wspólne — plan cięcia,
 * zestawienie zakupów, model przestrzenny i instrukcja montażu.
 *
 * CO Z TEGO WYNIKA W KODZIE
 * -------------------------
 * Przepis zwraca `Czesc[]` — każdy fizyczny kawałek drewna osobno, z pozycją.
 * Z tej jednej listy powstaje wszystko:
 *   - model 3D (część to gotowa bryła),
 *   - zestawienie części (grupowanie po nazwie, przekroju i długości),
 *   - plan cięcia i lista zakupów (moduł dachowy, bez zmian),
 *   - instrukcja montażu (części pogrupowane po etapie).
 * Dzięki temu dopisanie mebla to napisanie jednej funkcji, a nie czterech.
 *
 * KONWENCJA JEDNOSTEK jest ta sama co wszędzie: milimetry i stopnie.
 *
 * UKŁAD WSPÓŁRZĘDNYCH MEBLA
 *   X — długość, czyli front mebla; 0 przy lewym boku
 *   Y — głębokość; 0 z przodu, rośnie w głąb
 *   Z — wysokość; 0 na podłodze
 *
 * PRZEKRÓJ CZĘŚCI zapisujemy tak, jak drewno sprzedają: `b` to grubość deski,
 * `h` jej szerokość. Deska 20 × 140 ma więc b = 20, h = 140 — niezależnie od
 * tego, czy w meblu leży płasko, czy stoi na sztorc. O położeniu decyduje
 * osobno kierunek `gora`, który ustawiają funkcje warsztatu poniżej.
 */

import type { Section, StockMode, TimberItem } from './types'
import type { Belka, Etap, Punkt3 } from './model3d'
import { wierzcholki } from './model3d'

// ---------------------------------------------------------------------------
// Materiał
// ---------------------------------------------------------------------------

/** Gatunek drewna, z którego robimy mebel. */
export type Gatunek = 'sosna' | 'sosna-impregnowana' | 'swierk' | 'modrzew' | 'dab' | 'akacja'

/**
 * Co trzeba wiedzieć o gatunku, żeby doradzić rozsądnie.
 *
 * `trwaloscLat` to orientacyjna żywotność drewna NA ZEWNĄTRZ, bez kontaktu
 * z gruntem, przy normalnej pielęgnacji. Nie jest to parametr techniczny
 * z normy, tylko liczba, która ma powstrzymać przed zrobieniem donicy
 * z nieimpregnowanego świerka.
 */
export const GATUNEK_INFO: Record<
  Gatunek,
  { label: string; gestosc: number; trwaloscLat: number; naZewnatrz: boolean; opis: string }
> = {
  sosna: {
    label: 'Sosna',
    gestosc: 520,
    trwaloscLat: 3,
    naZewnatrz: false,
    opis: 'Tania i wszędzie dostępna, dobrze się obrabia. Na dworze bez porządnego wykończenia wytrzyma kilka sezonów.',
  },
  'sosna-impregnowana': {
    label: 'Sosna impregnowana ciśnieniowo',
    gestosc: 550,
    trwaloscLat: 15,
    naZewnatrz: true,
    opis: 'Domyślny wybór na ogród. Zielonkawa albo brązowa, kupowana już nasączona — po docięciu końce trzeba zamalować preparatem do impregnacji.',
  },
  swierk: {
    label: 'Świerk',
    gestosc: 470,
    trwaloscLat: 2,
    naZewnatrz: false,
    opis: 'Lekki i jasny, ale sękaty i mało odporny na wilgoć. Na meble do domu — tak, na deszcz — nie.',
  },
  modrzew: {
    label: 'Modrzew syberyjski',
    gestosc: 650,
    trwaloscLat: 20,
    naZewnatrz: true,
    opis: 'Żywiczny i twardy, sam z siebie odporny na wodę. Droższy od sosny, ale na tarasie i w donicy zwraca różnicę.',
  },
  dab: {
    label: 'Dąb',
    gestosc: 720,
    trwaloscLat: 25,
    naZewnatrz: true,
    opis: 'Najtrwalszy z powszechnie dostępnych. Ciężki, tępi narzędzia i wymaga nawiercania pod każdy wkręt — za to mebel zostaje na pokolenie.',
  },
  akacja: {
    label: 'Akacja (robinia)',
    gestosc: 770,
    trwaloscLat: 25,
    naZewnatrz: true,
    opis: 'Bardzo trwała nawet w kontakcie z ziemią, dlatego robi się z niej place zabaw. Twarda i skręcona — trudniej ją obrobić niż sosnę.',
  },
}

/** Sposób wykończenia gotowego mebla. */
export type Wykonczenie = 'olej' | 'lakierobejca' | 'impregnat' | 'brak'

/**
 * Wydajność i sposób nakładania.
 * `wydajnoscM2NaLitr` to metry kwadratowe z litra na JEDNĄ warstwę — tyle
 * podają producenci na puszce dla drewna szlifowanego.
 */
export const WYKONCZENIE_INFO: Record<
  Wykonczenie,
  { label: string; wydajnoscM2NaLitr: number; warstwy: number; opis: string }
> = {
  olej: {
    label: 'Olej do drewna',
    wydajnoscM2NaLitr: 12,
    warstwy: 2,
    opis: 'Wsiąka zamiast tworzyć powłokę, więc nie łuszczy się i nie trzeba go zdzierać — wystarczy raz na sezon przetrzeć od nowa. Najlepszy wybór na to, czego się dotyka: blaty, siedziska, poręcze.',
  },
  lakierobejca: {
    label: 'Lakierobejca',
    wydajnoscM2NaLitr: 10,
    warstwy: 2,
    opis: 'Barwi i zamyka powierzchnię powłoką. Trzyma dłużej niż olej, ale gdy po latach zacznie pękać, trzeba ją zeszlifować do gołego drewna.',
  },
  impregnat: {
    label: 'Impregnat gruntujący',
    wydajnoscM2NaLitr: 8,
    warstwy: 2,
    opis: 'Chroni przed grzybem i sinizną, ale nie przed wodą i słońcem. Sam nie wystarczy — to warstwa pod olej albo lakierobejcę.',
  },
  brak: {
    label: 'Bez wykończenia',
    wydajnoscM2NaLitr: 0,
    warstwy: 0,
    opis: 'Drewno zostaje surowe. Sensowne tylko w środku albo przy modrzewiu i dębie, które szarzeją, ale się nie psują.',
  },
}

// ---------------------------------------------------------------------------
// Katalog: przepis na mebel
// ---------------------------------------------------------------------------

/** Dział katalogu — po tym meble są pogrupowane przy wyborze. */
export type KategoriaMebla =
  | 'siedziska'
  | 'stoly'
  | 'ogrod'
  | 'przechowywanie'
  | 'dom'
  | 'zwierzeta'

export const KATEGORIA_LABELS: Record<KategoriaMebla, { label: string; opis: string }> = {
  siedziska: { label: 'Siedziska', opis: 'Ławki, krzesła, leżaki i huśtawki' },
  stoly: { label: 'Stoły', opis: 'Stoły, stoliki i blaty robocze' },
  ogrod: { label: 'Ogród', opis: 'Donice, grządki, trejaże i podesty' },
  przechowywanie: { label: 'Przechowywanie', opis: 'Skrzynie, drewutnie, osłony i regały' },
  dom: { label: 'Do domu', opis: 'Półki, stoliki, wieszaki i łóżko' },
  zwierzeta: { label: 'Dla zwierząt i dzieci', opis: 'Karmniki, budy, piaskownice' },
}

/**
 * Jeden parametr mebla — to, co użytkownik może w nim zmienić.
 *
 * Przepis deklaruje swoje parametry, a interfejs sam robi z tego pola.
 * Dzięki temu dołożenie mebla nie wymaga dotykania żadnego komponentu.
 */
export interface ParametrDef {
  klucz: string
  label: string
  min: number
  max: number
  /** Wartość domyślna [mm] albo [szt.]. */
  domyslna: number
  /** Skok strzałek w polu. */
  krok?: number
  /**
   * 'mm' dla wymiarów, 'szt' dla liczebności, '°' dla kąta, 'tak-nie' dla
   * opcji włączanej i wyłączanej. Przy 'tak-nie' wartością jest 0 albo 1 —
   * przepis czyta ją jak każdą inną liczbę, a interfejs rysuje przełącznik.
   */
  jednostka?: 'mm' | 'szt' | '°' | 'tak-nie'
  podpowiedz?: string
}

/** Wartości parametrów jednego mebla. */
export type Wymiary = Record<string, number>

/**
 * Jeden fizyczny kawałek drewna w gotowym meblu.
 *
 * To ta sama struktura co belka więźby — oś od środka czoła do środka czoła
 * plus przekrój — więc model przestrzenny mebla powstaje bez żadnej zamiany.
 */
export interface Czesc extends Omit<Belka, 'id'> {
  /** Ile wkrętów mocuje tę część. Domyślnie 2 — tyle, żeby nie mogła się obrócić. */
  wkretow?: number
  /** Kąt ścięcia końców [°], 0 albo brak = prosto. Trafia do listy części. */
  skos?: number
  /** Uwaga wykonawcza do tej części, np. „zaokrąglić narożnik". */
  uwaga?: string
  /** Element kupowany gotowy (śruba rzymska, łańcuch) nie wchodzi do drewna. */
  nieDrewno?: boolean
}

/** Dodatkowe łączniki, których nie da się wyliczyć z samych styków części. */
export interface DodatkowyLacznik {
  nazwa: string
  sztuk: number
  jednostka?: string
  uwaga?: string
}

/** Przepis na jeden mebel. */
export interface PrzepisMebla {
  id: string
  nazwa: string
  kategoria: KategoriaMebla
  /** Jedno zdanie: co to jest i dla kogo. */
  opis: string
  /** 1 — na jedno popołudnie z wkrętarką, 3 — trzeba umieć i mieć czym. */
  trudnosc: 1 | 2 | 3
  /**
   * W jakich warunkach mebel stoi. Decyduje o tym, jak ostro oceniamy dobór
   * gatunku: świerkowy stolik nocny jest w porządku, świerkowa grządka
   * rozpadnie się w trzy sezony. Pominięte znaczy: wnętrze dla kategorii
   * „do domu”, dwór dla wszystkich pozostałych.
   */
  wilgoc?: 'wnetrze' | 'zewnatrz' | 'grunt'
  /** Orientacyjny czas roboty, np. „3–4 godziny”. */
  czas: string
  /** Czym to się robi poza wkrętarką i piłą. */
  narzedzia?: string[]
  parametry: ParametrDef[]
  /** Układa części mebla w przestrzeni. */
  buduj: (w: Wymiary, m: KontekstMateriau) => Czesc[]
  /** Zdania zastępujące ogólny opis etapu — tam, gdzie mebel ma swoją specyfikę. */
  opisyEtapow?: Partial<Record<Etap, string>>
  /** Uwagi wykonawcze pokazywane pod instrukcją. */
  wskazowki?: string[]
  /**
   * Sprawdzenia, których nie da się wyprowadzić z samej geometrii — bo zależą
   * od czegoś, czego kalkulator nie widzi. Przykład: barierka łóżka piętrowego
   * musi wystawać ponad materac, a grubość materaca jest wyborem użytkownika,
   * nie wymiarem mebla. Zwrócone teksty trafiają do ostrzeżeń.
   */
  ostrzezenia?: (w: Wymiary) => string[]
  /** Łączniki poza wkrętami: zawiasy, śruby, łańcuch. */
  laczniki?: (w: Wymiary) => DodatkowyLacznik[]
}

/**
 * Co przepis wie o materiale.
 * Na razie tylko gatunek — ale np. dąb wymaga nawiercania, więc przepis może
 * dołożyć uwagę, zamiast trzymać ją w jednym miejscu dla wszystkich mebli.
 */
export interface KontekstMateriau {
  gatunek: Gatunek
}

// ---------------------------------------------------------------------------
// Dane projektu
// ---------------------------------------------------------------------------

/** Komplet danych wejściowych jednego mebla. */
export interface FurnitureInput {
  /** Identyfikator przepisu z katalogu. */
  model: string
  /** Wartości parametrów wybranego przepisu. */
  wymiary: Wymiary
  gatunek: Gatunek
  wykonczenie: Wykonczenie
  /** Naddatek na docięcie doliczany do każdej części [mm]. */
  cutAllowance: number
  /** Dostępne długości handlowe tarcicy [mm]. */
  stockLengths: number[]
  stockMode: StockMode
}

/**
 * Długości tarcicy meblowej [mm].
 *
 * Deski i kantówki na meble sprzedaje się krócej niż drewno konstrukcyjne —
 * czterometrówka to już rzadkość na półce, a sześciometrowa deska 20 × 140
 * po prostu nie istnieje w markecie. Stąd inna lista niż przy dachu.
 */
export const FURNITURE_STOCK_LENGTHS = [2000, 2500, 3000, 4000]

/** Na zamówienie w tartaku tarcica bywa dłuższa, ale rzadko powyżej 6 m. */
export const FURNITURE_CUSTOM_LENGTHS = [2000, 2500, 3000, 4000, 5000, 6000]

export function furnitureStockLengthsFor(mode: StockMode): number[] {
  return mode === 'na-wymiar' ? [...FURNITURE_CUSTOM_LENGTHS] : [...FURNITURE_STOCK_LENGTHS]
}

/** Domyślne dane mebla — ławka ogrodowa, bo od niej najczęściej się zaczyna. */
export function defaultFurniture(): FurnitureInput {
  return {
    model: 'lawka-z-oparciem',
    wymiary: {},
    gatunek: 'sosna-impregnowana',
    wykonczenie: 'olej',
    // Mebel tnie się dokładnie, na ogranicznik — naddatek jest tu dużo
    // mniejszy niż na budowie, gdzie krokwie docina się na miejscu.
    cutAllowance: 20,
    stockLengths: [...FURNITURE_STOCK_LENGTHS],
    stockMode: 'handlowe',
  }
}

/**
 * Uzupełnia wymiary o wartości domyślne przepisu i przycina je do zakresu.
 *
 * Dzięki temu przepis może pisać `w.dlugosc` bez sprawdzania, czy pole
 * w ogóle istnieje — a wczytanie starego linku z nieaktualnym zestawem
 * parametrów nie wywraca obliczeń.
 */
export function wymiaryDla(przepis: PrzepisMebla, zapisane: Wymiary): Wymiary {
  const out: Wymiary = {}
  for (const p of przepis.parametry) {
    const v = zapisane[p.klucz]
    out[p.klucz] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.domyslna
  }
  return out
}

// ---------------------------------------------------------------------------
// Skróty do pisania przepisów
// ---------------------------------------------------------------------------

/**
 * Przekrój tarcicy, zapisany tak jak w składzie: grubość × szerokość.
 * `T(20, 140)` to deska dwudziestka o szerokości czternastu centymetrów.
 */
export const T = (b: number, h: number): Section => ({ b, h })

/**
 * Parametry, które powtarzają się w prawie każdym meblu.
 *
 * Bez tego każdy przepis zaczynałby się od trzydziestu linii opisu pól, przez
 * które nie widać samego mebla. Kroki i jednostki są tu dobrane raz, więc
 * cały katalog zachowuje się jednakowo — a to widać przy przełączaniu modeli.
 */
export const par = {
  dlugosc: (domyslna: number, min: number, max: number, podpowiedz?: string): ParametrDef => ({
    klucz: 'dlugosc',
    label: 'Długość',
    domyslna,
    min,
    max,
    krok: 50,
    jednostka: 'mm',
    podpowiedz,
  }),
  glebokosc: (domyslna: number, min: number, max: number, podpowiedz?: string): ParametrDef => ({
    klucz: 'glebokosc',
    label: 'Głębokość',
    domyslna,
    min,
    max,
    krok: 10,
    jednostka: 'mm',
    podpowiedz,
  }),
  szerokosc: (domyslna: number, min: number, max: number, podpowiedz?: string): ParametrDef => ({
    klucz: 'szerokosc',
    label: 'Szerokość',
    domyslna,
    min,
    max,
    krok: 50,
    jednostka: 'mm',
    podpowiedz,
  }),
  wysokosc: (domyslna: number, min: number, max: number, podpowiedz?: string): ParametrDef => ({
    klucz: 'wysokosc',
    label: 'Wysokość',
    domyslna,
    min,
    max,
    krok: 10,
    jednostka: 'mm',
    podpowiedz,
  }),
  /** Opcja włączana i wyłączana — półka pod blatem, daszek, ścianka tylna. */
  opcja: (klucz: string, label: string, domyslnie: boolean, podpowiedz?: string): ParametrDef => ({
    klucz,
    label,
    domyslna: domyslnie ? 1 : 0,
    min: 0,
    max: 1,
    krok: 1,
    jednostka: 'tak-nie',
    podpowiedz,
  }),
  /** Dowolny parametr liczbowy — liczba półek, szczeblin, spadek daszku. */
  wlasny: (
    klucz: string,
    label: string,
    domyslna: number,
    min: number,
    max: number,
    opcje: { krok?: number; jednostka?: 'mm' | 'szt' | '°'; podpowiedz?: string } = {},
  ): ParametrDef => ({
    klucz,
    label,
    domyslna,
    min,
    max,
    krok: opcje.krok ?? 1,
    jednostka: opcje.jednostka ?? 'szt',
    podpowiedz: opcje.podpowiedz,
  }),
}

// ---------------------------------------------------------------------------
// Warsztat — funkcje, którymi pisze się przepisy
// ---------------------------------------------------------------------------

/** Skrót na punkt w przestrzeni. */
export const P = (x: number, y: number, z: number): Punkt3 => ({ x, y, z })

/** Długość części [mm] — odległość między środkami czół. */
export function dlugoscCzesci(c: Czesc): number {
  return Math.hypot(c.koniec.x - c.start.x, c.koniec.y - c.start.y, c.koniec.z - c.start.z)
}

/**
 * Jak deska jest obrócona względem swojej osi.
 * - 'plask'  — szerokość deski leży poziomo (blat, siedzisko, półka),
 * - 'sztorc' — szerokość deski stoi pionowo (oskrzynia, ściana skrzyni, legar).
 */
export type Obrot = 'plask' | 'sztorc'

/** Wspólne pola każdej funkcji warsztatu. */
interface Wspolne {
  nazwa: string
  etap?: Etap
  przekroj?: Section
  wkretow?: number
  skos?: number
  uwaga?: string
  nieDrewno?: boolean
}

/**
 * Warsztat: pamięta bieżący etap i przekrój, żeby przepis nie powtarzał ich
 * przy każdej desce. Przepisy czyta się wtedy jak opis roboty — „teraz nogi
 * z kantówki, teraz oskrzynia z deski”.
 */
export function warsztat() {
  const czesci: Czesc[] = []
  let etapTeraz: Etap = 'rama'
  let przekrojTeraz: Section = { b: 20, h: 100 }

  const dodaj = (
    o: Wspolne,
    start: Punkt3,
    koniec: Punkt3,
    gora: Punkt3,
  ): Czesc => {
    const c: Czesc = {
      nazwa: o.nazwa,
      etap: o.etap ?? etapTeraz,
      start,
      koniec,
      gora,
      b: (o.przekroj ?? przekrojTeraz).b,
      h: (o.przekroj ?? przekrojTeraz).h,
    }
    if (o.wkretow !== undefined) c.wkretow = o.wkretow
    if (o.skos) c.skos = o.skos
    if (o.uwaga) c.uwaga = o.uwaga
    if (o.nieDrewno) c.nieDrewno = true
    czesci.push(c)
    return c
  }

  return {
    /** Przestawia etap i przekrój na kolejną partię części. */
    ustaw(etap: Etap, przekroj: Section) {
      etapTeraz = etap
      przekrojTeraz = przekroj
    },

    /** Sam przekrój, gdy w tym samym etapie idzie inna tarcica. */
    tarcica(przekroj: Section) {
      przekrojTeraz = przekroj
    },

    /**
     * Element pionowy — noga, słupek, listwa oparcia.
     * Szerokość przekroju (h) odkłada się wzdłuż osi Y, grubość (b) wzdłuż X.
     */
    pion(o: Wspolne & { x: number; y: number; od: number; do: number }) {
      return dodaj(o, P(o.x, o.y, o.od), P(o.x, o.y, o.do), P(0, 1, 0))
    },

    /**
     * Element poziomy biegnący wzdłuż mebla (oś X).
     *
     * `pochylenie` to kąt odchylenia od pionu w radianach — dla deski, która
     * ma leżeć w płaszczyźnie odchylonego oparcia, a nie płasko jak półka.
     * Bez niego deska oparcia fotela wyglądała jak wysunięta szuflada; cieśla
     * ujął to krótko: „zawsze deska jest montowana prawie pionowo lub pod
     * kątem, jakim biegnie oparcie".
     */
    wzdluz(
      o: Wspolne & {
        od: number
        do: number
        y: number
        z: number
        obrot?: Obrot
        pochylenie?: number
      },
    ) {
      const gora =
        o.pochylenie !== undefined
          ? P(0, Math.sin(o.pochylenie), Math.cos(o.pochylenie))
          : o.obrot === 'sztorc'
            ? P(0, 0, 1)
            : P(0, 1, 0)
      return dodaj(o, P(o.od, o.y, o.z), P(o.do, o.y, o.z), gora)
    },

    /**
     * Element poziomy biegnący w głąb mebla (oś Y).
     *
     * `pochylenie` działa jak przy `wzdluz`, tylko że w płaszczyźnie XZ —
     * dla listew leżących na odchylonym oparciu leżanki.
     */
    wszerz(
      o: Wspolne & {
        od: number
        do: number
        x: number
        z: number
        obrot?: Obrot
        pochylenie?: number
      },
    ) {
      const gora =
        o.pochylenie !== undefined
          ? P(Math.sin(o.pochylenie), 0, Math.cos(o.pochylenie))
          : o.obrot === 'sztorc'
            ? P(0, 0, 1)
            : P(1, 0, 0)
      return dodaj(o, P(o.x, o.od, o.z), P(o.x, o.do, o.z), gora)
    },

    /**
     * Deski połaci daszku, ułożone wzdłuż mebla i pochylone razem z nią.
     *
     * Kusi, żeby po prostu rozłożyć poziome deski na kilku wysokościach —
     * ale wychodzą wtedy schodki, a nie połać: każda deska leży płasko,
     * zamiast być obrócona równolegle do spadku. Dlatego szerokość deski
     * odkładamy wzdłuż linii spadku, a grubość prostopadle do połaci.
     *
     * Punkty `odY/odZ` i `doY/doZ` to przekrój połaci: zwykle od okapu
     * do kalenicy. Deski powstają na całej tej długości.
     */
    polac(
      o: Wspolne & {
        od: number
        do: number
        odY: number
        odZ: number
        doY: number
        doZ: number
      },
    ) {
      const dy = o.doY - o.odY
      const dz = o.doZ - o.odZ
      const dlugosc = Math.hypot(dy, dz)
      if (dlugosc < 1) return []
      const gora = P(0, dy / dlugosc, dz / dlugosc)
      const przekroj = o.przekroj ?? przekrojTeraz
      // Deski pokrycia układamy NA STYK, od okapu w górę. Rozkład ze równymi
      // szczelinami, dobry przy siedzisku, zostawiłby tu w dachu szpary —
      // dlatego ostatnia deska zachodzi na poprzednią i przycina się ją
      // wzdłuż na miejscu, dokładnie tak jak przy krokwiach.
      const sztuk = Math.max(1, Math.ceil(dlugosc / przekroj.h))
      const szerokosc = sztuk === 1 ? dlugosc : przekroj.h
      const wynik: Czesc[] = []
      for (let i = 0; i < sztuk; i++) {
        const srodek =
          sztuk === 1
            ? dlugosc / 2
            : Math.min((i + 0.5) * przekroj.h, dlugosc - przekroj.h / 2)
        const u = srodek / dlugosc
        wynik.push(
          dodaj(
            {
              ...o,
              przekroj: { b: przekroj.b, h: szerokosc },
              uwaga:
                i === sztuk - 1 && sztuk > 1
                  ? [o.uwaga, 'ostatnią deskę dotnij wzdłuż'].filter(Boolean).join('; ')
                  : o.uwaga,
            },
            P(o.od, o.odY + dy * u, o.odZ + dz * u),
            P(o.do, o.odY + dy * u, o.odZ + dz * u),
            gora,
          ),
        )
      }
      return wynik
    },

    /**
     * Dowolny odcinek — zastrzał, noga rozstawiona, deska oparcia pod kątem.
     * `gora` można pominąć: warsztat dobierze kierunek prostopadły do osi,
     * leżący możliwie płasko względem tego, co wskazuje `plaszczyzna`.
     */
    ukos(
      o: Wspolne & {
        start: Punkt3
        koniec: Punkt3
        gora?: Punkt3
        /** Kierunek, w którym ma patrzeć szerokość deski. */
        plaszczyzna?: Punkt3
      },
    ) {
      const gora = o.gora ?? prostopadleDo(o.start, o.koniec, o.plaszczyzna)
      return dodaj(o, o.start, o.koniec, gora)
    },

    /** Gotowa lista części. */
    zbior(): Czesc[] {
      return czesci
    },
  }
}

export type Warsztat = ReturnType<typeof warsztat>

/**
 * Dobiera kierunek szerokości dla elementu ukośnego.
 *
 * Domyślnie deska ukośna ma leżeć płasko w płaszczyźnie, w której biegnie —
 * tak jak zastrzał przybity z boku nogi. Gdy oś jest niemal równoległa do
 * podpowiedzi, bierzemy drugi kierunek, żeby wektor nie zdegenerował się do zera.
 */
function prostopadleDo(start: Punkt3, koniec: Punkt3, plaszczyzna?: Punkt3): Punkt3 {
  const os = { x: koniec.x - start.x, y: koniec.y - start.y, z: koniec.z - start.z }
  const dl = Math.hypot(os.x, os.y, os.z) || 1
  const n = { x: os.x / dl, y: os.y / dl, z: os.z / dl }
  const kandydaci = plaszczyzna ? [plaszczyzna] : [P(0, 1, 0), P(0, 0, 1), P(1, 0, 0)]
  for (const k of [...kandydaci, P(0, 1, 0), P(0, 0, 1), P(1, 0, 0)]) {
    const rzut = k.x * n.x + k.y * n.y + k.z * n.z
    const reszta = { x: k.x - n.x * rzut, y: k.y - n.y * rzut, z: k.z - n.z * rzut }
    if (Math.hypot(reszta.x, reszta.y, reszta.z) > 0.2) return reszta
  }
  return P(0, 0, 1)
}

/**
 * Rozkłada deski na zadanej szerokości ze szczelinami.
 *
 * To najczęstszy rachunek w całym katalogu: siedzisko, blat, dno i ściana
 * skrzyni to zawsze kilka desek obok siebie i szczeliny między nimi. Szczelina
 * nie jest ozdobą — bez niej woda stoi na styku, a drewno pęczniejąc wypycha
 * wkręty.
 *
 * Liczbę desek dobieramy tak, żeby szczelina wypadła jak najbliżej zadanej,
 * a potem rozkładamy różnicę równo — deski zostają w handlowej szerokości,
 * bo docinanie każdej wzdłuż byłoby robotą na cały dzień.
 *
 * @param szerokosc  szerokość do wypełnienia [mm]
 * @param deska      szerokość jednej deski [mm]
 * @param szczelina  pożądana szczelina [mm]
 */
export function rozkladDesek(
  szerokosc: number,
  deska: number,
  szczelina: number,
): { sztuk: number; szczelina: number; srodki: number[] } {
  if (szerokosc <= 0 || deska <= 0) return { sztuk: 0, szczelina: 0, srodki: [] }

  const sztuk = Math.max(1, Math.round((szerokosc + szczelina) / (deska + szczelina)))
  const luz = sztuk > 1 ? (szerokosc - sztuk * deska) / (sztuk - 1) : 0
  const srodki: number[] = []
  for (let i = 0; i < sztuk; i++) srodki.push(deska / 2 + i * (deska + luz))
  return { sztuk, szczelina: Math.max(0, luz), srodki }
}

/**
 * Rozkłada elementy w równych odstępach między dwoma skrajnymi pozycjami.
 * Używane tam, gdzie liczy się rozstaw osi, a nie szczelina — szczebliny
 * trejaża, listwy oparcia, poprzeczki dna.
 */
export function rownyRozstaw(od: number, do_: number, sztuk: number): number[] {
  if (sztuk <= 0) return []
  if (sztuk === 1) return [(od + do_) / 2]
  const krok = (do_ - od) / (sztuk - 1)
  return Array.from({ length: sztuk }, (_, i) => od + i * krok)
}

/**
 * Ile elementów zmieści się przy zadanym maksymalnym rozstawie.
 * Zawsze co najmniej dwa — skrajne.
 */
export function ileWRozstawie(dlugosc: number, maxRozstaw: number): number {
  if (maxRozstaw <= 0) return 2
  return Math.max(2, Math.ceil(dlugosc / maxRozstaw) + 1)
}

// ---------------------------------------------------------------------------
// Obrys bryły
// ---------------------------------------------------------------------------

/** Prostopadłościan opisany na meblu [mm]. */
export interface Obrys {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/**
 * Obrys mebla liczony z rzeczywistych wierzchołków każdej bryły.
 *
 * Kusi, żeby wziąć skrajne punkty osi i dodać połowę przekroju — ale wtedy
 * leżąca płasko deska 20 × 140 zawyżałaby wysokość mebla o siedem centymetrów
 * zamiast o jeden. Osiem wierzchołków liczy tę samą funkcja co przy rysowaniu
 * modelu, więc obrys zgadza się z tym, co widać na ekranie.
 */
export function obrysCzesci(czesci: Czesc[]): Obrys {
  const o: Obrys = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  }

  for (const c of czesci) {
    for (const p of wierzcholki(c)) {
      o.minX = Math.min(o.minX, p.x)
      o.maxX = Math.max(o.maxX, p.x)
      o.minY = Math.min(o.minY, p.y)
      o.maxY = Math.max(o.maxY, p.y)
      o.minZ = Math.min(o.minZ, p.z)
      o.maxZ = Math.max(o.maxZ, p.z)
    }
  }

  if (!Number.isFinite(o.minX)) {
    return { minX: 0, maxX: 100, minY: 0, maxY: 100, minZ: 0, maxZ: 100 }
  }
  return o
}

// ---------------------------------------------------------------------------
// Z części na zestawienie
// ---------------------------------------------------------------------------

/** Pozycja listy części — tyle samo sztuk tego samego elementu. */
export interface PozycjaCzesci {
  nazwa: string
  section: Section
  /** Długość jednej sztuki [mm], już zaokrąglona do pełnych milimetrów. */
  length: number
  count: number
  skos?: number
  uwaga?: string
  etap: Etap
  /**
   * Element kupowany gotowy: paleta, łańcuch, okucie. Jest w spisie części
   * i w instrukcji montażu, ale nie w zamówieniu tarcicy — bo nie tnie się
   * go z deski.
   */
  gotowy?: boolean
}

/**
 * Skleja identyczne części w pozycje listy.
 *
 * Identyczne znaczy: ta sama nazwa, przekrój i długość zaokrąglona do
 * milimetra. Ten poziom zaokrąglenia jest celowy — dwie nogi różniące się
 * o setną milimetra przez arytmetykę zmiennoprzecinkową to nadal ta sama noga.
 */
export function pozycjeCzesci(czesci: Czesc[]): PozycjaCzesci[] {
  const map = new Map<string, PozycjaCzesci>()

  for (const c of czesci) {
    const dlugosc = Math.round(dlugoscCzesci(c))
    if (dlugosc <= 0) continue
    const klucz = `${c.nazwa}|${c.b}x${c.h}|${dlugosc}`
    const jest = map.get(klucz)
    if (jest) {
      jest.count += 1
      continue
    }
    map.set(klucz, {
      nazwa: c.nazwa,
      section: { b: c.b, h: c.h },
      length: dlugosc,
      count: 1,
      skos: c.skos,
      uwaga: c.uwaga,
      etap: c.etap,
      gotowy: c.nieDrewno,
    })
  }

  return [...map.values()]
}

/**
 * Zamienia pozycje listy części na elementy do planu cięcia.
 *
 * Naddatek dokładamy tu, a nie w przepisie: przepis opisuje mebel gotowy,
 * a nie to, ile drewna zejdzie na docinanie.
 */
export function czesciDoTarcicy(pozycje: PozycjaCzesci[], naddatek: number): TimberItem[] {
  return pozycje
    .filter((p) => !p.gotowy)
    .map((p) => ({
      name: p.nazwa,
      section: p.section,
      length: p.length + naddatek,
      count: p.count,
      note: p.skos ? `końce ścięte pod ${p.skos}°` : undefined,
    }))
}
