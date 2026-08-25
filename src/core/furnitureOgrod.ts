/**
 * Przepisy ogrodowe: donice, grządka, kwietnik, trejaż, podest, piaskownica.
 *
 * ZIEMIA ROZPYCHA — TO JEST GŁÓWNY PROBLEM TYCH MEBLI
 * ---------------------------------------------------
 * Skrzynia z ziemią zachowuje się zupełnie inaczej niż skrzynia na poduszki.
 * Wilgotna ziemia napiera na ściany od środka, a napór rośnie z głębokością —
 * dlatego grządka wysoka na 40 cm potrzebuje słupka pośredniego już przy
 * półtorametrowej ścianie, a bez niego deski wybrzuszają się po pierwszym
 * sezonie i mebel wygląda na zepsuty, choć nic się nie złamało.
 *
 * DRUGA SPRAWA TO WODA. Donica bez odpływu to doniczka z zamkniętym dnem:
 * korzenie gniją, a drewno stoi w wodzie od środka. Dno układamy więc zawsze
 * ze szczelinami, a ziemię oddzielamy od desek agrowłókniną, nie folią.
 */

import {
  T,
  par,
  warsztat,
  rozkladDesek,
  rownyRozstaw,
  ileWRozstawie,
  P,
  type PrzepisMebla,
} from './furniture'

/** Deska na ściany skrzyń ogrodowych — 25 mm wytrzymuje napór wilgotnej ziemi. */
const DESKA_SCIANY = T(25, 140)

export const PRZEPISY_OGROD: PrzepisMebla[] = [
  // -------------------------------------------------------------------------
  {
    id: 'donica-prostokatna',
    nazwa: 'Donica prostokątna',
    kategoria: 'ogrod',
    opis: 'Skrzynia na kwiaty albo krzewy, stojąca wprost na ziemi lub na tarasie. Dobry projekt na pierwszy raz — same proste cięcia.',
    trudnosc: 1,
    wilgoc: 'grunt',
    czas: '2–3 godziny',
    narzedzia: ['piła', 'wkrętarka', 'kątownik'],
    parametry: [
      par.dlugosc(800, 400, 1600),
      par.glebokosc(400, 300, 700),
      par.wysokosc(400, 250, 700, 'Dla kwiatów sezonowych wystarczy 30 cm, dla krzewu licz 50 cm ziemi.'),
      par.opcja('nozki', 'Nóżki dystansowe', true, 'Podnoszą donicę nad podłoże. Drewno stojące wprost na płytce gnije od spodu.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const slupekB = 45
      const zNozek = w.nozki >= 1 ? 40 : 0
      const xSlup = [slupekB / 2, dl - slupekB / 2]
      const ySlup = [slupekB / 2, gl - slupekB / 2]

      if (zNozek > 0) {
        s.ustaw('nogi', T(45, 60))
        for (const x of xSlup) {
          s.wszerz({ nazwa: 'Nóżka dystansowa', x, od: 0, do: gl, z: zNozek / 2, obrot: 'sztorc', wkretow: 4 })
        }
      }

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlup) {
        for (const y of ySlup) {
          s.pion({ nazwa: 'Słupek narożny', x, y, od: zNozek, do: zNozek + wys, wkretow: 4 })
        }
      }
      // Przy długiej donicy ściana wybrzusza się w połowie — dokładamy słupki.
      const slupkiPosrednie = Math.max(0, Math.ceil(dl / 900) - 1)
      for (const x of rownyRozstaw(xSlup[0], xSlup[1], slupkiPosrednie + 2).slice(1, -1)) {
        for (const y of ySlup) {
          s.pion({ nazwa: 'Słupek pośredni', x, y, od: zNozek, do: zNozek + wys, wkretow: 4 })
        }
      }

      s.ustaw('sciany', DESKA_SCIANY)
      const rzedy = rozkladDesek(wys, DESKA_SCIANY.h, 0)
      for (const zLok of rzedy.srodki) {
        const z = zNozek + zLok
        for (const y of ySlup) {
          s.wzdluz({ nazwa: 'Deska ściany dłuższej', od: 0, do: dl, y, z, obrot: 'sztorc', wkretow: 4 })
        }
        for (const x of xSlup) {
          s.wszerz({
            nazwa: 'Deska ściany krótszej',
            x,
            od: DESKA_SCIANY.b,
            do: gl - DESKA_SCIANY.b,
            z,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      s.ustaw('dno', T(25, 120))
      const dno = rozkladDesek(gl - slupekB, 120, 12)
      for (const yLok of dno.srodki) {
        s.wzdluz({
          nazwa: 'Deska dna',
          od: slupekB,
          do: dl - slupekB,
          y: slupekB / 2 + yLok,
          z: zNozek + 40,
          wkretow: 2,
          uwaga: 'szczeliny na odpływ wody — nie zabijaj ich na styk',
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zacznij od słupków narożnych — to do nich przykręca się wszystko inne. Przy donicy dłuższej niż metr wstaw dodatkowe słupki w połowie długości: napór mokrej ziemi wybrzusza dłuższą ścianę.',
      sciany: 'Obszaluj donicę deskami, zaczynając od dołu. Ściany krótsze wchodzą MIĘDZY dłuższe — wtedy naroże zasłania czoło deski, przez które drewno najszybciej nasiąka.',
      dno: 'Deski dna ze szczelinami 10–15 mm, oparte na dolnych krawędziach słupków. Dno szczelne to najczęstszy błąd przy donicy — woda musi mieć którędy uciec.',
    },
    wskazowki: [
      'Wyściel wnętrze agrowłókniną, nie folią. Włóknina zatrzymuje ziemię, ale przepuszcza wodę i powietrze; folia zamienia donicę w wiadro z zamkniętą wodą.',
      'Nie stawiaj donicy wprost na tarasie. Nawet 4 cm prześwitu pod dnem wystarczy, żeby spód obsychał — bez tego drewno spróchnieje od dołu, a z góry będzie wyglądać jak nowe.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'donica-wysoka',
    nazwa: 'Donica wysoka na nogach',
    kategoria: 'ogrod',
    opis: 'Skrzynia z ziemią na wysokości pasa — do ziół i sałaty. Nie trzeba się schylać, a ślimaki mają trudniej.',
    trudnosc: 2,
    wilgoc: 'grunt',
    czas: '4–5 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'poziomica'],
    parametry: [
      par.dlugosc(1000, 600, 1800),
      par.glebokosc(500, 350, 700),
      par.wysokosc(850, 700, 1000, 'Wysokość górnej krawędzi. Do pracy na stojąco najwygodniej 85–90 cm.'),
      par.wlasny('ziemia', 'Głębokość ziemi', 250, 150, 400, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Zioła i sałata potrzebują 20 cm, marchew i pomidor 35–40 cm.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const zIemi = w.ziemia
      const nogaB = 70
      const zDna = wys - zIemi
      const xNog = [nogaB / 2 + 10, dl - nogaB / 2 - 10]
      const yNog = [nogaB / 2 + 10, gl - nogaB / 2 - 10]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys, wkretow: 6 })
        }
      }

      // Skrzynia z ziemią jest ciężka: metr sześcienny wilgotnego podłoża waży
      // około 800 kg. Rama pod dnem przenosi ten ciężar wprost na nogi.
      s.ustaw('rama', T(32, 120))
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia pod dnem', od: xNog[0], do: xNog[1], y, z: zDna - 60, obrot: 'sztorc', wkretow: 6 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Poprzeczka pod dnem', x, od: yNog[0], do: yNog[1], z: zDna - 60, obrot: 'sztorc', wkretow: 4 })
      }
      const legary = ileWRozstawie(dl, 500)
      for (const x of rownyRozstaw(xNog[0], xNog[1], legary).slice(1, -1)) {
        s.wszerz({ nazwa: 'Legar dna', x, od: yNog[0], do: yNog[1], z: zDna - 60, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('stezenia', T(25, 90))
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Poprzeczka dolna', od: xNog[0], do: xNog[1], y, z: 200, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('dno', T(25, 120))
      const dno = rozkladDesek(gl - nogaB, 120, 10)
      for (const yLok of dno.srodki) {
        s.wzdluz({
          nazwa: 'Deska dna',
          od: xNog[0],
          do: xNog[1],
          y: nogaB / 2 + yLok,
          z: zDna,
          wkretow: 4,
        })
      }

      s.ustaw('sciany', DESKA_SCIANY)
      const rzedy = rozkladDesek(zIemi, DESKA_SCIANY.h, 0)
      for (const zLok of rzedy.srodki) {
        const z = zDna + zLok
        for (const y of yNog) {
          s.wzdluz({ nazwa: 'Deska ściany dłuższej', od: 0, do: dl, y, z, obrot: 'sztorc', wkretow: 4 })
        }
        for (const x of xNog) {
          s.wszerz({ nazwa: 'Deska ściany krótszej', x, od: 25, do: gl - 25, z, obrot: 'sztorc', wkretow: 4 })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery długie nogi na całą wysokość donicy — jeden kawałek od ziemi po górną krawędź skrzyni. Skrzynia postawiona na osobnym stoliku rozjeżdża się po jednym sezonie.',
      rama: 'Rama pod dnem to najważniejsza część tego mebla. Wilgotna ziemia w skrzyni 100 × 50 × 25 cm waży ponad sto kilogramów — ten ciężar musi trafić prosto w nogi, a nie w wkręty trzymające deski ścian.',
      stezenia: 'Poprzeczki nisko przy ziemi trzymają nogi przed rozjechaniem się.',
      dno: 'Deski dna na legarach, ze szczelinami. Woda z podlewania ma kapać pod donicę, a nie stać w niej.',
      sciany: 'Obszaluj skrzynię od dołu. Górna deska powinna wypaść równo z końcem nóg — sterczące nogi wyglądają jak niedokończone.',
    },
    wskazowki: [
      'Nie napełniaj całej skrzyni ziemią ogrodową. Dolną trzecią wyłóż gałęziami, korą albo keramzytem: mniej ciężaru, lepszy drenaż i mniej podłoża do kupienia.',
      'Agrowłóknina na dnie i na ścianach zatrzyma ziemię w szczelinach, ale nie zamknie wody. Przybij ją zszywkami po wewnętrznej stronie, zanim wsypiesz podłoże.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'grzadka-podwyzszona',
    nazwa: 'Grządka podwyższona',
    kategoria: 'ogrod',
    opis: 'Warzywnik w skrzyni bez dna, postawiony wprost na ziemi. Ziemia grzeje się szybciej wiosną, a chwasty z trawnika nie wchodzą do środka.',
    trudnosc: 1,
    wilgoc: 'grunt',
    czas: '3–4 godziny',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'szpadel'],
    parametry: [
      par.dlugosc(2000, 1000, 4000, 'Dowolna, byle dało się obejść dookoła.'),
      par.szerokosc(1000, 600, 1400, 'Nie szersza niż dwa wyciągnięcia ręki — do środka trzeba sięgnąć bez wchodzenia na grządkę.'),
      par.wysokosc(400, 200, 800, 'Do warzyw wystarczy 30 cm. 80 cm to grządka, przy której pracuje się na stojąco.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const wys = w.wysokosc
      const slupekB = 70
      const xSlup = [slupekB / 2, dl - slupekB / 2]
      const ySlup = [slupekB / 2, szer - slupekB / 2]

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlup) {
        for (const y of ySlup) {
          // Słupek schodzi 150 mm poniżej zera — wbija się w grunt i trzyma
          // grządkę na miejscu, gdy ziemia po deszczu zacznie napierać.
          s.pion({ nazwa: 'Słupek narożny', x, y, od: -150, do: wys, wkretow: 6 })
        }
      }
      const posrednie = Math.max(0, Math.ceil(dl / 1200) - 1)
      for (const x of rownyRozstaw(xSlup[0], xSlup[1], posrednie + 2).slice(1, -1)) {
        for (const y of ySlup) {
          s.pion({ nazwa: 'Słupek pośredni', x, y, od: -150, do: wys, wkretow: 4 })
        }
      }

      s.ustaw('sciany', T(32, 150))
      const rzedy = rozkladDesek(wys, 150, 0)
      for (const zLok of rzedy.srodki) {
        for (const y of ySlup) {
          s.wzdluz({ nazwa: 'Deska ściany dłuższej', od: 0, do: dl, y, z: zLok, obrot: 'sztorc', wkretow: 4 })
        }
        for (const x of xSlup) {
          s.wszerz({ nazwa: 'Deska ściany krótszej', x, od: 32, do: szer - 32, z: zLok, obrot: 'sztorc', wkretow: 4 })
        }
      }

      // Ściąg w poprzek: przy wyższej grządce ziemia rozpycha ściany na tyle,
      // że same słupki tego nie utrzymają.
      if (wys >= 400) {
        s.ustaw('stezenia', T(25, 60))
        const sciagi = Math.max(1, Math.round(dl / 1200))
        for (const x of rownyRozstaw(dl / (sciagi + 1), (dl * sciagi) / (sciagi + 1), sciagi)) {
          s.wszerz({
            nazwa: 'Ściąg poprzeczny',
            x,
            od: 0,
            do: szer,
            z: wys - 60,
            obrot: 'plask',
            wkretow: 4,
            uwaga: 'trzyma ściany przed rozejściem się pod naporem ziemi',
          })
        }
      }

      // Szeroka deska na górnej krawędzi: siada się na niej przy pieleniu.
      s.ustaw('blat', T(32, 140))
      for (const y of ySlup) {
        s.wzdluz({ nazwa: 'Deska krawędziowa', od: 0, do: dl, y, z: wys + 16, wkretow: 6 })
      }
      for (const x of xSlup) {
        s.wszerz({ nazwa: 'Deska krawędziowa', x, od: 0, do: szer, z: wys + 16, wkretow: 4 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Wytycz obrys grządki sznurem i wbij słupki narożne, wpuszczając je kilkanaście centymetrów w grunt. Przy grządce dłuższej niż 1,2 m wstaw słupki pośrednie — inaczej ściana wybrzuszy się po pierwszym sezonie.',
      sciany: 'Przykręcaj deski od dołu, poziomując pierwszą. Nie zostawiaj szczelin — z grządki miałaby czym wysypywać się ziemia.',
      stezenia: 'Przy grządce wyższej niż 40 cm wstaw ściągi w poprzek. To zwykła listwa łącząca przeciwległe ściany u góry, a bez niej boki po prostu się rozejdą.',
      blat: 'Nakryj górną krawędź szeroką deską. Zasłania czoła desek, wzmacnia całość i daje gdzie usiąść albo odłożyć narzędzia przy pieleniu.',
    },
    wskazowki: [
      'Na dno połóż siatkę o drobnych oczkach, jeśli w ogrodzie są nornice. Wkopana pod deski uratuje korzenie przed zjedzeniem od spodu.',
      'Nie używaj podkładów kolejowych ani drewna impregnowanego kreozotem pod uprawy jadalne. Do grządki warzywnej idzie modrzew, dąb, akacja albo sosna impregnowana ciśnieniowo w klasie dopuszczonej do kontaktu z ziemią.',
      'Ustaw grządkę dłuższym bokiem na linii wschód–zachód. Rośliny w pierwszym rzędzie nie będą wtedy zacieniać tych z tyłu.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'kwietnik-schodkowy',
    nazwa: 'Kwietnik schodkowy',
    kategoria: 'ogrod',
    opis: 'Etażerka na doniczki: kilka półek jedna nad drugą, każda cofnięta do tyłu. Mieści dziesięć roślin na metrze kwadratowym podłogi.',
    trudnosc: 2,
    czas: '3–4 godziny',
    narzedzia: ['piła', 'wkrętarka', 'kątownik nastawny'],
    parametry: [
      par.szerokosc(800, 500, 1400),
      par.wysokosc(1000, 600, 1600),
      par.wlasny('poziomy', 'Liczba półek', 4, 3, 6),
      par.wlasny('polka', 'Głębokość półki', 200, 150, 300, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Doniczka 15 cm potrzebuje 18 cm półki. Głębsza półka to głębszy i mniej stabilny kwietnik.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const wys = w.wysokosc
      const poziomy = Math.round(w.poziomy)
      const glPolki = w.polka
      // Bok kwietnika to trójkąt: pion z tyłu, ukos z przodu, a półki
      // wypełniają przestrzeń między nimi. Głębokość dołu wynika z liczby półek.
      const glDolu = glPolki * poziomy * 0.55
      const bokX = [45, szer - 45]

      s.ustaw('nogi', T(32, 90))
      for (const x of bokX) {
        s.pion({ nazwa: 'Słupek tylny', x, y: glDolu, od: 0, do: wys, wkretow: 4 })
        s.ukos({
          nazwa: 'Ukos przedni boku',
          start: P(x, 0, 0),
          koniec: P(x, glDolu - glPolki, wys - 60),
          plaszczyzna: P(0, 0, 1),
          wkretow: 4,
          uwaga: 'oba końce ścięte: dolny płasko do ziemi, górny do słupka',
        })
        s.wszerz({
          nazwa: 'Stopa boku',
          x,
          od: 0,
          do: glDolu,
          z: 16,
          obrot: 'plask',
          wkretow: 4,
        })
      }

      s.ustaw('polki', T(25, 140))
      for (let i = 0; i < poziomy; i++) {
        const z = 120 + (i * (wys - 200)) / Math.max(1, poziomy - 1)
        // Każda kolejna półka jest cofnięta do tyłu — stąd „schodkowy”.
        // Dolna stoi najbardziej z przodu, pod ukosem boku; górna dosuwa się
        // do słupka. Odwrotna kolejność dawałaby półki wiszące w powietrzu.
        const yPrzod = ((glDolu - glPolki) * z) / (wys - 60)
        const deski = rozkladDesek(glPolki, 140, 5)
        for (const yLok of deski.srodki) {
          s.wzdluz({
            nazwa: `Deska półki ${i + 1}`,
            od: 0,
            do: szer,
            y: yPrzod + yLok,
            z,
            wkretow: 4,
          })
        }
        s.tarcica(T(25, 60))
        s.wzdluz({
          nazwa: `Listwa nośna półki ${i + 1}`,
          od: bokX[0],
          do: bokX[1],
          y: yPrzod + glPolki - 30,
          z: z - 25,
          obrot: 'sztorc',
          wkretow: 4,
        })
        s.tarcica(T(25, 140))
      }

      s.ustaw('stezenia', T(20, 90))
      s.wzdluz({
        nazwa: 'Stężenie tylne',
        od: bokX[0],
        do: bokX[1],
        y: glDolu,
        z: wys - 80,
        obrot: 'sztorc',
        wkretow: 4,
      })

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zrób oba boki jako osobne trójkąty: słupek pionowy z tyłu, ukos z przodu i stopa na dole. Zrób pierwszy, sprawdź, i użyj go jako szablonu do drugiego.',
      polki: 'Wstawiaj półki od dołu, każdą na listwie nośnej i cofniętą względem poprzedniej. Sprawdź poziom każdej osobno — na tak wąskich półkach doniczka zjeżdża, zanim się to zauważy.',
      stezenia: 'Zepnij oba boki listwą z tyłu, u góry. Bez niej kwietnik składa się na bok jak drabina bez szczebli.',
    },
    wskazowki: [
      'Kwietnik z doniczkami jest cięższy u góry, niż wygląda. Jeśli stoi na tarasie na wietrze, przykręć go do ściany jednym kątownikiem albo obciąż dolną półkę.',
      'Zrób najniższą półkę nieco głębszą niż pozostałe — trafiają na nią zawsze największe doniczki.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'trejaz',
    nazwa: 'Trejaż — krata na pnącza',
    kategoria: 'ogrod',
    opis: 'Krata z listew do postawienia przy ścianie albo w donicy. Powojnik, róża pnąca i winobluszcz potrzebują czegoś, po czym wejdą w górę.',
    trudnosc: 1,
    wilgoc: 'grunt',
    czas: '2 godziny',
    narzedzia: ['piła', 'wkrętarka', 'kątownik'],
    parametry: [
      par.szerokosc(900, 400, 1600),
      par.wysokosc(1800, 900, 2500),
      par.wlasny('oczko', 'Wielkość oczka', 160, 80, 300, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Odległość między listwami w świetle. Drobne pnącza wolą gęstszą kratę, róża potrzebuje luźniejszej.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const wys = w.wysokosc
      const oczko = w.oczko
      const ramaB = 32
      const listwa = T(20, 40)

      s.ustaw('rama', T(ramaB, 70))
      for (const x of [35, szer - 35]) {
        s.pion({ nazwa: 'Słupek ramy', x, y: 0, od: 0, do: wys, wkretow: 4 })
      }
      for (const z of [35, wys - 35]) {
        s.wzdluz({ nazwa: 'Poprzeczka ramy', od: 0, do: szer, y: 0, z, obrot: 'plask', wkretow: 4 })
      }

      s.ustaw('sciany', listwa)
      const pionowych = Math.max(2, Math.floor((szer - 70) / (oczko + listwa.h)))
      for (const x of rownyRozstaw(90, szer - 90, pionowych)) {
        s.pion({
          nazwa: 'Listwa pionowa',
          x,
          y: -ramaB / 2 - 10,
          od: 60,
          do: wys - 60,
          wkretow: 2,
        })
      }
      const poziomych = Math.max(2, Math.floor((wys - 120) / (oczko + listwa.h)))
      for (const z of rownyRozstaw(120, wys - 120, poziomych)) {
        s.wzdluz({
          nazwa: 'Listwa pozioma',
          od: 20,
          do: szer - 20,
          y: -ramaB / 2 - 30,
          z,
          obrot: 'plask',
          wkretow: 2,
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      rama: 'Skręć ramę zewnętrzną i sprawdź przekątne. Krata bez sztywnej ramy zmienia się w równoległobok już przy wieszaniu.',
      sciany: 'Przykręć najpierw wszystkie listwy pionowe, potem poziome na nich. Rozmierz je od środka ku brzegom — wtedy ewentualna różnica rozejdzie się po obu stronach po równo.',
    },
    wskazowki: [
      'Nie przykręcaj trejaża płasko do ściany. Odsuń go na 4–5 cm klockami dystansowymi: pnącze musi mieć którędy owinąć się wokół listwy, a ściana za kratą musi obsychać.',
      'Trejaż zdejmowany ze ściany to lepszy pomysł niż przykręcony na stałe — przy malowaniu elewacji odchyla się go razem z rośliną, zamiast ciąć pnącze.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'podest-tarasowy',
    nazwa: 'Podest tarasowy',
    kategoria: 'ogrod',
    opis: 'Moduł drewnianej podłogi do położenia na trawie, kostce albo żwirze. Kilka takich modułów układa się w cały taras.',
    trudnosc: 1,
    wilgoc: 'grunt',
    czas: '2–3 godziny na moduł',
    narzedzia: ['piła', 'wkrętarka', 'poziomica'],
    parametry: [
      par.dlugosc(1000, 500, 2000),
      par.szerokosc(1000, 500, 2000),
      par.wlasny('legar', 'Rozstaw legarów', 450, 300, 600, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Deska tarasowa 25 mm potrzebuje legara co 40 cm, 32 mm wytrzyma 50 cm. Rzadziej — podłoga ugina się pod stopą.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const legarSekcja = T(45, 70)

      s.ustaw('rama', legarSekcja)
      const legarow = ileWRozstawie(szer - legarSekcja.h, w.legar)
      for (const y of rownyRozstaw(legarSekcja.h / 2, szer - legarSekcja.h / 2, legarow)) {
        s.wzdluz({
          nazwa: 'Legar',
          od: 0,
          do: dl,
          y,
          z: legarSekcja.h / 2,
          obrot: 'sztorc',
          wkretow: 0,
          uwaga: 'ustawiony wyższym bokiem w pionie',
        })
      }

      s.ustaw('blat', T(25, 140))
      const deski = rozkladDesek(dl, 140, 6)
      for (const x of deski.srodki) {
        s.wszerz({
          nazwa: 'Deska tarasowa',
          x,
          od: 0,
          do: szer,
          z: legarSekcja.h + 12.5,
          wkretow: 2,
          uwaga: 'po dwa wkręty w każdy legar',
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      rama: 'Rozłóż legary na wyrównanym podłożu, wyższym bokiem w pionie — tak są kilkakrotnie sztywniejsze niż położone płasko. Pod każdy legar podłóż podkładkę dystansową, żeby drewno nie leżało w błocie.',
      blat: 'Przykręć deski w poprzek legarów, po dwa wkręty w każde skrzyżowanie. Szczelina 5–6 mm między deskami jest obowiązkowa: bez niej po deszczu deski zaprą się o siebie i podest wybrzuszy się do góry.',
    },
    wskazowki: [
      'Deski układaj tak, żeby woda spływała wzdłuż nich, a nie wzdłuż szczelin — najlepiej z minimalnym spadkiem 1% od budynku.',
      'Podest kładziony na trawie zabija ją w kilka tygodni i zaczyna gnić od spodu. Pod modułem daj warstwę żwiru albo agrowłókninę i podkładki dystansowe.',
      'Wkręty tylko nierdzewne albo do drewna impregnowanego. Zwykły ocynk w kontakcie z impregnatem miedziowym koroduje w jeden sezon i zostawia czarne smugi wokół każdego łba.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'piaskownica',
    nazwa: 'Piaskownica z siedziskami',
    kategoria: 'ogrod',
    opis: 'Kwadratowa skrzynia na piasek z siedziskami w narożnikach. Siedziska można rozłożyć — wtedy zakrywają piasek na noc.',
    trudnosc: 2,
    wilgoc: 'grunt',
    czas: '4–5 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'szlifierka', 'szpadel'],
    parametry: [
      par.szerokosc(1500, 1000, 2200, 'Bok piaskownicy. Poniżej 1,2 m dwoje dzieci już sobie przeszkadza.'),
      par.wysokosc(300, 200, 400, 'Wysokość ścian. Głębokość piasku to zwykle 25–30 cm.'),
      par.opcja('siedziska', 'Siedziska narożne', true),
    ],
    buduj: (w) => {
      const s = warsztat()
      const bok = w.szerokosc
      const wys = w.wysokosc
      const slupekB = 70
      const xSlup = [slupekB / 2, bok - slupekB / 2]
      const ySlup = [slupekB / 2, bok - slupekB / 2]

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlup) {
        for (const y of ySlup) {
          s.pion({ nazwa: 'Słupek narożny', x, y, od: -100, do: wys, wkretow: 6 })
        }
      }

      s.ustaw('sciany', T(32, 150))
      const rzedy = rozkladDesek(wys, 150, 0)
      for (const zLok of rzedy.srodki) {
        for (const y of ySlup) {
          s.wzdluz({ nazwa: 'Deska ściany', od: 0, do: bok, y, z: zLok, obrot: 'sztorc', wkretow: 4 })
        }
        for (const x of xSlup) {
          s.wszerz({ nazwa: 'Deska ściany', x, od: 32, do: bok - 32, z: zLok, obrot: 'sztorc', wkretow: 4 })
        }
      }

      if (w.siedziska >= 1) {
        s.ustaw('siedzisko', T(32, 140))
        // Siedzisko narożne: trójkątny narożnik z dwóch desek pod kątem prostym.
        const dlSiedziska = Math.min(500, bok / 2 - 100)
        for (const [x0, y0, kx, ky] of [
          [0, 0, 1, 1],
          [bok, 0, -1, 1],
          [0, bok, 1, -1],
          [bok, bok, -1, -1],
        ] as Array<[number, number, number, number]>) {
          s.wzdluz({
            nazwa: 'Deska siedziska narożnego',
            od: Math.min(x0, x0 + kx * dlSiedziska),
            do: Math.max(x0, x0 + kx * dlSiedziska),
            y: y0 + ky * 70,
            z: wys + 16,
            wkretow: 4,
          })
          s.wszerz({
            nazwa: 'Deska siedziska narożnego',
            x: x0 + kx * 70,
            od: Math.min(y0 + ky * 140, y0 + ky * dlSiedziska),
            do: Math.max(y0 + ky * 140, y0 + ky * dlSiedziska),
            z: wys + 16,
            wkretow: 4,
          })
        }
      } else {
        s.ustaw('blat', T(32, 140))
        for (const y of ySlup) {
          s.wzdluz({ nazwa: 'Deska krawędziowa', od: 0, do: bok, y, z: wys + 16, wkretow: 4 })
        }
        for (const x of xSlup) {
          s.wszerz({ nazwa: 'Deska krawędziowa', x, od: 0, do: bok, z: wys + 16, wkretow: 4 })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Wytycz kwadrat i sprawdź przekątne — przy piaskownicy widać każdy przekos, bo boki są równe. Słupki wpuść kilkanaście centymetrów w grunt.',
      sciany: 'Obszaluj skrzynię deskami. Wszystkie górne krawędzie mocno zaokrąglij papierem: to jest mebel, po którym dzieci chodzą, siadają na nim i przewracają się o niego.',
      siedzisko: 'Przykręć siedziska w narożnikach. Sprawdź dłonią każdą krawędź i każdy łeb wkrętu — drzazga w piaskownicy kończy zabawę na tydzień.',
      blat: 'Nakryj górną krawędź deskami. Siedzi się na nich i zasłaniają czoła desek ściany.',
    },
    laczniki: () => [
      { nazwa: 'Agrowłóknina', sztuk: 1, jednostka: 'm²', uwaga: 'na dno, pod piasek — powyżej wymiaru piaskownicy' },
      { nazwa: 'Plandeka albo pokrowiec', sztuk: 1, jednostka: 'szt.', uwaga: 'zakrycie piasku na noc' },
    ],
    wskazowki: [
      'Piasek kupuj płukany, kopalniany, przesiany — ten z budowy zawiera glinę i po deszczu robi się z niego beton. Na piaskownicę 1,5 × 1,5 m przy 25 cm głębokości potrzeba około 0,6 m³, czyli mniej więcej tonę.',
      'Dno wyłóż agrowłókniną, nie folią. Deszcz musi mieć którędy odejść, bo inaczej piasek zamieni się w błoto i zacznie pleśnieć.',
      'Zakrywaj piaskownicę na noc. Odkryta jest zaproszeniem dla kotów, a to jedyna rzecz, która potrafi zniechęcić do niej dzieci na dobre.',
    ],
  },
]
