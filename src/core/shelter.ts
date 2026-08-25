/**
 * Wiaty, zadaszenia i pergole — model danych, słowniki i geometria.
 *
 * DLACZEGO OSOBNY MODUŁ, A NIE KOLEJNY KSZTAŁT DACHU
 * --------------------------------------------------
 * Dach domu opiera się na murach: murłata leży na wieńcu i cała reszta wynika
 * z rozpiętości budynku. Wiata nie ma murów — stoi na słupach wbetonowanych
 * w grunt, więc trzeba policzyć fundamenty, wysokość w świetle i usztywnienie,
 * bez którego rama rozkłada się na bok. To inne pytania i inne wyniki, dlatego
 * wiata ma własny model danych zamiast doklejanych pól do `RoofInput`.
 *
 * KONWENCJA JEDNOSTEK jest ta sama co w dachu: milimetry i stopnie.
 *
 * WYMIARY W OSIACH SŁUPÓW
 * -----------------------
 * `width` i `length` to rozstaw OSI skrajnych słupów — dokładnie to, co
 * wytycza się sznurkiem na działce i co potem stoi w zgłoszeniu budowlanym.
 * Dach jest większy o wysunięcia okapu z każdej strony.
 */

import type { Section, StockMode } from './types'
import { deg2rad } from './geometry'
import { STOCK_LENGTHS } from './defaults'

/**
 * Rodzaj konstrukcji.
 * - 'wiata' — wolnostojąca, na własnych słupach ze wszystkich stron,
 * - 'zadaszenie' — dostawione do budynku, jedna strona wisi na ścianie,
 * - 'pergola' — rama bez pełnego pokrycia albo z lekkim pokryciem, spadek mały.
 */
export type ShelterKind = 'wiata' | 'zadaszenie' | 'pergola'

/** Kształt zadaszenia. */
export type ShelterShape = 'dwuspadowy' | 'jednospadowy'

/**
 * Sposób osadzenia słupa.
 * Wbetonowanie słupa jest tu wymienione, bo tak się to nadal robi — ale drewno
 * zatopione w betonie gnije od dołu i po kilkunastu latach wiata siada.
 */
export type PostBase = 'kotwa-regulowana' | 'podstawa-u' | 'kotwa-wklejana' | 'w-betonie'

/** Pokrycie zadaszenia. */
export type ShelterCovering =
  | 'poliweglan'
  | 'blacha-trapezowa'
  | 'blachodachowka'
  | 'dachowka'
  | 'gont'
  | 'deski'
  | 'brak'

/** Komplet danych wejściowych jednej wiaty. */
export interface ShelterInput {
  kind: ShelterKind
  shape: ShelterShape

  /** Szerokość w poprzek, w osiach skrajnych słupów [mm]. */
  width: number
  /** Długość wzdłuż, w osiach skrajnych słupów [mm]. */
  length: number
  /** Kąt nachylenia połaci [stopnie]. */
  pitchDeg: number
  /** Wysokość w świetle: od posadzki do spodu oczepu po stronie niskiej [mm]. */
  clearHeight: number

  /** Wysunięcie okapu w poziomie, w poprzek wiaty [mm]. */
  eavesFront: number
  /** Wysunięcie dachu poza skrajne słupy, wzdłuż wiaty [mm]. */
  eavesSide: number

  /** Maksymalny rozstaw słupów w rzędzie [mm]. */
  postSpacingMax: number
  /** Przekrój słupa. */
  postSection: Section
  /** Przekrój oczepu — belki leżącej na słupach wzdłuż wiaty. */
  beamSection: Section
  /** Przekrój krokwi (przy pergoli: belki poprzecznej). */
  rafterSection: Section
  /** Maksymalny rozstaw krokwi w osiach [mm]. */
  rafterSpacingMax: number

  /** Belka kalenicowa na własnych słupach — dla szerokich wiat dwuspadowych. */
  hasRidgeBeam: boolean
  /** Przekrój belki kalenicowej. */
  ridgeSection: Section

  /** Miecze usztywniające ramę. */
  hasBraces: boolean
  /** Długość ramienia miecza, mierzona wzdłuż słupa i wzdłuż oczepu [mm]. */
  braceArm: number
  /** Przekrój miecza. */
  braceSection: Section

  covering: ShelterCovering
  /** Rozstaw łat albo płatwi poprzecznych, mierzony wzdłuż spadku [mm]. */
  battenSpacing: number
  /** Przekrój łaty / płatwi poprzecznej. */
  battenSection: Section
  /** Przekrój kontrłaty. */
  counterBattenSection: Section
  /** Membrana wstępnego krycia — ma sens tylko pod dachówką i blachodachówką. */
  hasMembrane: boolean

  /** Szczebliny na wierzchu — to one dają pergoli cień. */
  hasSlats: boolean
  /** Rozstaw szczeblin w osiach [mm]. */
  slatSpacing: number
  /** Przekrój szczebliny. */
  slatSection: Section

  postBase: PostBase
  /** Bok stopy fundamentowej [mm]. */
  footingSize: number
  /** Głębokość stopy fundamentowej [mm] — poniżej strefy przemarzania. */
  footingDepth: number

  /** Rynny i rury spustowe. */
  hasGutters: boolean

  /** Naddatek długości na docięcie [mm]. */
  cutAllowance: number
  stockLengths: number[]
  stockMode: StockMode
  hasImpregnation: boolean
}

/** Nazwy rodzajów konstrukcji widoczne w interfejsie. */
export const SHELTER_KIND_LABELS: Record<ShelterKind, { label: string; opis: string }> = {
  wiata: {
    label: 'Wiata wolnostojąca',
    opis: 'garażowa, na drewno, na maszyny — stoi sama, na słupach ze wszystkich stron',
  },
  zadaszenie: {
    label: 'Zadaszenie przyścienne',
    opis: 'taras albo wejście — jedna strona na ścianie budynku, druga na słupach',
  },
  pergola: {
    label: 'Pergola',
    opis: 'rama ze szczeblinami albo lekkim pokryciem, spadek niewielki',
  },
}

/** Opisy sposobów osadzenia słupa. */
export const POST_BASE_INFO: Record<PostBase, { label: string; hint: string; kotwyNaSlup: number }> = {
  'kotwa-regulowana': {
    label: 'Podstawa regulowana',
    hint: 'Talerz z prętem, wpuszczany w mokry beton albo kotwiony po stwardnieniu. Pozwala wypoziomować wiatę i trzyma drewno nad betonem.',
    kotwyNaSlup: 4,
  },
  'podstawa-u': {
    label: 'Podstawa U-kształtna',
    hint: 'Blacha obejmująca słup z dwóch stron, na śrubę przelotową. Najprostsze i najczęstsze rozwiązanie przy wiatach.',
    kotwyNaSlup: 2,
  },
  'kotwa-wklejana': {
    label: 'Pręt na kotwie chemicznej',
    hint: 'Pręt gwintowany wklejony w gotową stopę albo w płytę. Wymaga dokładnego wytyczenia — po zawiązaniu żywicy nic się już nie przesunie.',
    kotwyNaSlup: 2,
  },
  'w-betonie': {
    label: 'Słup wbetonowany',
    hint: 'Drewno zatopione w betonie. Tanio i szybko, ale słup gnije od dołu — przy wiacie, która ma stać dwadzieścia lat, to zły wybór.',
    kotwyNaSlup: 0,
  },
}

/**
 * Wymagania pokryć.
 *
 * `minPitchDeg` to najmniejszy spadek, przy którym producenci w ogóle dopuszczają
 * dane pokrycie. Poniżej niego woda podchodzi pod zakłady — i nie ratuje tego
 * żadna ilość uszczelniacza.
 */
export const SHELTER_COVERING_INFO: Record<
  ShelterCovering,
  {
    label: string
    /** Minimalny spadek [stopnie]. */
    minPitchDeg: number
    /** Zalecany rozstaw podpór pod pokryciem [mm]; 0 = pełne poszycie. */
    battenSpacing: number
    /** Jak nazywa się element podpierający pokrycie. */
    podpora: 'lata' | 'platew' | 'poszycie'
    /** Ciężar pokrycia [kg/m²] — pomocniczo przy rozmowie z konstruktorem. */
    weightKgM2: number
    hint: string
  }
> = {
  poliweglan: {
    label: 'Poliwęglan komorowy',
    minPitchDeg: 5,
    battenSpacing: 700,
    podpora: 'platew',
    weightKgM2: 2.8,
    hint: 'Płyty przykręca się do płatwi poprzecznych przez podkładki EPDM. Rozstaw podpór dobierz do grubości płyty, a szerokość pola — do szerokości płyty (typowo 105 albo 120 cm).',
  },
  'blacha-trapezowa': {
    label: 'Blacha trapezowa',
    minPitchDeg: 7,
    battenSpacing: 900,
    podpora: 'platew',
    weightKgM2: 5,
    hint: 'Najtańsze pokrycie wiaty. Mocowana wkrętami farmerskimi w dolinę fali, do płatwi poprzecznych.',
  },
  blachodachowka: {
    label: 'Blachodachówka',
    minPitchDeg: 12,
    battenSpacing: 350,
    podpora: 'lata',
    weightKgM2: 5.5,
    hint: 'Rozstaw łat musi trafić w moduł arkusza — inaczej nie zejdzie się na zamku.',
  },
  dachowka: {
    label: 'Dachówka',
    minPitchDeg: 25,
    battenSpacing: 320,
    podpora: 'lata',
    weightKgM2: 45,
    hint: 'Najcięższe pokrycie. Przy wiacie oznacza mocniejsze krokwie i słupy — sprawdź to z konstruktorem, zanim zamówisz drewno.',
  },
  gont: {
    label: 'Gont bitumiczny',
    minPitchDeg: 12,
    battenSpacing: 0,
    podpora: 'poszycie',
    weightKgM2: 12,
    hint: 'Kładziony na pełnym poszyciu z desek albo płyt OSB. Łat nie ma.',
  },
  deski: {
    label: 'Deskowanie / szalówka',
    minPitchDeg: 10,
    battenSpacing: 0,
    podpora: 'poszycie',
    weightKgM2: 18,
    hint: 'Rozwiązanie na wiatę gospodarczą. Deski układane na zakład albo na styk z listwą.',
  },
  brak: {
    label: 'Bez pokrycia',
    minPitchDeg: 0,
    battenSpacing: 0,
    podpora: 'poszycie',
    weightKgM2: 0,
    hint: 'Sama rama, ewentualnie ze szczeblinami. Pergola nie chroni przed deszczem i nie liczymy dla niej odwodnienia.',
  },
}

/** Świeża wiata z sensownymi wartościami startowymi. */
export function defaultShelter(): ShelterInput {
  return {
    kind: 'wiata',
    shape: 'dwuspadowy',

    width: 5000,
    length: 6000,
    pitchDeg: 20,
    clearHeight: 2400,

    eavesFront: 400,
    eavesSide: 400,

    postSpacingMax: 3000,
    postSection: { b: 140, h: 140 },
    beamSection: { b: 120, h: 180 },
    rafterSection: { b: 80, h: 160 },
    rafterSpacingMax: 900,

    hasRidgeBeam: false,
    ridgeSection: { b: 120, h: 180 },

    hasBraces: true,
    braceArm: 600,
    braceSection: { b: 100, h: 100 },

    covering: 'blacha-trapezowa',
    battenSpacing: 900,
    battenSection: { b: 50, h: 100 },
    counterBattenSection: { b: 25, h: 50 },
    hasMembrane: false,

    hasSlats: false,
    slatSpacing: 300,
    slatSection: { b: 40, h: 90 },

    postBase: 'podstawa-u',
    footingSize: 400,
    footingDepth: 900,

    hasGutters: true,

    cutAllowance: 100,
    stockLengths: [...STOCK_LENGTHS],
    stockMode: 'handlowe',
    hasImpregnation: true,
  }
}

/** Rozłożenie słupów w jednym rzędzie. */
export interface PostLayout {
  /** Liczba pól między słupami. */
  bays: number
  /** Rozstaw osiowy słupów [mm]. */
  spacing: number
  /** Liczba słupów w rzędzie. */
  perRow: number
  /** Liczba rzędów słupów. */
  rows: number
  /** Razem słupów. */
  total: number
}

/**
 * Rozkłada słupy równomiernie na długości wiaty.
 *
 * Skrajne słupy stoją w narożach, więc pól jest zawsze o jedno mniej niż słupów.
 * Rozstaw dobieramy w górę do zadanego maksimum i rozkładamy równo — nierówne
 * pola widać z daleka i psują cały efekt.
 *
 * @param length rozstaw osi skrajnych słupów [mm]
 * @param maxSpacing największy dopuszczalny rozstaw [mm]
 * @param rows liczba rzędów słupów
 */
export function layoutPosts(length: number, maxSpacing: number, rows: number): PostLayout {
  const bays = Math.max(1, Math.ceil(length / Math.max(1, maxSpacing)))
  const perRow = bays + 1
  return {
    bays,
    spacing: length / bays,
    perRow,
    rows,
    total: perRow * rows,
  }
}

/** Geometria bryły zadaszenia. */
export interface ShelterGeometry {
  /** Bieg poziomy jednej połaci, od osi oczepu do kalenicy albo do drugiego oczepu [mm]. */
  run: number
  /** Wzniesienie na tym biegu [mm]. */
  rise: number
  /** Długość krokwi z okapami, do zamówienia [mm]. */
  rafterLength: number
  /** Długość połaci wzdłuż spadku [mm]. */
  slopeLength: number
  /** Liczba połaci: 1 albo 2. */
  slopes: number
  /** Szerokość dachu w rzucie, z okapami [mm]. */
  roofWidth: number
  /** Długość dachu w rzucie, z okapami [mm]. */
  roofLength: number
  /** Powierzchnia dachu w rzucie [m²]. */
  planAreaM2: number
  /** Powierzchnia połaci [m²]. */
  roofAreaM2: number
  /** Wysokość słupa niskiego, od posadzki do spodu oczepu [mm]. */
  lowPostHeight: number
  /** Wysokość słupa wysokiego [mm]; przy dwuspadowym równa niskiemu. */
  highPostHeight: number
  /** Wysokość słupa kalenicowego [mm]; 0, gdy go nie ma. */
  ridgePostHeight: number
  /** Wysokość najwyższego punktu konstrukcji nad posadzką [mm]. */
  topHeight: number
  /** Prześwit pod krokwią w najniższym punkcie okapu [mm]. */
  eavesClearHeight: number
  /** Liczba rzędów słupów wynikająca z rodzaju i kształtu. */
  postRows: number
}

/**
 * Liczy bryłę zadaszenia.
 *
 * Zadaszenie przyścienne ma tylko jeden rząd słupów — drugą stronę dźwiga belka
 * przykręcona do ściany budynku, i to ona decyduje o wysokości całości.
 */
export function shelterGeometry(input: ShelterInput): ShelterGeometry {
  const a = deg2rad(input.pitchDeg)
  const cos = Math.cos(a)
  const tan = Math.tan(a)

  const dwuspadowy = input.shape === 'dwuspadowy' && input.kind !== 'zadaszenie'
  const slopes = dwuspadowy ? 2 : 1
  const run = dwuspadowy ? input.width / 2 : input.width

  // Zadaszenie przyścienne kończy się na ścianie budynku, więc okap ma tylko
  // od frontu. Wolnostojąca połać jednospadowa wystaje z obu stron, a przy
  // dwuspadowym każda z dwóch połaci ma własny okap.
  const przyscienne = input.kind === 'zadaszenie'
  const okapyPolaci = dwuspadowy || przyscienne ? 1 : 2
  const rafterRun = run + okapyPolaci * input.eavesFront
  const rafterLength = cos > 1e-9 ? rafterRun / cos : rafterRun

  const roofWidth = input.width + (przyscienne ? 1 : 2) * input.eavesFront
  const roofLength = input.length + 2 * input.eavesSide
  const planAreaM2 = (roofWidth / 1000) * (roofLength / 1000)

  const lowPostHeight = input.clearHeight
  const highPostHeight = dwuspadowy ? input.clearHeight : input.clearHeight + input.width * tan

  // Wierzch oczepu to poziom, od którego liczy się resztę konstrukcji.
  const beamTop = input.clearHeight + input.beamSection.h

  // Belka kalenicowa podpiera krokwie od spodu, więc to jej WIERZCH musi
  // trafić w linię połaci — słup pod nią jest o jej wysokość krótszy.
  const ridgePostHeight =
    dwuspadowy && input.hasRidgeBeam
      ? Math.max(0, beamTop + run * tan - input.ridgeSection.h)
      : 0

  // Krokiew mierzy `h` prostopadle do połaci, więc w pionie zajmuje h / cos α.
  const rafterVertical = cos > 1e-9 ? input.rafterSection.h / cos : input.rafterSection.h
  const topHeight = dwuspadowy
    ? beamTop + run * tan + rafterVertical
    : beamTop + input.width * tan + rafterVertical

  // Pod okapem połać schodzi najniżej — tam ktoś uderzy głową, jeśli za nisko.
  const eavesClearHeight = input.clearHeight - input.eavesFront * tan

  return {
    run,
    rise: run * tan,
    rafterLength,
    slopeLength: rafterLength,
    slopes,
    roofWidth,
    roofLength,
    planAreaM2,
    roofAreaM2: cos > 1e-9 ? planAreaM2 / cos : planAreaM2,
    lowPostHeight,
    highPostHeight,
    ridgePostHeight,
    topHeight,
    eavesClearHeight,
    postRows: postRowsFor(input),
  }
}

/**
 * Ile rzędów słupów stoi pod zadaszeniem.
 * Przyścienne ma jeden, wolnostojące dwa, a szeroka wiata dwuspadowa
 * z belką kalenicową — trzy.
 */
export function postRowsFor(input: ShelterInput): number {
  if (input.kind === 'zadaszenie') return 1
  const dwuspadowy = input.shape === 'dwuspadowy'
  return dwuspadowy && input.hasRidgeBeam ? 3 : 2
}

/** Wymiary miecza usztywniającego. */
export interface BraceGeometry {
  /** Długość miecza mierzona po przekątnej [mm]. */
  length: number
  /** Kąt cięcia na obu końcach [stopnie] — przy równych ramionach zawsze 45°. */
  cutAngleDeg: number
  /** Ramię odmierzane na słupie i na oczepie [mm]. */
  arm: number
}

/**
 * Miecz to przekątna trójkąta o równych ramionach: jedno odmierzone w dół
 * od oczepu po słupie, drugie w bok po oczepie. Dlatego cięcie zawsze wypada
 * pod 45°, niezależnie od spadku dachu.
 */
export function braceGeometry(arm: number): BraceGeometry {
  return { length: arm * Math.SQRT2, cutAngleDeg: 45, arm }
}

/** Wynik obliczenia fundamentów. */
export interface FootingResult {
  /** Liczba stóp — po jednej pod każdym słupem. */
  count: number
  /** Objętość jednej stopy [m³]. */
  volumeEachM3: number
  /** Objętość betonu razem [m³]. */
  volumeM3: number
  /** Objętość z zapasem na wybrania i nierówny wykop [m³]. */
  volumeWithSpareM3: number
  /** Ile wykopu trzeba wybrać razem [m³]. */
  excavationM3: number
}

/** Zapas betonu — wykop nigdy nie jest równy, a beton kupuje się z góry [%]. */
const CONCRETE_SPARE_PCT = 10

/**
 * Stopy fundamentowe pod słupami.
 *
 * Liczymy stopę prostopadłościenną o zadanym boku i głębokości. Głębokość musi
 * sięgnąć poniżej strefy przemarzania — inaczej mróz wypycha stopę do góry
 * i wiata co roku chodzi.
 */
export function footings(count: number, size: number, depth: number): FootingResult {
  const volumeEachM3 = (size / 1000) ** 2 * (depth / 1000)
  const volumeM3 = volumeEachM3 * count
  return {
    count,
    volumeEachM3,
    volumeM3,
    volumeWithSpareM3: volumeM3 * (1 + CONCRETE_SPARE_PCT / 100),
    // Wykop robi się szerszy od samej stopy, żeby dało się w nim pracować.
    excavationM3: ((size + 200) / 1000) ** 2 * (depth / 1000) * count,
  }
}

/** Wynik doboru odwodnienia. */
export interface GutterResult {
  /** Łączna długość rynny [mm]. */
  gutterLength: number
  /** Liczba haków rynnowych. */
  hooks: number
  /** Liczba rur spustowych. */
  downpipes: number
  /** Łączna długość rury spustowej [mm]. */
  downpipeLength: number
  /** Liczba kolan — po dwa na każdą rurę. */
  elbows: number
  /** Powierzchnia połaci przypadająca na jedną rurę [m²]. */
  areaPerDownpipeM2: number
}

/** Rozstaw haków rynnowych [mm]. */
const HOOK_SPACING = 600
/** Największa długość rynny obsługiwana przez jedną rurę spustową [mm]. */
const MAX_GUTTER_PER_DOWNPIPE = 12000
/** Największa powierzchnia połaci na jedną rurę spustową [m²]. */
const MAX_AREA_PER_DOWNPIPE = 80

/**
 * Dobiera rynny i rury spustowe.
 *
 * Rynna biegnie po każdym okapie — przy dwuspadowym są dwie, przy jednospadowym
 * jedna. Liczbę rur ogranicza i długość rynny, i powierzchnia połaci, którą
 * ta rura ma odebrać; bierzemy ostrzejsze z dwóch ograniczeń.
 */
export function gutters(
  eavesRuns: number,
  runLength: number,
  roofAreaM2: number,
  eavesHeight: number,
): GutterResult {
  const gutterLength = eavesRuns * runLength
  const zDlugosci = eavesRuns * Math.ceil(runLength / MAX_GUTTER_PER_DOWNPIPE)
  const zPowierzchni = Math.ceil(roofAreaM2 / MAX_AREA_PER_DOWNPIPE)
  const downpipes = Math.max(eavesRuns, zDlugosci, zPowierzchni)
  return {
    gutterLength,
    // Na każdym końcu rynny hak wypada osobno, stąd dodatkowy na każdy okap.
    hooks: Math.ceil(gutterLength / HOOK_SPACING) + eavesRuns,
    downpipes,
    downpipeLength: downpipes * Math.max(0, eavesHeight),
    elbows: downpipes * 2,
    areaPerDownpipeM2: downpipes > 0 ? roofAreaM2 / downpipes : 0,
  }
}
