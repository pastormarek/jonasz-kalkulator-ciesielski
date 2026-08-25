/**
 * Zestawienie materiału wiaty — od wymiarów w osiach słupów do listy zakupów.
 *
 * Tak jak przy dachu, cały moduł jest czystą funkcją: `ShelterInput` na wejściu,
 * komplet wyników na wyjściu. Plan cięcia, grupowanie po przekrojach i naddatki
 * bierzemy z modułu dachowego — to ta sama piła i ten sam skład budowlany,
 * więc nie ma powodu liczyć tego drugi raz osobno.
 */

import type { TimberItem } from './types'
import {
  type ShelterInput,
  type ShelterGeometry,
  type PostLayout,
  type BraceGeometry,
  type FootingResult,
  type GutterResult,
  SHELTER_COVERING_INFO,
  POST_BASE_INFO,
  shelterGeometry,
  layoutPosts,
  braceGeometry,
  footings,
  gutters,
} from './shelter'
import {
  groupBySection,
  withAllowance,
  IMPREGNATION_PER_M2,
  IMPREGNATION_COATS,
  type AreaItem,
  type FastenerItem,
  type TimberGroup,
} from './materials'
import { layoutRafters, type RafterLayout } from './geometry'
import { volumeM3, surfaceM2 } from './cutting'

/** Komplet wyników obliczeń wiaty. */
export interface ShelterCalculation {
  input: ShelterInput
  geom: ShelterGeometry
  posts: PostLayout
  rafters: RafterLayout
  brace: BraceGeometry
  footing: FootingResult
  /** Odwodnienie; null, gdy wyłączone albo gdy zadaszenie nie ma pokrycia. */
  gutter: GutterResult | null
  timber: TimberItem[]
  groups: TimberGroup[]
  areas: AreaItem[]
  fasteners: FastenerItem[]
  /** Zapotrzebowanie na impregnat [l]. */
  impregnationLitres: number
  /** Łączna objętość drewna netto [m³]. */
  totalVolumeM3: number
  /** Objętość drewna do kupienia, po planie cięcia [m³]. */
  purchaseVolumeM3: number
  /** Ciężar pokrycia wraz z konstrukcją [kg] — do rozmowy z konstruktorem. */
  roofWeightKg: number
  warnings: string[]
  notes: string[]
}

/** Gęstość drewna iglastego świeżo po tartaku [kg/m³]. */
const TIMBER_DENSITY = 550
/** Rozstaw kotew mocujących belkę ścienną do muru [mm]. */
const WALL_ANCHOR_SPACING = 800
/** Najmniejsza rozsądna głębokość stopy w polskich warunkach [mm]. */
const MIN_FOOTING_DEPTH = 800
/** Prześwit, poniżej którego pod okapem zaczyna się uderzać głową [mm]. */
const HEAD_CLEARANCE = 2000

export function calculateShelter(input: ShelterInput): ShelterCalculation {
  const warnings: string[] = []
  const notes: string[] = []

  const geom = shelterGeometry(input)
  const pokrycie = SHELTER_COVERING_INFO[input.covering]
  const podstawa = POST_BASE_INFO[input.postBase]

  const dwuspadowy = geom.slopes === 2
  const przyscienne = input.kind === 'zadaszenie'
  const wolnostojaca = !przyscienne

  // Słupy stoją tylko tam, gdzie nie ma ściany budynku.
  const rzedySlupow = przyscienne ? 1 : geom.postRows
  const posts = layoutPosts(input.length, input.postSpacingMax, rzedySlupow)
  const rafters = layoutRafters(geom.roofLength, input.rafterSpacingMax, input.rafterSection.b)
  const brace = braceGeometry(input.braceArm)

  // --- walidacja wejścia ---
  if (input.pitchDeg < 0 || input.pitchDeg >= 60) {
    warnings.push('Kąt nachylenia wiaty musi mieścić się między 0° a 60°.')
  }
  if (input.covering !== 'brak' && input.pitchDeg < pokrycie.minPitchDeg) {
    warnings.push(
      `${pokrycie.label} wymaga spadku co najmniej ${pokrycie.minPitchDeg}°, a wiata ma ${input.pitchDeg.toFixed(0)}°. Przy mniejszym spadku woda podchodzi pod zakłady i zaczyna kapać do środka.`,
    )
  }
  if (rafters.clear < 0) {
    warnings.push('Krokwie zachodzą na siebie — rozstaw jest mniejszy niż ich grubość.')
  }
  if (input.footingDepth < MIN_FOOTING_DEPTH && input.postBase !== 'kotwa-wklejana') {
    warnings.push(
      `Stopa ma ${fmtM(input.footingDepth)} m głębokości. W Polsce fundament musi sięgnąć poniżej strefy przemarzania, czyli 0,8–1,4 m zależnie od regionu — płytsza stopa będzie co zimę wypychana przez mróz.`,
    )
  }
  if (wolnostojaca && !input.hasBraces) {
    warnings.push(
      'Wiata bez mieczy nie ma jak przenieść wiatru — rama składa się wtedy jak parallelogram. Włącz miecze albo zaplanuj usztywnienie w inny sposób (tarcza z desek, stężenie stalowe, ściana szczytowa).',
    )
  }
  if (geom.eavesClearHeight < HEAD_CLEARANCE) {
    warnings.push(
      `Pod okapem zostaje ${fmtM(geom.eavesClearHeight)} m prześwitu. To poniżej wzrostu dorosłego człowieka — podnieś słupy albo skróć okap.`,
    )
  }

  // --- drewno konstrukcyjne ---
  const timber: TimberItem[] = []
  // Słup wbetonowany musi być dłuższy o to, co zniknie w stopie.
  const zaglebienie = input.postBase === 'w-betonie' ? input.footingDepth : 0

  // Przy dwuspadowym oba rzędy są równe, przy jednospadowym drugi rząd jest
  // wyższy o całe wzniesienie połaci — i wtedy trzeba je zamówić osobno.
  const rownaWysokosc = dwuspadowy || przyscienne
  const wBetonie = zaglebienie > 0 ? `, w tym ${fmt(zaglebienie)} mm w betonie` : ''

  timber.push({
    name: rownaWysokosc ? 'Słup' : 'Słup niski',
    section: input.postSection,
    length: withAllowance(geom.lowPostHeight + zaglebienie, input.cutAllowance),
    count: rownaWysokosc && !przyscienne ? posts.perRow * 2 : posts.perRow,
    note: `${posts.perRow} szt. w rzędzie, rozstaw ${fmt(posts.spacing)} mm${wBetonie}`,
  })

  if (!rownaWysokosc) {
    timber.push({
      name: 'Słup wysoki',
      section: input.postSection,
      length: withAllowance(geom.highPostHeight + zaglebienie, input.cutAllowance),
      count: posts.perRow,
      note: `rząd od strony wyższej, o ${fmt(geom.highPostHeight - geom.lowPostHeight)} mm dłuższy${wBetonie}`,
    })
  }

  if (dwuspadowy && input.hasRidgeBeam) {
    timber.push({
      name: 'Słup kalenicowy',
      section: input.postSection,
      length: withAllowance(geom.ridgePostHeight + zaglebienie, input.cutAllowance),
      count: posts.perRow,
      note: 'podpiera belkę kalenicową w osi wiaty',
    })
    notes.push(
      'Słupy kalenicowe stoją w osi wiaty i dzielą ją na pół. Przy wiacie garażowej sprawdź, czy nie wypadają na drodze przejazdu.',
    )
  }

  const nosneOczepy = przyscienne ? 1 : 2
  timber.push({
    name: 'Oczep',
    section: input.beamSection,
    length: withAllowance(geom.roofLength, input.cutAllowance),
    count: nosneOczepy,
    note: 'belka na słupach, wzdłuż wiaty; łączona nad słupem',
    splittable: true,
  })

  if (przyscienne) {
    timber.push({
      name: 'Belka ścienna',
      section: input.beamSection,
      length: withAllowance(geom.roofLength, input.cutAllowance),
      count: 1,
      note: `przykręcona do ściany budynku, kotwy co ${WALL_ANCHOR_SPACING} mm`,
      splittable: true,
    })
  }

  if (dwuspadowy && input.hasRidgeBeam) {
    timber.push({
      name: 'Belka kalenicowa',
      section: input.ridgeSection,
      length: withAllowance(geom.roofLength, input.cutAllowance),
      count: 1,
      note: 'na słupach kalenicowych, pod stykiem krokwi',
      splittable: true,
    })
  }

  const nazwaKrokwi = input.kind === 'pergola' ? 'Belka poprzeczna' : 'Krokiew'
  timber.push({
    name: nazwaKrokwi,
    section: input.rafterSection,
    length: withAllowance(geom.rafterLength, input.cutAllowance),
    count: rafters.countPerSlope * geom.slopes,
    note: `${rafters.countPerSlope} szt. na połać, rozstaw w osiach ${fmt(rafters.spacing)} mm`,
  })

  if (input.hasBraces) {
    // Każde pole między słupami dostaje parę mieczy — po jednym z każdej strony.
    // Rząd kalenicowy dźwiga belkę kalenicową, a nie oczep, więc go pomijamy.
    const rzedyZOczepem = Math.min(2, rzedySlupow)
    const wzdluz = 2 * posts.bays * rzedyZOczepem
    timber.push({
      name: 'Miecz wzdłużny',
      section: input.braceSection,
      length: withAllowance(brace.length, input.cutAllowance),
      count: wzdluz,
      note: `ramię ${fmt(brace.arm)} mm, oba końce cięte pod ${brace.cutAngleDeg}°`,
    })

    if (wolnostojaca) {
      // Rama poprzeczna też musi być sztywna — bez tego wiata kładzie się w bok.
      timber.push({
        name: 'Miecz poprzeczny',
        section: input.braceSection,
        length: withAllowance(brace.length, input.cutAllowance),
        count: 2 * posts.perRow,
        note: 'para w każdej ramie, między słupem a belką poprzeczną',
      })
      notes.push(
        'Miecze poprzeczne policzyliśmy w każdej ramie. Jeśli projekt przewiduje usztywnienie tylko w ramach skrajnych, zmniejsz ich liczbę przy zamawianiu.',
      )
    }
  }

  // --- podparcie pokrycia ---
  const areas: AreaItem[] = []
  const naPoszyciu = pokrycie.podpora === 'poszycie' && input.covering !== 'brak'

  if (input.covering !== 'brak' && !naPoszyciu) {
    const rzedy = Math.ceil(geom.slopeLength / Math.max(1, input.battenSpacing)) + 1
    const nazwa = pokrycie.podpora === 'platew' ? 'Płatew poprzeczna' : 'Łata'
    timber.push({
      name: nazwa,
      section: input.battenSection,
      length: withAllowance(geom.roofLength, input.cutAllowance),
      count: rzedy * geom.slopes,
      note: `${rzedy} rzędów na połaci, rozstaw ${fmt(input.battenSpacing)} mm`,
      splittable: true,
    })

    if (input.hasMembrane) {
      timber.push({
        name: 'Kontrłata',
        section: input.counterBattenSection,
        length: withAllowance(geom.rafterLength, input.cutAllowance),
        count: rafters.countPerSlope * geom.slopes,
        note: 'wzdłuż krokwi, na membranie — tworzy szczelinę wentylacyjną',
      })
    }
  }

  if (naPoszyciu) {
    areas.push({
      name: input.covering === 'gont' ? 'Poszycie pod gont (deski / OSB)' : 'Deskowanie połaci',
      net: geom.roofAreaM2,
      gross: geom.roofAreaM2 * 1.1,
      note: 'z 10% zapasu na docinki',
    })
  }

  if (input.hasSlats) {
    // Szczebliny leżą wzdłuż wiaty, na belkach poprzecznych — rozkładają się
    // więc na całej szerokości połaci mierzonej po spadku.
    const szerokoscPoSpadku = geom.rafterLength * geom.slopes
    const sztuk = Math.floor(szerokoscPoSpadku / Math.max(1, input.slatSpacing)) + 1
    timber.push({
      name: 'Szczeblina',
      section: input.slatSection,
      length: withAllowance(geom.roofLength, input.cutAllowance),
      count: sztuk,
      note: `rozstaw ${fmt(input.slatSpacing)} mm, prześwit ${fmt(Math.max(0, input.slatSpacing - input.slatSection.b))} mm`,
      splittable: true,
    })
  }

  // --- grupowanie i plan cięcia ---
  const groups = groupBySection(timber, input.stockLengths)
  const totalVolumeM3 = groups.reduce((s, g) => s + g.volumeM3, 0)
  const purchaseVolumeM3 = groups.reduce(
    (s, g) => s + volumeM3(g.section.b, g.section.h, g.plan.totalStock),
    0,
  )

  for (const g of groups) {
    if (g.plan.impossible.length > 0) {
      const najdluzszy = Math.max(...g.plan.impossible)
      const rada =
        input.stockMode === 'handlowe'
          ? 'Przełącz drewno na cięte na wymiar — tartak robi belki do 12 m.'
          : 'Nawet na zamówienie to bardzo długa sztuka — rozważ podział wiaty na dwa pola.'
      warnings.push(
        `${g.label}: element o długości ${fmtM(najdluzszy)} m nie mieści się w żadnej dostępnej belce. ${rada}`,
      )
    }
  }

  // --- pokrycie i warstwy ---
  if (input.covering !== 'brak') {
    areas.push({
      name: pokrycie.label,
      net: geom.roofAreaM2,
      gross: geom.roofAreaM2 * 1.1,
      note: 'z 10% na zakłady i docinki',
    })
  }
  if (input.hasMembrane && input.covering !== 'brak') {
    areas.push({
      name: 'Membrana wstępnego krycia',
      net: geom.roofAreaM2,
      gross: geom.roofAreaM2 * 1.15,
      note: 'z 15% na zakłady poziome i pionowe',
    })
  }

  // --- fundamenty ---
  const footing = footings(posts.total, input.footingSize, input.footingDepth)

  // --- łączniki ---
  const fasteners: FastenerItem[] = []

  if (input.postBase === 'w-betonie') {
    notes.push(
      'Słup wbetonowany chłonie wodę od dołu i po kilkunastu latach gnije w poziomie gruntu — a to jedyne miejsce, w którym nie widać, co się dzieje. Jeśli wiata ma stać długo, postaw ją na podstawach trzymających drewno kilka centymetrów nad betonem.',
    )
  } else {
    fasteners.push({
      name: podstawa.label,
      count: posts.total,
      unit: 'szt.',
      note: 'po jednej pod każdym słupem',
    })
    if (podstawa.kotwyNaSlup > 0) {
      fasteners.push({
        name:
          input.postBase === 'kotwa-wklejana'
            ? 'Pręt gwintowany M16 + żywica'
            : 'Kotwa mechaniczna do betonu',
        count: posts.total * podstawa.kotwyNaSlup,
        unit: 'szt.',
        note: `po ${podstawa.kotwyNaSlup} na podstawę`,
      })
    }
  }

  fasteners.push({
    name: 'Wkręt ciesielski słup–oczep',
    count: posts.total * 2,
    unit: 'szt.',
    note: 'po dwa na głowicę słupa; przy połączeniu na czop wystarczy jeden kołek',
  })

  // Krokiew dwuspadowa leży jednym końcem na oczepie, a drugim opiera się
  // o sąsiadkę w kalenicy. Jednospadowa leży na dwóch oczepach.
  const oparcia = dwuspadowy ? 1 : 2
  fasteners.push({
    name: `Wkręt ciesielski ${input.kind === 'pergola' ? 'belka poprzeczna' : 'krokiew'}–oczep`,
    count: rafters.countPerSlope * geom.slopes * oparcia * 2,
    unit: 'szt.',
    note: `po dwa na każde oparcie${dwuspadowy ? '' : ' — krokiew leży na dwóch oczepach'}`,
  })

  if (dwuspadowy && !input.hasRidgeBeam) {
    fasteners.push({
      name: 'Wkręt do połączenia w kalenicy',
      count: rafters.countPerSlope * 4,
      unit: 'szt.',
      note: 'po cztery na parę krokwi zbitych czołowo',
    })
  }

  if (input.hasBraces) {
    const miecze = timber
      .filter((t) => t.name.startsWith('Miecz'))
      .reduce((s, t) => s + t.count, 0)
    fasteners.push({
      name: 'Śruba M12 z podkładką — miecz',
      count: miecze * 2,
      unit: 'szt.',
      note: 'po jednej na każdy koniec miecza',
    })
  }

  if (przyscienne) {
    fasteners.push({
      name: 'Kotwa belki ściennej do muru',
      count: Math.ceil(geom.roofLength / WALL_ANCHOR_SPACING) + 1,
      unit: 'szt.',
      note: `co ${WALL_ANCHOR_SPACING} mm; w ścianie z pustaka użyj kotwy chemicznej z tuleją siatkową`,
    })
    notes.push(
      'Styk zadaszenia ze ścianą trzeba obrobić: obróbka blacharska wpuszczona w bruzdę albo listwa dociskowa z uszczelniaczem dekarskim. To jest miejsce, którym najczęściej zaczyna ciec.',
    )
  }

  if (input.covering === 'blacha-trapezowa' || input.covering === 'blachodachowka') {
    fasteners.push({
      name: 'Wkręt farmerski z podkładką EPDM',
      count: Math.ceil(geom.roofAreaM2 * 6),
      unit: 'szt.',
      note: 'ok. 6 szt./m² połaci',
    })
  }
  if (input.covering === 'poliweglan') {
    fasteners.push({
      name: 'Wkręt z podkładką dociskową do poliwęglanu',
      count: Math.ceil(geom.roofAreaM2 * 8),
      unit: 'szt.',
      note: 'ok. 8 szt./m²; otwory wierć większe niż wkręt — płyta pracuje z temperaturą',
    })
    fasteners.push({
      name: 'Profil łączący płyty + taśma wentylacyjna',
      count: Math.max(1, Math.round(geom.roofAreaM2 / 6)),
      unit: 'kpl.',
      note: 'na styk sąsiednich płyt; taśma zamyka komory od góry i od dołu',
    })
    notes.push(
      'Poliwęglan układa się komorami wzdłuż spadku, folią z nadrukiem UV do góry. Ułożona odwrotnie płyta zżółknie i skruszeje w kilka sezonów.',
    )
  }

  // --- odwodnienie ---
  let gutter: GutterResult | null = null
  if (input.hasGutters && input.covering !== 'brak') {
    const okapy = dwuspadowy ? 2 : 1
    gutter = gutters(okapy, geom.roofLength, geom.roofAreaM2, geom.eavesClearHeight)
    fasteners.push(
      {
        name: 'Rynna',
        count: Math.ceil(gutter.gutterLength / 1000),
        unit: 'm',
        note: `${okapy === 2 ? 'dwa okapy' : 'jeden okap'} po ${fmtM(geom.roofLength)} m`,
      },
      {
        name: 'Hak rynnowy',
        count: gutter.hooks,
        unit: 'szt.',
        note: 'rozstaw 60 cm; przy okapie bez deski czołowej bierz haki doczołowe do krokwi',
      },
      {
        name: 'Rura spustowa',
        count: Math.ceil(gutter.downpipeLength / 1000),
        unit: 'm',
        note: `${gutter.downpipes} szt. po ok. ${fmtM(geom.eavesClearHeight)} m`,
      },
      {
        name: 'Kolano rury spustowej',
        count: gutter.elbows,
        unit: 'szt.',
        note: 'po dwa na rurę — odsadzka od okapu do ściany albo do słupa',
      },
      {
        name: 'Sztucer rynnowy + zaślepka',
        count: gutter.downpipes + okapy * 2,
        unit: 'szt.',
        note: 'sztucer pod każdą rurę, zaślepki na oba końce każdej rynny',
      },
    )
    notes.push(
      `Jedna rura spustowa odbiera ${liczbaM2(gutter.areaPerDownpipeM2)} m² połaci. Woda z wiaty musi mieć dokąd odpłynąć — przy zadaszeniu przy budynku wpięcie w istniejącą kanalizację deszczową, przy wolnostojącej skrzynka rozsączająca albo po prostu spad w stronę od fundamentu.`,
    )
  } else if (input.hasGutters && input.covering === 'brak') {
    notes.push('Pergola bez pokrycia nie zbiera wody, więc odwodnienia nie liczymy.')
  }

  // --- impregnat ---
  const timberSurfaceM2 = groups.reduce(
    (s, g) => s + surfaceM2(g.section.b, g.section.h, g.totalLength),
    0,
  )
  const impregnationLitres = input.hasImpregnation
    ? timberSurfaceM2 * IMPREGNATION_PER_M2 * IMPREGNATION_COATS
    : 0

  if (!input.hasImpregnation) {
    warnings.push(
      'Wiata stoi na dworze i drewno w niej moknie z każdej strony. Bez impregnacji ciśnieniowej albo dwóch warstw impregnatu przemyślnego liczy się je w latach, nie w dziesięcioleciach.',
    )
  }

  // --- ciężar ---
  const roofWeightKg =
    totalVolumeM3 * TIMBER_DENSITY + geom.roofAreaM2 * pokrycie.weightKgM2

  // --- uwagi wykonawcze ---
  if (geom.run > 4500) {
    notes.push(
      `Krokiew ma ${fmtM(geom.run)} m rozpiętości w poziomie i nic jej po drodze nie podpiera. Przy takiej rozpiętości przekrój musi wynikać z obliczeń — dołóż płatew pośrednią albo dobierz krokiew z konstruktorem.`,
    )
  }
  if (posts.spacing > 3500) {
    notes.push(
      `Słupy stoją co ${fmtM(posts.spacing)} m. Oczep na takim polu ugina się widocznie — sprawdź jego przekrój albo dostaw słup.`,
    )
  }
  if (input.covering === 'poliweglan') {
    notes.push(
      `Płyty poliwęglanowe mają zwykle 105 albo 120 cm szerokości. Rozstaw krokwi wyszedł ${fmt(rafters.spacing)} mm — dobierz go tak, żeby styk płyt wypadał na krokwi, inaczej zostaniesz z paskami do docinania.`,
    )
  }
  if (input.kind === 'pergola' && input.covering !== 'brak') {
    notes.push(
      'Pergola z pokryciem przestaje być tylko cieniem: przejmuje śnieg i wiatr jak zwykły dach. Sprawdź przekroje tak samo jak przy wiacie.',
    )
  }
  if (input.kind === 'pergola' && input.covering === 'brak' && input.hasSlats) {
    notes.push(
      'Szczebliny dają cień, ale nie chronią przed deszczem. Prześwit między nimi rozmierz na miejscu — o cień decyduje ich szerokość i kierunek, nie sam rozstaw.',
    )
  }
  notes.push(
    `Drewno stykające się z betonem odizoluj papą albo podkładką dystansową. Wilgoć podciągana z fundamentu psuje słup szybciej niż deszcz z góry.`,
  )

  return {
    input,
    geom,
    posts,
    rafters,
    brace,
    footing,
    gutter,
    timber,
    groups,
    areas,
    fasteners,
    impregnationLitres,
    totalVolumeM3,
    purchaseVolumeM3,
    roofWeightKg,
    warnings,
    notes,
  }
}

const fmt = (mm: number): string => Math.round(mm).toString()
const fmtM = (mm: number): string => (mm / 1000).toFixed(2)
const liczbaM2 = (m2: number): string => m2.toFixed(0)
