/**
 * Geometria dachu — czysta matematyka, bez UI i bez stanu.
 *
 * PRZYJĘTY MODEL ODNIESIENIA
 * --------------------------
 * Linią bazową krokwi jest jej DOLNA krawędź. Zaczyna się w zewnętrznym
 * narożu murłaty (punkt oparcia zaciosu) i biegnie pod kątem α do osi
 * kalenicy. Wszystkie biegi i wzniesienia liczymy od tego naroża.
 *
 * Krokiew cięta pionowo na obu końcach (kalenica i okap) jest w przekroju
 * równoległobokiem — jej górna i dolna krawędź mają wtedy tę samą długość.
 * Dlatego długość krokwi to po prostu: zasięg poziomy / cos α.
 */

import type { RidgeJointKind } from './types'

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180
export const rad2deg = (rad: number): number => (rad * 180) / Math.PI

/** Geometria pojedynczej połaci. */
export interface SlopeGeometry {
  /** Bieg poziomy od naroża murłaty do osi kalenicy [mm]. */
  run: number
  /** Wzniesienie kalenicy nad poziomem oparcia [mm]. */
  rise: number
  /** Długość krokwi od oparcia do kalenicy, bez okapu [mm]. */
  rafterToRidge: number
  /** Długość samego okapu, mierzona wzdłuż krokwi [mm]. */
  eavesLength: number
  /** Pełna długość krokwi do zamówienia [mm]. */
  rafterTotal: number
  /** Długość połaci wzdłuż spadku, od kalenicy do końca okapu [mm]. */
  slopeLength: number
  /** Kąt nachylenia [stopnie] — powtórzony dla wygody. */
  pitchDeg: number
}

/**
 * Podstawowa geometria połaci.
 *
 * @param run bieg poziomy do osi kalenicy [mm]
 * @param pitchDeg kąt nachylenia [stopnie]
 * @param eaves wysunięcie okapu w poziomie [mm]
 */
export function slopeGeometry(run: number, pitchDeg: number, eaves: number): SlopeGeometry {
  const a = deg2rad(pitchDeg)
  const cos = Math.cos(a)
  const rafterToRidge = run / cos
  const eavesLength = eaves / cos
  return {
    run,
    rise: run * Math.tan(a),
    rafterToRidge,
    eavesLength,
    rafterTotal: rafterToRidge + eavesLength,
    slopeLength: rafterToRidge + eavesLength,
    pitchDeg,
  }
}

/** Zamienia spadek w procentach na kąt w stopniach (100% = 45°). */
export const percentToDeg = (pct: number): number => rad2deg(Math.atan(pct / 100))

/** Zamienia kąt w stopniach na spadek w procentach. */
export const degToPercent = (deg: number): number => Math.tan(deg2rad(deg)) * 100

/**
 * Zamienia stosunek wzniesienia do biegu (np. 1:2) na kąt w stopniach.
 * Cieśle często dostają dach opisany właśnie tak.
 */
export const ratioToDeg = (rise: number, run: number): number => rad2deg(Math.atan(rise / run))

/** Wynik rozłożenia krokwi na długości budynku. */
export interface RafterLayout {
  /** Liczba pól między skrajnymi krokwiami. */
  bays: number
  /** Rzeczywisty rozstaw w osiach [mm]. */
  spacing: number
  /** Prześwit między bokami sąsiednich krokwi [mm]. */
  clear: number
  /** Liczba krokwi na JEDNEJ połaci. */
  countPerSlope: number
  /** Rozpiętość osiowa: od osi skrajnej do osi skrajnej krokwi [mm]. */
  axisSpan: number
}

/**
 * Rozkłada krokwie równomiernie na długości budynku.
 *
 * Skrajne krokwie licują z krawędziami ścian szczytowych, więc ich OSIE są
 * cofnięte o połowę grubości krokwi. Liczbę pól dobieramy w górę, żeby
 * rozstaw nie przekroczył zadanego maksimum — a potem rozkładamy je równo.
 *
 * @param buildingLength długość budynku wzdłuż kalenicy [mm]
 * @param maxSpacing maksymalny rozstaw w osiach [mm]
 * @param rafterWidth grubość krokwi (wymiar b) [mm]
 */
export function layoutRafters(
  buildingLength: number,
  maxSpacing: number,
  rafterWidth: number,
): RafterLayout {
  const axisSpan = Math.max(0, buildingLength - rafterWidth)
  const bays = Math.max(1, Math.ceil(axisSpan / maxSpacing))
  const spacing = axisSpan / bays
  return {
    bays,
    spacing,
    clear: spacing - rafterWidth,
    countPerSlope: bays + 1,
    axisSpan,
  }
}

/** Wymiary zaciosu (wrębu) krokwi na murłacie. */
export interface Notch {
  /** Głębokość mierzona prostopadle do krokwi [mm]. */
  depth: number
  /** Długość płaszczyzny poziomej — siodła leżącego na murłacie [mm]. */
  seatLength: number
  /** Wysokość płaszczyzny pionowej, opartej o bok murłaty [mm]. */
  heelHeight: number
  /** Maksymalna dopuszczalna głębokość = 1/3 wysokości krokwi [mm]. */
  maxDepth: number
  /** Czy głębokość mieści się w normie. */
  depthOk: boolean
  /** Czy siodło mieści się na szerokości murłaty. */
  seatFitsPlate: boolean
  /** Wysokość krokwi pozostała nad zaciosem, mierzona w pionie [mm]. */
  remainingHeight: number
}

/**
 * Liczy zacios siodłowy: wycięcie o dwóch płaszczyznach — poziomej,
 * która leży na murłacie, i pionowej, opartej o jej bok.
 *
 * Wyprowadzenie: naroże murłaty leży w odległości `depth` prostopadle od
 * dolnej krawędzi krokwi. Idąc od naroża poziomo, tniemy linię krokwi pod
 * kątem α, więc droga do niej wynosi depth / sin α. Idąc pionowo, kąt
 * wynosi (90° − α), więc droga to depth / cos α.
 *
 * @param depth zadana głębokość zaciosu [mm]
 * @param pitchDeg kąt nachylenia połaci [stopnie]
 * @param rafterHeight wysokość przekroju krokwi [mm]
 * @param plateWidth szerokość murłaty [mm]
 */
export function notch(
  depth: number,
  pitchDeg: number,
  rafterHeight: number,
  plateWidth: number,
): Notch {
  const a = deg2rad(pitchDeg)
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  const maxDepth = rafterHeight / 3
  const seatLength = sin > 1e-9 ? depth / sin : Number.POSITIVE_INFINITY
  return {
    depth,
    seatLength,
    heelHeight: depth / cos,
    maxDepth,
    depthOk: depth <= maxDepth + 1e-9,
    seatFitsPlate: seatLength <= plateWidth + 1e-9,
    // Wysokość krokwi mierzona w pionie to h/cos α; zacios zabiera z niej depth/cos α.
    remainingHeight: (rafterHeight - depth) / cos,
  }
}

/** Wymiary złącza krokwi w kalenicy. */
export interface RidgeJoint {
  kind: RidgeJointKind
  /** Ile krokiew przechodzi za oś kalenicy, mierzone w poziomie [mm]. */
  overshootRun: number
  /** O tyle krokiew jest dłuższa niż przy cięciu czołowym, wzdłuż połaci [mm]. */
  extension: number
  /** Głębokość wybrania, mierzona w poprzek krokwi [mm]. */
  depth: number
  /** Długość nakładki wzdłuż krokwi — na tyle sięga wybranie [mm]. */
  lapLength: number
}

/**
 * Liczy złącze krokwi w kalenicy.
 *
 * ZAKŁADKA CIESIELSKA (odpowiedzi Jonasza, punkty 54–55)
 * ------------------------------------------------------
 * Krokwie nie kończą się na osi kalenicy, tylko mijają się bokiem — każda
 * wybrana na pół grubości, więc po złożeniu dają pełny przekrój. Jak daleko
 * przechodzą, wyznacza reguła: „patrząc na dolną krawędź krokwi, ona dochodzi
 * aż do górnej krawędzi kolejnej krokwi w szczycie".
 *
 * Wyprowadzenie. Osią odniesienia jest pion przez kalenicę, wierzchołek leży
 * na przecięciu górnych krawędzi obu krokwi. Górna krawędź krokwi z prawej
 * opada jak z = −x·tg α. Dolna krawędź krokwi z lewej to ta sama prosta
 * przesunięta o h prostopadle do połaci, czyli z = (x − h·sin α)·tg α − h·cos α.
 * Przyrównanie obu i skrócenie (sin²α + cos²α = 1) daje
 *
 *     x = h / (2 · sin α)
 *
 * a po przeliczeniu na długość mierzoną wzdłuż połaci (dzielenie przez cos α)
 *
 *     Δ = h / sin 2α
 *
 * Dla krokwi 18 cm przy 42° wychodzi 18,1 cm — o tyle każda krokiew jest
 * dłuższa niż przy cięciu czołowym. Przy małych kątach wydłużenie rośnie
 * gwałtownie, bo krokwie schodzą się coraz płycej.
 *
 * @param kind sposób zakończenia
 * @param rafterHeight wysokość przekroju krokwi [mm]
 * @param rafterWidth grubość krokwi [mm]
 * @param pitchDeg kąt nachylenia połaci [stopnie]
 */
export function ridgeJoint(
  kind: RidgeJointKind,
  rafterHeight: number,
  rafterWidth: number,
  pitchDeg: number,
): RidgeJoint {
  if (kind === 'czolowe') {
    return { kind, overshootRun: 0, extension: 0, depth: 0, lapLength: 0 }
  }

  const a = deg2rad(pitchDeg)
  const sin = Math.sin(a)
  const sin2 = Math.sin(2 * a)
  // Dach płaski jak stół nie ma kalenicy, w której cokolwiek dałoby się
  // zazębić — zwracamy zero zamiast dzielić przez zero.
  if (sin < 1e-9 || sin2 < 1e-9) {
    return { kind, overshootRun: 0, extension: 0, depth: rafterWidth / 2, lapLength: 0 }
  }

  const overshootRun = rafterHeight / (2 * sin)
  const extension = rafterHeight / sin2
  return {
    kind,
    overshootRun,
    extension,
    depth: rafterWidth / 2,
    lapLength: extension,
  }
}

/** Zakończenie krokwi przy okapie, dopasowane do deski podrynnowej. */
export interface EavesCut {
  /** Wysokość deski podrynnowej [mm]. */
  fasciaHeight: number
  /** Wysokość pionowego cięcia na końcu krokwi [mm]. */
  cutHeight: number
  /** Wysokość krokwi zmierzona w pionie, na ukos przekroju [mm]. */
  verticalHeight: number
  /** Czy cięcie mieści się w krokwi. */
  fits: boolean
}

/**
 * Liczy pionowe cięcie na końcu krokwi (odpowiedzi Jonasza, punkt 56).
 *
 * O wysokości cięcia decyduje deska podrynnowa, a nie sama krokiew: deska ma
 * zasłonić czoło krokwi i przyjąć hak rynny, więc krokiew tnie się pionowo
 * o dwa centymetry NIŻEJ niż wysokość deski. Przykład Jonasza: deska 20 cm →
 * krokiew w cięciu pionowym 18 cm.
 *
 * Cięcie nie może być wyższe niż sama krokiew mierzona w pionie — a mierzy się
 * ją na ukos, więc wynosi h / cos α i jest zauważalnie większa od wysokości
 * przekroju.
 */
export function eavesCut(
  fasciaHeight: number,
  rafterHeight: number,
  pitchDeg: number,
): EavesCut {
  const cos = Math.cos(deg2rad(pitchDeg))
  const verticalHeight = cos > 1e-9 ? rafterHeight / cos : rafterHeight
  const cutHeight = Math.max(0, fasciaHeight - FASCIA_REVEAL)
  return {
    fasciaHeight,
    cutHeight,
    verticalHeight,
    fits: cutHeight <= verticalHeight + 1e-9,
  }
}

/**
 * O tyle cięcie krokwi jest niższe od deski podrynnowej [mm].
 * Ta odsadzka sprawia, że deska wystaje ponad czoło krokwi i można ją
 * wyrównać sznurem niezależnie od tego, jak dokładnie wyszły same krokwie.
 */
export const FASCIA_REVEAL = 20

/** Geometria naroża dachu kopertowego. */
export interface HipGeometry {
  /** Kąt nachylenia krokwi narożnej (krożyny) [stopnie]. */
  hipPitchDeg: number
  /** Bieg krożyny w rzucie poziomym [mm]. */
  hipRun: number
  /** Długość krożyny od naroża do kalenicy, bez okapu [mm]. */
  hipLength: number
  /** Pełna długość krożyny wraz z okapem [mm]. */
  hipTotal: number
  /** Różnica długości między sąsiednimi kulawkami [mm]. */
  jackDifference: number
  /** Długości kolejnych kulawek na jednym skosie, od najdłuższej [mm]. */
  jackLengths: number[]
  /** Kąt ukosu kulawki nastawiany na pile [stopnie]. */
  jackCheekAngleDeg: number
  /** Kąt sfazowania grzbietu krożyny [stopnie]. */
  hipBackingAngleDeg: number
  /** Długość kalenicy dachu kopertowego [mm]. */
  ridgeLength: number
}

/**
 * Geometria dachu kopertowego o równych spadkach — naroże w rzucie
 * przebiega wtedy dokładnie pod 45°.
 *
 * Kluczowe zależności:
 *   tan β = tan α / √2        (krożyna jest łagodniejsza niż połać)
 *   bieg krożyny = halfSpan · √2
 *   skrót kulawki = rozstaw / cos α
 *   kąt ukosu kulawki = arctan(cos α)     — dla dachu 45° daje znane 35,26°
 *   sfazowanie krożyny = arctan(sin β)    — dla dachu 45° daje znane 30°
 *
 * @param span rozpiętość budynku [mm]
 * @param buildingLength długość budynku [mm]
 * @param pitchDeg kąt nachylenia połaci [stopnie]
 * @param eaves wysunięcie okapu w poziomie [mm]
 * @param spacing rozstaw krokwi w osiach [mm]
 */
export function hipGeometry(
  span: number,
  buildingLength: number,
  pitchDeg: number,
  eaves: number,
  spacing: number,
): HipGeometry {
  const a = deg2rad(pitchDeg)
  const halfSpan = span / 2
  const hipPitch = Math.atan(Math.tan(a) / Math.SQRT2)
  const hipRun = halfSpan * Math.SQRT2
  const hipLength = hipRun / Math.cos(hipPitch)

  // Okap krożyny biegnie po przekątnej, więc jego zasięg też rośnie √2 razy.
  const hipTotal = (hipRun + eaves * Math.SQRT2) / Math.cos(hipPitch)

  const jackDifference = spacing / Math.cos(a)

  // Kulawki wypełniają skos: od najdłuższej (przy krokwi zwykłej) w dół do zera.
  const jackCount = Math.max(0, Math.ceil(halfSpan / spacing) - 1)
  const jackLengths: number[] = []
  for (let i = 1; i <= jackCount; i++) {
    const run = halfSpan - i * spacing
    if (run <= 0) break
    jackLengths.push((run + eaves) / Math.cos(a))
  }

  return {
    hipPitchDeg: rad2deg(hipPitch),
    hipRun,
    hipLength,
    hipTotal,
    jackDifference,
    jackLengths,
    jackCheekAngleDeg: rad2deg(Math.atan(Math.cos(a))),
    hipBackingAngleDeg: rad2deg(Math.atan(Math.sin(hipPitch))),
    // Kalenica jest krótsza od budynku o dwa biegi naroży (po jednym z każdej strony).
    ridgeLength: Math.max(0, buildingLength - span),
  }
}

/** Geometria jętki w więźbie krokwiowo-jętkowej. */
export interface CollarGeometry {
  /** Rozpiętość jętki w świetle krokwi [mm]. */
  span: number
  /** Długość jętki do zamówienia, z zakładkami na krokwiach [mm]. */
  length: number
  /** Wysokość dolnej krawędzi jętki nad murłatą [mm]. */
  height: number
  /** Czy jętka mieści się pod kalenicą. */
  valid: boolean
}

/**
 * Jętka spina parę krokwi na zadanej wysokości. Im wyżej, tym krótsza:
 * na wysokości h szerokość dachu zwęża się o 2·h/tan α.
 *
 * @param span rozpiętość budynku [mm]
 * @param pitchDeg kąt nachylenia [stopnie]
 * @param height wysokość dolnej krawędzi jętki nad murłatą [mm]
 * @param rafterWidth grubość krokwi [mm] — jętka zachodzi na krokwie
 */
export function collarGeometry(
  span: number,
  pitchDeg: number,
  height: number,
  rafterWidth: number,
): CollarGeometry {
  const a = deg2rad(pitchDeg)
  const rise = (span / 2) * Math.tan(a)
  const tan = Math.tan(a)
  // Szerokość między dolnymi krawędziami krokwi na wysokości `height`.
  const clearSpan = tan > 1e-9 ? span - (2 * height) / tan : span
  return {
    span: clearSpan,
    // Jętka przybijana z boku krokwi — bierzemy pełną rozpiętość plus zakładki.
    length: clearSpan + 2 * rafterWidth,
    height,
    valid: height > 0 && height < rise && clearSpan > 0,
  }
}
