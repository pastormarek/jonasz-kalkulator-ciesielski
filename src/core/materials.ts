/**
 * Zestawienie materiału — przeliczenie geometrii dachu na listę zakupów.
 *
 * Cały moduł jest czystą funkcją: RoofInput na wejściu, komplet wyników na
 * wyjściu. Dzięki temu ten sam kod liczy podgląd na ekranie, wydruk PDF i
 * testy — i nie ma szans, żeby się rozjechały.
 */

import type { RoofInput, TimberItem, Opening, Section } from './types'
import { SPLICE_SUPPORT_LABELS } from './defaults'
import {
  slopeGeometry,
  layoutRafters,
  notch,
  hipGeometry,
  collarGeometry,
  ridgeJoint,
  eavesCut,
  rozstawMurlat,
  deg2rad,
  type SlopeGeometry,
  type RafterLayout,
  type Notch,
  type HipGeometry,
  type CollarGeometry,
  type RidgeJoint,
  type EavesCut,
} from './geometry'
import { planCuts, volumeM3, surfaceM2, type CutPlan } from './cutting'

/** Pozycja materiału liczonego w metrach kwadratowych. */
export interface AreaItem {
  name: string
  /** Powierzchnia netto [m²]. */
  net: number
  /** Powierzchnia z zapasem i zakładami [m²]. */
  gross: number
  note?: string
}

/** Pozycja liczona na sztuki — łączniki, kotwy, wkręty. */
export interface FastenerItem {
  name: string
  count: number
  unit: string
  note?: string
}

/** Drewno jednego przekroju wraz z planem cięcia. */
export interface TimberGroup {
  section: Section
  label: string
  items: TimberItem[]
  /** Łączna długość netto [mm]. */
  totalLength: number
  /** Objętość netto [m³]. */
  volumeM3: number
  plan: CutPlan
}

/** Wynik sprawdzenia łączenia krokwi nad podporą. */
export interface SpliceResult {
  /** Czy łączenie jest włączone i geometrycznie poprawne. */
  active: boolean
  /** Odległość styku od dolnego końca krokwi, wzdłuż połaci [mm]. */
  atLength: number
  /** Długość odcinka dolnego, z nakładką [mm]. */
  lower: number
  /** Długość odcinka górnego [mm]. */
  upper: number
  /** Nazwa podpory pod stykiem. */
  supportLabel: string
}

/** Komplet wyników obliczeń dachu. */
export interface Calculation {
  input: RoofInput
  slope: SlopeGeometry
  layout: RafterLayout
  notchGeom: Notch
  /** Złącze krokwi w kalenicy: zerowe przy cięciu czołowym. */
  ridge: RidgeJoint
  /** Zakończenie krokwi przy okapie, dopasowane do deski podrynnowej. */
  eaves: EavesCut
  splice: SpliceResult
  hip: HipGeometry | null
  collar: CollarGeometry | null
  /** Liczba połaci głównych: 1 dla pulpitowego, 2 dla pozostałych. */
  mainSlopes: number
  /** Powierzchnia dachu w rzucie poziomym [m²]. */
  planAreaM2: number
  /** Powierzchnia połaci [m²]. */
  roofAreaM2: number
  /** Wysokość kalenicy nad murłatą [mm]. */
  ridgeHeight: number
  timber: TimberItem[]
  groups: TimberGroup[]
  areas: AreaItem[]
  fasteners: FastenerItem[]
  /** Zapotrzebowanie na impregnat [l]. */
  impregnationLitres: number
  /** Łączna objętość drewna netto [m³]. */
  totalVolumeM3: number
  /** Łączna objętość drewna do kupienia, po planie cięcia [m³]. */
  purchaseVolumeM3: number
  /** Problemy, które trzeba naprawić przed cięciem drewna. */
  warnings: string[]
  /** Uwagi wykonawcze — nie są błędem, ale trzeba o nich pamiętać na budowie. */
  notes: string[]
}

/** Zużycie impregnatu [l/m²] na jedną warstwę. */
export const IMPREGNATION_PER_M2 = 0.2
/** Liczba warstw impregnatu. */
export const IMPREGNATION_COATS = 2
/** Zakład membrany i zapas na docinki [%]. */
const MEMBRANE_OVERLAP_PCT = 15
/** Grubość deski podrynnowej [mm] — deska calowa, tak się ją kupuje. */
const FASCIA_THICKNESS = 25

/** Naddatek na deskę podrynnową [%] — na docinki i łączenia. */
const FASCIA_SPARE_PCT = 15

/** Rozstaw kotew mocujących murłatę do wieńca [mm]. */
const ANCHOR_SPACING = 1500

export function calculate(dane: RoofInput): Calculation {
  // Rozpiętość podaje się dwiema drogami: cieśla wprost jako rozstaw murłat,
  // ktoś bez wprawy jako obrys budynku. Sprowadzamy ją do jednej liczby TU,
  // żeby reszta modułu nie musiała o tym wiedzieć.
  const input: RoofInput = { ...dane, span: rozstawMurlat(dane) }
  const warnings: string[] = []
  const notes: string[] = []
  const a = deg2rad(input.pitchDeg)
  const cos = Math.cos(a)

  const isShed = input.shape === 'shed'
  const isHip = input.shape === 'hip'
  const mainSlopes = isShed ? 1 : 2

  // --- geometria podstawowa ---
  // Pulpitowy ma jedną połać na całej rozpiętości; pozostałe dzielą ją na pół.
  const run = isShed ? input.span : input.span / 2
  const slope = slopeGeometry(run, input.pitchDeg, input.eaves)
  const layout = layoutRafters(input.length, input.rafterSpacingMax, input.rafterSection.b)
  const notchGeom = notch(
    input.notchDepth,
    input.pitchDeg,
    input.rafterSection.h,
    input.wallPlateSection.b,
  )

  const hip = isHip
    ? hipGeometry(input.span, input.length, input.pitchDeg, input.eaves, layout.spacing)
    : null

  // Dach pulpitowy nie ma kalenicy, w której dwie krokwie mogłyby się minąć —
  // tam zakładka nie ma czego zazębiać, więc wymuszamy cięcie czołowe.
  const ridge = ridgeJoint(
    isShed ? 'czolowe' : input.ridgeJoint,
    input.rafterSection.h,
    input.rafterSection.b,
    input.pitchDeg,
  )
  const eaves = eavesCut(
    input.fasciaHeight,
    input.rafterSection.h,
    input.pitchDeg,
    input.fasciaReveal,
  )

  const splice = evaluateSplice(input, slope, warnings, notes)

  const collar =
    input.truss === 'collar'
      ? collarGeometry(input.span, input.pitchDeg, input.collarHeight, input.rafterSection.b)
      : null

  // --- powierzchnie ---
  // Dla dachu o jednolitym spadku pole połaci to dokładnie pole rzutu / cos α.
  const planWidth = input.span + 2 * input.eaves
  const planLength = input.length + (isHip ? 2 * input.eaves : 2 * input.gableOverhang)
  const planAreaM2 = (planWidth / 1000) * (planLength / 1000)
  const roofAreaM2 = planAreaM2 / cos

  // --- walidacja wejścia ---
  if (input.pitchDeg <= 0 || input.pitchDeg >= 90) {
    warnings.push('Kąt nachylenia musi mieścić się między 0° a 90°.')
  }
  if (!notchGeom.depthOk) {
    warnings.push(
      `Zacios ${fmt(input.notchDepth)} mm jest za głęboki. Norma dopuszcza najwyżej 1/3 wysokości krokwi, czyli ${fmt(notchGeom.maxDepth)} mm.`,
    )
  }
  if (!notchGeom.seatFitsPlate) {
    warnings.push(
      `Siodło zaciosu ma ${fmt(notchGeom.seatLength)} mm i nie mieści się na murłacie szerokiej ${fmt(input.wallPlateSection.b)} mm. Zmniejsz zacios albo weź szerszą murłatę.`,
    )
  }
  if (layout.clear < 0) {
    warnings.push('Krokwie zachodzą na siebie — rozstaw jest mniejszy niż ich grubość.')
  }
  if (collar && !collar.valid) {
    warnings.push('Jętka jest za wysoko — wypada powyżej kalenicy. Obniż ją.')
  }
  if (input.hasFascia && eaves.fits && eaves.horizontalCut > 0) {
    notes.push(
      `Koniec krokwi ma dwa cięcia: pionowe na ${fmt(eaves.cutHeight)} mm i poziome na ${fmt(eaves.horizontalCut)} mm w głąb. Deska podrynnowa schodzi ${fmt(eaves.reveal)} mm poniżej cięcia poziomego — to miejsce na podbitkę.`,
    )
  }
  if (input.hasFascia && !eaves.fits) {
    warnings.push(
      `Deska podrynnowa ${fmt(input.fasciaHeight)} mm wymaga cięcia pionowego ${fmt(eaves.cutHeight)} mm, a krokiew ma w pionie tylko ${fmt(eaves.verticalHeight)} mm. Weź niższą deskę albo wyższą krokiew.`,
    )
  }
  if (input.truss === 'rafter' && slope.rafterToRidge > 4500) {
    warnings.push(
      `Krokiew ma ${fmtM(slope.rafterToRidge)} m w świetle. Przy więźbie krokwiowej powyżej ok. 4,5 m zwykle dokłada się jętki — sprawdź to z konstruktorem.`,
    )
  }

  // --- drewno konstrukcyjne ---
  const timber: TimberItem[] = []

  // Przy zakładce krokiew przechodzi za oś kalenicy, więc jest dłuższa niż
  // wynikałoby z samej geometrii połaci. Kontrłat i łat to nie dotyczy —
  // one kończą się na kalenicy.
  const rafterFull = slope.rafterTotal + ridge.extension
  const rafterLength = withAllowance(rafterFull, input.cutAllowance)
  if (ridge.extension > 0) {
    notes.push(
      `Zakładka w kalenicy wydłuża każdą krokiew o ${fmt(ridge.extension)} mm — długość w zestawieniu już to uwzględnia. Wybranie ma ${fmt(ridge.depth)} mm głębokości, czyli pół grubości krokwi.`,
    )
  }
  const openings = input.openings ?? []
  const cut = countCutRafters(openings, layout, input)

  if (isHip) {
    // Kopertowy: krokwie zwykłe tylko w prostokątnej części pod kalenicą.
    const commonBays = Math.max(0, Math.ceil((hip!.ridgeLength - input.rafterSection.b) / layout.spacing))
    const commonPerSlope = commonBays + 1
    timber.push(
      ...rafterItems(
        'Krokiew zwykła',
        commonPerSlope * 2,
        rafterLength,
        input,
        splice,
        `${commonPerSlope} szt. na połać, rozstaw ${fmt(layout.spacing)} mm`,
      ),
    )
    timber.push({
      name: 'Krokiew narożna (krożyna)',
      section: input.rafterSection,
      length: withAllowance(hip!.hipTotal, input.cutAllowance),
      count: 4,
      note: `nachylenie ${hip!.hipPitchDeg.toFixed(1)}°, sfazowanie grzbietu ${hip!.hipBackingAngleDeg.toFixed(1)}°`,
    })
    // Kulawki występują po obu stronach każdej z czterech krożyn.
    hip!.jackLengths.forEach((len, i) => {
      timber.push({
        name: `Kulawka ${i + 1}`,
        section: input.rafterSection,
        length: withAllowance(len, input.cutAllowance),
        count: 8,
        note: `ukos na pile ${hip!.jackCheekAngleDeg.toFixed(1)}°`,
      })
    })
  } else {
    timber.push(
      ...rafterItems(
        'Krokiew',
        layout.countPerSlope * mainSlopes - cut.removed,
        rafterLength,
        input,
        splice,
        `${layout.countPerSlope} szt. na połać, rozstaw w osiach ${fmt(layout.spacing)} mm`,
      ),
    )
  }

  // Krokwie przerwane otworami zamieniają się w krótsze odcinki nad i pod otworem.
  for (const piece of cut.pieces) {
    timber.push(piece)
  }
  for (const ex of cut.exchanges) {
    timber.push(ex)
  }

  // Murłata biegnie po obwodzie oparcia: dwie ściany albo pełny obwód przy kopercie.
  const plateLength = isHip ? 2 * (input.length + input.span) : 2 * input.length
  timber.push({
    name: 'Murłata',
    section: input.wallPlateSection,
    length: input.length,
    count: isHip ? 2 : 2,
    note: isHip ? 'dodatkowo murłaty szczytowe poniżej' : 'po jednej na każdą ścianę podłużną',
    splittable: true,
  })
  if (isHip) {
    timber.push({
      name: 'Murłata szczytowa',
      section: input.wallPlateSection,
      length: input.span,
      count: 2,
      note: 'domyka obwód pod krożyny',
      splittable: true,
    })
  }

  if (collar && collar.valid) {
    timber.push({
      name: 'Jętka',
      section: input.collarSection,
      length: withAllowance(collar.length, input.cutAllowance),
      count: layout.countPerSlope,
      note: `na wysokości ${fmt(collar.height)} mm, rozpiętość ${fmt(collar.span)} mm`,
    })
  }

  if (input.truss === 'purlin') {
    addPurlinFrame(timber, input, slope, isHip ? hip!.ridgeLength : input.length, notes)
  }

  // --- grupowanie po przekroju i plan cięcia ---
  if (input.hasFascia && input.fasciaHeight > 0) {
    // Deska biegnie wzdłuż całego okapu: przy dachu kopertowym dookoła,
    // przy dwuspadowym po obu stronach, przy pulpitowym po jednej.
    const bokDlugi = input.length + 2 * (isHip ? input.eaves : input.gableOverhang)
    const bokKrotki = input.span + 2 * input.eaves
    const odcinki: Array<{ dlugosc: number; sztuk: number }> = isHip
      ? [
          { dlugosc: bokDlugi, sztuk: 2 },
          { dlugosc: bokKrotki, sztuk: 2 },
        ]
      : [{ dlugosc: bokDlugi, sztuk: mainSlopes }]

    for (const o of odcinki) {
      timber.push({
        name: 'Deska podrynnowa',
        section: { b: FASCIA_THICKNESS, h: input.fasciaHeight },
        // Naddatek 15% na docinki i łączenia — tak liczy to cieśla.
        length: Math.round(o.dlugosc * (1 + FASCIA_SPARE_PCT / 100)),
        count: o.sztuk,
        splittable: true,
        note: `wzdłuż okapu, z ${FASCIA_SPARE_PCT}% naddatku; krokiew cięta pionowo na ${fmt(eaves.cutHeight)} mm`,
      })
    }
  }

  const groups = groupBySection(timber, input.stockLengths)
  const totalVolumeM3 = groups.reduce((s, g) => s + g.volumeM3, 0)
  const purchaseVolumeM3 = groups.reduce(
    (s, g) => s + volumeM3(g.section.b, g.section.h, g.plan.totalStock),
    0,
  )

  for (const g of groups) {
    if (g.plan.impossible.length > 0) {
      const longest = Math.max(...g.plan.impossible)
      const hint =
        input.stockMode === 'handlowe'
          ? 'Przełącz drewno na cięte na wymiar (tartak robi do 12 m) albo włącz łączenie krokwi nad ścianą kolankową lub wieńcem.'
          : 'Nawet na zamówienie to bardzo długa sztuka — rozważ łączenie nad podporą.'
      warnings.push(`${g.label}: element o długości ${fmtM(longest)} m nie mieści się w żadnej dostępnej belce. ${hint}`)
    }
  }

  // --- warstwy pokrycia ---
  const areas: AreaItem[] = []
  // Poza rzędami wynikającymi z rozstawu dochodzą dwie łaty, o których łatwo
  // zapomnieć: jedna pod gąsior w kalenicy i jedna na pas okapowy.
  const battenRows = Math.ceil(slope.slopeLength / input.battenSpacing) + 2
  const battenRunM = ((battenRows * planLength) / 1000) * mainSlopes

  if (input.hasSheathing) {
    areas.push({
      name: 'Deskowanie / płyty poszycia',
      net: roofAreaM2,
      gross: roofAreaM2 * 1.1,
      note: 'z 10% zapasu na docinki',
    })
  }
  if (input.hasMembrane) {
    areas.push({
      name: 'Membrana wstępnego krycia',
      net: roofAreaM2,
      gross: roofAreaM2 * (1 + MEMBRANE_OVERLAP_PCT / 100),
      note: `z ${MEMBRANE_OVERLAP_PCT}% na zakłady poziome i pionowe`,
    })
  }
  if (input.hasInsulation) {
    // Wełna wchodzi tylko między krokwie, więc odejmujemy pole zajęte przez drewno.
    const woodFraction = input.rafterSection.b / layout.spacing
    areas.push({
      name: 'Ocieplenie międzykrokwiowe',
      net: roofAreaM2 * (1 - woodFraction),
      gross: roofAreaM2 * (1 - woodFraction) * 1.05,
      note: `krokwie zajmują ${(woodFraction * 100).toFixed(0)}% połaci`,
    })
  }

  // --- łączniki ---
  const rafterCount = timber
    .filter((t) => t.name.startsWith('Krokiew') || t.name.startsWith('Kulawka'))
    .reduce((s, t) => s + t.count, 0)
  const anchors = Math.ceil(plateLength / ANCHOR_SPACING)

  const fasteners: FastenerItem[] = [
    {
      name: 'Pręt gwintowany M14–M16 na kotwie chemicznej',
      count: anchors,
      unit: 'szt.',
      note: `mocuje murłatę do wieńca, rozstaw co ${ANCHOR_SPACING / 1000} m, łącznie ${fmtM(plateLength)} m murłaty`,
    },
  ]

  // Krokiew mocuje się do murłaty albo długimi wkrętami wprost, albo na kątowniki.
  if (input.rafterFixing === 'katowniki') {
    fasteners.push(
      {
        name: 'Kątownik ciesielski krokiew–murłata',
        count: rafterCount * 2,
        unit: 'szt.',
        note: 'po dwa na każde oparcie krokwi',
      },
      {
        name: 'Wkręt do kątowników',
        count: rafterCount * 2 * 10,
        unit: 'szt.',
        note: 'po ok. 10 wkrętów na kątownik',
      },
    )
  } else {
    fasteners.push({
      name: 'Wkręt ciesielski krokiew–murłata',
      count: rafterCount * 2,
      unit: 'szt.',
      note: 'po dwa na oparcie, wkręcane wprost w murłatę — typowo 8×220, 8×240 lub 10×240 mm',
    })
  }

  // Dach pulpitowy nie ma kalenicy — nie ma tam czego spinać.
  if (!isShed) {
    // Wkręt musi przejść przez obie połówki zakładki, więc jego długość
    // dobiera się do grubości krokwi. Cztery sztuki na parę to minimum.
    const paryKrokwi = Math.ceil(rafterCount / 2)
    fasteners.push({
      name: 'Wkręt ciesielski — połączenie krokwi w kalenicy',
      count: paryKrokwi * 4,
      unit: 'szt.',
      note:
        ridge.kind === 'zakladka'
          ? `po cztery na parę krokwi, długość co najmniej ${fmt(input.rafterSection.b)} mm — tyle, ile grubość krokwi`
          : 'po cztery na parę krokwi',
    })
  }

  if (collar && collar.valid) {
    fasteners.push({
      name: 'Śruba M12 z podkładką — jętka',
      count: layout.countPerSlope * 4,
      unit: 'szt.',
      note: 'po dwie na każdy koniec jętki',
    })
  }

  const battenLinearM = battenRunM
  const counterBattenLinearM = (rafterCount * slope.rafterTotal) / 1000

  // --- impregnat ---
  const timberSurfaceM2 = groups.reduce(
    (s, g) => s + surfaceM2(g.section.b, g.section.h, g.totalLength),
    0,
  )
  const battenSurfaceM2 =
    surfaceM2(input.battenSection.b, input.battenSection.h, battenLinearM * 1000) +
    surfaceM2(
      input.counterBattenSection.b,
      input.counterBattenSection.h,
      counterBattenLinearM * 1000,
    )
  const impregnationLitres = input.hasImpregnation
    ? (timberSurfaceM2 + battenSurfaceM2) * IMPREGNATION_PER_M2 * IMPREGNATION_COATS
    : 0

  if (!input.hasImpregnation) {
    notes.push(
      'Impregnat nie jest liczony — drewno konstrukcyjne z tartaku bywa impregnowane w cenie. Przy zamawianiu zaznacz, że ma być impregnowane, albo włącz tę pozycję w ustawieniach.',
    )
  }

  areas.push({
    name: 'Łaty',
    net: battenLinearM,
    gross: battenLinearM * 1.05,
    note: `${battenRows} rzędów na połaci (w tym łata pod gąsior i druga łata pasa okapowego, odsunięta o 1–2 cm od pierwszej), rozstaw ${fmt(input.battenSpacing)} mm`,
  })
  // Wiatrownica to ta sama łata co na dachu, przybijana od spodu krokwi
  // ukośnie — dwie sztuki, po jednej z każdej strony dachu. Biegnie po
  // przekątnej od kalenicy w stronę okapu, przecinając kilka krokwi, więc
  // jest dłuższa od samej połaci; przyjmujemy skos przez trzy pola krokwi.
  const wiatrownicaSkos = Math.hypot(slope.slopeLength, 3 * layout.spacing)
  const wiatrownicaM = (wiatrownicaSkos * 2) / 1000
  areas.push({
    name: 'Wiatrownice',
    net: wiatrownicaM,
    gross: wiatrownicaM * 1.05,
    note: `dwie sztuki, po jednej z każdej strony dachu, z tej samej łaty ${fmt(input.battenSection.b)}×${fmt(input.battenSection.h)} mm; przybijane od spodu krokwi pod skosem`,
  })
  areas.push({
    name: 'Kontrłaty',
    net: counterBattenLinearM,
    gross: counterBattenLinearM * 1.05,
    note: 'po jednej na każdej krokwi — wynik w metrach bieżących',
  })

  if (input.stockMode === 'na-wymiar') {
    notes.push(
      'Drewno cięte na wymiar trzeba zamówić z wyprzedzeniem i sprawdzić, czy da się je dowieźć i wnieść na dach.',
    )
  }

  return {
    input,
    slope,
    layout,
    notchGeom,
    ridge,
    eaves,
    splice,
    hip,
    collar,
    mainSlopes,
    planAreaM2,
    roofAreaM2,
    ridgeHeight: slope.rise,
    timber,
    groups,
    areas,
    fasteners,
    impregnationLitres,
    totalVolumeM3,
    purchaseVolumeM3,
    warnings,
    notes,
  }
}

/** Dokłada elementy więźby płatwiowo-kleszczowej. */
function addPurlinFrame(
  timber: TimberItem[],
  input: RoofInput,
  slope: SlopeGeometry,
  ridgeRun: number,
  notes: string[],
): void {
  const purlins = Math.max(0, Math.min(2, Math.round(input.purlinCount)))
  const postBays = Math.max(1, Math.ceil(input.length / input.postSpacingMax))
  const postSpacing = input.length / postBays
  const postsPerPurlin = postBays + 1

  if (purlins === 0) {
    timber.push({
      name: 'Płatew kalenicowa',
      section: input.purlinSection,
      length: ridgeRun,
      count: 1,
      note: 'podpiera krokwie w kalenicy',
      splittable: true,
    })
    // Krokwie spięte zakładką trzymają się w kalenicy same. Płatew nadal
    // wolno pod nie wsunąć, ale wtedy jest wyborem projektu, a nie
    // koniecznością — warto o tym wiedzieć przed zamówieniem belki.
    if (input.ridgeJoint === 'zakladka' && input.shape !== 'shed') {
      notes.push(
        'Przy zakładce w kalenicy płatew kalenicowa nie jest konieczna — krokwie spięte na zakładkę trzymają się same. Jeśli projekt jej nie przewiduje, zmień więźbę na krokwiową albo jętkową, a płatew i słupy znikną z zestawienia.',
      )
    }
  } else {
    timber.push({
      name: 'Płatew pośrednia',
      section: input.purlinSection,
      length: input.length,
      count: purlins * 2,
      note: `${purlins} na połać, rozstaw słupów ${fmt(postSpacing)} mm`,
      splittable: true,
    })
  }

  // Wysokość słupa liczona od PODŁOGI PODDASZA — tak wskazał cieśla: „przy
  // dachach dwuspadowych i kopertowych, jeśli w miejscu słupa nie ma ściany
  // nośnej, liczy się od podłogi poddasza".
  //
  // Do wierzchu murłaty jest stamtąd ścianka kolankowa plus sama murłata.
  // Płatwie dzielą bieg połaci na równe części, więc pierwsza z dwóch stoi
  // w 1/3 biegu, a jedyna — w połowie. Wysokość krokwi nad murłatą w tym
  // miejscu to bieg × tg α, a słup kończy się pod płatwią, nie na krokwi.
  const doMurlaty = input.kneeWallHeight + input.wallPlateSection.h
  const biegPlatwi = purlins === 0 ? slope.run : slope.run / (purlins + 1)
  const wzniesieniePlatwi = biegPlatwi * Math.tan(deg2rad(input.pitchDeg))
  const postHeight = Math.max(0, doMurlaty + wzniesieniePlatwi - input.purlinSection.h)
  timber.push({
    name: 'Słup',
    section: input.postSection,
    length: withAllowance(postHeight, input.cutAllowance),
    count: postsPerPurlin * Math.max(1, purlins * 2),
    note: `od podłogi poddasza do spodu płatwi: ${fmt(input.kneeWallHeight)} mm ścianki + ${fmt(input.wallPlateSection.h)} mm murłaty + ${fmt(wzniesieniePlatwi)} mm wzniesienia − ${fmt(input.purlinSection.h)} mm płatwi`,
  })
  notes.push(
    'Długość słupa liczymy od podłogi poddasza. Jeśli w miejscu słupa stoi ściana nośna albo projekt podaje inny poziom oparcia, sprawdź to z rzutem — słup zawsze można dociąć, gdyby wyszedł za długi.',
  )

  if (input.hasClamps) {
    // Kleszcze kręci się z boku do krokwi i nie wolno im wystawać poza nie,
    // więc kończą się na krokwiach — nic ponad rozpiętość nie doliczamy.
    timber.push({
      name: 'Kleszcze (deska)',
      section: input.clampSection,
      length: withAllowance(input.span, input.cutAllowance),
      count: postsPerPurlin * 2,
      note: 'para desek na każdy słup, kręcona z boku do krokwi',
    })
  }

  if (input.hasBraces) {
    // Miecz to przekątna trójkąta równoramiennego o ramieniu braceArm.
    timber.push({
      name: 'Miecz',
      section: input.braceSection,
      length: withAllowance(input.braceArm * Math.SQRT2, input.cutAllowance),
      count: postsPerPurlin * 2,
      note: `ramię ${fmt(input.braceArm)} mm, cięcie pod 45°`,
    })
  }
}

/** Wynik analizy otworów: ile krokwi znika i co pojawia się w zamian. */
interface CutResult {
  removed: number
  pieces: TimberItem[]
  exchanges: TimberItem[]
}

/**
 * Liczy skutki otworów w połaci. Każdy otwór przerywa te krokwie, których osie
 * wpadają w jego szerokość, i wymaga dwóch wymianów: nad i pod otworem.
 */
function countCutRafters(
  openings: Opening[],
  layout: RafterLayout,
  input: RoofInput,
): CutResult {
  const pieces: TimberItem[] = []
  const exchanges: TimberItem[] = []
  let removed = 0

  openings.forEach((op, idx) => {
    // Ile osi krokwi mieści się w świetle otworu.
    const cutCount = Math.max(0, Math.floor(op.width / layout.spacing))
    removed += cutCount

    if (cutCount > 0) {
      const a = deg2rad(input.pitchDeg)
      const openingAlongSlope = op.height / Math.cos(a)
      // Odcinek nad otworem i pod otworem — razem krótsze niż pełna krokiew.
      const fullLength = slopeGeometry(
        input.shape === 'shed' ? input.span : input.span / 2,
        input.pitchDeg,
        input.eaves,
      ).rafterTotal
      const restLength = Math.max(0, fullLength - openingAlongSlope)
      pieces.push({
        name: `Krokiew skrócona przy otworze ${idx + 1} (${op.kind})`,
        section: input.rafterSection,
        length: withAllowance(restLength / 2, input.cutAllowance),
        count: cutCount * 2,
        note: 'odcinek nad i pod otworem',
      })
    }

    exchanges.push({
      name: `Wymian przy otworze ${idx + 1} (${op.kind})`,
      section: input.rafterSection,
      length: withAllowance(op.width + 2 * input.rafterSection.b, input.cutAllowance),
      count: 2,
      note: 'poprzeczka nad i pod otworem, oparta na sąsiednich krokwiach',
    })
  })

  return { removed, pieces, exchanges }
}

/**
 * Sprawdza łączenie krokwi nad podporą pośrednią.
 *
 * Krokiew z dwóch kawałków jest w pełni poprawna, o ile styk wypada dokładnie
 * nad podporą — ścianą kolankową, wieńcem albo płatwią. Dlatego nie dzielimy
 * krokwi na pół "gdzieś", tylko dokładnie w punkcie, który poda użytkownik.
 */
function evaluateSplice(
  input: RoofInput,
  slope: SlopeGeometry,
  warnings: string[],
  notes: string[],
): SpliceResult {
  const idle: SpliceResult = {
    active: false,
    atLength: 0,
    lower: 0,
    upper: 0,
    supportLabel: SPLICE_SUPPORT_LABELS[input.splice.support],
  }

  if (!input.splice.enabled) return idle

  const run = input.shape === 'shed' ? input.span : input.span / 2
  if (input.splice.atRun <= 0 || input.splice.atRun >= run) {
    warnings.push(
      `Podpora pod stykiem krokwi wypada ${fmtM(input.splice.atRun)} m od murłaty, a połać ma tylko ${fmtM(run)} m biegu. Styk musi trafić w podporę stojącą pod dachem.`,
    )
    return idle
  }

  // Styk mierzymy od dolnego końca krokwi, czyli od końca okapu.
  const atLength = (input.eaves + input.splice.atRun) / Math.cos(deg2rad(input.pitchDeg))
  const lower = atLength + input.splice.overlap
  const upper = slope.rafterTotal - atLength + input.cutAllowance

  notes.push(
    `Krokiew jest łączona z dwóch kawałków. Styk wypada ${fmtM(atLength)} m od okapu i musi opierać się na podporze (${SPLICE_SUPPORT_LABELS[input.splice.support]}). Nakładka ${fmt(input.splice.overlap)} mm.`,
  )

  return {
    active: true,
    atLength,
    lower,
    upper,
    supportLabel: SPLICE_SUPPORT_LABELS[input.splice.support],
  }
}

/** Zwraca pozycje dla krokwi — jedną całą albo dwa odcinki, gdy jest łączona. */
function rafterItems(
  name: string,
  count: number,
  fullLength: number,
  input: RoofInput,
  splice: SpliceResult,
  note: string,
): TimberItem[] {
  if (count <= 0) return []

  if (!splice.active) {
    return [{ name, section: input.rafterSection, length: fullLength, count, note }]
  }

  return [
    {
      name: `${name} — odcinek dolny`,
      section: input.rafterSection,
      length: splice.lower,
      count,
      note: `${note}; od okapu do podpory (${splice.supportLabel}), z nakładką`,
    },
    {
      name: `${name} — odcinek górny`,
      section: input.rafterSection,
      length: splice.upper,
      count,
      note: `${note}; od podpory do kalenicy`,
    },
  ]
}

/** Grupuje elementy po przekroju i układa dla każdej grupy plan cięcia. Wspólne dla dachu i wiaty. */
export function groupBySection(timber: TimberItem[], stockLengths: number[]): TimberGroup[] {
  const map = new Map<string, TimberGroup>()

  for (const item of timber) {
    if (item.count <= 0 || item.length <= 0) continue
    const key = `${item.section.b}x${item.section.h}`
    let group = map.get(key)
    if (!group) {
      group = {
        section: item.section,
        label: `${item.section.b} × ${item.section.h} mm`,
        items: [],
        totalLength: 0,
        volumeM3: 0,
        plan: { bars: [], purchase: [], totalStock: 0, totalNeeded: 0, totalWaste: 0, wastePct: 0, impossible: [] },
      }
      map.set(key, group)
    }
    group.items.push(item)
    group.totalLength += item.length * item.count
  }

  const maxStock = Math.max(...stockLengths, 0)

  for (const group of map.values()) {
    const pieces: number[] = []
    for (const item of group.items) {
      // Element ciągły dłuższy niż belka handlowa dzielimy na równe odcinki
      // i łączymy je na budowie — tak się murłatę i płatew układa naprawdę.
      const parts =
        item.splittable && maxStock > 0 && item.length > maxStock
          ? Math.ceil(item.length / maxStock)
          : 1
      const partLength = item.length / parts
      for (let i = 0; i < item.count * parts; i++) pieces.push(partLength)
    }
    group.plan = planCuts(pieces, stockLengths)
    group.volumeM3 = volumeM3(group.section.b, group.section.h, group.totalLength)
  }

  return [...map.values()].sort((a, b) => b.volumeM3 - a.volumeM3)
}

/** Dokłada naddatek na docięcie do długości elementu. */
export function withAllowance(length: number, allowance: number): number {
  return length > 0 ? length + allowance : 0
}

const fmt = (mm: number): string => Math.round(mm).toString()
const fmtM = (mm: number): string => (mm / 1000).toFixed(2)
