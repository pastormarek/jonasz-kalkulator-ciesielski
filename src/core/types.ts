/**
 * Model danych kalkulatora ciesielskiego.
 *
 * KONWENCJA JEDNOSTEK: wszystkie wymiary liniowe wewnątrz rdzenia są
 * w MILIMETRACH. Zamiana na cm/m następuje dopiero przy wyświetlaniu.
 * Kąty są w stopniach (tak podaje je cieśla), a na radiany przelicza
 * dopiero funkcja licząca.
 */

/** Kształt bryły dachu. */
export type RoofShape =
  | 'gable' // dwuspadowy (siodłowy)
  | 'shed' // jednospadowy (pulpitowy)
  | 'hip' // kopertowy (czterospadowy)

/** Typ konstrukcji więźby. */
export type TrussType =
  | 'rafter' // krokwiowa
  | 'collar' // krokwiowo-jętkowa
  | 'purlin' // płatwiowo-kleszczowa

/** Przekrój drewna [mm]: b = szerokość (grubość), h = wysokość. */
export interface Section {
  /** Szerokość przekroju, czyli grubość elementu widziana z góry [mm]. */
  b: number
  /** Wysokość przekroju, mierzona prostopadle do połaci [mm]. */
  h: number
}

/**
 * Skąd bierzemy drewno.
 * - 'handlowe' — długości z półki w składzie, zwykle do 6 m.
 * - 'na-wymiar' — tartak tnie na zamówienie, realnie do ok. 12 m.
 *   Kosztuje więcej i trzeba czekać, ale znika problem łączenia.
 */
export type StockMode = 'handlowe' | 'na-wymiar'

/** Co podpiera krokiew w miejscu styku. */
export type SpliceSupport = 'sciana-kolankowa' | 'platew' | 'wieniec'

/**
 * Łączenie krokwi z dwóch kawałków.
 *
 * Krokiew wolno złożyć z dwóch belek, ale TYLKO wtedy, gdy styk wypada nad
 * podporą — na ścianie kolankowej, na wieńcu albo na płatwi. Styk zawieszony
 * w powietrzu, w środku rozpiętości, jest błędem konstrukcyjnym.
 */
export interface RafterSplice {
  enabled: boolean
  /** Odległość podpory od zewnętrznej krawędzi murłaty, mierzona w poziomie [mm]. */
  atRun: number
  support: SpliceSupport
  /** Długość nakładki na styku [mm] — o tyle kawałki zachodzą na siebie. */
  overlap: number
}

/**
 * Sposób mocowania krokwi do murłaty.
 *
 * Kątowniki ciesielskie to rozwiązanie z katalogu, ale wielu cieśli kręci
 * krokiew wprost do murłaty długimi wkrętami — po dwa na oparcie, bez żadnej
 * blachy. Domyślnie liczymy wkręty, bo tak się to najczęściej robi.
 */
export type RafterFixing = 'wkrety' | 'katowniki'

/** Rodzaj pokrycia — decyduje o rozstawie łat i zapasach. */
export type Covering =
  | 'dachowka-ceramiczna'
  | 'dachowka-betonowa'
  | 'blachodachowka'
  | 'blacha-na-rabek'
  | 'gont-bitumiczny'
  | 'inne'

/** Otwór w połaci: komin albo okno dachowe. Wymusza wymiany i krokwie skrócone. */
export interface Opening {
  id: string
  kind: 'komin' | 'okno'
  /** Szerokość otworu mierzona wzdłuż kalenicy [mm]. */
  width: number
  /** Wysokość otworu mierzona wzdłuż spadku połaci [mm]. */
  height: number
  /**
   * Odległość lewej krawędzi otworu od lewego szczytu budynku [mm],
   * mierzona wzdłuż kalenicy.
   */
  offsetAlong: number
  /** Która połać: A = pierwsza, B = przeciwna (nieistotne dla jednospadowego). */
  slope: 'A' | 'B'
}

/** Komplet danych wejściowych jednego dachu. */
export interface RoofInput {
  shape: RoofShape
  truss: TrussType

  /**
   * Rozpiętość budynku [mm] — mierzona w poprzek, między ZEWNĘTRZNYMI
   * krawędziami murłat. To od tej krawędzi startuje okap i tam wypada zacios.
   */
  span: number
  /** Długość budynku [mm], mierzona wzdłuż kalenicy. */
  length: number
  /** Kąt nachylenia połaci [stopnie]. */
  pitchDeg: number
  /** Wysunięcie okapu w POZIOMIE, poza krawędź murłaty [mm]. */
  eaves: number
  /** Wysunięcie połaci poza ścianę szczytową [mm] (wiatrownica/deska szczytowa). */
  gableOverhang: number

  /** Maksymalny dopuszczalny rozstaw krokwi w osiach [mm]. */
  rafterSpacingMax: number
  /** Przekrój krokwi. */
  rafterSection: Section
  /** Przekrój murłaty. */
  wallPlateSection: Section

  /** Głębokość zaciosu na murłacie [mm]. Norma: nie więcej niż 1/3 wysokości krokwi. */
  notchDepth: number

  // --- więźba krokwiowo-jętkowa ---
  /** Wysokość dolnej krawędzi jętki nad poziomem murłaty [mm]. */
  collarHeight: number
  /** Przekrój jętki. */
  collarSection: Section

  // --- więźba płatwiowo-kleszczowa ---
  /** Liczba płatwi pośrednich na JEDNEJ połaci (0, 1 lub 2). */
  purlinCount: number
  /** Przekrój płatwi. */
  purlinSection: Section
  /** Przekrój słupa. */
  postSection: Section
  /** Maksymalny rozstaw słupów pod płatwią [mm]. */
  postSpacingMax: number
  /** Czy liczyć kleszcze (para desek spinających krokwie przez słup). */
  hasClamps: boolean
  /** Przekrój pojedynczej deski kleszczy. */
  clampSection: Section
  /** Czy liczyć miecze (zastrzały usztywniające słup wzdłuż płatwi). */
  hasBraces: boolean
  /** Długość ramienia miecza mierzona wzdłuż słupa i płatwi [mm]. */
  braceArm: number
  /** Przekrój miecza. */
  braceSection: Section

  // --- warstwy pokrycia ---
  covering: Covering
  /** Rozstaw łat mierzony wzdłuż spadku [mm]. */
  battenSpacing: number
  /** Przekrój łaty. */
  battenSection: Section
  /** Przekrój kontrłaty. */
  counterBattenSection: Section
  /** Czy pod pokryciem jest pełne deskowanie / płyty. */
  hasSheathing: boolean
  /** Czy liczyć membranę wstępnego krycia. */
  hasMembrane: boolean
  /** Czy liczyć ocieplenie między krokwiami. */
  hasInsulation: boolean
  /** Sposób mocowania krokwi do murłaty. */
  rafterFixing: RafterFixing
  /**
   * Czy liczyć impregnat. Drewno konstrukcyjne z tartaku bywa impregnowane
   * już w cenie, więc domyślnie tego nie doliczamy.
   */
  hasImpregnation: boolean

  /** Otwory w połaci. */
  openings: Opening[]

  // --- zapasy i zakupy ---
  /**
   * Naddatek długości doliczany do każdego elementu [mm] — kilka centymetrów
   * na docięcie na budowie. Odpad z rozkroju liczy osobno plan cięcia, więc
   * nie doliczamy tu jeszcze raz procentów.
   */
  cutAllowance: number
  /** Dostępne długości drewna [mm]. */
  stockLengths: number[]
  /** Czy drewno bierzemy z półki, czy zamawiamy na wymiar. */
  stockMode: StockMode
  /** Łączenie krokwi nad podporą pośrednią. */
  splice: RafterSplice
}

/** Wynik obliczeń pojedynczego typu elementu drewnianego. */
export interface TimberItem {
  /** Nazwa elementu, np. "Krokiew zwykła". */
  name: string
  section: Section
  /** Długość jednej sztuki [mm]. */
  length: number
  /** Liczba sztuk. */
  count: number
  /** Skąd się wzięła ta pozycja — pokazywane w trybie nauki. */
  note?: string
  /**
   * Czy element wolno złożyć z kilku krótszych kawałków. Murłatę i płatew
   * łączy się na zamek, więc 12 m murłaty to po prostu dwie belki po 6 m.
   * Krokwi ani jętki tak łączyć nie wolno — muszą być z jednego kawałka.
   */
  splittable?: boolean
}
