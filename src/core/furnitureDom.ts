/**
 * Przepisy do domu oraz dla zwierząt i dzieci.
 *
 * MEBLE DO DOMU RZĄDZĄ SIĘ INNYMI PRAWAMI NIŻ OGRODOWE
 * ---------------------------------------------------
 * Nie ma tu deszczu, więc nie ma szczelin na odpływ, nie ma impregnacji
 * ciśnieniowej i nie ma sensu kupować modrzewia. Za to wszystko widać z bliska
 * i wszystkiego się dotyka — liczy się szlif, równe szczeliny i to, czy łeb
 * wkrętu jest schowany. Dlatego w tych przepisach więcej uwagi idzie na
 * wykończenie niż na konstrukcję.
 *
 * BUDKI I KARMNIKI mają własną, ostrą regułę: żadnej impregnacji od środka
 * i żadnej żerdzi pod otworem. Ptak wchodzi do wnętrza, w którym spędzi
 * kilka tygodni z pisklętami, a żerdź to podest, z którego kot albo sroka
 * sięgają do gniazda.
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

/**
 * Dobiera szerokość deski, z której składamy powierzchnię o zadanej głębokości.
 *
 * Tarcica kończy się na 200 mm szerokości i im szersza deska, tym mocniej
 * pracuje. Dzielimy więc głębokość na tyle równych pasów, żeby każdy zmieścił
 * się w tym limicie — a że dzielimy równo, wszystkie deski w meblu są
 * identyczne i tnie się je z jednego ustawienia.
 */
function szerokoscDeski(glebokosc: number): number {
  const pasow = Math.max(1, Math.ceil(glebokosc / 195))
  return Math.round(glebokosc / pasow)
}

export const PRZEPISY_DOM: PrzepisMebla[] = [
  // -------------------------------------------------------------------------
  {
    id: 'polka-scienna',
    nazwa: 'Półka ścienna na wspornikach',
    kategoria: 'dom',
    opis: 'Jedna deska i dwa trójkątne wsporniki. Najmniejszy projekt w katalogu — dobry na pierwszy raz z wkrętarką.',
    trudnosc: 1,
    czas: '1 godzina',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'wiertarka udarowa do ściany'],
    parametry: [
      par.dlugosc(800, 400, 1600, 'Powyżej 1 m wstaw trzeci wspornik pośrodku — sama deska ugnie się pod książkami.'),
      par.glebokosc(250, 150, 350, 'Głębokość półki. Książki potrzebują 22 cm, segregatory 32 cm.'),
    ],
    buduj: (w) => {
      const dl = w.dlugosc
      const gl = w.glebokosc
      const s = warsztat()
      const wspornikow = dl > 1000 ? 3 : 2
      const grubosc = 25

      s.ustaw('nogi', T(20, 70))
      for (const x of rownyRozstaw(120, dl - 120, wspornikow)) {
        s.wszerz({
          nazwa: 'Ramię wspornika',
          x,
          od: 0,
          do: gl - 20,
          z: -35,
          obrot: 'sztorc',
          wkretow: 3,
        })
        s.pion({
          nazwa: 'Pion wspornika',
          x,
          y: gl - 30,
          od: -260,
          do: -10,
          wkretow: 3,
          uwaga: 'przykręcany do ściany',
        })
        s.ukos({
          nazwa: 'Zastrzał wspornika',
          start: P(x, gl - 40, -250),
          koniec: P(x, 20, -60),
          plaszczyzna: P(1, 0, 0),
          skos: 45,
          wkretow: 2,
        })
      }

      s.ustaw('blat', T(grubosc, 140))
      const deski = rozkladDesek(gl, 140, 0)
      for (const y of deski.srodki) {
        s.wzdluz({ nazwa: 'Deska półki', od: 0, do: dl, y, z: grubosc / 2, wkretow: 4 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zrób wsporniki: pion do ściany, ramię pod półkę i zastrzał pod 45° między nimi. Zastrzał jest tu całą konstrukcją — bez niego półka opiera się wyłącznie na wkrętach wyrywanych ze ściany.',
      blat: 'Przykręć deskę do wsporników od góry, potem całość do ściany. Sprawdź poziomicą oba wsporniki naraz, przykładając ją do ramion — nie do ściany, która rzadko bywa prosta.',
    },
    wskazowki: [
      'Kołek dobierz do ściany, nie do wkrętu. W betonie trzyma niemal wszystko, w gazobetonie trzeba kołka do materiałów porowatych, a w płycie gipsowo-kartonowej — kołka motylkowego albo trafienia w profil.',
      'Półka szeroka na 25 cm z książkami to około 15 kg na metr. Nie wieszaj jej na dwóch kołkach 6 mm w gipsie.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'regal-z-desek',
    nazwa: 'Regał z desek',
    kategoria: 'dom',
    opis: 'Otwarty regał z pełnymi bokami. Prosty w budowie, a wygląda jak mebel ze sklepu, jeśli tylko starannie go wyszlifujesz.',
    trudnosc: 2,
    czas: '5–6 godzin',
    narzedzia: ['piła', 'wkrętarka', 'szlifierka', 'poziomica', 'ścisk'],
    parametry: [
      par.szerokosc(800, 500, 1100, 'Szerokość w świetle półki. Powyżej 90 cm deska 25 mm zauważalnie się ugina.'),
      par.glebokosc(300, 200, 450),
      par.wysokosc(1800, 900, 2200),
      par.wlasny('polki', 'Liczba półek', 5, 3, 7),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const polek = Math.round(w.polki)
      const bok = 25

      // Bok składamy z kilku desek zamiast brać jedną szeroką: tarcicy szerszej
      // niż 20 cm praktycznie nie ma na półce, a węższa deska mniej się paczy.
      const uklad = rozkladDesek(gl, szerokoscDeski(gl), 0)
      s.ustaw('nogi', T(bok, szerokoscDeski(gl)))
      for (const x of [bok / 2, szer + bok * 1.5]) {
        for (const y of uklad.srodki) {
          s.pion({ nazwa: 'Deska boku', x, y, od: 0, do: wys, wkretow: 8 })
        }
      }

      s.ustaw('polki', T(bok, szerokoscDeski(gl)))
      const poziomy = rownyRozstaw(120, wys - 60, polek)
      for (const z of poziomy) {
        for (const y of uklad.srodki) {
          s.wzdluz({
            nazwa: 'Deska półki',
            od: bok,
            do: szer + bok,
            y,
            z,
            obrot: 'plask',
            wkretow: 4,
            uwaga: 'wpuszczana między boki, przykręcana przez bok od zewnątrz',
          })
        }
      }

      s.ustaw('stezenia', T(20, 90))
      s.ukos({
        nazwa: 'Zastrzał tylny',
        start: P(bok, gl - 10, 150),
        koniec: P(szer + bok, gl - 10, wys - 150),
        plaszczyzna: P(0, 1, 0),
        wkretow: 6,
      })
      s.tarcica(T(20, 70))
      s.wzdluz({
        nazwa: 'Listwa cokołu',
        od: bok,
        do: szer + bok,
        y: gl - 20,
        z: 60,
        obrot: 'sztorc',
        wkretow: 4,
      })

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Przygotuj oba boki i rozmierz na nich położenie półek. Rozmierzaj oba boki naraz, leżące obok siebie — wtedy półki na pewno wyjdą poziomo, nawet jeśli miarka kłamie.',
      polki: 'Wkręcaj półki przez bok od zewnątrz. Nawierć otwory: deska wkręcana w czoło bez nawiercenia pęka wzdłuż słoja i tego się już nie naprawia.',
      stezenia: 'Listwa po przekątnej z tyłu i cokół na dole. Regał wysoki na 1,8 m bez stężenia chodzi na boki przy każdym wyjmowaniu książki.',
    },
    wskazowki: [
      'Regał wyższy niż 1,5 m przykręć do ściany jednym kątownikiem u góry. To zabezpieczenie przed przewróceniem, nie ozdoba — szczególnie jeśli w domu są dzieci.',
      'Szlifuj przed skręcaniem, nie po. Papier nie wejdzie w narożniki gotowego mebla, a właśnie tam widać każdą nierówność.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'stolik-nocny',
    nazwa: 'Stolik nocny',
    kategoria: 'dom',
    opis: 'Mała szafka przy łóżku: blat, otwarta półka i miejsce na książkę. Dwa takie robi się prawie w tym samym czasie co jeden.',
    trudnosc: 2,
    czas: '3–4 godziny',
    narzedzia: ['piła', 'wkrętarka', 'szlifierka', 'kątownik'],
    parametry: [
      par.szerokosc(420, 300, 600),
      par.glebokosc(350, 250, 450),
      par.wysokosc(550, 450, 700, 'Blat najwygodniej na wysokości materaca albo 5 cm wyżej.'),
      par.wlasny('polki', 'Liczba półek', 1, 0, 2),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const nogaB = 40
      const grubBlatu = 20
      // Blat wystaje poza nogi tylko na tyle, żeby dało się go złapać palcami.
      const xNog = [nogaB / 2 + 8, szer - nogaB / 2 - 8]
      const yNog = [nogaB / 2 + 8, gl - nogaB / 2 - 8]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys - grubBlatu, wkretow: 4 })
        }
      }

      s.ustaw('rama', T(18, 70))
      const zRamy = wys - grubBlatu - 45
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia', od: xNog[0], do: xNog[1], y, z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Oskrzynia boczna', x, od: yNog[0], do: yNog[1], z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }

      const polek = Math.round(w.polki)
      if (polek > 0) {
        s.ustaw('polki', T(18, 60))
        const poziomy = rownyRozstaw(180, zRamy - 200, polek)
        for (const z of poziomy) {
          for (const y of yNog) {
            s.wzdluz({ nazwa: 'Listwa nośna półki', od: xNog[0], do: xNog[1], y, z, obrot: 'sztorc' })
          }
          s.tarcica(T(18, 120))
          const polka = rozkladDesek(gl - nogaB - 20, 120, 3)
          for (const yLok of polka.srodki) {
            s.wzdluz({
              nazwa: 'Deska półki',
              od: xNog[0],
              do: xNog[1],
              y: nogaB / 2 + 25 + yLok,
              z: z + 39,
              wkretow: 2,
            })
          }
          s.tarcica(T(18, 60))
        }
      }

      s.ustaw('blat', T(grubBlatu, 120))
      const blat = rozkladDesek(gl, 120, 2)
      for (const y of blat.srodki) {
        s.wzdluz({ nazwa: 'Deska blatu', od: 0, do: szer, y, z: wys - grubBlatu / 2, wkretow: 4 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery krótkie nogi. Przy tak małym meblu warto je lekko zwęzić ku dołowi — stolik przestaje wtedy wyglądać jak skrzynka na nóżkach.',
      rama: 'Oskrzynia pod blatem spina nogi. Skręcaj przez nawiercone otwory: cienka listwa 18 mm pęka przy wkręcaniu na wcisk.',
      polki: 'Półka na listwach nośnych. Zostaw ją niezakręconą, jeśli chcesz móc ją wyjąć do umycia.',
      blat: 'Blat na końcu, ze szczelinami 2 mm — w meblu domowym są one ozdobą, nie odpływem, więc rozmierz je dokładnie.',
    },
    wskazowki: [
      'Zrób dwa stoliki naraz. Ustawianie ogranicznika przy pile zajmuje więcej czasu niż samo cięcie, a przy dwóch sztukach robisz to raz.',
      'Do sypialni wybierz olej albo wosk o niskiej emisji, nie lakier rozpuszczalnikowy. Ten mebel stoi 40 cm od twarzy przez osiem godzin na dobę.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'rama-lozka',
    nazwa: 'Rama łóżka',
    kategoria: 'dom',
    opis: 'Prosta rama z listwowym stelażem i wezgłowiem. Wychodzi taniej i solidniej niż gotowa, a wymiar dopasowujesz do swojego materaca.',
    trudnosc: 2,
    czas: '1 dzień',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'ścisk', 'klucz nasadowy'],
    parametry: [
      par.dlugosc(2000, 1800, 2200, 'Długość materaca. Zmierz swój — 200 cm to standard, ale bywa 190 i 210.'),
      par.szerokosc(1600, 800, 1800, 'Szerokość materaca: 90, 120, 140, 160 albo 180 cm.'),
      par.wysokosc(350, 250, 500, 'Wysokość górnej krawędzi ramy, na której leży stelaż.'),
      par.opcja('wezglowie', 'Wezgłowie', true),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const wys = w.wysokosc
      const ramaB = 32
      const ramaH = 140
      const nogaB = 70

      s.ustaw('nogi', T(nogaB, nogaB))
      const xNog = [nogaB / 2, dl - nogaB / 2]
      const yNog = [nogaB / 2, szer - nogaB / 2]
      for (const x of xNog) {
        for (const y of yNog) {
          const wezgl = w.wezglowie >= 1 && x === xNog[0]
          s.pion({
            nazwa: wezgl ? 'Noga z wezgłowiem' : 'Noga',
            x,
            y,
            od: 0,
            do: wezgl ? wys + 550 : wys,
            wkretow: 6,
          })
        }
      }
      // Przy szerokim materacu środek ramy trzeba podeprzeć, bo inaczej
      // stelaż ugina się dokładnie tam, gdzie leży najwięcej ciężaru.
      if (szer >= 1400) {
        for (const x of rownyRozstaw(xNog[0], xNog[1], 3).slice(1, -1)) {
          s.pion({ nazwa: 'Noga środkowa', x, y: szer / 2, od: 0, do: wys - ramaH / 2, wkretow: 4 })
        }
      }

      s.ustaw('rama', T(ramaB, ramaH))
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Bok ramy', od: 0, do: dl, y, z: wys - ramaH / 2, obrot: 'sztorc', wkretow: 6 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Poprzeczka ramy', x, od: 0, do: szer, z: wys - ramaH / 2, obrot: 'sztorc', wkretow: 6 })
      }
      if (szer >= 1400) {
        s.wzdluz({
          nazwa: 'Belka środkowa',
          od: 0,
          do: dl,
          y: szer / 2,
          z: wys - ramaH / 2,
          obrot: 'sztorc',
          wkretow: 6,
          uwaga: 'niesie środek stelaża — nie pomijaj jej przy materacu 140 cm i szerszym',
        })
      }

      s.ustaw('polki', T(20, 45))
      for (const y of [yNog[0], yNog[1], ...(szer >= 1400 ? [szer / 2] : [])]) {
        s.wzdluz({
          nazwa: 'Listwa oporowa stelaża',
          od: 0,
          do: dl,
          y,
          z: wys - ramaH + 30,
          obrot: 'sztorc',
          wkretow: 6,
        })
      }

      s.ustaw('dno', T(20, 70))
      const listew = ileWRozstawie(dl - 100, 80)
      for (const x of rownyRozstaw(50, dl - 50, listew)) {
        s.wszerz({
          nazwa: 'Listwa stelaża',
          x,
          od: 20,
          do: szer - 20,
          z: wys - ramaH + 50,
          obrot: 'plask',
          wkretow: 4,
        })
      }

      if (w.wezglowie >= 1) {
        s.ustaw('oparcie', T(20, 140))
        const deski = rozkladDesek(480, 140, 12)
        for (const zLok of deski.srodki) {
          s.wzdluz({
            nazwa: 'Deska wezgłowia',
            od: 0,
            do: szer,
            y: nogaB / 2 - 20,
            z: wys + 40 + zLok,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery nogi, a od strony wezgłowia dwie dłuższe — wezgłowie ma być przedłużeniem nogi, nie doklejoną płytą. Przy materacu 140 cm i szerszym dołóż nogi środkowe.',
      rama: 'Skręć prostokąt ramy i sprawdź przekątne. Materac wsuwa się w tę ramę na luz 5–10 mm z każdej strony; zmierzony materac bywa o centymetr większy niż na metce.',
      polki: 'Przykręć listwy oporowe po wewnętrznej stronie ramy. To na nich położy się stelaż — wysokość dobierz tak, żeby materac wystawał ponad ramę o co najmniej 5 cm.',
      dno: 'Rozłóż listwy stelaża w rozstawie nie większym niż 8 cm w świetle. Rzadszy stelaż niszczy materac piankowy i nie podpiera kręgosłupa równomiernie.',
      oparcie: 'Deski wezgłowia przykręć do wystających nóg. Górną krawędź górnej deski złam papierem — o tę krawędź opierają się plecy przy czytaniu.',
    },
    laczniki: () => [
      { nazwa: 'Śruba z łbem walcowym M8 do skręcenia ramy', sztuk: 8, jednostka: 'szt.', uwaga: 'łóżko powinno dać się rozkręcić przy przeprowadzce' },
      { nazwa: 'Kątownik meblowy', sztuk: 4, jednostka: 'szt.' },
    ],
    wskazowki: [
      'Zmierz drzwi i klatkę schodową, zanim skręcisz ramę na stałe. Rama 160 × 200 cm nie przejdzie przez większość drzwi w całości — dlatego łączenia rób na śruby, nie na wkręty.',
      'Nie kładź materaca na pełnej płycie. Stelaż z prześwitami odprowadza wilgoć, której człowiek oddaje w nocy blisko pół litra; materac na płycie pleśnieje od spodu.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'karmnik',
    nazwa: 'Karmnik dla ptaków',
    kategoria: 'zwierzeta',
    opis: 'Daszek na czterech słupkach nad podestem z burtami. Klasyczny karmnik, który da się zrobić z jednej deski i resztek.',
    trudnosc: 1,
    czas: '2 godziny',
    narzedzia: ['piła', 'wkrętarka', 'papier ścierny'],
    parametry: [
      par.szerokosc(320, 220, 500),
      par.glebokosc(260, 200, 400),
      par.wysokosc(300, 200, 400, 'Wysokość od podestu do kalenicy daszku.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const gl = w.glebokosc
      const wysDaszku = w.wysokosc
      const okap = 60

      s.ustaw('dno', T(18, 120))
      const podest = rozkladDesek(gl, 120, 4)
      for (const y of podest.srodki) {
        s.wzdluz({ nazwa: 'Deska podestu', od: 0, do: szer, y, z: 9, wkretow: 3 })
      }
      s.tarcica(T(15, 30))
      // Burta zatrzymuje ziarno, ale szczelina pod nią pozwala wymieść resztki
      // i spuścić wodę — karmnik bez tego zamienia się w miskę z pleśnią.
      for (const y of [10, gl - 10]) {
        s.wzdluz({ nazwa: 'Burta podłużna', od: 0, do: szer, y, z: 33, obrot: 'sztorc', wkretow: 3 })
      }
      for (const x of [10, szer - 10]) {
        s.wszerz({ nazwa: 'Burta poprzeczna', x, od: 15, do: gl - 15, z: 33, obrot: 'sztorc', wkretow: 3 })
      }

      s.ustaw('nogi', T(25, 25))
      for (const x of [25, szer - 25]) {
        for (const y of [22, gl - 22]) {
          s.pion({ nazwa: 'Słupek', x, y, od: 18, do: wysDaszku - 80, wkretow: 3 })
        }
      }

      s.ustaw('daszek', T(15, 100))
      for (const k of [-1, 1]) {
        s.polac({
          nazwa: 'Deska połaci daszku',
          od: -okap,
          do: szer + okap,
          odY: gl / 2 + k * (gl / 2 + okap),
          odZ: wysDaszku - 120,
          doY: gl / 2,
          doZ: wysDaszku,
          wkretow: 3,
        })
      }
      // Listwa nakrywa styk połaci od góry. Postawiona na sztorc sterczałaby
      // nad kalenicą jak grzebień i zbierała wodę zamiast ją odprowadzać.
      s.tarcica(T(15, 60))
      s.wzdluz({
        nazwa: 'Listwa kalenicowa',
        od: -okap,
        do: szer + okap,
        y: gl / 2,
        z: wysDaszku + 15,
        obrot: 'plask',
        wkretow: 3,
        uwaga: 'przykrywa styk obu połaci',
      })

      return s.zbior()
    },
    opisyEtapow: {
      dno: 'Zbij podest i przykręć burty tak, żeby została pod nimi szczelina 5 mm. Ziarno zostaje w środku, a woda i łuski wychodzą — bez tej szczeliny karmnik po pierwszym deszczu zapleśnieje.',
      nogi: 'Cztery słupki w narożnikach. Zostaw boki całkowicie otwarte: ptak musi widzieć, co się dzieje wokół, i mieć którędy uciec.',
      daszek: 'Dwie połacie i listwa na kalenicy. Daj daszkowi wyraźny okap ze wszystkich stron — chroni ziarno przed zacinającym deszczem i przed śniegiem.',
    },
    wskazowki: [
      'Nie impregnuj karmnika od środka i nie maluj podestu. Ptaki dziobią wszystko, po czym chodzą.',
      'Karmnik trzeba czyścić co kilka tygodni — dlatego daszek warto przykręcić tak, żeby dało się go zdjąć. Zapleśniałe ziarno zabija ptaki skuteczniej niż mróz.',
      'Powieś go 1,5 m nad ziemią i co najmniej 2 m od gałęzi i parapetu, z których kot może skoczyć.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'budka-legowa',
    nazwa: 'Budka lęgowa',
    kategoria: 'zwierzeta',
    opis: 'Skrzynka lęgowa dla sikorek, wróbli albo szpaka — o gatunku decyduje wyłącznie średnica otworu wlotowego.',
    trudnosc: 1,
    czas: '2 godziny',
    narzedzia: ['piła', 'wkrętarka', 'otwornica', 'papier ścierny'],
    parametry: [
      par.wlasny('otwor', 'Średnica otworu', 32, 26, 50, {
        krok: 1,
        jednostka: 'mm',
        podpowiedz: '28 mm — modraszka, 32 mm — bogatka i mazurek, 34 mm — wróbel, 45 mm — szpak. Większy otwór wpuszcza większego ptaka, który wyprze mniejszego.',
      }),
      par.wlasny('bok', 'Bok wnętrza', 140, 110, 180, {
        krok: 5,
        jednostka: 'mm',
        podpowiedz: 'Dno budki dla sikory to około 12 × 12 cm, dla szpaka 16 × 16 cm.',
      }),
      par.wysokosc(280, 220, 400, 'Wysokość przedniej ściany. Od otworu do dna musi zostać co najmniej 17 cm, żeby kot nie sięgnął łapą do gniazda.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const bok = w.bok
      const g = 22
      // Ściany z grubej deski: cienka sklejka nagrzewa się latem jak piekarnik
      // i przemarza wiosną, a dwa centymetry drewna trzymają temperaturę wnętrza.
      const zewn = bok + 2 * g
      const wysPrzod = w.wysokosc
      const wysTyl = wysPrzod + 45
      const okap = 60

      // Boki są zewnętrzne, przednia i tylna wchodzą między nie — dzięki temu
      // deszcz spływa po boku, a nie po styku dwóch czół.
      const bokiUklad = rozkladDesek(zewn, szerokoscDeski(zewn), 0)
      s.ustaw('sciany', T(g, szerokoscDeski(zewn)))
      for (const x of [g / 2, bok + 1.5 * g]) {
        for (const y of bokiUklad.srodki) {
          s.pion({
            nazwa: 'Ściana boczna',
            x,
            y,
            od: 0,
            do: (wysPrzod + wysTyl) / 2,
            wkretow: 4,
            uwaga: 'górną krawędź zetnij skośnie, od wysokości przedniej do tylnej',
          })
        }
      }

      s.tarcica(T(g, bok))
      s.ukos({
        nazwa: 'Ściana przednia z otworem',
        start: P(zewn / 2, g / 2, 0),
        koniec: P(zewn / 2, g / 2, wysPrzod),
        gora: P(1, 0, 0),
        wkretow: 4,
        uwaga: `otwór wlotowy ${Math.round(w.otwor)} mm, tuż pod daszkiem`,
      })
      s.ukos({
        nazwa: 'Ściana tylna',
        start: P(zewn / 2, bok + 1.5 * g, 0),
        koniec: P(zewn / 2, bok + 1.5 * g, wysTyl),
        gora: P(1, 0, 0),
        wkretow: 4,
        uwaga: 'wyższa od przedniej — to ona daje daszkowi spadek',
      })

      s.ustaw('dno', T(g, bok))
      s.wzdluz({
        nazwa: 'Dno',
        od: g,
        do: bok + g,
        y: zewn / 2,
        z: g / 2,
        obrot: 'plask',
        wkretow: 4,
        uwaga: 'wpuszczone między ściany, z otworami odpływowymi w narożnikach',
      })

      // Daszek z dwóch desek — jedna o szerokości 30 cm nie istnieje w składzie.
      s.ustaw('daszek', T(g, 0))
      const szerDaszku = zewn + 2 * okap
      const deski = rozkladDesek(szerDaszku, szerokoscDeski(szerDaszku), 0)
      const dlPolaci = Math.hypot(zewn + okap, 45)
      for (const xLok of deski.srodki) {
        s.tarcica(T(g, deski.srodki.length > 1 ? szerokoscDeski(szerDaszku) : szerDaszku))
        s.ukos({
          nazwa: 'Deska daszku',
          start: P(-okap + xLok, -okap, wysTyl + g),
          koniec: P(-okap + xLok, zewn, wysTyl - 45 + g),
          gora: P(1, 0, 0),
          wkretow: 2,
          uwaga: `długość połaci ${Math.round(dlPolaci)} mm; daszek zdejmowany — budkę trzeba czyścić raz w roku`,
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      sciany: 'Zetnij ściany boczne skośnie u góry — to one nadają daszkowi spadek. Otwór wlotowy wywierć otwornicą wysoko, tuż pod daszkiem: pisklęta mają wtedy nad sobą osłonę, a przed sobą ścianę nie do pokonania dla kota.',
      dno: 'Dno wpuść MIĘDZY ściany, nie przybijaj go od spodu. W narożnikach zrób cztery małe otwory odpływowe — deszcz zawsze w końcu dostanie się do środka.',
      daszek: 'Daszek zamocuj tak, żeby dawał się zdjąć: na dwóch wkrętach albo na zawiasie z haczykiem. Raz w roku, po sezonie lęgowym, budkę trzeba wyczyścić ze starego gniazda.',
    },
    wskazowki: [
      'Żadnej żerdzi pod otworem. To wygodny podest dla sroki, wrony i kota — a ptak, dla którego budka jest przeznaczona, wlatuje do niej wprost i nie potrzebuje niczego, na czym miałby usiąść.',
      'Nie maluj i nie impregnuj budki od środka. Z zewnątrz wystarczy olej lniany albo nic; surowa deska jest lepsza niż lakier.',
      'Wieszaj z otworem na wschód albo południowy wschód, lekko pochyloną do przodu, na wysokości 2–4 m. Pochylenie sprawia, że deszcz nie zacina do otworu.',
      'Wewnętrznej strony przedniej ściany NIE szlifuj. Chropowate drewno jest drabinką, po której młode wychodzą na zewnątrz.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'buda-dla-psa',
    nazwa: 'Buda dla psa',
    kategoria: 'zwierzeta',
    opis: 'Ocieplana buda z podniesioną podłogą i zdejmowanym daszkiem. Wymiary dobierasz do psa, nie do miejsca w ogrodzie.',
    trudnosc: 3,
    wilgoc: 'grunt',
    czas: '1–2 dni',
    narzedzia: ['piła', 'wkrętarka', 'wyrzynarka', 'zszywacz', 'poziomica'],
    parametry: [
      par.dlugosc(900, 600, 1400, 'Długość wnętrza: długość psa od nosa do nasady ogona plus jedna trzecia.'),
      par.szerokosc(650, 450, 1000, 'Szerokość wnętrza — pies musi móc obrócić się w miejscu.'),
      par.wysokosc(700, 500, 1000, 'Wysokość ściany bocznej. Wejście powinno sięgać psu do wysokości kłębu.'),
      par.wlasny('wejscie', 'Szerokość wejścia', 300, 200, 500, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Wejście większe niż potrzeba wywiewa ciepło. Ma być takie, żeby pies wchodził bez schylania boków.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const wys = w.wysokosc
      const slupekB = 45
      const wysKalenicy = 260

      // Podłoga na legarach: buda stojąca wprost na ziemi jest zimna i wilgotna.
      s.ustaw('nogi', T(45, 70))
      for (const y of [50, szer - 50]) {
        s.wzdluz({ nazwa: 'Legar podłogi', od: 0, do: dl, y, z: 35, obrot: 'sztorc', wkretow: 4 })
      }
      const legarow = ileWRozstawie(dl, 500)
      for (const x of rownyRozstaw(50, dl - 50, legarow).slice(1, -1)) {
        s.wszerz({ nazwa: 'Legar poprzeczny', x, od: 0, do: szer, z: 35, obrot: 'sztorc', wkretow: 4 })
      }
      s.ustaw('dno', T(22, 140))
      const podloga = rozkladDesek(szer, 140, 0)
      for (const y of podloga.srodki) {
        s.wzdluz({ nazwa: 'Deska podłogi', od: 0, do: dl, y, z: 81, wkretow: 4 })
      }

      const z0 = 92
      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of [slupekB / 2, dl - slupekB / 2]) {
        for (const y of [slupekB / 2, szer - slupekB / 2]) {
          s.pion({ nazwa: 'Słupek narożny', x, y, od: z0, do: z0 + wys, wkretow: 4 })
        }
      }
      s.pion({ nazwa: 'Słupek przy wejściu', x: dl / 2 - w.wejscie / 2 - slupekB, y: slupekB / 2, od: z0, do: z0 + wys, wkretow: 4 })
      s.pion({ nazwa: 'Słupek przy wejściu', x: dl / 2 + w.wejscie / 2 + slupekB, y: slupekB / 2, od: z0, do: z0 + wys, wkretow: 4 })

      s.ustaw('sciany', T(20, 140))
      const rzedy = rozkladDesek(wys, 140, 0)
      for (const zLok of rzedy.srodki) {
        const z = z0 + zLok
        s.wzdluz({ nazwa: 'Deska ściany tylnej', od: 0, do: dl, y: szer - 5, z, obrot: 'sztorc', wkretow: 4 })
        for (const x of [10, dl - 10]) {
          s.wszerz({ nazwa: 'Deska ściany bocznej', x, od: 0, do: szer, z, obrot: 'sztorc', wkretow: 4 })
        }
        // Ściana frontowa tylko po bokach wejścia.
        for (const [od, do_] of [
          [0, dl / 2 - w.wejscie / 2],
          [dl / 2 + w.wejscie / 2, dl],
        ]) {
          s.wzdluz({ nazwa: 'Deska ściany frontowej', od, do: do_, y: 5, z, obrot: 'sztorc', wkretow: 4 })
        }
      }

      // Daszek dwuspadowy, zdejmowany — inaczej budy nie da się wysprzątać.
      s.ustaw('daszek', T(32, 90))
      const szczyty = [50, dl / 2, dl - 50]
      for (const x of szczyty) {
        for (const k of [-1, 1]) {
          s.ukos({
            nazwa: 'Krokiewka daszku',
            start: P(x, k < 0 ? -70 : szer + 70, z0 + wys),
            koniec: P(x, szer / 2, z0 + wys + wysKalenicy),
            plaszczyzna: P(0, 0, 1),
            wkretow: 3,
          })
        }
      }
      s.tarcica(T(20, 140))
      for (const k of [-1, 1]) {
        s.polac({
          nazwa: 'Deska połaci',
          od: -60,
          do: dl + 60,
          odY: szer / 2 + k * (szer / 2 + 70),
          odZ: z0 + wys + 20,
          doY: szer / 2,
          doZ: z0 + wys + wysKalenicy + 20,
          wkretow: 4,
        })
      }
      s.tarcica(T(20, 120))
      s.wzdluz({
        nazwa: 'Gąsior kalenicy',
        od: -60,
        do: dl + 60,
        y: szer / 2,
        z: z0 + wys + wysKalenicy + 30,
        obrot: 'plask',
        wkretow: 4,
        uwaga: 'nakrywa styk obu połaci',
      })

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zacznij od podłogi na legarach — buda musi stać kilka centymetrów nad ziemią. To ta przerwa, a nie grubość ścian, decyduje o tym, czy w środku jest sucho.',
      dno: 'Deski podłogi zbij na styk, bez szczelin. To jedyne miejsce w tym meblu, gdzie szczeliny są niepożądane: pies leży wprost na tej podłodze.',
      sciany: 'Postaw słupki i obszaluj trzy ściany oraz front po bokach wejścia. Wejście umieść z boku ściany frontowej, nie na środku — pies może wtedy położyć się w kącie osłoniętym od wiatru.',
      daszek: 'Daszek zrób tak, żeby dawał się zdjąć w całości: kładziony na ściany i ustalany listwami od spodu. Bez tego wysprzątanie budy i wymiana posłania jest walką przez wejście.',
    },
    laczniki: () => [
      { nazwa: 'Wełna mineralna albo styropian do ocieplenia ścian', sztuk: 3, jednostka: 'm²', uwaga: 'między szalunek zewnętrzny a wewnętrzny' },
      { nazwa: 'Papa albo gont bitumiczny na daszek', sztuk: 2, jednostka: 'm²' },
      { nazwa: 'Kurtyna na wejście (mata gumowa albo plandeka)', sztuk: 1, jednostka: 'szt.' },
    ],
    wskazowki: [
      'Buda dopasowana do psa, nie do wyobrażenia o psie. Za duża jest zimna — pies ogrzewa ją własnym ciałem i w nadmiarze przestrzeni po prostu marznie.',
      'Ustaw wejście od strony zawietrznej, najczęściej na wschód albo południe. Buda z wejściem od zachodu dostaje wiatr i deszcz prosto do środka.',
      'Jeśli ocieplasz ściany, zrób szalunek dwustronny i wełnę schowaj w środku. Wełna dostępna dla psa zostanie wygryziona w pierwszym tygodniu.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'stolik-dzieciecy',
    nazwa: 'Stolik dziecięcy z ławeczkami',
    kategoria: 'zwierzeta',
    opis: 'Mały stolik i dwie ławeczki do rysowania i zabawy, na taras albo do pokoju. Wymiary z myślą o dziecku w wieku 3–7 lat.',
    trudnosc: 1,
    wilgoc: 'wnetrze',
    czas: '4–5 godzin',
    narzedzia: ['piła', 'wkrętarka', 'szlifierka', 'kątownik'],
    parametry: [
      par.dlugosc(800, 600, 1200),
      par.glebokosc(600, 450, 800),
      par.wysokosc(500, 400, 600, 'Wysokość blatu. Dla trzylatka 45 cm, dla siedmiolatka 55 cm.'),
      par.wlasny('siedzisko', 'Wysokość siedziska', 280, 220, 350, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Różnica między blatem a siedziskiem powinna wynieść około 22 cm.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const zSiedziska = w.siedzisko
      const nogaB = 45
      const grubBlatu = 20
      const xNog = [nogaB / 2 + 40, dl - nogaB / 2 - 40]
      const yNog = [nogaB / 2 + 40, gl - nogaB / 2 - 40]

      s.ustaw('nogi', T(nogaB, nogaB))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga stolika', x, y, od: 0, do: wys - grubBlatu, wkretow: 4 })
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

      s.ustaw('blat', T(grubBlatu, 140))
      const blat = rozkladDesek(gl, 140, 3)
      for (const y of blat.srodki) {
        s.wzdluz({ nazwa: 'Deska blatu', od: 0, do: dl, y, z: wys - grubBlatu / 2, wkretow: 4 })
      }

      // Dwie ławeczki po bokach stolika, stojące osobno.
      const szerLawki = 240
      s.ustaw('siedzisko', T(20, 120))
      for (const k of [-1, 1]) {
        const yLawki = k < 0 ? -260 : gl + 260
        s.ustaw('nogi', T(nogaB, nogaB))
        for (const x of [140, dl - 140]) {
          for (const dy of [-szerLawki / 2 + 40, szerLawki / 2 - 40]) {
            s.pion({
              nazwa: 'Noga ławeczki',
              x,
              y: yLawki + dy,
              od: 0,
              do: zSiedziska - 20,
              wkretow: 4,
            })
          }
        }
        s.ustaw('rama', T(20, 70))
        for (const dy of [-szerLawki / 2 + 40, szerLawki / 2 - 40]) {
          s.wzdluz({
            nazwa: 'Oskrzynia ławeczki',
            od: 140,
            do: dl - 140,
            y: yLawki + dy,
            z: zSiedziska - 60,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
        for (const x of [140, dl - 140]) {
          s.wszerz({
            nazwa: 'Poprzeczka ławeczki',
            x,
            od: yLawki - szerLawki / 2 + 40,
            do: yLawki + szerLawki / 2 - 40,
            z: zSiedziska - 60,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
        s.ustaw('siedzisko', T(20, 120))
        const siedzisko = rozkladDesek(szerLawki, 120, 4)
        for (const yLok of siedzisko.srodki) {
          s.wzdluz({
            nazwa: 'Deska siedziska ławeczki',
            od: 0,
            do: dl,
            y: yLawki - szerLawki / 2 + yLok,
            z: zSiedziska - 10,
            wkretow: 4,
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Nogi stolika i ławeczek. Zetnij je wszystkie w dwóch seriach, z dwóch ustawień ogranicznika — wtedy na pewno nic się nie kiwa.',
      rama: 'Oskrzynie pod blatem i pod siedziskami. Przy meblu dziecięcym rama jest ważniejsza niż przy dorosłym: to na nim będzie się stawało, skakało i huśtało.',
      blat: 'Blat i siedziska ze szczelinami 3 mm, jeśli mebel stoi na dworze. Do pokoju zbij deski na styk — kredka wpadająca w szczelinę potrafi zepsuć całą zabawę.',
      siedzisko: 'Ławeczki zrób jako osobne meble, nie doklejaj ich do stolika. Dziecko przesuwa je, przewraca, buduje z nich tunel — i tak ma być.',
    },
    wskazowki: [
      'Zaokrąglij WSZYSTKIE narożniki i krawędzie, nie tylko te na wierzchu. Ten mebel jest dokładnie na wysokości głowy biegającego trzylatka.',
      'Nie używaj drewna impregnowanego ciśnieniowo do mebla, który stoi w pokoju i po którym dziecko jeździ palcami. Sosna albo świerk plus olej z atestem do zabawek.',
      'Zrób mebel z zapasem na wyrost, ale nie za dużym: stolik za wysoki o 5 cm zmusza dziecko do podnoszenia ramion i po pół godzinie rysowanie przestaje być przyjemne.',
    ],
  },
]
