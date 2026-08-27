/**
 * Przepisy na siedziska: ławki, fotel, leżak, huśtawka, sofa z palet.
 *
 * WYSOKOŚCI SĄ TU NIE DO RUSZENIA BEZ POWODU
 * ------------------------------------------
 * Siedzisko na wysokości 44–46 cm i głębokość 42–45 cm to nie są liczby
 * z katalogu, tylko z ludzkiego ciała: przy tej wysokości stopa staje płasko
 * na ziemi, a udo nie jest uciskane pod kolanem. Mebel wyższy o pięć
 * centymetrów siedzi się jak na barowym stołku, niższy — jak na progu.
 * Dlatego zakresy parametrów są wąskie: nie po to, żeby ograniczać, tylko
 * żeby nie zrobić ławki, której nikt nie chce używać.
 *
 * ODCHYLENIE OPARCIA robimy pochyleniem tylnych nóg, a nie doklejaniem
 * ukośnych klocków. Wtedy oparcie i noga to jeden kawałek drewna, a całe
 * odchylenie nie zależy od jednego złącza, które z czasem się rozluźnia.
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

/** Deska siedziska: dwudziestka o szerokości 90 mm — dobrze schnie i nie paczy się jak szersza. */
const DESKA_SIEDZISKA = T(20, 90)
/** Kantówka na nogi ławki. */
const NOGA_LAWKI = T(45, 70)

export const PRZEPISY_SIEDZISKA: PrzepisMebla[] = [
  // -------------------------------------------------------------------------
  {
    id: 'lawka-z-oparciem',
    nazwa: 'Ławka ogrodowa z oparciem',
    kategoria: 'siedziska',
    opis: 'Klasyczna ławka na dwie albo trzy osoby. Najczęściej robiony mebel ogrodowy i dobry pierwszy projekt.',
    trudnosc: 1,
    czas: '3–4 godziny',
    narzedzia: ['piła (ręczna wystarczy)', 'wkrętarka', 'kątownik', 'papier ścierny'],
    parametry: [
      par.dlugosc(1500, 900, 2400, 'Na dwie osoby wystarczy 1,2 m, na trzy licz 1,8 m.'),
      par.glebokosc(440, 380, 520, 'Głębokość siedziska. Powyżej 50 cm trzeba się garbić, żeby oprzeć plecy.'),
      par.wysokosc(450, 400, 500, 'Wysokość siedziska od ziemi. 45 cm to wysokość zwykłego krzesła.'),
      par.wlasny('oparcie', 'Wysokość oparcia', 400, 250, 550, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Liczona od siedziska w górę. 40 cm podpiera plecy, 55 cm sięga łopatek.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const grubosc = DESKA_SIEDZISKA.b
      // Nogi stoją wsunięte do środka, żeby ławka nie wywracała się o własne
      // narożniki i żeby deski siedziska nieco wystawały poza obrys.
      const wcieciX = 90
      const xNog = [wcieciX, dl - wcieciX]
      const yPrzod = 60
      const yTyl = gl - 45

      s.ustaw('nogi', NOGA_LAWKI)
      for (const x of xNog) {
        s.pion({ nazwa: 'Noga przednia', x, y: yPrzod, od: 0, do: wys - grubosc })
        s.pion({
          nazwa: 'Noga tylna z oparciem',
          x,
          y: yTyl,
          od: 0,
          do: wys + w.oparcie,
          uwaga: 'jeden kawałek: noga i słupek oparcia',
        })
      }

      // Rama pod siedziskiem: dwie oskrzynie wzdłuż i dwie w poprzek.
      s.ustaw('rama', T(20, 120))
      const zRamy = wys - grubosc - 60
      for (const x of xNog) {
        s.wszerz({
          nazwa: 'Poprzeczka boczna',
          x,
          od: yPrzod,
          do: yTyl,
          z: zRamy,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }
      for (const y of [yPrzod, yTyl]) {
        s.wzdluz({
          nazwa: 'Oskrzynia podłużna',
          od: xNog[0],
          do: xNog[1],
          y,
          z: zRamy,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }

      s.ustaw('siedzisko', DESKA_SIEDZISKA)
      const siedzisko = rozkladDesek(gl, DESKA_SIEDZISKA.h, 8)
      for (const y of siedzisko.srodki) {
        s.wzdluz({
          nazwa: 'Deska siedziska',
          od: 0,
          do: dl,
          y,
          z: wys - grubosc / 2,
          wkretow: 4,
        })
      }

      s.ustaw('oparcie', T(20, 120))
      const listwy = w.oparcie >= 420 ? 3 : 2
      for (const z of rownyRozstaw(wys + 90, wys + w.oparcie - 60, listwy)) {
        s.wzdluz({
          nazwa: 'Deska oparcia',
          od: 0,
          do: dl,
          y: yTyl + NOGA_LAWKI.b / 2 + 10,
          z,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Dotnij cztery nogi: dwie krótkie przednie i dwie długie tylne, które idą dalej w górę jako słupki oparcia. To ten jeden kawałek decyduje o sztywności ławki — nie dziel go na dwa.',
      rama: 'Zbierz nogi ramą: najpierw bok — noga przednia, tylna i poprzeczka między nimi — a potem oba boki spinasz oskrzyniami wzdłuż. Sprawdź przekątne, zanim dokręcisz na mocno.',
      siedzisko: 'Ułóż deski siedziska ze szczelinami i przykręć je do oskrzyni. Pierwszą wyrównaj z przednią krawędzią; ewentualną różnicę zostaw na tyle, gdzie jej nie widać.',
      oparcie: 'Przykręć deski oparcia od tyłu słupków. Górna krawędź górnej deski powinna wypaść równo z końcem słupka — inaczej sterczące kikuty od razu rzucają się w oczy.',
    },
    wskazowki: [
      'Złam papierem wszystkie krawędzie, których dotyka noga i dłoń: przednia krawędź siedziska i górna oparcia. To pięć minut roboty i różnica między ławką ładną a ładną i wygodną.',
      'Łby wkrętów wpuść 2 mm pod powierzchnię i zaszpachluj albo zakryj kołkiem. Wystający łeb nagrzewa się na słońcu i potrafi zniszczyć spodnie.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'lawka-prosta',
    nazwa: 'Ławka prosta bez oparcia',
    kategoria: 'siedziska',
    opis: 'Ławka do stołu biesiadnego albo pod ścianę. Najprostszy mebel w katalogu — da się zrobić w jedno popołudnie.',
    trudnosc: 1,
    czas: '1,5–2 godziny',
    narzedzia: ['piła', 'wkrętarka', 'kątownik'],
    parametry: [
      par.dlugosc(1600, 800, 2400, 'Do stołu biesiadnego dobierz tak, żeby ławka mieściła się między nogami stołu.'),
      par.glebokosc(300, 240, 400, 'Szerokość siedziska. 30 cm wystarczy do posiłku, 40 cm do dłuższego siedzenia.'),
      par.wysokosc(450, 400, 480, 'Przy stole 75 cm wysokie na 45 cm siedzisko daje wygodny odstęp.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const grubosc = 32
      const xNog = [120, dl - 120]

      // Bok ławki to deska ustawiona na sztorc, wsparta stopą u dołu
      // i poprzeczką pod siedziskiem. Deska szeroka na całą głębokość ławki
      // byłaby wygodniejsza, ale tarcicy szerszej niż 20 cm po prostu nie ma
      // na półce — a sklejanie jej z dwóch to już inna robota.
      s.ustaw('nogi', T(32, 140))
      for (const x of xNog) {
        s.pion({
          nazwa: 'Noga — deska boczna',
          x,
          y: gl / 2,
          od: 32,
          do: wys - grubosc,
          wkretow: 4,
        })
        s.wszerz({
          nazwa: 'Stopa',
          x,
          od: 0,
          do: gl,
          z: 16,
          obrot: 'plask',
          wkretow: 4,
          uwaga: 'szeroka podstawa — bez niej ławka kiwa się w poprzek',
        })
        s.wszerz({
          nazwa: 'Poprzeczka pod siedziskiem',
          x,
          od: 0,
          do: gl,
          z: wys - grubosc - 16,
          obrot: 'plask',
          wkretow: 4,
        })
      }

      s.ustaw('rama', T(32, 90))
      s.wzdluz({
        nazwa: 'Oskrzynia podłużna',
        od: xNog[0],
        do: xNog[1],
        y: gl / 2,
        z: wys - grubosc - 45,
        obrot: 'sztorc',
        wkretow: 4,
      })

      s.ustaw('siedzisko', T(grubosc, 140))
      const siedzisko = rozkladDesek(gl, 140, 6)
      for (const y of siedzisko.srodki) {
        s.wzdluz({ nazwa: 'Deska siedziska', od: 0, do: dl, y, z: wys - grubosc / 2, wkretow: 4 })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Bok ławki to deska na sztorc, stopa pod nią i poprzeczka pod siedziskiem — razem tworzą literę I. Stopa jest tu najważniejsza: ławka bez niej stoi na krawędzi deski szerokiej na trzy centymetry i kiwa się w poprzek.',
      rama: 'Zepnij obie nogi jedną oskrzynią pod siedziskiem. Bez niej ławka rozjeżdża się na boki przy pierwszym mocniejszym siadnięciu.',
      siedzisko: 'Przykręć deski siedziska do nóg i do oskrzyni, po dwa wkręty w każde skrzyżowanie.',
    },
    wskazowki: [
      'Jeśli ławka ma stać na trawie, przybij pod nogami płaskie kawałki deski — noga o powierzchni 3 × 30 cm nie wcina się w grunt tak jak wąska kantówka.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'lawka-skrzynia',
    nazwa: 'Ławo-skrzynia',
    kategoria: 'siedziska',
    opis: 'Ławka z pojemnikiem pod siedziskiem — na poduszki, zabawki albo narzędzia. Siedzisko podnosi się na zawiasach.',
    trudnosc: 2,
    czas: '5–6 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'wiertło do zawiasów'],
    parametry: [
      par.dlugosc(1200, 800, 1800),
      par.glebokosc(450, 350, 600),
      par.wysokosc(450, 400, 520, 'Wysokość całkowita razem z pokrywą.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const nogaB = 45
      const pokrywa = 20
      const wysSkrzyni = wys - pokrywa

      s.ustaw('nogi', T(nogaB, nogaB))
      const xNog = [nogaB / 2, dl - nogaB / 2]
      const yNog = [nogaB / 2, gl - nogaB / 2]
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Słupek narożny', x, y, od: 0, do: wysSkrzyni })
        }
      }

      // Rama górna trzyma skrzynię w kącie prostym i jest oparciem dla pokrywy.
      s.ustaw('rama', T(20, 90))
      const zRamy = wysSkrzyni - 45
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Oskrzynia górna', od: xNog[0], do: xNog[1], y, z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }
      for (const x of xNog) {
        s.wszerz({ nazwa: 'Oskrzynia boczna', x, od: yNog[0], do: yNog[1], z: zRamy, obrot: 'sztorc', wkretow: 4 })
      }

      // Dno leży na listwach przybitych nisko do słupków.
      s.ustaw('dno', T(20, 40))
      for (const y of yNog) {
        s.wzdluz({ nazwa: 'Listwa nośna dna', od: xNog[0], do: xNog[1], y, z: 90, obrot: 'sztorc' })
      }
      s.tarcica(T(20, 120))
      const dno = rozkladDesek(gl - nogaB, 120, 6)
      for (const y of dno.srodki) {
        s.wzdluz({
          nazwa: 'Deska dna',
          od: xNog[0],
          do: xNog[1],
          y: nogaB / 2 + y,
          z: 110,
          wkretow: 2,
        })
      }

      // Ściany: deski poziome na sztorc, od dołu do oskrzyni.
      s.ustaw('sciany', T(20, 140))
      const wysSciany = zRamy - 45 - 70
      const rzedy = rozkladDesek(wysSciany, 140, 4)
      for (const zSrodek of rzedy.srodki) {
        const z = 70 + zSrodek
        s.wzdluz({ nazwa: 'Deska ściany dłuższej', od: xNog[0], do: xNog[1], y: yNog[0], z, obrot: 'sztorc' })
        s.wzdluz({ nazwa: 'Deska ściany dłuższej', od: xNog[0], do: xNog[1], y: yNog[1], z, obrot: 'sztorc' })
        s.wszerz({ nazwa: 'Deska ściany krótszej', x: xNog[0], od: yNog[0], do: yNog[1], z, obrot: 'sztorc' })
        s.wszerz({ nazwa: 'Deska ściany krótszej', x: xNog[1], od: yNog[0], do: yNog[1], z, obrot: 'sztorc' })
      }

      s.ustaw('siedzisko', T(pokrywa, 140))
      const wieko = rozkladDesek(gl, 140, 3)
      for (const y of wieko.srodki) {
        s.wzdluz({ nazwa: 'Deska pokrywy', od: 0, do: dl, y, z: wys - pokrywa / 2, wkretow: 0 })
      }
      s.tarcica(T(20, 60))
      for (const x of [dl * 0.25, dl * 0.75]) {
        s.wszerz({
          nazwa: 'Listwa spinająca pokrywę',
          x,
          od: 40,
          do: gl - 40,
          z: wys - pokrywa - 10,
          obrot: 'plask',
          wkretow: 6,
          uwaga: 'od spodu pokrywy; nie sięga oskrzyni, żeby wieko się domykało',
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zacznij od czterech słupków narożnych. To one wyznaczają obrys skrzyni — sprawdź, czy wszystkie mają dokładnie tę samą długość.',
      rama: 'Zwiąż słupki oskrzyniami pod górną krawędzią. Ta rama jest jednocześnie oparciem, na którym siądzie pokrywa.',
      dno: 'Przykręć nisko listwy nośne, a na nich ułóż deski dna ze szczelinami. Dno z prześwitami przewietrza wnętrze — poduszki schowane na noc nie zapleśnieją.',
      sciany: 'Obszaluj skrzynię deskami, zaczynając od dołu. Pierwszą deskę ustaw poziomicą, resztę dosuwaj do niej.',
      siedzisko: 'Zbij deski pokrywy dwiema listwami od spodu i zamocuj ją na zawiasach do tylnej oskrzyni. Listwy przykręć tak, żeby przy zamykaniu wchodziły do środka skrzyni — wtedy wieko nie przesuwa się na boki.',
    },
    laczniki: () => [
      { nazwa: 'Zawias do skrzyni', sztuk: 2, jednostka: 'szt.', uwaga: 'nierdzewny albo ocynkowany' },
      { nazwa: 'Podnośnik / blokada wieka', sztuk: 1, jednostka: 'szt.', uwaga: 'żeby pokrywa nie spadła na palce' },
    ],
    wskazowki: [
      'Nie uszczelniaj skrzyni na styk. Woda i tak dostanie się do środka podczas deszczu; ważne, żeby miała którędy wyjść i żeby wnętrze schło.',
      'Zawiasy przykręcaj do oskrzyni, a nie do cienkiej deski ściany — wieko wyrwie każdy wkręt wkręcony w samo poszycie.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'fotel-adirondack',
    nazwa: 'Fotel ogrodowy z odchylonym oparciem',
    kategoria: 'siedziska',
    opis: 'Głęboki fotel z szerokimi podłokietnikami — ten, który stoi na każdym amerykańskim ganku. Siedzi się w nim, a nie na nim.',
    trudnosc: 3,
    czas: '6–8 godzin',
    narzedzia: ['wyrzynarka', 'wkrętarka', 'kątownik nastawny', 'papier ścierny'],
    parametry: [
      par.szerokosc(650, 550, 800, 'Szerokość zewnętrzna fotela.'),
      par.wlasny('nachylenie', 'Odchylenie oparcia', 25, 15, 35, {
        krok: 1,
        jednostka: '°',
        podpowiedz: 'Od pionu. 25° to pozycja do rozmowy, 35° prawie do drzemki.',
      }),
      par.wysokosc(380, 320, 440, 'Wysokość przedniej krawędzi siedziska. Ten fotel siedzi nisko — tak ma być.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const wysPrzod = w.wysokosc
      const kat = (w.nachylenie * Math.PI) / 180
      const glebSiedziska = 560
      // Siedzisko opada do tyłu — to ono, a nie samo oparcie, wciska plecy
      // w oparcie i sprawia, że z fotela nie chce się wstawać.
      const spadekSiedziska = 90
      const bokB = 32
      const xBokow = [bokB / 2 + 10, szer - bokB / 2 - 10]

      s.ustaw('nogi', T(bokB, 140))
      for (const x of xBokow) {
        // Bok fotela: jeden kawałek od przedniej nogi po tylny koniec siedziska.
        s.ukos({
          nazwa: 'Bok siedziska',
          start: P(x, 0, wysPrzod),
          koniec: P(x, glebSiedziska, wysPrzod - spadekSiedziska),
          plaszczyzna: P(0, 0, 1),
          wkretow: 6,
          uwaga: 'oba końce ścięte pionowo',
        })
        s.pion({ nazwa: 'Noga przednia', x, y: 60, od: 0, do: wysPrzod + 20 })
        s.pion({ nazwa: 'Noga tylna', x, y: glebSiedziska - 60, od: 0, do: wysPrzod - spadekSiedziska })
      }

      // Słupki oparcia odchylone do tyłu o zadany kąt.
      s.ustaw('oparcie', T(32, 90))
      const wysOparcia = 620
      for (const x of xBokow) {
        const yDol = glebSiedziska - 80
        s.ukos({
          nazwa: 'Słupek oparcia',
          start: P(x, yDol, wysPrzod - spadekSiedziska),
          koniec: P(
            x,
            yDol + Math.sin(kat) * wysOparcia,
            wysPrzod - spadekSiedziska + Math.cos(kat) * wysOparcia,
          ),
          plaszczyzna: P(0, 1, 0),
          skos: Math.round(w.nachylenie),
          wkretow: 4,
        })
      }

      // Deski oparcia w wachlarz: krótsze na dole, dłuższe u góry — to ten
      // kształt daje fotelowi sylwetkę, po której go się poznaje.
      s.tarcica(T(20, 90))
      const listw = 5
      for (let i = 0; i < listw; i++) {
        const t = (i + 0.5) / listw
        const wzdluzOparcia = 80 + t * (wysOparcia - 140)
        const y = glebSiedziska - 80 + Math.sin(kat) * wzdluzOparcia
        const z = wysPrzod - spadekSiedziska + Math.cos(kat) * wzdluzOparcia
        // Szerokość rośnie ku górze: dolne deski są węższe o wcięcie boków.
        const wciecie = 60 * (1 - t)
        s.wzdluz({
          nazwa: 'Deska oparcia',
          od: wciecie,
          do: szer - wciecie,
          y,
          z,
          // Deska leży w płaszczyźnie oparcia, a nie płasko: przy odchyleniu
          // 25° różnica to nie kosmetyka, tylko inny mebel.
          pochylenie: kat,
          wkretow: 4,
          uwaga: i === listw - 1 ? 'górną krawędź wyokrąglij' : undefined,
        })
      }

      s.ustaw('siedzisko', T(20, 70))
      const siedzisko = rozkladDesek(glebSiedziska - 40, 70, 10)
      for (const yLok of siedzisko.srodki) {
        const y = 20 + yLok
        const z = wysPrzod - (spadekSiedziska * y) / glebSiedziska + 10
        s.wzdluz({ nazwa: 'Deska siedziska', od: 0, do: szer, y, z, wkretow: 4 })
      }

      // Podłokietnik opiera się z tyłu o słupek oparcia, więc musi kończyć
      // się dokładnie tam, gdzie ten słupek przechodzi przez jego wysokość —
      // inaczej wisi w powietrzu i trzyma się na samych wkrętach z przodu.
      s.ustaw('rama', T(25, 140))
      const zPodlokietnika = wysPrzod + 190
      const wzdluzSlupka =
        (zPodlokietnika - (wysPrzod - spadekSiedziska)) / Math.cos(kat)
      const yPodparcia = glebSiedziska - 80 + Math.sin(kat) * wzdluzSlupka
      for (const x of xBokow) {
        s.wszerz({
          nazwa: 'Podłokietnik',
          x,
          od: -60,
          do: yPodparcia,
          z: zPodlokietnika,
          obrot: 'plask',
          wkretow: 4,
          uwaga: 'przedni koniec zaokrąglij — o ten róg zahacza się rękawem',
        })
        s.tarcica(T(32, 90))
        s.pion({
          nazwa: 'Wspornik podłokietnika',
          x,
          y: 60,
          od: wysPrzod + 20,
          do: zPodlokietnika,
          wkretow: 3,
        })
        s.tarcica(T(25, 140))
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Wytnij dwa boki siedziska — to najważniejsze części całego fotela. Zrób jeden, sprawdź, i dopiero potem obrysuj go jako szablon na drugim. Dwa boki wycinane osobno nigdy nie wyjdą identyczne.',
      oparcie: 'Przykręć słupki oparcia do tylnych końców boków pod zadanym kątem, a potem deski wachlarza od dołu ku górze. Rozstaw deski na oko równo — tu nie ma jednej dobrej odległości, ma być symetrycznie.',
      siedzisko: 'Ułóż deski siedziska od przodu do tyłu. Przednią wysuń trochę przed bok i mocno ją zaokrąglij — to ta krawędź naciska pod kolanem.',
      rama: 'Na końcu podłokietniki: opierają się z tyłu o słupek oparcia, z przodu na wsporniku wychodzącym z przedniej nogi. Sprawdź poziom obu, zanim dokręcisz.',
    },
    wskazowki: [
      'To jedyny mebel w katalogu, w którym warto najpierw zrobić szablony z kartonu. Kąt oparcia i spadek siedziska łatwiej sprawdzić, siadając na kartonowej makiecie, niż po skręceniu drewna.',
      'Wszystkie łby wkrętów w siedzisku i oparciu wpuść pod powierzchnię — do tego fotela siada się w krótkich spodniach.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'lezak',
    nazwa: 'Leżak ogrodowy',
    kategoria: 'siedziska',
    opis: 'Leżanka z regulowanym oparciem, na nóżkach albo na kółkach. Wygodna, a prosta — to głównie rama i listwy.',
    trudnosc: 2,
    czas: '5–6 godzin',
    narzedzia: ['piła', 'wkrętarka', 'wiertło 10 mm', 'papier ścierny'],
    parametry: [
      par.dlugosc(1900, 1600, 2100, 'Długość leżanki. Dla osoby 180 cm licz co najmniej 1,9 m.'),
      par.szerokosc(650, 550, 800),
      par.wysokosc(350, 280, 450, 'Wysokość leżenia od ziemi.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const szer = w.szerokosc
      const wys = w.wysokosc
      const ramaB = 32
      const yBokow = [ramaB / 2 + 10, szer - ramaB / 2 - 10]
      // Oparcie zajmuje mniej więcej jedną trzecią długości — reszta to leżysko.
      const dlOparcia = Math.round(dl * 0.32)
      const dlLezyska = dl - dlOparcia

      s.ustaw('nogi', T(45, 45))
      for (const x of [80, dlLezyska - 80]) {
        for (const y of yBokow) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys - 90 })
        }
      }

      s.ustaw('rama', T(ramaB, 90))
      for (const y of yBokow) {
        s.wzdluz({
          nazwa: 'Bok ramy',
          od: 0,
          do: dlLezyska,
          y,
          z: wys - 45,
          obrot: 'sztorc',
          wkretow: 6,
        })
      }
      for (const x of [0 + ramaB / 2, dlLezyska - ramaB / 2, dlLezyska / 2]) {
        s.wszerz({
          nazwa: 'Poprzeczka ramy',
          x,
          od: yBokow[0],
          do: yBokow[1],
          z: wys - 45,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }

      // Oparcie: osobna ramka na zawiasie, podpierana listwą w kilku pozycjach.
      s.ustaw('oparcie', T(ramaB, 90))
      const kat = (32 * Math.PI) / 180
      for (const y of yBokow) {
        s.ukos({
          nazwa: 'Bok oparcia',
          start: P(dlLezyska, y, wys - 45),
          koniec: P(
            dlLezyska + Math.sin(kat) * dlOparcia,
            y,
            wys - 45 + Math.cos(kat) * dlOparcia,
          ),
          plaszczyzna: P(0, 0, 1),
          wkretow: 4,
        })
      }
      s.ukos({
        nazwa: 'Poprzeczka oparcia',
        start: P(
          dlLezyska + Math.sin(kat) * (dlOparcia - 45),
          yBokow[0],
          wys - 45 + Math.cos(kat) * (dlOparcia - 45),
        ),
        koniec: P(
          dlLezyska + Math.sin(kat) * (dlOparcia - 45),
          yBokow[1],
          wys - 45 + Math.cos(kat) * (dlOparcia - 45),
        ),
        plaszczyzna: P(0, 0, 1),
        wkretow: 4,
      })
      s.tarcica(T(25, 60))
      s.ukos({
        nazwa: 'Podpórka oparcia',
        start: P(dlLezyska - 350, szer / 2, wys - 90),
        koniec: P(
          dlLezyska + Math.sin(kat) * (dlOparcia * 0.6),
          szer / 2,
          wys - 45 + Math.cos(kat) * (dlOparcia * 0.6),
        ),
        plaszczyzna: P(0, 1, 0),
        wkretow: 2,
        uwaga: 'wycięcia co 5 cm dają kilka pozycji oparcia',
      })

      s.ustaw('siedzisko', T(20, 70))
      const listwy = rozkladDesek(dlLezyska - 40, 70, 12)
      for (const xLok of listwy.srodki) {
        s.wszerz({
          nazwa: 'Listwa leżyska',
          x: 20 + xLok,
          od: yBokow[0] - 20,
          do: yBokow[1] + 20,
          z: wys,
          wkretow: 4,
        })
      }
      const listwyOparcia = Math.max(3, Math.round((dlOparcia - 60) / 82))
      for (let i = 0; i < listwyOparcia; i++) {
        const t = 40 + (i * (dlOparcia - 80)) / Math.max(1, listwyOparcia - 1)
        // Listwa leży na ramce oparcia, więc jest pochylona razem z nią —
        // płaska listwa na odchylonym oparciu wygląda jak schodek.
        s.wszerz({
          nazwa: 'Listwa oparcia',
          x: dlLezyska + Math.sin(kat) * t,
          od: yBokow[0] - 20,
          do: yBokow[1] + 20,
          z: wys - 45 + Math.cos(kat) * t + 45,
          pochylenie: kat,
          wkretow: 4,
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery nogi pod ramą leżyska. Jeśli leżak ma jeździć po tarasie, zamiast przedniej pary daj koła — wtedy podnosi się go za koniec jak taczkę.',
      rama: 'Skręć prostokątną ramę leżyska i wstaw środkową poprzeczkę. Bez niej listwy uginają się dokładnie tam, gdzie leżą biodra.',
      oparcie: 'Zrób ramkę oparcia jako osobny prostokąt i połącz ją z ramą zawiasami. Podpórkę z wycięciami przykręć na środku od spodu — to ona daje kilka pozycji.',
      siedzisko: 'Przykręć listwy z równymi szczelinami. Zacznij od skrajnych, a resztę rozłóż między nimi — wtedy błąd nie kumuluje się na końcu.',
    },
    laczniki: () => [
      { nazwa: 'Zawias', sztuk: 2, jednostka: 'szt.', uwaga: 'łączy oparcie z ramą leżyska' },
      { nazwa: 'Koło do mebli 100 mm', sztuk: 2, jednostka: 'szt.', uwaga: 'opcjonalnie, zamiast dwóch nóg' },
    ],
    wskazowki: [
      'Listwy leżyska rób z drewna bez sęków w środku szerokości. To po nich rozkłada się cały ciężar, a sęk jest w desce miejscem, w którym pęknie.',
      'Szczeliny między listwami zostaw nie mniejsze niż 10 mm — inaczej po deszczu leżak schnie pół dnia.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'hustawka-ogrodowa',
    nazwa: 'Huśtawka ogrodowa na ramie',
    kategoria: 'siedziska',
    opis: 'Ławka podwieszona na łańcuchach do własnej ramy w kształcie litery A. Stoi wolno, nie potrzebuje drzewa ani belki stropowej.',
    trudnosc: 3,
    wilgoc: 'grunt',
    czas: '1–2 dni',
    narzedzia: ['piła', 'wkrętarka', 'wiertarka z wiertłem 12 mm', 'klucz nasadowy', 'poziomica'],
    parametry: [
      par.dlugosc(1400, 1100, 1800, 'Długość siedziska. Powyżej 1,6 m ławka robi się ciężka i mocno się wygina.'),
      par.wysokosc(2100, 1900, 2400, 'Wysokość belki nośnej nad ziemią.'),
      par.glebokosc(500, 420, 600, 'Głębokość siedziska.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const wysBelki = w.wysokosc
      const gl = w.glebokosc
      // Rozstaw ram jest większy niż ławka: łańcuchy muszą wisieć pionowo,
      // a rama musi wystawać poza obrys huśtawki, żeby się nie przewracała.
      const rozstawRam = dl + 400
      const rozkrok = 1100
      const belkaB = 90

      s.ustaw('rama', T(belkaB, 140))
      s.wzdluz({
        nazwa: 'Belka nośna',
        od: -200,
        do: rozstawRam + 200,
        y: 0,
        z: wysBelki,
        obrot: 'sztorc',
        wkretow: 8,
        uwaga: 'jeden kawałek — na tej belce wisi cała huśtawka',
      })

      s.ustaw('nogi', T(90, 90))
      for (const x of [0, rozstawRam]) {
        for (const kierunek of [-1, 1]) {
          s.ukos({
            nazwa: 'Noga ramy A',
            start: P(x + kierunek * 60, (kierunek * rozkrok) / 2, 0),
            koniec: P(x, 0, wysBelki + 60),
            plaszczyzna: P(0, 1, 0),
            skos: Math.round((Math.atan2(rozkrok / 2, wysBelki) * 180) / Math.PI),
            wkretow: 4,
            uwaga: 'oba końce ścięte: dolny do gruntu, górny do belki',
          })
        }
        s.ustaw('stezenia', T(32, 120))
        s.wszerz({
          nazwa: 'Ściąg ramy A',
          x,
          od: -rozkrok / 3,
          do: rozkrok / 3,
          z: wysBelki * 0.45,
          obrot: 'sztorc',
          wkretow: 4,
          uwaga: 'trzyma nogi przed rozjechaniem się',
        })
        s.ustaw('rama', T(belkaB, 140))
      }

      // Ławka: prostokątna rama z listwami i odchylone oparcie.
      const zSiedziska = 500
      const xLawki = [(rozstawRam - dl) / 2, (rozstawRam + dl) / 2]
      s.ustaw('siedzisko', T(32, 90))
      for (const y of [-gl / 2 + 45, gl / 2 - 45]) {
        s.wzdluz({
          nazwa: 'Bok ramy siedziska',
          od: xLawki[0],
          do: xLawki[1],
          y,
          z: zSiedziska,
          obrot: 'sztorc',
          wkretow: 6,
        })
      }
      for (const x of [xLawki[0] + 45, xLawki[1] - 45, (xLawki[0] + xLawki[1]) / 2]) {
        s.wszerz({
          nazwa: 'Poprzeczka siedziska',
          x,
          od: -gl / 2 + 45,
          do: gl / 2 - 45,
          z: zSiedziska,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }
      s.tarcica(T(20, 90))
      const listwy = rozkladDesek(gl, 90, 8)
      for (const yLok of listwy.srodki) {
        s.wzdluz({
          nazwa: 'Listwa siedziska',
          od: xLawki[0],
          do: xLawki[1],
          y: -gl / 2 + yLok,
          z: zSiedziska + 55,
          wkretow: 4,
        })
      }

      s.ustaw('oparcie', T(32, 90))
      const katOparcia = (18 * Math.PI) / 180
      const wysOparcia = 450
      for (const x of [xLawki[0] + 45, xLawki[1] - 45]) {
        s.ukos({
          nazwa: 'Słupek oparcia',
          start: P(x, gl / 2 - 45, zSiedziska),
          koniec: P(
            x,
            gl / 2 - 45 + Math.sin(katOparcia) * wysOparcia,
            zSiedziska + Math.cos(katOparcia) * wysOparcia,
          ),
          plaszczyzna: P(0, 1, 0),
          wkretow: 4,
        })
      }
      s.tarcica(T(20, 120))
      for (const t of [120, 300, wysOparcia - 60]) {
        s.wzdluz({
          nazwa: 'Deska oparcia',
          od: xLawki[0],
          do: xLawki[1],
          y: gl / 2 - 45 + Math.sin(katOparcia) * t,
          z: zSiedziska + Math.cos(katOparcia) * t,
          pochylenie: katOparcia,
          wkretow: 4,
        })
      }

      // Łańcuchy nie są drewnem, ale muszą być w modelu — bez nich nie widać,
      // jak huśtawka wisi i gdzie wypadają zaczepy.
      s.ustaw('stezenia', T(8, 8))
      for (const x of [xLawki[0] + 45, xLawki[1] - 45]) {
        for (const y of [-gl / 2 + 45, gl / 2 - 45]) {
          s.ukos({
            nazwa: 'Łańcuch',
            start: P(x, y, zSiedziska + 40),
            koniec: P(x, 0, wysBelki - 70),
            nieDrewno: true,
            wkretow: 0,
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zrób dwie ramy A na płasko, na ziemi: dwie nogi zbiegające się u góry i ściąg w połowie wysokości. Dopiero gotowe ramy podnosi się do pionu — samodzielne stawianie nóg pojedynczo jest niebezpieczne.',
      rama: 'Połóż belkę nośną na obu ramach i skręć ją śrubami przelotowymi, nie wkrętami. Na tej belce wisi ciężar dwóch dorosłych osób w ruchu, a ruch obciąża złącze dużo mocniej niż sam ciężar.',
      stezenia: 'Ściągi ram A i zastrzały wzdłuż belki. Huśtawka bez wzdłużnego stężenia buja się nie tylko w przód i w tył, ale też na boki — i to ten drugi ruch wywraca całą konstrukcję.',
      siedzisko: 'Skręć ramę ławki, wstaw środkową poprzeczkę i przykręć listwy. Ławka jest podwieszona za cztery punkty, więc jej rama pracuje zupełnie inaczej niż rama ławki stojącej — nie oszczędzaj na poprzeczkach.',
      oparcie: 'Odchyl oparcie o kilkanaście stopni i przykręć deski. Sprawdź, gdzie wypadną zaczepy łańcuchów — nie mogą kolidować z oparciem.',
    },
    laczniki: () => [
      { nazwa: 'Śruba przelotowa M10 z podkładką i nakrętką', sztuk: 12, jednostka: 'szt.', uwaga: 'nogi do belki i ściągi' },
      { nazwa: 'Hak zaczepowy z gwintem do drewna', sztuk: 4, jednostka: 'szt.', uwaga: 'wkręcany w belkę nośną' },
      { nazwa: 'Łańcuch ocynkowany', sztuk: 12, jednostka: 'm', uwaga: 'cztery odcinki plus zapas na regulację' },
      { nazwa: 'Karabińczyk / szekla', sztuk: 8, jednostka: 'szt.' },
      { nazwa: 'Kotwa gruntowa albo stopa betonowa', sztuk: 4, jednostka: 'szt.', uwaga: 'huśtawka musi być związana z gruntem' },
    ],
    wskazowki: [
      'Ta konstrukcja MUSI być zakotwiona w gruncie. Rozbujana huśtawka podnosi ramę od podłoża — cztery kotwy gruntowe albo stopy betonowe to nie jest opcja, tylko warunek bezpieczeństwa.',
      'Zaczepy wkręcaj w belkę od góry, przelotowo, na podkładkę i nakrętkę. Zwykły hak wkręcony w drewno wyrywa się po kilku sezonach — i zawsze wtedy, gdy ktoś na nim siedzi.',
      'Kalkulator liczy ilość drewna, ale nie sprawdza nośności belki nośnej. Przy rozpiętości powyżej 2 m dobierz jej przekrój z projektu albo zwiększ go z zapasem.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'sofa-z-palet',
    nazwa: 'Sofa z palet',
    kategoria: 'siedziska',
    opis: 'Kanapa z palet euro spiętych w moduł, z oparciem z desek. Najtańszy mebel ogrodowy i najszybszy do zrobienia.',
    trudnosc: 1,
    czas: '3–4 godziny',
    narzedzia: ['wkrętarka', 'piła', 'szczotka druciana', 'szlifierka'],
    parametry: [
      par.wlasny('palet', 'Palet w podstawie', 4, 2, 8, {
        podpowiedz: 'Paleta euro to 120 × 80 cm. Cztery palety w układzie 2 × 2 dają sofę 160 × 120 cm.',
      }),
      par.wlasny('warstwy', 'Warstwy palet', 2, 1, 3, {
        podpowiedz: 'Jedna paleta to 14 cm — z poduszką siedzi się za nisko. Dwie warstwy dają 28 cm i wysokość zbliżoną do kanapy.',
      }),
      par.wysokosc(600, 400, 800, 'Wysokość oparcia liczona od wierzchu palet.'),
    ],
    buduj: (w) => {
      const s = warsztat()
      // Paleta euro: 1200 × 800 × 144 mm. Odwzorowujemy ją uproszczoną
      // ramą — trzy wsporniki i pokład — bo do zestawienia i tak wchodzi
      // jako gotowy element, a nie jako drewno do kupienia na metry.
      const palW = 1200
      const palG = 800
      const palH = 144
      const wRzedzie = Math.max(1, Math.round(Math.sqrt(w.palet)))
      const rzedy = Math.max(1, Math.ceil(w.palet / wRzedzie))
      const szer = wRzedzie * palW
      const gleb = rzedy * palG

      s.ustaw('nogi', T(100, 100))
      for (let warstwa = 0; warstwa < w.warstwy; warstwa++) {
        const z0 = warstwa * palH
        for (let i = 0; i < wRzedzie; i++) {
          for (let j = 0; j < rzedy; j++) {
            const x0 = i * palW
            const y0 = j * palG
            for (const xk of rownyRozstaw(x0 + 50, x0 + palW - 50, 3)) {
              s.wszerz({
                nazwa: 'Wspornik palety',
                x: xk,
                od: y0,
                do: y0 + palG,
                z: z0 + 50,
                obrot: 'sztorc',
                wkretow: 0,
                // Palety kupujesz gotowe, więc nie wchodzą do zamówienia
                // tarcicy — ale muszą być w modelu i w spisie części, bo bez
                // nich nie widać, co się do czego przykręca.
                nieDrewno: true,
              })
            }
            s.ustaw('dno', T(22, 100))
            for (const yk of rownyRozstaw(y0 + 50, y0 + palG - 50, 7)) {
              s.wzdluz({
                nazwa: 'Deska pokładu palety',
                od: x0,
                do: x0 + palW,
                y: yk,
                z: z0 + palH - 11,
                wkretow: 0,
                nieDrewno: true,
              })
            }
            for (const yk of rownyRozstaw(y0 + 50, y0 + palG - 50, 3)) {
              s.wzdluz({
                nazwa: 'Deska spodu palety',
                od: x0,
                do: x0 + palW,
                y: yk,
                z: z0 + 11,
                wkretow: 0,
                nieDrewno: true,
              })
            }
            s.ustaw('nogi', T(100, 100))
          }
        }
      }

      // Oparcie: rama z kantówki przykręcona z tyłu do palet, obita deskami.
      s.ustaw('oparcie', T(45, 90))
      const zPalet = w.warstwy * palH
      const xSlupkow = rownyRozstaw(100, szer - 100, Math.max(2, wRzedzie + 1))
      for (const x of xSlupkow) {
        s.pion({
          nazwa: 'Słupek oparcia',
          x,
          y: gleb - 45,
          od: zPalet - palH,
          do: zPalet + w.wysokosc,
          wkretow: 4,
          uwaga: 'przykręcany do bocznego wspornika palety',
        })
      }
      s.tarcica(T(20, 140))
      const deski = rozkladDesek(w.wysokosc - 60, 140, 10)
      for (const zLok of deski.srodki) {
        s.wzdluz({
          nazwa: 'Deska oparcia',
          od: 0,
          do: szer,
          y: gleb - 10,
          z: zPalet + 30 + zLok,
          obrot: 'sztorc',
          wkretow: 4,
        })
      }

      return s.zbior()
    },
    laczniki: (w) => [
      {
        nazwa: 'Paleta euro 1200 × 800 mm',
        sztuk: Math.max(1, Math.round(w.palet)) * Math.max(1, Math.round(w.warstwy)),
        jednostka: 'szt.',
        uwaga: 'suszone komorowo, z oznaczeniem EPAL albo EUR',
      },
      { nazwa: 'Kątownik montażowy do spięcia palet', sztuk: 8, jednostka: 'szt.' },
    ],
    opisyEtapow: {
      nogi: 'Zszlifuj palety i sprawdź, czy żadna deska nie jest pęknięta. Palety z oznaczeniem EPAL i EUR są suszone komorowo; te z literami MB były traktowane bromkiem metylu i nie nadają się na mebel, na którym się siedzi.',
      dno: 'Zepnij palety ze sobą — najpierw poziomo w moduł, potem warstwami w pionie. Skręcaj przez wsporniki, nie przez cienkie deski pokładu.',
      oparcie: 'Przykręć słupki oparcia do bocznych wsporników tylnych palet, a na nich deski. Słupek sięgający tylko do wierzchu palety wyrwie się przy pierwszym mocniejszym oparciu — musi zachodzić na bok palety co najmniej na jej wysokość.',
    },
    wskazowki: [
      'Ilość drewna w zestawieniu dotyczy oparcia. Palety kupujesz albo znajdujesz osobno — to one są główną częścią tego mebla.',
      'Szlifowanie palety zajmuje więcej czasu niż cała reszta roboty. Zacznij papierem 80, skończ 120 i nie żałuj czasu na krawędzie — drzazga z palety jest wyjątkowo nieprzyjemna.',
      'Zanim polakierujesz: paleta była na dworze, w magazynie i pod ciężarem. Umyj ją, wysusz przez kilka dni i dopiero wtedy maluj.',
    ],
  },
]
