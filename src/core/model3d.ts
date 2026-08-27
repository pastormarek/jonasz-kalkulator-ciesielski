/**
 * Model przestrzenny więźby — lista belek z ich położeniem w przestrzeni.
 *
 * Moduł nie rysuje. Zamienia wyniki obliczeń na bryły ustawione we
 * współrzędnych budynku, a rysowaniem zajmuje się warstwa interfejsu.
 * Dzięki temu model da się przetestować bez przeglądarki i bez płótna.
 *
 * UKŁAD WSPÓŁRZĘDNYCH (w milimetrach)
 *   X — wzdłuż budynku, czyli równolegle do kalenicy; 0 przy ścianie szczytowej
 *   Y — w poprzek budynku; 0 przy jednej murłacie, `span` przy drugiej
 *   Z — w górę; 0 na wierzchu murłaty
 *
 * Każda belka jest opisana osią (od środka jednego czoła do środka drugiego)
 * oraz przekrojem. To wystarcza, żeby odtworzyć osiem wierzchołków bryły.
 */

import type { Calculation } from './materials'
import type { Covering, RoofInput } from './types'
import { deg2rad } from './geometry'

/** Punkt w przestrzeni [mm]. */
export interface Punkt3 {
  x: number
  y: number
  z: number
}

/**
 * Etap montażu. Kolejność w tej tablicy jest kolejnością stawiania dachu —
 * tak samo numerowane są kroki w instrukcji.
 */
export const ETAPY = [
  // --- dach i wiata: od fundamentu do pokrycia ---
  'stopy',
  'murlaty',
  'slupy',
  'oczepy',
  'platwie',
  'zastrzaly',
  'krokwie',
  'jetki',
  'wymiany',
  'kontrlaty',
  'laty',
  'poprzeczki',
  // --- meble: od nog do wierzchu ---
  // Dopisane na koncu, bo zaden mebel nie uzywa etapow dachowych i odwrotnie.
  // Kolejnosc wewnatrz tej grupy jest kolejnoscia skrecania mebla.
  'nogi',
  'rama',
  'stezenia',
  'dno',
  'sciany',
  'polki',
  'siedzisko',
  'oparcie',
  'drabina',
  'blat',
  'daszek',
] as const

export type Etap = (typeof ETAPY)[number]

/** Opis etapu pokazywany w instrukcji. */
export const OPIS_ETAPU: Record<Etap, { tytul: string; opis: string }> = {
  stopy: {
    tytul: 'Stopy fundamentowe',
    opis: 'Wytycz osie słupów sznurem i wykop stopy poniżej strefy przemarzania. Osadź podstawy słupów dokładnie w osiach i sprawdź przekątne — po zawiązaniu betonu nic już nie przesuniesz.',
  },
  murlaty: {
    tytul: 'Murłaty',
    opis: 'Ułóż murłaty na wieńcu i zakotw je prętami gwintowanymi. To one przenoszą cały ciężar dachu na mury, więc muszą leżeć równo i być trwale związane z wieńcem.',
  },
  slupy: {
    tytul: 'Słupy',
    opis: 'Ustaw słupy w miejscach podparcia. Sprawdź pion każdego słupa i zabezpiecz go zastrzałem montażowym, zanim przejdziesz dalej — później poprawianie jest już bardzo trudne.',
  },
  oczepy: {
    tytul: 'Oczepy',
    opis: 'Ułóż oczepy na głowicach słupów i sprawdź poziom na całej długości. Dopiero związane oczepem słupy stoją same — do tego momentu wszystko trzyma się na zastrzałach montażowych.',
  },
  zastrzaly: {
    tytul: 'Miecze',
    opis: 'Wstaw miecze między słupy a oczepy. To one przenoszą parcie wiatru; bez nich rama składa się na bok jak nożyce, nawet jeśli wszystkie połączenia są mocne.',
  },
  platwie: {
    tytul: 'Płatwie',
    opis: 'Ułóż płatwie na słupach. Sprawdź poziom na całej długości: krokwie będą się na nich opierać, więc każde odchylenie przeniesie się na całą połać.',
  },
  krokwie: {
    tytul: 'Krokwie',
    opis: 'Wykonaj zaciosy i ustaw krokwie parami, zaczynając od skrajnych. Rozciągnij sznur po kalenicy i wzdłuż okapu — po nim ustawiasz wszystkie pozostałe.',
  },
  jetki: {
    tytul: 'Jętki i kleszcze',
    opis: 'Zepnij pary krokwi. To one nie pozwalają połaciom rozeprzeć się na boki, więc dach bez nich jest niestabilny — nie zostawiaj tego na później.',
  },
  wymiany: {
    tytul: 'Wymiany',
    opis: 'Obuduj otwory pod komin i okna dachowe. Wymian opiera się na sąsiednich krokwiach i przejmuje obciążenie z krokwi przerwanej.',
  },
  kontrlaty: {
    tytul: 'Kontrłaty',
    opis: 'Przybij kontrłaty wzdłuż krokwi, na membranie. Tworzą szczelinę, którą przewietrza się połać — bez niej pod pokryciem zbiera się wilgoć.',
  },
  laty: {
    tytul: 'Łaty',
    opis: 'Przybij łaty w rozstawie dobranym do pokrycia. Pierwszą przy okapie i ostatnią pod gąsiorem rozmierz osobno, a resztę rozłóż równo między nimi.',
  },
  poprzeczki: {
    tytul: 'Szczebliny',
    opis: 'Rozłóż szczebliny na wierzchu i przykręć je od góry. Rozstaw rozmierz od środka ku brzegom — wtedy ewentualna różnica rozejdzie się po obu stronach i nikt jej nie zauważy.',
  },

  // --- etapy meblowe ---
  // To są opisy ogólne, wspólne dla całego katalogu. Konkretny mebel może je
  // nadpisać własnym zdaniem — patrz `opisyEtapow` w przepisie.
  nogi: {
    tytul: 'Nogi i boki',
    opis: 'Dotnij nogi na jednakową długość — najlepiej wszystkie naraz, z jednego ustawienia ogranicznika. Różnica dwóch milimetrów wystarczy, żeby gotowy mebel się kiwał.',
  },
  rama: {
    tytul: 'Rama',
    opis: 'Zbierz nogi ramą z poprzeczek. Skręcaj na płasko na podłodze i sprawdź przekątne — muszą być równe, inaczej mebel wyjdzie w romb i nie przylgnie do ściany.',
  },
  stezenia: {
    tytul: 'Usztywnienia',
    opis: 'Wstaw zastrzały i krzyżaki. Prostokątna rama sama z siebie składa się na bok jak nożyce; dopiero ukośne stężenie trzyma ją w kącie prostym.',
  },
  dno: {
    tytul: 'Dno',
    opis: 'Ułóż deski dna na poprzeczkach i zostaw między nimi szczeliny — woda musi mieć którędy uciec, a drewno pracować przy zmianie wilgotności.',
  },
  sciany: {
    tytul: 'Ściany',
    opis: 'Obszaluj ramę deskami, zaczynając od dołu. Pierwszą deskę ustaw poziomicą; każda następna pójdzie już po niej, a błąd z pierwszej powtórzy się na całej wysokości.',
  },
  polki: {
    tytul: 'Półki',
    opis: 'Włóż półki i przykręć je do poprzeczek. Sprawdź poziom każdej osobno — na oko wychodzą zbieżne, a widać to dopiero, gdy coś na nich stanie.',
  },
  siedzisko: {
    tytul: 'Siedzisko',
    opis: 'Przykręć deski siedziska od góry, ze szczelinami na odpływ wody. Łby wkrętów wpuść pod powierzchnię i złam krawędzie desek papierem — to jest miejsce, którego dotyka się gołą skórą.',
  },
  oparcie: {
    tytul: 'Oparcie i podłokietniki',
    opis: 'Zamocuj oparcie, a potem podłokietniki. Oparcie odchylone do tyłu siedzi się wygodniej niż pionowe, ale wtedy tym mocniej podważa tylne nogi — nie żałuj wkrętów w tym miejscu.',
  },
  drabina: {
    tytul: 'Drabinka',
    opis: 'Zamocuj drabinkę na stałe do ramy, u góry i u dołu. Drabinka tylko zahaczona albo oparta zsuwa się w bok dokładnie wtedy, gdy ktoś stanie na niej jedną nogą.',
  },
  blat: {
    tytul: 'Blat',
    opis: 'Ułóż deski blatu i przykręć je od spodu, przez poprzeczki. Wkręt wchodzący od góry zawsze w końcu zbierze wodę pod łbem i zacznie czernić drewno wokół siebie.',
  },
  daszek: {
    tytul: 'Daszek',
    opis: 'Nakryj konstrukcję daszkiem tak, żeby wystawał poza ściany z każdej strony. To wystawienie decyduje o tym, czy woda kapie na ziemię, czy spływa po ścianie.',
  },
}

/** Pojedyncza belka w przestrzeni. */
export interface Belka {
  id: string
  nazwa: string
  etap: Etap
  /** Środek czoła początkowego. */
  start: Punkt3
  /** Środek czoła końcowego. */
  koniec: Punkt3
  /** Kierunek wysokości przekroju — wektor jednostkowy prostopadły do osi. */
  gora: Punkt3
  /** Szerokość przekroju [mm]. */
  b: number
  /** Wysokość przekroju [mm]. */
  h: number
  /**
   * Ścięcie czoła końcowego [mm] — o tyle GÓRNA krawędź jest cofnięta
   * względem dolnej. Zero znaczy czoło prostopadłe do osi.
   *
   * Potrzebne przy zakładce w kalenicy: koniec krokwi ścina się tam
   * równolegle do boku krokwi przeciwnej, a nie na płasko.
   */
  scinaKonca?: number
  /**
   * Ścięcie czoła początkowego [mm], liczone tak samo: o tyle górna krawędź
   * jest cofnięta w stronę drugiego końca.
   *
   * Tak powstaje pionowe cięcie na końcu krokwi przy okapie — belka biegnie
   * po skosie, więc czoło prostopadłe do osi nie jest pionowe.
   */
  scinaStartu?: number
}

/** Linia wymiarowa pokazywana obok modelu. */
export interface Wymiar3 {
  od: Punkt3
  do: Punkt3
  etykieta: string
  /** Kierunek, w którym odsunąć opis od mierzonej krawędzi. */
  odsuniecie: Punkt3
}

/**
 * Płaszczyzna pokrycia — jedna połać dachu.
 *
 * Nie jest belką i nie ma przekroju: to czworokąt naciągnięty nad krokwiami,
 * służący wyłącznie do pokazania, jak dach będzie wyglądał po pokryciu.
 * Do zestawienia materiału nie wchodzi — tam pokrycie liczy się w metrach
 * kwadratowych połaci.
 */
export interface PolacPokrycia {
  nazwa: string
  rogi: [Punkt3, Punkt3, Punkt3, Punkt3]
}

/**
 * Rysunek materiału pokrycia — na tyle, ile trzeba, żeby połać nie była
 * jednolitą plamą koloru.
 *
 * Cieśla poprosił, żeby pokazać fakturę „łącznie z gąsiorem na szczycie":
 * fale blachy biegną wzdłuż spadku, rzędy dachówek w poprzek, a moduł
 * bierze się z materiału, nie z upodobania rysującego.
 */
export interface FakturaPokrycia {
  /** Odstęp podziałów biegnących wzdłuż spadku [mm]; 0 = brak podziału. */
  modulWzdluz: number
  /** Odstęp rzędów równoległych do okapu [mm]; 0 = brak podziału. */
  modulPoprzek: number
}

/** Gąsior nakrywający kalenicę — półwalec o zadanej osi. */
export interface Gasior {
  od: Punkt3
  do: Punkt3
  promien: number
}

/** Kompletny model przestrzenny dachu. */
export interface Model3D {
  belki: Belka[]
  /** Połacie pokrycia — puste tam, gdzie pokrycia nie ma (pergola, mebel). */
  polacie?: PolacPokrycia[]
  /** Rysunek materiału na połaci — brak znaczy gładką płaszczyznę. */
  faktura?: FakturaPokrycia | null
  /** Gąsior na kalenicy — tylko tam, gdzie kalenica w ogóle jest. */
  gasior?: Gasior | null
  wymiary: Wymiar3[]
  /** Środek bryły — punkt, wokół którego obraca się widok. */
  srodek: Punkt3
  /** Promień sfery obejmującej całość — służy do dobrania powiększenia. */
  promien: number
}

const p3 = (x: number, y: number, z: number): Punkt3 => ({ x, y, z })

/** Buduje model przestrzenny na podstawie wyników obliczeń. */
export function zbudujModel(w: Calculation): Model3D {
  const { input, slope, layout } = w
  const belki: Belka[] = []
  const isShed = input.shape === 'shed'
  const isHip = input.shape === 'hip'

  const span = input.span
  const dlugosc = input.length
  const a = deg2rad(input.pitchDeg)
  const rise = slope.rise
  const eaves = input.eaves

  // Wierzchołek połaci: przy dachu jednospadowym leży nad drugą murłatą,
  // przy pozostałych w połowie rozpiętości.
  const kalenicaY = isShed ? span : span / 2

  let licznik = 0
  const dodaj = (b: Omit<Belka, 'id'>) => {
    belki.push({ ...b, id: `b${licznik++}` })
  }

  // ---------- murłaty ----------
  const mur = input.wallPlateSection
  const yMurlat = isShed ? [0] : [0, span]
  for (const y of yMurlat) {
    dodaj({
      nazwa: 'Murłata',
      etap: 'murlaty',
      start: p3(0, y, -mur.h / 2),
      koniec: p3(dlugosc, y, -mur.h / 2),
      gora: p3(0, 0, 1),
      b: mur.b,
      h: mur.h,
    })
  }
  if (isHip) {
    for (const x of [0, dlugosc]) {
      dodaj({
        nazwa: 'Murłata szczytowa',
        etap: 'murlaty',
        start: p3(x, 0, -mur.h / 2),
        koniec: p3(x, span, -mur.h / 2),
        gora: p3(0, 0, 1),
        b: mur.b,
        h: mur.h,
      })
    }
  }

  // ---------- słupy i płatwie ----------
  if (input.truss === 'purlin') {
    dodajPlatwie(dodaj, w, kalenicaY, rise)
  }

  // ---------- krokwie ----------
  const kierunkiPolaci: Array<1 | -1> = isShed ? [1] : [1, -1]
  const gornaPolaci = (znak: 1 | -1): Punkt3 =>
    // Wektor prostopadły do połaci, skierowany na zewnątrz dachu.
    p3(0, -znak * Math.sin(a), Math.cos(a))

  const pozycjeX: number[] = []
  for (let i = 0; i < layout.countPerSlope; i++) {
    pozycjeX.push(input.rafterSection.b / 2 + i * layout.spacing)
  }

  // Przy kopercie krokwie zwykłe stoją tylko pod kalenicą, a resztę wypełniają kulawki.
  const zakresKrokwi = isHip
    ? pozycjeX.filter((x) => x >= span / 2 && x <= dlugosc - span / 2)
    : pozycjeX

  // Przy zakładce krokiew nie kończy się na osi kalenicy, tylko przechodzi
  // za nią i mija się z krokwią przeciwną.
  //
  // `overshootRun` opisuje, dokąd dochodzi DOLNA KRAWĘDŹ krokwi — to ona
  // spotyka górną krawędź krokwi przeciwnej. Skoro linią bazową modelu jest
  // właśnie dolna krawędź (patrz niżej), liczba wchodzi tu wprost.
  const przejscie = w.ridge.overshootRun
  // Bryła prostopadłościenna nie pokaże wybrania na pół grubości, więc żeby
  // krokwie nie przenikały się w rysunku nawzajem, rozsuwamy je o ćwierć
  // grubości na boki. To zabieg rysunkowy: rozstaw w obliczeniach zostaje
  // dokładnie taki, jaki wyszedł z rozkładu.
  const rozsuniecie = przejscie > 0 ? input.rafterSection.b / 4 : 0

  /**
   * Ścięcie końca krokwi przy zakładce (odpowiedzi Jonasza, punkt 89):
   * „równolegle do boku krokwi przeciwnej i tak też powinno być na rysunku 3D".
   *
   * Krokiew przeciwna biegnie pod kątem −α, więc płaszczyzna cięcia jest
   * odchylona od prostopadłej do osi o (90° − 2α). Górna krawędź jest przez
   * to krótsza od dolnej o h ÷ tg 2α — i właśnie tak wychodzi reguła cieśli,
   * że dolna krawędź dochodzi aż do górnej krawędzi kolejnej krokwi.
   *
   * Przy 45° obie krokwie stoją do siebie prostopadle i ścięcie znika samo.
   */
  const tan2a = Math.tan(2 * a)
  const scieciePrzyKalenicy =
    przejscie > 0 && Math.abs(tan2a) > 1e-9 ? input.rafterSection.h / tan2a : 0

  /**
   * Pionowe cięcie na końcu krokwi przy okapie.
   *
   * Krokiew biegnie po skosie, więc czoło prostopadłe do osi stoi ukośnie —
   * a przy okapie tnie się pionowo, żeby deska podrynnowa przylegała płasko.
   * Żeby czoło stanęło w pionie, górny róg trzeba cofnąć o h × tg α.
   *
   * Model pomija drobny dziób z cięcia poziomego: zabiera on tylko dolny
   * narożnik na kilku centymetrach, a bryła o ośmiu wierzchołkach nie odda
   * łamanego czoła. Dokładne wymiary obu cięć są na zakładce Krokwie.
   */
  const scieciePrzyOkapie = input.rafterSection.h * Math.tan(a)

  /**
   * Przesunięcie z linii bazowej na oś krokwi.
   *
   * Rdzeń liczy wszystko po DOLNEJ krawędzi krokwi: to ona startuje
   * w zewnętrznym narożu murłaty i to jej długość podaje zestawienie.
   * Model opisuje belki osiami, więc oś trzeba unieść o pół wysokości
   * przekroju prostopadle do połaci.
   *
   * Wcześniej oś biegła wprost po linii bazowej, przez co krokiew tonęła
   * w murłacie do połowy grubości, a dach był o te pół wysokości za niski.
   */
  const naOs = input.rafterSection.h / 2

  for (const znak of kierunkiPolaci) {
    const yOparcia = znak === 1 ? 0 : span
    for (const x of zakresKrokwi) {
      const yOkap = yOparcia - znak * eaves
      const xKrokwi = x + znak * rozsuniecie
      const gora = gornaPolaci(znak)
      dodaj({
        nazwa: 'Krokiew',
        etap: 'krokwie',
        start: przesun(p3(xKrokwi, yOkap, -eaves * Math.tan(a)), gora, naOs),
        koniec: przesun(
          p3(xKrokwi, kalenicaY + znak * przejscie, rise + przejscie * Math.tan(a)),
          gora,
          naOs,
        ),
        gora,
        b: input.rafterSection.b,
        h: input.rafterSection.h,
        scinaKonca: scieciePrzyKalenicy,
        scinaStartu: scieciePrzyOkapie,
      })
    }
  }

  if (isHip) {
    dodajNarozaKoperty(dodaj, w, span, dlugosc, rise, a, eaves)
  }

  // ---------- jętki ----------
  if (w.collar?.valid) {
    const c = w.collar
    const yLewa = (span - c.span) / 2
    for (const x of zakresKrokwi) {
      dodaj({
        nazwa: 'Jętka',
        etap: 'jetki',
        // Jętka przylega z boku krokwi, więc odsuwamy ją o pół grubości obu.
        start: p3(x + (input.rafterSection.b + input.collarSection.b) / 2, yLewa, c.height + input.collarSection.h / 2),
        koniec: p3(x + (input.rafterSection.b + input.collarSection.b) / 2, yLewa + c.span, c.height + input.collarSection.h / 2),
        gora: p3(0, 0, 1),
        b: input.collarSection.b,
        h: input.collarSection.h,
      })
    }
  }

  // ---------- wymiany przy otworach ----------
  for (const otwor of input.openings) {
    dodajWymian(dodaj, w, otwor, a, span, kalenicaY)
  }

  // ---------- kontrłaty i łaty ----------
  for (const znak of kierunkiPolaci) {
    const yOparcia = znak === 1 ? 0 : span
    for (const x of zakresKrokwi) {
      // Kontrłata leży na krokwi, więc musi iść dokładnie jej osią — także
      // wtedy, gdy krokwie zostały rozsunięte na potrzeby rysunku zakładki.
      const xKrokwi = x + znak * rozsuniecie
      dodaj({
        nazwa: 'Kontrłata',
        etap: 'kontrlaty',
        start: p3(xKrokwi, yOparcia - znak * eaves, -eaves * Math.tan(a)),
        koniec: p3(xKrokwi, kalenicaY, rise),
        gora: gornaPolaci(znak),
        b: input.counterBattenSection.b,
        h: input.counterBattenSection.h,
        // Kontrłata leży na krokwi, więc jej oś jest wyżej o pół obu wysokości.
      })
    }
    dodajLaty(dodaj, w, znak, yOparcia, kalenicaY, a, eaves, dlugosc)
  }

  // Kontrłaty i łaty trzeba jeszcze podnieść ponad krokwie.
  podniesWarstwy(belki, input.rafterSection.h, input.counterBattenSection.h)

  const polacie = zbudujPolacie(w, span, dlugosc, rise, a, eaves, kalenicaY, isShed, isHip)

  const wymiary = zbudujWymiary(w, span, dlugosc, rise, kalenicaY)

  return {
    belki,
    polacie,
    faktura: fakturaDla(input.covering, input.battenSpacing),
    gasior: isShed ? null : gasiorKalenicy(w, span, dlugosc, rise, a, kalenicaY, isHip),
    wymiary,
    srodek: p3(dlugosc / 2, span / 2, rise / 2),
    promien: Math.max(dlugosc, span, rise) * 0.75 + eaves,
  }
}

/** Dokłada słupy i płatwie więźby płatwiowo-kleszczowej. */
function dodajPlatwie(
  dodaj: (b: Omit<Belka, 'id'>) => void,
  w: Calculation,
  kalenicaY: number,
  rise: number,
): void {
  const { input } = w
  const pol = input.purlinCount > 0 ? Math.min(2, Math.round(input.purlinCount)) : 0
  const postBays = Math.max(1, Math.ceil(input.length / input.postSpacingMax))
  const postSpacing = input.length / postBays
  const a = deg2rad(input.pitchDeg)

  /** Płatew kalenicowa, gdy nie ma pośrednich. */
  if (pol === 0) {
    dodaj({
      nazwa: 'Płatew kalenicowa',
      etap: 'platwie',
      start: p3(0, kalenicaY, rise + input.purlinSection.h / 2),
      koniec: p3(input.length, kalenicaY, rise + input.purlinSection.h / 2),
      gora: p3(0, 0, 1),
      b: input.purlinSection.b,
      h: input.purlinSection.h,
    })
    for (let i = 0; i <= postBays; i++) {
      const x = i * postSpacing
      dodaj({
        nazwa: 'Słup',
        etap: 'slupy',
        start: p3(x, kalenicaY, 0),
        koniec: p3(x, kalenicaY, rise),
        gora: p3(0, 1, 0),
        b: input.postSection.b,
        h: input.postSection.h,
      })
    }
    return
  }

  // Płatwie pośrednie: dzielimy połać na równe części i stawiamy je na słupach.
  for (let nr = 1; nr <= pol; nr++) {
    const udzial = nr / (pol + 1)
    for (const znak of [1, -1] as const) {
      const yOparcia = znak === 1 ? 0 : input.span
      const yPlatwi = znak === 1 ? udzial * kalenicaY : input.span - udzial * (input.span - kalenicaY)
      const zPlatwi = Math.abs(yPlatwi - yOparcia) * Math.tan(a)

      dodaj({
        nazwa: 'Płatew pośrednia',
        etap: 'platwie',
        start: p3(0, yPlatwi, zPlatwi + input.purlinSection.h / 2),
        koniec: p3(input.length, yPlatwi, zPlatwi + input.purlinSection.h / 2),
        gora: p3(0, 0, 1),
        b: input.purlinSection.b,
        h: input.purlinSection.h,
      })

      for (let i = 0; i <= postBays; i++) {
        const x = i * postSpacing
        dodaj({
          nazwa: 'Słup',
          etap: 'slupy',
          start: p3(x, yPlatwi, 0),
          koniec: p3(x, yPlatwi, zPlatwi),
          gora: p3(0, 1, 0),
          b: input.postSection.b,
          h: input.postSection.h,
        })
      }
    }
  }
}

/** Dokłada krożyny dachu kopertowego. */
function dodajNarozaKoperty(
  dodaj: (b: Omit<Belka, 'id'>) => void,
  w: Calculation,
  span: number,
  dlugosc: number,
  rise: number,
  a: number,
  eaves: number,
): void {
  const { input } = w
  const halfSpan = span / 2

  // Cztery krożyny biegną z naroży budynku do końców kalenicy.
  const naroza: Array<{ od: Punkt3; do: Punkt3 }> = [
    { od: p3(-eaves, -eaves, -eaves * Math.tan(a)), do: p3(halfSpan, halfSpan, rise) },
    { od: p3(-eaves, span + eaves, -eaves * Math.tan(a)), do: p3(halfSpan, halfSpan, rise) },
    { od: p3(dlugosc + eaves, -eaves, -eaves * Math.tan(a)), do: p3(dlugosc - halfSpan, halfSpan, rise) },
    {
      od: p3(dlugosc + eaves, span + eaves, -eaves * Math.tan(a)),
      do: p3(dlugosc - halfSpan, halfSpan, rise),
    },
  ]

  for (const n of naroza) {
    dodaj({
      nazwa: 'Krokiew narożna',
      etap: 'krokwie',
      start: n.od,
      koniec: n.do,
      gora: p3(0, 0, 1),
      b: input.rafterSection.b,
      h: input.rafterSection.h,
    })
  }

  // Kalenica łączy wierzchołki obu naroży.
  if (dlugosc > span) {
    dodaj({
      nazwa: 'Kalenica',
      etap: 'krokwie',
      start: p3(halfSpan, halfSpan, rise),
      koniec: p3(dlugosc - halfSpan, halfSpan, rise),
      gora: p3(0, 0, 1),
      b: input.rafterSection.b,
      h: input.rafterSection.h,
    })
  }
}

/** Dokłada dwa wymiany obudowujące otwór. */
function dodajWymian(
  dodaj: (b: Omit<Belka, 'id'>) => void,
  w: Calculation,
  otwor: Calculation['input']['openings'][number],
  a: number,
  span: number,
  kalenicaY: number,
): void {
  const { input } = w
  const znak: 1 | -1 = otwor.slope === 'A' ? 1 : -1
  const yOparcia = znak === 1 ? 0 : span

  // Otwór opisany jest wzdłuż spadku, więc zamieniamy go na współrzędną Y.
  const biegDolny = Math.min(
    Math.abs(kalenicaY - yOparcia) - 100,
    Math.abs(kalenicaY - yOparcia) / 2,
  )
  const biegGorny = biegDolny + otwor.height * Math.cos(a)

  for (const [nazwa, bieg] of [
    ['Wymian dolny', biegDolny],
    ['Wymian górny', biegGorny],
  ] as const) {
    const y = yOparcia + znak * bieg
    const z = bieg * Math.tan(a)
    dodaj({
      nazwa,
      etap: 'wymiany',
      start: p3(otwor.offsetAlong, y, z),
      koniec: p3(otwor.offsetAlong + otwor.width, y, z),
      gora: p3(0, -znak * Math.sin(a), Math.cos(a)),
      b: input.rafterSection.b,
      h: input.rafterSection.h,
    })
  }
}

/** Dokłada rzędy łat na jednej połaci. */
function dodajLaty(
  dodaj: (b: Omit<Belka, 'id'>) => void,
  w: Calculation,
  znak: 1 | -1,
  yOparcia: number,
  kalenicaY: number,
  a: number,
  eaves: number,
  dlugosc: number,
): void {
  const { input, slope } = w
  const rzedy = Math.ceil(slope.slopeLength / input.battenSpacing) + 2
  const wysunięcie = input.shape === 'hip' ? eaves : input.gableOverhang

  for (let i = 0; i < rzedy; i++) {
    // Odległość mierzona wzdłuż połaci, od końca okapu w górę.
    const wzdluz = i * input.battenSpacing
    const bieg = wzdluz * Math.cos(a) - eaves
    const y = yOparcia + znak * bieg
    const z = bieg * Math.tan(a)

    // Powyżej kalenicy łat już nie ma.
    if (znak === 1 ? y > kalenicaY : y < kalenicaY) break

    dodaj({
      nazwa: 'Łata',
      etap: 'laty',
      start: p3(-wysunięcie, y, z),
      koniec: p3(dlugosc + wysunięcie, y, z),
      gora: p3(0, -znak * Math.sin(a), Math.cos(a)),
      b: input.battenSection.b,
      h: input.battenSection.h,
    })
  }
}

/**
 * Podnosi kontrłaty i łaty ponad krokwie.
 *
 * Model buduje je najpierw na LINII BAZOWEJ, czyli na dolnej krawędzi krokwi,
 * bo tak najprościej policzyć ich przebieg. Tutaj przesuwamy je prostopadle
 * do połaci: kontrłatę na wierzch krokwi, a łatę jeszcze wyżej, na wierzch
 * kontrłaty. Stąd pełna wysokość krokwi w obu wzorach, a nie jej połowa.
 */
function podniesWarstwy(
  belki: Belka[],
  wysokoscKrokwi: number,
  wysokoscKontrlaty: number,
): void {
  for (const b of belki) {
    let podnies = 0
    if (b.etap === 'kontrlaty') podnies = wysokoscKrokwi + b.h / 2
    else if (b.etap === 'laty') podnies = wysokoscKrokwi + wysokoscKontrlaty + b.h / 2
    if (podnies === 0) continue

    b.start = przesun(b.start, b.gora, podnies)
    b.koniec = przesun(b.koniec, b.gora, podnies)
  }
}

const przesun = (p: Punkt3, kierunek: Punkt3, ile: number): Punkt3 => ({
  x: p.x + kierunek.x * ile,
  y: p.y + kierunek.y * ile,
  z: p.z + kierunek.z * ile,
})

/** Linie wymiarowe pokazywane przy modelu. */
function zbudujWymiary(
  w: Calculation,
  span: number,
  dlugosc: number,
  rise: number,
  kalenicaY: number,
): Wymiar3[] {
  const { input, layout, slope } = w
  const eaves = input.eaves
  const cm = (mm: number) => `${Math.round(mm / 10)} cm`

  const wymiary: Wymiar3[] = [
    {
      od: p3(0, 0, 0),
      do: p3(0, span, 0),
      etykieta: `rozpiętość ${cm(span)}`,
      odsuniecie: p3(-1, 0, 0),
    },
    {
      od: p3(0, 0, 0),
      do: p3(dlugosc, 0, 0),
      etykieta: `długość ${cm(dlugosc)}`,
      odsuniecie: p3(0, -1, 0),
    },
    {
      od: p3(0, kalenicaY, 0),
      do: p3(0, kalenicaY, rise),
      etykieta: `kalenica ${cm(rise)}`,
      odsuniecie: p3(-1, 0, 0),
    },
    {
      od: p3(input.rafterSection.b / 2, -eaves, -eaves * Math.tan(deg2rad(input.pitchDeg))),
      do: p3(
        input.rafterSection.b / 2 + layout.spacing,
        -eaves,
        -eaves * Math.tan(deg2rad(input.pitchDeg)),
      ),
      etykieta: `rozstaw ${cm(layout.spacing)}`,
      odsuniecie: p3(0, -1, 0),
    },
    {
      od: p3(dlugosc, -eaves, -eaves * Math.tan(deg2rad(input.pitchDeg))),
      do: p3(dlugosc, kalenicaY, rise),
      etykieta: `krokiew ${cm(slope.rafterTotal)}`,
      odsuniecie: p3(1, 0, 0),
    },
  ]

  return wymiary
}

/**
 * Osiem wierzchołków bryły belki, w kolejności: najpierw czoło początkowe.
 *
 * Przyjmuje belkę bez identyfikatora, żeby dało się policzyć bryłę także dla
 * części mebla, która identyfikator dostaje dopiero przy budowaniu modelu.
 */
/**
 * Naciąga płaszczyzny pokrycia nad krokwiami.
 *
 * Połać leży wyżej niż oś krokwi: o połowę jej wysokości (bo oś biegnie
 * środkiem przekroju) plus grubość kontrłaty i łaty. Bez tego podniesienia
 * pokrycie przecinałoby krokwie w połowie i rysunek robiłby się nieczytelny.
 *
 * Dach kopertowy dostaje cztery płaszczyzny: dwie wzdłuż i dwa skosy
 * szczytowe. Skos zapisujemy jako czworokąt z powtórzonym wierzchołkiem —
 * dzięki temu rysowanie nie musi znać dwóch przypadków.
 */
function zbudujPolacie(
  w: Calculation,
  span: number,
  dlugosc: number,
  rise: number,
  a: number,
  eaves: number,
  kalenicaY: number,
  isShed: boolean,
  isHip: boolean,
): PolacPokrycia[] {
  const { input } = w
  const ponadOsia = gruboscLacenia(input)
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  const zOkapu = -eaves * Math.tan(a)
  const wysuniecie = isHip ? eaves : input.gableOverhang

  /**
   * Przesuwa punkt z osi krokwi na wierzch łacenia.
   *
   * Kierunek podniesienia jest prostopadły DO TEJ połaci, na której punkt
   * leży — inaczej skosy koperty wychodziłyby przekrzywione, bo spadają
   * wzdłuż innej osi niż połacie wzdłużne.
   */
  const naWierzch = (x: number, y: number, z: number, normalna: Punkt3): Punkt3 =>
    p3(x + normalna.x * ponadOsia, y + normalna.y * ponadOsia, z + normalna.z * ponadOsia)

  const polacie: PolacPokrycia[] = []
  const kierunki: Array<1 | -1> = isShed ? [1] : [1, -1]

  for (const znak of kierunki) {
    const yOparcia = znak === 1 ? 0 : span
    const yOkap = yOparcia - znak * eaves
    const n = p3(0, -znak * sin, cos)

    // Przy kopercie połać wzdłużna jest trapezem: przy okapie biegnie przez
    // całą długość budynku, a u góry kończy się na krótszej kalenicy.
    const okapOd = isHip ? -eaves : -wysuniecie
    const okapDo = isHip ? dlugosc + eaves : dlugosc + wysuniecie
    const kalenicaOd = isHip ? span / 2 : -wysuniecie
    const kalenicaDo = isHip ? dlugosc - span / 2 : dlugosc + wysuniecie

    // Przy kalenicy obie połacie muszą spotkać się w JEDNYM punkcie.
    // Podniesienie ich prostopadle do własnej połaci rozsuwało je na boki
    // i między pokryciem zostawała szczelina szeroka na dwie warstwy łat.
    // Płaszczyzny pokrycia przecinają się dokładnie nad osią kalenicy,
    // wyżej o grubość łacenia podzieloną przez cosinus kąta.
    const zKalenicy = isShed ? rise + ponadOsia * cos : rise + ponadOsia / cos
    const yKalenicy = isShed ? kalenicaY - znak * ponadOsia * sin : kalenicaY

    polacie.push({
      nazwa: znak === 1 ? 'Połać przednia' : 'Połać tylna',
      rogi: [
        naWierzch(okapOd, yOkap, zOkapu, n),
        naWierzch(okapDo, yOkap, zOkapu, n),
        p3(kalenicaDo, yKalenicy, zKalenicy),
        p3(kalenicaOd, yKalenicy, zKalenicy),
      ],
    })
  }

  if (isHip) {
    // Skos szczytowy opada wzdłuż osi X, więc i jego normalna leży w tej osi.
    for (const [xOkap, xKalenicy, znakX, nazwa] of [
      [-eaves, span / 2, 1, 'Skos lewy'],
      [dlugosc + eaves, dlugosc - span / 2, -1, 'Skos prawy'],
    ] as Array<[number, number, 1 | -1, string]>) {
      const n = p3(-znakX * sin, 0, cos)
      const szczyt = naWierzch(xKalenicy, kalenicaY, rise, n)
      polacie.push({
        nazwa,
        rogi: [
          naWierzch(xOkap, -eaves, zOkapu, n),
          naWierzch(xOkap, span + eaves, zOkapu, n),
          szczyt,
          szczyt,
        ],
      })
    }
  }

  return polacie
}

/**
 * Jak wygląda materiał pokrycia z odległości, z której ogląda się dach.
 *
 * Dachówka układa się w rzędy równoległe do okapu, a rozstaw tych rzędów to
 * dokładnie rozstaw łat — więc bierzemy go z danych, a nie z oka. Blachy
 * profilowane mają fale biegnące wzdłuż spadku i moduł niezależny od łacenia.
 * Gont kładzie się na pełnym poszyciu w gęstych pasach.
 */
function fakturaDla(covering: Covering, rozstawLat: number): FakturaPokrycia | null {
  const rzedy = Math.max(150, rozstawLat)
  switch (covering) {
    // Rzędy dachówek wyznaczają łaty, a szerokość jednej dachówki to ok. 30 cm.
    case 'dachowka-ceramiczna':
    case 'dachowka-betonowa':
      return { modulWzdluz: 300, modulPoprzek: rzedy }
    // Blachodachówka ma ten sam rytm rzędów, ale arkusz jest szeroki.
    case 'blachodachowka':
      return { modulWzdluz: 1100, modulPoprzek: rzedy }
    // Blachy profilowane idą jednym arkuszem od okapu po kalenicę — widać
    // tylko fale biegnące wzdłuż spadku.
    case 'blacha-trapezowa':
      return { modulWzdluz: 200, modulPoprzek: 0 }
    case 'blacha-na-rabek':
      return { modulWzdluz: 500, modulPoprzek: 0 }
    case 'gont-bitumiczny':
      return { modulWzdluz: 1000, modulPoprzek: 150 }
    default:
      return null
  }
}

/** Promień gąsiora [mm] — typowy gąsior ceramiczny ma ok. 22 cm szerokości. */
const PROMIEN_GASIORA = 110

/**
 * Gąsior nakrywający kalenicę. Siedzi na wierzchu łacenia, więc podnosimy go
 * o tę samą warstwę, na której leży pokrycie — inaczej tonąłby w połaci.
 */
function gasiorKalenicy(
  w: Calculation,
  span: number,
  dlugosc: number,
  rise: number,
  a: number,
  kalenicaY: number,
  isHip: boolean,
): Gasior {
  const ponad = gruboscLacenia(w.input)
  // Przy kopercie kalenica jest krótsza od budynku o dwa biegi naroży;
  // przy dwuspadowym sięga poza szczyt tak samo jak połać.
  const od = isHip ? span / 2 : -w.input.gableOverhang
  const doX = isHip ? dlugosc - span / 2 : dlugosc + w.input.gableOverhang
  const z = rise + ponad / Math.cos(a)
  return {
    od: p3(od, kalenicaY, z),
    do: p3(doX, kalenicaY, z),
    promien: PROMIEN_GASIORA,
  }
}

/**
 * Odległość spodu pokrycia od linii bazowej krokwi [mm].
 *
 * Liczona z przekrojów, nie przyjęta z góry. Wcześniej była tu stała 65 mm —
 * mniej niż kontrłata i łata razem — więc łaty przebijały przez połać
 * i na modelu wyglądało to tak, jakby wchodziły w krokwie. Cieśla zwrócił
 * na to uwagę wprost: „łata zawsze jest przybita na kontrłatę i nigdy
 * w krokiew nie wchodzi".
 */
function gruboscLacenia(input: RoofInput): number {
  return input.rafterSection.h + input.counterBattenSection.h + input.battenSection.h
}

export function wierzcholki(b: Omit<Belka, 'id'>): Punkt3[] {
  const os = normalizuj(odejmij(b.koniec, b.start))
  const gora = normalizuj(ortogonalizuj(b.gora, os))
  const bok = iloczynWektorowy(os, gora)

  const polB = b.b / 2
  const polH = b.h / 2

  const rog = (baza: Punkt3, zB: number, zH: number): Punkt3 =>
    przesun(przesun(baza, bok, zB * polB), gora, zH * polH)

  // Skośne czoła: górne rogi przesuwamy wzdłuż osi, dolne zostają na miejscu.
  // Na końcu cofamy je do tyłu, na początku — do przodu, czyli w obu wypadkach
  // w stronę drugiego czoła.
  const scinK = b.scinaKonca ?? 0
  const scinS = b.scinaStartu ?? 0
  const rogS = (zB: number, zH: number): Punkt3 =>
    zH > 0 ? przesun(rog(b.start, zB, zH), os, scinS) : rog(b.start, zB, zH)
  const rogK = (zB: number, zH: number): Punkt3 =>
    zH > 0 ? przesun(rog(b.koniec, zB, zH), os, -scinK) : rog(b.koniec, zB, zH)

  return [
    rogS(-1, -1),
    rogS(1, -1),
    rogS(1, 1),
    rogS(-1, 1),
    rogK(-1, -1),
    rogK(1, -1),
    rogK(1, 1),
    rogK(-1, 1),
  ]
}

/** Sześć ścian bryły, każda jako czwórka indeksów wierzchołków. */
export const SCIANY: number[][] = [
  [0, 1, 2, 3], // czoło początkowe
  [7, 6, 5, 4], // czoło końcowe
  [0, 4, 5, 1], // spód
  [3, 2, 6, 7], // wierzch
  [0, 3, 7, 4], // bok lewy
  [1, 5, 6, 2], // bok prawy
]

// --- drobna algebra wektorów ---

const odejmij = (a: Punkt3, b: Punkt3): Punkt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

const dlugoscWektora = (v: Punkt3): number => Math.hypot(v.x, v.y, v.z)

function normalizuj(v: Punkt3): Punkt3 {
  const d = dlugoscWektora(v)
  return d < 1e-9 ? { x: 1, y: 0, z: 0 } : { x: v.x / d, y: v.y / d, z: v.z / d }
}

const iloczynSkalarny = (a: Punkt3, b: Punkt3): number => a.x * b.x + a.y * b.y + a.z * b.z

const iloczynWektorowy = (a: Punkt3, b: Punkt3): Punkt3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

/** Odejmuje od wektora jego składową wzdłuż osi, zostawiając część prostopadłą. */
function ortogonalizuj(v: Punkt3, os: Punkt3): Punkt3 {
  const rzut = iloczynSkalarny(v, os)
  const reszta = { x: v.x - os.x * rzut, y: v.y - os.y * rzut, z: v.z - os.z * rzut }
  // Gdyby „góra" pokrywała się z osią, bierzemy dowolny kierunek prostopadły.
  return dlugoscWektora(reszta) < 1e-6
    ? normalizuj(iloczynWektorowy(os, { x: 0, y: 0, z: 1 }))
    : normalizuj(reszta)
}

/** Zlicza belki w każdym etapie — do podsumowania w instrukcji. */
export function policzEtapy(model: Model3D): Array<{ etap: Etap; liczba: number }> {
  return ETAPY.map((etap) => ({
    etap,
    liczba: model.belki.filter((b) => b.etap === etap).length,
  })).filter((e) => e.liczba > 0)
}
