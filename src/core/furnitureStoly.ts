/**
 * Przepisy na stoły: biesiadny, piknikowy, kawowy, ogrodnika i barowy.
 *
 * DLACZEGO WYSOKOŚĆ BLATU JEST PRAWIE ZAWSZE TA SAMA
 * -------------------------------------------------
 * 75 cm to wysokość, przy której siedząc na 45-centymetrowym siedzisku ma się
 * kolana pod blatem, a łokcie na nim. Odstęp między siedziskiem a spodem blatu
 * powinien wynosić około 28 cm — przy mniejszym uda opierają się o oskrzynię.
 * Dlatego przy stole liczy się nie tyle sama wysokość, ile GRUBOŚĆ TEGO, CO
 * WISI POD BLATEM: oskrzynia 140 mm zjada połowę tego prześwitu.
 *
 * ROZSTAW NÓG to drugi wymiar, który psuje gotowy stół. Noga wsunięta 30 cm
 * od końca blatu pozwala dostawić krzesło u szczytu; noga w samym narożniku
 * blokuje to miejsce na zawsze.
 */

import {
  T,
  par,
  warsztat,
  rozkladDesek,
  rownyRozstaw,
  P,
  type PrzepisMebla,
} from './furniture'

/** Blat ogrodowy z deski 32 mm — cieńsza ugina się między oskrzyniami. */
const DESKA_BLATU = T(32, 140)

export const PRZEPISY_STOLY: PrzepisMebla[] = [
  // -------------------------------------------------------------------------
  {
    id: 'stol-biesiadny',
    nazwa: 'Stół biesiadny',
    kategoria: 'stoly',
    opis: 'Solidny stół na kilkanaście osób, do ogrodu albo pod wiatę. Robi się go raz i zostaje na lata.',
    trudnosc: 2,
    czas: '6–8 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'poziomica', 'ścisk stolarski'],
    parametry: [
      par.dlugosc(2000, 1200, 3000, 'Licz 60 cm blatu na osobę. Stół 2 m to sześć osób po bokach i dwie u szczytów.'),
      par.szerokosc(800, 700, 1100, 'Poniżej 70 cm talerze z obu stron stykają się na środku.'),
      par.wysokosc(750, 720, 780, 'Standard to 75 cm. Przy ławce 45 cm daje wygodny prześwit na kolana.'),
      par.opcja('polkaDolna', 'Półka pod blatem', false, 'Przydaje się w warsztacie, w ogrodzie raczej przeszkadza przy nogach.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const wys = w.wysokosc
      const nogaB = 70
      const grubBlatu = DESKA_BLATU.b
      // Nogi wsunięte od czoła, żeby dało się usiąść u szczytu stołu.
      const wciecie = 250
      const xNog = [wciecie, dl - wciecie]
      const yNog = [70, szer - 70]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys - grubBlatu, wkretow: 4 })
        }
      }

      s.ustaw('rama', T(32, 140))
      const zRamy = wys - grubBlatu - 90
      for (const y of yNog) {
        s.wzdluz({
          nazwa: 'Oskrzynia podłużna',
          od: xNog[0],
          do: xNog[1],
          y,
          z: zRamy,
          obrot: 'sztorc',
          wkretow: 6,
        })
      }
      for (const x of xNog) {
        s.wszerz({
          nazwa: 'Oskrzynia poprzeczna',
          x,
          od: yNog[0],
          do: yNog[1],
          z: zRamy,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }
      // Przy długim blacie deski uginają się pośrodku — dokładamy legary.
      const legary = Math.max(0, Math.round(dl / 900) - 1)
      for (const x of rownyRozstaw(xNog[0], xNog[1], legary + 2).slice(1, -1)) {
        s.wszerz({
          nazwa: 'Legar pośredni',
          x,
          od: yNog[0],
          do: yNog[1],
          z: zRamy,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }

      // Zastrzały w narożnikach: prostokąt z czterech belek sam z siebie
      // składa się jak nożyce, dopiero ukos trzyma go w kącie prostym.
      s.ustaw('stezenia', T(32, 90))
      for (const x of xNog) {
        for (const y of yNog) {
          const kX = x === xNog[0] ? 1 : -1
          const kY = y === yNog[0] ? 1 : -1
          s.ukos({
            nazwa: 'Zastrzał narożny',
            start: P(x + kX * 30, y, zRamy - 200),
            koniec: P(x + kX * 30, y + kY * 260, zRamy),
            plaszczyzna: P(0, 0, 1),
            skos: 45,
            wkretow: 2,
          })
        }
      }

      if (w.polkaDolna >= 1) {
        s.ustaw('polki', T(25, 140))
        const polka = rozkladDesek(szer - 140, 140, 10)
        for (const yLok of polka.srodki) {
          s.wzdluz({
            nazwa: 'Deska półki',
            od: xNog[0] - 40,
            do: xNog[1] + 40,
            y: 70 + yLok,
            z: 220,
            wkretow: 4,
          })
        }
      }

      s.ustaw('blat', DESKA_BLATU)
      const blat = rozkladDesek(szer, DESKA_BLATU.h, 6)
      for (const y of blat.srodki) {
        s.wzdluz({
          nazwa: 'Deska blatu',
          od: 0,
          do: dl,
          y,
          z: wys - grubBlatu / 2,
          wkretow: 6,
          uwaga: 'mocowana od spodu, przez oskrzynię',
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Dotnij cztery nogi na jednakową długość. Zetnij je wszystkie z jednego ustawienia ogranicznika — mierzone pojedynczo miarką różnią się o kilka milimetrów, a stół stoi na najkrótszej z nich.',
      rama: 'Zbierz ramę pod blatem: dwie oskrzynie wzdłuż, dwie w poprzek i legary tam, gdzie blat byłby zbyt długi bez podparcia. Przekątne ramy muszą być równe — to jedyne sprawdzenie, które naprawdę decyduje o tym, czy stół nie będzie się kiwał.',
      stezenia: 'Wstaw zastrzały w narożnikach, po 45°. Zabierają kilka minut, a bez nich stół po roku zaczyna chodzić na boki przy każdym oparciu się o blat.',
      polki: 'Ułóż deski półki na dolnych poprzeczkach.',
      blat: 'Przykręcaj deski blatu OD SPODU, przez oskrzynię i legary. Wkręt od góry zawsze zbierze wodę pod łbem i zacznie czernić drewno wokół siebie. Zostaw 5–6 mm szczeliny między deskami — na deszcz i na pracę drewna.',
    },
    wskazowki: [
      'Deski blatu układaj słojami na przemian: jedna łukiem do góry, następna do dołu. Wtedy blat wysychając faluje po trochu w obie strony zamiast wygiąć się w jedną misę.',
      'Szczelin w blacie nie zamykaj silikonem ani listwą. To one sprawiają, że po deszczu stół schnie w godzinę zamiast przez dwa dni.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'zestaw-piknikowy',
    nazwa: 'Zestaw piknikowy — stół z ławkami',
    kategoria: 'stoly',
    opis: 'Stół i dwie ławki połączone w jedną bryłę, na skrzyżowanych nogach. Klasyk z każdego pola namiotowego — nic się w nim nie rozjeżdża i nic nie ginie.',
    trudnosc: 3,
    czas: '1 dzień',
    narzedzia: ['piła', 'wkrętarka', 'kątownik nastawny', 'klucz nasadowy'],
    parametry: [
      par.dlugosc(1800, 1400, 2400, 'Długość stołu i ławek. 1,8 m to sześć osób.'),
      par.szerokosc(750, 650, 900, 'Szerokość blatu.'),
      par.wysokosc(750, 720, 780, 'Wysokość blatu od ziemi.'),
      par.wlasny('siedzisko', 'Wysokość siedziska', 450, 400, 480, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Różnica między blatem a siedziskiem powinna wynieść około 30 cm.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szerBlatu = w.szerokosc
      const wys = w.wysokosc
      const zSiedziska = w.siedzisko
      const grubBlatu = 32
      const szerLawki = 300
      // Nogi rozchodzą się na zewnątrz i podtrzymują ławki — im niżej, tym
      // szerzej. To ten rozkrok, a nie żadne stężenie, trzyma zestaw stabilnie.
      const rozkrokDolny = szerBlatu / 2 + szerLawki + 200
      const xRam = [340, dl - 340]
      const ySrodek = 0

      s.ustaw('nogi', T(45, 140))
      for (const x of xRam) {
        for (const k of [-1, 1]) {
          s.ukos({
            nazwa: 'Noga skrzyżowana',
            start: P(x, ySrodek + k * rozkrokDolny, 0),
            koniec: P(x, ySrodek - k * (szerBlatu / 2 - 60), wys - grubBlatu),
            plaszczyzna: P(0, 0, 1),
            skos: Math.round(
              (Math.atan2(rozkrokDolny + szerBlatu / 2 - 60, wys - grubBlatu) * 180) / Math.PI,
            ),
            wkretow: 6,
            uwaga: 'oba końce ścięte pod tym samym kątem, równolegle do ziemi i do blatu',
          })
        }
      }

      s.ustaw('rama', T(45, 140))
      for (const x of xRam) {
        s.wszerz({
          nazwa: 'Poprzeczka pod blatem',
          x,
          od: -szerBlatu / 2 + 40,
          do: szerBlatu / 2 - 40,
          z: wys - grubBlatu - 70,
          obrot: 'sztorc',
          wkretow: 6,
        })
        s.wszerz({
          nazwa: 'Belka siedziska',
          x,
          od: -rozkrokDolny + 60,
          do: rozkrokDolny - 60,
          z: zSiedziska - 70,
          obrot: 'sztorc',
          wkretow: 8,
          uwaga: 'przechodzi przez obie nogi i niesie obie ławki',
        })
      }

      // Zastrzał wzdłuż stołu — bez niego zestaw składa się na długość.
      s.ustaw('stezenia', T(32, 120))
      for (const k of [-1, 1]) {
        s.ukos({
          nazwa: 'Zastrzał podłużny',
          start: P(xRam[0], ySrodek + k * 40, zSiedziska - 70),
          koniec: P(dl / 2, ySrodek + k * 40, wys - grubBlatu - 90),
          plaszczyzna: P(0, 1, 0),
          wkretow: 4,
        })
        s.ukos({
          nazwa: 'Zastrzał podłużny',
          start: P(xRam[1], ySrodek + k * 40, zSiedziska - 70),
          koniec: P(dl / 2, ySrodek + k * 40, wys - grubBlatu - 90),
          plaszczyzna: P(0, 1, 0),
          wkretow: 4,
        })
      }

      s.ustaw('siedzisko', T(32, 140))
      for (const k of [-1, 1]) {
        const lawka = rozkladDesek(szerLawki, 140, 8)
        for (const yLok of lawka.srodki) {
          const y = k * (szerBlatu / 2 + 180 + yLok)
          s.wzdluz({ nazwa: 'Deska ławki', od: 0, do: dl, y, z: zSiedziska - 16, wkretow: 4 })
        }
      }

      s.ustaw('blat', DESKA_BLATU)
      const blat = rozkladDesek(szerBlatu, DESKA_BLATU.h, 6)
      for (const yLok of blat.srodki) {
        s.wzdluz({
          nazwa: 'Deska blatu',
          od: 0,
          do: dl,
          y: -szerBlatu / 2 + yLok,
          z: wys - grubBlatu / 2,
          wkretow: 4,
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zetnij końce nóg pod jednym kątem — dolny równolegle do ziemi, górny równolegle do blatu. Zrób jedną nogę, przymierz ją na sucho, i dopiero wtedy obrysuj jako szablon pozostałych trzech.',
      rama: 'Skręć każdą ramę osobno na płasko: dwie skrzyżowane nogi, poprzeczka pod blatem i belka siedziska. Belka siedziska musi przechodzić przez obie nogi — to ona przenosi ciężar siedzących na skrzyżowanie.',
      stezenia: 'Postaw obie ramy i zepnij je zastrzałami wzdłuż stołu. Do tego momentu konstrukcja stoi tylko dlatego, że ktoś ją trzyma.',
      siedzisko: 'Przykręć deski ławek do belek siedzisk, po obu stronach naraz — inaczej zestaw przewraca się na obciążoną stronę.',
      blat: 'Na końcu blat. Deski przykręć od spodu przez poprzeczki, ze szczelinami.',
    },
    wskazowki: [
      'Wszystkie cztery skrzyżowania nóg skręć śrubami przelotowymi na podkładkę i nakrętkę, nie wkrętami. To złącze pracuje przy każdym siadnięciu i wstaniu, a wkręt w drewnie czołowym rozrabia sobie otwór w kilka miesięcy.',
      'Zestaw jest ciężki i nieporęczny. Jeśli ma być przenoszony, zrób go na 1,6 m zamiast 2 m — różnica w wadze jest większa, niż się wydaje.',
    ],
    laczniki: () => [
      { nazwa: 'Śruba przelotowa M8 z podkładkami i nakrętką', sztuk: 8, jednostka: 'szt.', uwaga: 'skrzyżowania nóg' },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'stolik-kawowy',
    nazwa: 'Stolik kawowy',
    kategoria: 'stoly',
    opis: 'Niski stolik na taras albo do salonu, z półką pod blatem. Mały projekt, na którym dobrze uczyć się skręcania ramy.',
    trudnosc: 1,
    czas: '2–3 godziny',
    narzedzia: ['piła', 'wkrętarka', 'kątownik'],
    parametry: [
      par.dlugosc(900, 600, 1400),
      par.glebokosc(500, 400, 700),
      par.wysokosc(420, 350, 500, 'Stolik kawowy stoi zwykle na wysokości siedziska kanapy albo nieco niżej.'),
      par.opcja('polkaDolna', 'Półka pod blatem', true),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const nogaB = 45
      const grubBlatu = 25
      const xNog = [nogaB / 2 + 30, dl - nogaB / 2 - 30]
      const yNog = [nogaB / 2 + 30, gl - nogaB / 2 - 30]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys - grubBlatu })
        }
      }

      s.ustaw('rama', T(20, 90))
      const zRamy = wys - grubBlatu - 55
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia podłużna', od: xNog[0], do: xNog[1], y, z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Oskrzynia poprzeczna', x, od: yNog[0], do: yNog[1], z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }

      if (w.polkaDolna >= 1) {
        s.ustaw('polki', T(20, 60))
        for (const y of yNog) {
          s.wzdluz({ nazwa: 'Listwa nośna półki', od: xNog[0], do: xNog[1], y, z: 120, obrot: 'sztorc' })
        }
        s.tarcica(T(20, 120))
        const polka = rozkladDesek(gl - 100, 120, 6)
        for (const yLok of polka.srodki) {
          s.wzdluz({
            nazwa: 'Deska półki',
            od: xNog[0],
            do: xNog[1],
            y: 50 + yLok,
            z: 140,
            wkretow: 2,
          })
        }
      }

      s.ustaw('blat', T(grubBlatu, 120))
      const blat = rozkladDesek(gl, 120, 4)
      for (const y of blat.srodki) {
        s.wzdluz({ nazwa: 'Deska blatu', od: 0, do: dl, y, z: wys - grubBlatu / 2, wkretow: 4 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery nogi jednakowej długości. Przy tak małym meblu różnica dwóch milimetrów jest od razu wyczuwalna — stolik chodzi po podłodze przy każdym postawieniu kubka.',
      rama: 'Skręć ramę z oskrzyni na wysokości tuż pod blatem. Najpierw dwa boki na płasko, potem zepnij je poprzecznie — tak jest łatwiej niż walczyć z całą ramą naraz.',
      polki: 'Przykręć listwy nośne do nóg i połóż na nich deski półki.',
      blat: 'Deski blatu mocuj od spodu. Jeśli stolik ma stać w domu, warto podkleić pod nogami filce.',
    },
    wskazowki: [
      'Do wnętrza domu użyj sosny albo świerku bez impregnacji ciśnieniowej i wykończ olejem do drewna wewnętrznego — impregnat ogrodowy potrafi pachnieć w zamkniętym pomieszczeniu jeszcze wiele tygodni.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'stol-ogrodnika',
    nazwa: 'Stół do przesadzania roślin',
    kategoria: 'stoly',
    opis: 'Blat roboczy na wysokości pasa, z półką na doniczki i ścianką z hakami na narzędzia. Praca na stojąco zamiast w kucki.',
    trudnosc: 2,
    czas: '4–5 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'poziomica'],
    parametry: [
      par.dlugosc(1200, 800, 1800),
      par.glebokosc(600, 450, 750),
      par.wysokosc(900, 850, 1000, 'Blat na wysokości bioder — przy przesadzaniu nie schyla się pleców.'),
      par.opcja('sciankaTylna', 'Ścianka tylna z hakami', true, 'Zasłania to, co za stołem, i daje gdzie powiesić narzędzia.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const nogaB = 70
      const grubBlatu = 25
      const xNog = [nogaB / 2 + 40, dl - nogaB / 2 - 40]
      const yNog = [nogaB / 2 + 20, gl - nogaB / 2 - 20]
      const wysScianki = w.sciankaTylna >= 1 ? 500 : 0

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        s.pion({ nazwa: 'Noga przednia', x, y: yNog[0], od: 0, do: wys - grubBlatu })
        s.pion({
          nazwa: 'Noga tylna ze słupkiem ścianki',
          x,
          y: yNog[1],
          od: 0,
          do: wys - grubBlatu + wysScianki,
          uwaga: wysScianki > 0 ? 'jeden kawałek: noga i słupek ścianki tylnej' : undefined,
        })
      }

      s.ustaw('rama', T(25, 120))
      const zRamy = wys - grubBlatu - 70
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia podłużna', od: xNog[0], do: xNog[1], y, z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Oskrzynia poprzeczna', x, od: yNog[0], do: yNog[1], z: zRamy, obrot: 'sztorc', wkretow: 4 })
        s.wszerz({ nazwa: 'Poprzeczka półki', x, od: yNog[0], do: yNog[1], z: 250, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('polki', T(25, 140))
      const polka = rozkladDesek(gl - 60, 140, 8)
      for (const yLok of polka.srodki) {
        s.wzdluz({
          nazwa: 'Deska półki dolnej',
          od: xNog[0],
          do: xNog[1],
          y: 30 + yLok,
          z: 275,
          wkretow: 4,
        })
      }

      s.ustaw('blat', T(grubBlatu, 140))
      const blat = rozkladDesek(gl, 140, 5)
      for (const y of blat.srodki) {
        s.wzdluz({ nazwa: 'Deska blatu', od: 0, do: dl, y, z: wys - grubBlatu / 2, wkretow: 6 })
      }

      if (wysScianki > 0) {
        s.ustaw('sciany', T(20, 140))
        const scianka = rozkladDesek(wysScianki - 60, 140, 6)
        for (const zLok of scianka.srodki) {
          s.wzdluz({
            nazwa: 'Deska ścianki tylnej',
            od: xNog[0] - 40,
            do: xNog[1] + 40,
            y: yNog[1] + nogaB / 2 + 10,
            z: wys + 30 + zLok,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Tylne nogi zrób dłuższe — idą dalej w górę jako słupki ścianki. Ścianka doklejona osobno do gotowego blatu zawsze się kiwa.',
      rama: 'Rama pod blatem i niżej poprzeczki pod półkę. Sprawdź poziom obu poziomów osobno.',
      polki: 'Deski półki dolnej ze szczelinami — z doniczek zawsze coś się sypie i to musi mieć którędy spaść.',
      blat: 'Blat przykręć od góry, ale łby wkrętów wpuść pod powierzchnię: po tym blacie przesuwa się ciężkie doniczki.',
      sciany: 'Obszaluj ścianę tylną deskami i wkręć haki na narzędzia. Zostaw wolne pole na wysokości oczu — tam wiesza się to, czego używa się najczęściej.',
    },
    wskazowki: [
      'Jeśli zamiast części blatu wstawisz wyjmowaną skrzynkę na ziemię, przesadzanie robi się dużo czystsze — ziemia zgarnia się prosto do środka.',
      'Ten stół stoi zwykle przy ścianie i moknie tylko z jednej strony. Zaimpregnuj go równie starannie od tyłu — właśnie tam gnicie zaczyna się najczęściej, bo nikt tam nie zagląda.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'stol-barowy',
    nazwa: 'Stół barowy z podnóżkiem',
    kategoria: 'stoly',
    opis: 'Wysoki, wąski stół do stania albo na wysokie stołki. Dobry pod ścianę tarasu, gdzie na zwykły stół nie ma miejsca.',
    trudnosc: 2,
    czas: '4–5 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'poziomica'],
    parametry: [
      par.dlugosc(1600, 900, 2400),
      par.glebokosc(450, 350, 600, 'Wąski blat wystarczy na szklankę i talerz. Szerszy zaczyna wchodzić w przejście.'),
      par.wysokosc(1050, 950, 1150, 'Do stania i do wysokich stołków. Stołek barowy ma siedzisko na 75–80 cm.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const nogaB = 70
      const grubBlatu = 32
      const xNog = [200, dl - 200]
      const yNog = [nogaB / 2 + 20, gl - nogaB / 2 - 20]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys - grubBlatu, wkretow: 4 })
        }
      }

      s.ustaw('rama', T(32, 120))
      const zRamy = wys - grubBlatu - 80
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia podłużna', od: xNog[0], do: xNog[1], y, z: zRamy, obrot: 'sztorc', wkretow: 6 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Oskrzynia poprzeczna', x, od: yNog[0], do: yNog[1], z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }

      // Podnóżek na wysokości 250 mm — bez niego przy wysokim stole nie ma
      // gdzie postawić nogi i stoi się niewygodnie po kilku minutach.
      s.ustaw('stezenia', T(45, 90))
      for (const y of yNog) {
        s.wzdluz({
          nazwa: 'Podnóżek',
          od: xNog[0],
          do: xNog[1],
          y,
          z: 250,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Poprzeczka dolna', x, od: yNog[0], do: yNog[1], z: 250, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('blat', T(grubBlatu, 140))
      const blat = rozkladDesek(gl, 140, 5)
      for (const y of blat.srodki) {
        s.wzdluz({ nazwa: 'Deska blatu', od: 0, do: dl, y, z: wys - grubBlatu / 2, wkretow: 6 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery długie nogi. Przy tej wysokości stół jest wywrotny — nogi muszą być z porządnej kantówki, nie z desek.',
      rama: 'Rama pod blatem, skręcona na sztywno. Sprawdź przekątne: przy wysokim stole każdy przekos widać z drugiego końca tarasu.',
      stezenia: 'Podnóżek dookoła, nisko nad ziemią. Pełni dwie role naraz: stabilizuje nogi i daje gdzie oprzeć stopy.',
      blat: 'Deski blatu od spodu, ze szczelinami. Wąski blat nie potrzebuje legarów pośrednich.',
    },
    wskazowki: [
      'Wysoki i wąski mebel łatwo przewrócić. Jeśli stół stoi przy ścianie, przykręć go do niej dwoma kątownikami — to jedna śruba na stronę, a znika ryzyko, że ktoś się o niego oprze i pociągnie na siebie.',
    ],
  },
]
