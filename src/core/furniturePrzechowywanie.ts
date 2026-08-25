/**
 * Przepisy na przechowywanie: kompostownik, drewutnia, skrzynia, osłona
 * na pojemniki i regał ogrodowy.
 *
 * WSPÓLNY MIANOWNIK TYCH MEBLI TO PRZEWIETRZANIE
 * ----------------------------------------------
 * Kompost, drewno opałowe i pojemniki na odpady mają jedną wspólną cechę:
 * wszystkie parują. Skrzynia zbita na styk zamienia się w komorę wilgotną
 * w środku i mokrą od spodu — kompost gnije zamiast dojrzewać, drewno nie
 * schnie, a osłona śmieci zaczyna śmierdzieć mocniej niż same pojemniki.
 * Dlatego w każdym z tych przepisów ściany mają szczeliny, a podłoga jest
 * podniesiona nad grunt. To nie jest oszczędność drewna, tylko warunek
 * działania.
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

export const PRZEPISY_PRZECHOWYWANIE: PrzepisMebla[] = [
  // -------------------------------------------------------------------------
  {
    id: 'kompostownik',
    nazwa: 'Kompostownik z desek',
    kategoria: 'przechowywanie',
    opis: 'Skrzynia bez dna, ze szczelinami między deskami i wyjmowaną ścianą przednią. Kompost wybiera się od dołu, nie przerzucając całej pryzmy.',
    trudnosc: 1,
    wilgoc: 'grunt',
    czas: '3–4 godziny',
    narzedzia: ['piła', 'wkrętarka', 'poziomica'],
    parametry: [
      par.szerokosc(1000, 700, 1500, 'Jedna komora. Poniżej 70 cm boku pryzma nie nagrzewa się na tyle, żeby kompost dojrzewał.'),
      par.glebokosc(1000, 700, 1500),
      par.wysokosc(900, 600, 1200),
      par.wlasny('komory', 'Liczba komór', 1, 1, 3, {
        podpowiedz: 'Dwie komory pozwalają przerzucać kompost z jednej do drugiej — dojrzewa wtedy dużo szybciej.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const bokX = w.szerokosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const komory = Math.round(w.komory)
      const slupekB = 70
      const dlCalk = bokX * komory
      // Słupki stoją na granicach komór, więc sąsiednie komory dzielą słupek.
      const xSlupkow = Array.from({ length: komory + 1 }, (_, i) => i * bokX + (i === 0 ? slupekB / 2 : i === komory ? -slupekB / 2 : 0))
      const ySlup = [slupekB / 2, gl - slupekB / 2]

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlupkow) {
        for (const y of ySlup) {
          s.pion({ nazwa: 'Słupek', x, y, od: -200, do: wys, wkretow: 6 })
        }
      }

      // Ściany ze szczelinami: pryzma musi oddychać, inaczej zgnije.
      s.ustaw('sciany', T(25, 140))
      const rzedy = rozkladDesek(wys, 140, 25)
      for (const zLok of rzedy.srodki) {
        s.wzdluz({ nazwa: 'Deska ściany tylnej', od: 0, do: dlCalk, y: ySlup[1], z: zLok, obrot: 'sztorc', wkretow: 4 })
        for (let i = 0; i <= komory; i++) {
          s.wszerz({
            nazwa: i === 0 || i === komory ? 'Deska ściany bocznej' : 'Deska ściany działowej',
            x: i * bokX + (i === 0 ? slupekB / 2 : i === komory ? -slupekB / 2 : 0),
            od: 25,
            do: gl - 25,
            z: zLok,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      // Ściana przednia z desek wsuwanych w prowadnice — to ona daje dostęp
      // do gotowego kompostu bez rozbierania całej skrzyni.
      s.ustaw('rama', T(25, 45))
      for (const x of xSlupkow) {
        for (const przesuniecie of [-20, 20]) {
          s.pion({
            nazwa: 'Prowadnica ściany przedniej',
            x: x + przesuniecie,
            y: ySlup[0] - slupekB / 2 - 12,
            od: 0,
            do: wys,
            wkretow: 4,
            uwaga: 'dwie listwy tworzą szczelinę, w którą wsuwa się deski',
          })
        }
      }
      s.ustaw('sciany', T(25, 140))
      for (const zLok of rzedy.srodki) {
        for (let i = 0; i < komory; i++) {
          s.wzdluz({
            nazwa: 'Deska wsuwana ściany przedniej',
            od: i * bokX + 30,
            do: (i + 1) * bokX - 30,
            y: ySlup[0] - slupekB / 2 - 12,
            z: zLok,
            obrot: 'sztorc',
            wkretow: 0,
            uwaga: 'nie przykręcaj — ma dać się wyjąć',
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Wbij słupki w grunt na głębokość co najmniej 20 cm i sprawdź piony. Przy dwóch komorach słupek środkowy jest wspólny dla obu — nie stawiaj dwóch obok siebie.',
      sciany: 'Deski przykręcaj ze szczelinami około 25 mm. Kompost bez dostępu powietrza nie dojrzewa, tylko gnije i zaczyna śmierdzieć amoniakiem.',
      rama: 'Przykręć podwójne listwy prowadzące na słupkach przednich. Szczelina między nimi musi być o 3–4 mm szersza od grubości deski, inaczej po napęcznieniu nie wyciągniesz jej wcale.',
    },
    wskazowki: [
      'Nie rób dna. Kompostownik musi stać wprost na ziemi — dżdżownice i mikroorganizmy wchodzą od spodu i to one wykonują większość pracy.',
      'Deski przedniej ściany wsuwaj dopiero w miarę wypełniania komory. Przy pustym kompostowniku wszystkie na raz tylko przeszkadzają przy wrzucaniu.',
      'Kompostownik postaw w półcieniu. W pełnym słońcu pryzma przesycha i proces staje, w głębokim cieniu jest za zimna.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'drewutnia',
    nazwa: 'Stojak na drewno z daszkiem',
    kategoria: 'przechowywanie',
    opis: 'Wiata na opał: ruszt nad ziemią, boki z listew i daszek ze spadkiem. Drewno schnie zamiast pleśnieć pod plandeką.',
    trudnosc: 2,
    wilgoc: 'grunt',
    czas: '5–6 godzin',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'kątownik'],
    parametry: [
      par.dlugosc(1500, 800, 3000, 'Metr sześcienny drewna to mniej więcej stos 1,5 × 1,2 × 0,5 m.'),
      par.glebokosc(450, 350, 700, 'Głębokość zależy od długości szczap: 33 cm szczapa potrzebuje 40 cm stojaka.'),
      par.wysokosc(1400, 900, 2000, 'Wysokość z przodu, do krawędzi daszku.'),
      par.wlasny('spadek', 'Spadek daszku', 150, 80, 350, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'O tyle tył jest niższy od przodu. Woda ma spływać do tyłu, nie na drewno.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wysPrzod = w.wysokosc
      const wysTyl = wysPrzod - w.spadek
      const slupekB = 70
      const xSlup = [slupekB / 2 + 20, dl - slupekB / 2 - 20]
      const yPrzod = slupekB / 2
      const yTyl = gl - slupekB / 2

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlup) {
        s.pion({ nazwa: 'Słupek przedni', x, y: yPrzod, od: 0, do: wysPrzod, wkretow: 6 })
        s.pion({ nazwa: 'Słupek tylny', x, y: yTyl, od: 0, do: wysTyl, wkretow: 6 })
      }
      const posrednie = Math.max(0, Math.ceil(dl / 1200) - 1)
      for (const x of rownyRozstaw(xSlup[0], xSlup[1], posrednie + 2).slice(1, -1)) {
        s.pion({ nazwa: 'Słupek pośredni przedni', x, y: yPrzod, od: 0, do: wysPrzod, wkretow: 4 })
        s.pion({ nazwa: 'Słupek pośredni tylny', x, y: yTyl, od: 0, do: wysTyl, wkretow: 4 })
      }

      // Ruszt: drewno leżące na ziemi nasiąka od spodu i nigdy nie wyschnie.
      s.ustaw('dno', T(45, 90))
      for (const y of [yPrzod, yTyl]) {
        s.wzdluz({ nazwa: 'Belka rusztu', od: 0, do: dl, y, z: 120, obrot: 'sztorc', wkretow: 4 })
      }
      s.tarcica(T(32, 90))
      const legary = ileWRozstawie(dl, 500)
      for (const x of rownyRozstaw(60, dl - 60, legary)) {
        s.wszerz({ nazwa: 'Legar rusztu', x, od: 0, do: gl, z: 175, obrot: 'plask', wkretow: 4 })
      }

      // Boki i tył z listew ze szczelinami — wiatr musi przewiewać stos.
      s.ustaw('sciany', T(20, 90))
      const listwyBoku = rozkladDesek(wysPrzod - 250, 90, 60)
      for (const zLok of listwyBoku.srodki) {
        const z = 220 + zLok
        if (z > wysTyl - 60) continue
        s.wzdluz({ nazwa: 'Listwa ściany tylnej', od: 0, do: dl, y: yTyl + slupekB / 2 + 10, z, obrot: 'sztorc', wkretow: 4 })
        for (const x of xSlup) {
          s.wszerz({
            nazwa: 'Listwa boczna',
            x: x + (x === xSlup[0] ? -slupekB / 2 - 10 : slupekB / 2 + 10),
            od: yPrzod,
            do: yTyl,
            z,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      s.ustaw('stezenia', T(25, 90))
      for (const x of xSlup) {
        s.ukos({
          nazwa: 'Zastrzał boczny',
          start: P(x + (x === xSlup[0] ? -slupekB / 2 - 10 : slupekB / 2 + 10), yPrzod, wysPrzod - 400),
          koniec: P(x + (x === xSlup[0] ? -slupekB / 2 - 10 : slupekB / 2 + 10), yTyl, wysTyl - 60),
          plaszczyzna: P(0, 0, 1),
          wkretow: 4,
        })
      }

      // Krokiewki daszku i pokrycie z desek.
      s.ustaw('daszek', T(45, 90))
      const krokiewek = ileWRozstawie(dl, 700)
      for (const x of rownyRozstaw(60, dl - 60, krokiewek)) {
        s.ukos({
          nazwa: 'Krokiewka daszku',
          start: P(x, -120, wysPrzod + 45),
          koniec: P(x, gl + 120, wysTyl + 45),
          plaszczyzna: P(0, 0, 1),
          wkretow: 4,
          uwaga: 'wystaje przed i za słupki — to okap',
        })
      }
      s.tarcica(T(20, 140))
      s.polac({
        nazwa: 'Deska pokrycia daszku',
        od: -80,
        do: dl + 80,
        odY: -120,
        odZ: wysPrzod + 90,
        doY: gl + 120,
        doZ: wysTyl + 90,
        wkretow: 4,
      })

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Postaw sześć słupków: przednie wyższe, tylne niższe o wartość spadku. Różnica wysokości daje daszkowi spadek do tyłu — sprawdź to, zanim zaczniesz cokolwiek przykręcać.',
      dno: 'Ruszt podnosi drewno nad grunt. To najważniejszy element tego mebla: szczapa leżąca na ziemi nasiąka od spodu i nie wyschnie nigdy, choćby stała pod dachem.',
      sciany: 'Listwy boków i tyłu przykręć ze szczelinami 5–6 cm. Stos musi być przewiewany na wylot; ściana zbita na styk zatrzymuje wilgoć w środku stosu.',
      stezenia: 'Zastrzały w bokach. Stos drewna napiera na ściany, a wiatr popycha całą wiatę — bez ukosu konstrukcja składa się na bok.',
      daszek: 'Krokiewki i deski pokrycia, z okapem wystającym przed i za słupki. Front zostaw otwarty — to on wietrzy stos.',
    },
    wskazowki: [
      'Deski daszku pokryj papą albo blachą trapezową. Sam daszek z desek przecieka na styku i po roku zaczyna gnić od góry.',
      'Nie zasłaniaj frontu. Drewno schnie od strony czół szczap, a to właśnie one patrzą na zewnątrz — zamknięta wiata suszy opał kilka razy wolniej.',
      'Metr sześcienny bukowych szczap waży około 700 kg w stanie świeżym. Przy stojaku dłuższym niż 2 m nie oszczędzaj na słupkach pośrednich.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'skrzynia-ogrodowa',
    nazwa: 'Skrzynia ogrodowa z daszkiem',
    kategoria: 'przechowywanie',
    opis: 'Zamykana skrzynia na poduszki, narzędzia albo zabawki. Pokrywa ze spadkiem, żeby woda po niej spływała.',
    trudnosc: 2,
    czas: '6–7 godzin',
    narzedzia: ['piła', 'wkrętarka', 'kątownik', 'poziomica'],
    parametry: [
      par.dlugosc(1200, 700, 2000),
      par.glebokosc(600, 400, 800),
      par.wysokosc(700, 500, 1000, 'Wysokość ściany przedniej. Tył jest wyższy o wartość spadku.'),
      par.wlasny('spadek', 'Spadek pokrywy', 80, 40, 200, {
        krok: 10,
        jednostka: 'mm',
        podpowiedz: 'Płaska pokrywa zbiera wodę w kałuże i przecieka do środka przy każdej szczelinie.',
      }),
    ],
    buduj: (w) => {
      const s = warsztat()
      const dl = w.dlugosc
      const gl = w.glebokosc
      const wysPrzod = w.wysokosc
      const wysTyl = wysPrzod + w.spadek
      const slupekB = 45
      const xSlup = [slupekB / 2 + 20, dl - slupekB / 2 - 20]
      const yPrzod = slupekB / 2 + 20
      const yTyl = gl - slupekB / 2 - 20

      s.ustaw('nogi', T(slupekB, slupekB))
      for (const x of xSlup) {
        s.pion({ nazwa: 'Słupek przedni', x, y: yPrzod, od: 60, do: wysPrzod, wkretow: 6 })
        s.pion({ nazwa: 'Słupek tylny', x, y: yTyl, od: 60, do: wysTyl, wkretow: 6 })
      }
      s.tarcica(T(45, 70))
      for (const x of xSlup) {
        s.wszerz({ nazwa: 'Nóżka dystansowa', x, od: 0, do: gl, z: 30, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('rama', T(25, 90))
      for (const y of [yPrzod, yTyl]) {
        s.wzdluz({ nazwa: 'Listwa nośna dna', od: xSlup[0], do: xSlup[1], y, z: 120, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('dno', T(20, 140))
      const dno = rozkladDesek(gl - 100, 140, 8)
      for (const yLok of dno.srodki) {
        s.wzdluz({ nazwa: 'Deska dna', od: xSlup[0], do: xSlup[1], y: 50 + yLok, z: 150, wkretow: 2 })
      }

      s.ustaw('sciany', T(20, 140))
      const rzedyPrzod = rozkladDesek(wysPrzod - 150, 140, 0)
      for (const zLok of rzedyPrzod.srodki) {
        s.wzdluz({ nazwa: 'Deska ściany przedniej', od: 0, do: dl, y: yPrzod - slupekB / 2 - 10, z: 150 + zLok, obrot: 'sztorc', wkretow: 4 })
      }
      const rzedyTyl = rozkladDesek(wysTyl - 150, 140, 0)
      for (const zLok of rzedyTyl.srodki) {
        s.wzdluz({ nazwa: 'Deska ściany tylnej', od: 0, do: dl, y: yTyl + slupekB / 2 + 10, z: 150 + zLok, obrot: 'sztorc', wkretow: 4 })
      }
      // Boki są trapezowe: górna deska docinana wzdłuż linii spadku.
      for (const x of xSlup) {
        const zewn = x === xSlup[0] ? -slupekB / 2 - 10 : slupekB / 2 + 10
        const rzedyBok = rozkladDesek(wysPrzod - 150, 140, 0)
        for (const zLok of rzedyBok.srodki) {
          s.wszerz({
            nazwa: 'Deska boku',
            x: x + zewn,
            od: 0,
            do: gl,
            z: 150 + zLok,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
        s.wszerz({
          nazwa: 'Deska boku — docinana skośnie',
          x: x + zewn,
          od: 0,
          do: gl,
          z: wysPrzod + w.spadek / 2 - 40,
          obrot: 'sztorc',
          wkretow: 4,
          uwaga: 'górną krawędź dotnij wzdłuż linii spadku pokrywy',
        })
      }

      s.ustaw('daszek', T(20, 140))
      s.polac({
        nazwa: 'Deska pokrywy',
        od: -30,
        do: dl + 30,
        odY: -60,
        odZ: wysTyl + 30 - w.spadek,
        doY: gl + 60,
        doZ: wysTyl + 30,
        wkretow: 0,
      })
      s.tarcica(T(25, 70))
      for (const x of [dl * 0.2, dl * 0.8]) {
        s.wszerz({
          nazwa: 'Listwa spinająca pokrywę',
          x,
          od: 20,
          do: gl - 20,
          z: wysTyl - 5 - (w.spadek * 0.5) / 2,
          obrot: 'plask',
          wkretow: 6,
          uwaga: 'od spodu; wchodzi do środka skrzyni i ustala pokrywę',
        })
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Cztery słupki: tylne wyższe od przednich o wartość spadku pokrywy. Pod spodem nóżki dystansowe — dno skrzyni nie może dotykać płytki ani ziemi.',
      dno: 'Listwy nośne i deski dna ze szczelinami. Nawet zamknięta skrzynia zbiera wilgoć z wnoszonych rzeczy, a dno szczelne trzyma ją w środku.',
      sciany: 'Obszaluj skrzynię od dołu. Górne deski boków dotnij skośnie, wzdłuż linii spadku — to jedyne cięcie pod kątem w całym meblu.',
      daszek: 'Zbij deski pokrywy dwiema listwami od spodu, tak żeby wchodziły do środka skrzyni. Zawiasy przykręć do tylnej ściany, przez deskę I słupek — same deski wyrwą się przy pierwszym mocnym otwarciu.',
    },
    laczniki: () => [
      { nazwa: 'Zawias', sztuk: 3, jednostka: 'szt.', uwaga: 'nierdzewny; przy pokrywie dłuższej niż 1,5 m daj cztery' },
      { nazwa: 'Podnośnik gazowy albo linka ograniczająca', sztuk: 2, jednostka: 'szt.' },
      { nazwa: 'Uchwyt', sztuk: 1, jednostka: 'szt.' },
    ],
    wskazowki: [
      'Pokryj wierzch pokrywy papą podkładową albo cienką blachą. Sama deska po kilku latach przepuszcza wodę na styku, a to jedyne miejsce w tym meblu, gdzie woda stoi.',
      'Skrzynia nie będzie szczelna i nie musi. Ma chronić przed deszczem i kurzem, a nie przed wilgocią — poduszki i tak trzeba wietrzyć.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'oslona-smietnika',
    nazwa: 'Osłona na pojemniki na odpady',
    kategoria: 'przechowywanie',
    opis: 'Trzy ściany i uchylny daszek zasłaniające kubły. Pojemniki wyjeżdżają przodem, daszek podnosi się przy wrzucaniu.',
    trudnosc: 2,
    wilgoc: 'grunt',
    czas: '1 dzień',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'kątownik'],
    parametry: [
      par.wlasny('pojemniki', 'Liczba pojemników', 3, 1, 5, {
        podpowiedz: 'Standardowy kubeł 240 l ma 58 cm szerokości, 74 cm głębokości i 107 cm wysokości.',
      }),
      par.wysokosc(1250, 1150, 1500, 'Musi być wyższa niż pojemnik z zamkniętą klapą.'),
      par.glebokosc(800, 700, 950),
    ],
    buduj: (w) => {
      const s = warsztat()
      const naPojemnik = 640
      const dl = Math.round(w.pojemniki) * naPojemnik
      const gl = w.glebokosc
      const wys = w.wysokosc
      const slupekB = 70
      const xSlup = [slupekB / 2, dl - slupekB / 2]
      const yPrzod = slupekB / 2
      const yTyl = gl - slupekB / 2
      const spadek = 120

      s.ustaw('nogi', T(slupekB, slupekB))
      const xWszystkie = [
        ...xSlup,
        ...rownyRozstaw(xSlup[0], xSlup[1], Math.round(w.pojemniki) + 1).slice(1, -1),
      ]
      for (const x of xWszystkie) {
        s.pion({ nazwa: 'Słupek przedni', x, y: yPrzod, od: 0, do: wys, wkretow: 6 })
        s.pion({ nazwa: 'Słupek tylny', x, y: yTyl, od: 0, do: wys - spadek, wkretow: 6 })
      }

      s.ustaw('rama', T(45, 90))
      for (const y of [yPrzod, yTyl]) {
        const z = y === yPrzod ? wys - 45 : wys - spadek - 45
        s.wzdluz({ nazwa: 'Oczep', od: 0, do: dl, y, z, obrot: 'sztorc', wkretow: 6 })
        s.wzdluz({ nazwa: 'Poprzeczka dolna', od: 0, do: dl, y, z: 120, obrot: 'sztorc', wkretow: 4 })
      }

      s.ustaw('sciany', T(20, 120))
      const rzedy = rozkladDesek(wys - spadek - 200, 120, 15)
      for (const zLok of rzedy.srodki) {
        const z = 160 + zLok
        s.wzdluz({ nazwa: 'Deska ściany tylnej', od: 0, do: dl, y: yTyl + slupekB / 2 + 10, z, obrot: 'sztorc', wkretow: 4 })
        for (const x of xSlup) {
          s.wszerz({
            nazwa: 'Deska ściany bocznej',
            x: x + (x === xSlup[0] ? -slupekB / 2 - 10 : slupekB / 2 + 10),
            od: yPrzod,
            do: yTyl,
            z,
            obrot: 'sztorc',
            wkretow: 4,
          })
        }
      }

      // Front: niska deska zatrzymująca kubły i słupki naprowadzające.
      s.ustaw('stezenia', T(25, 120))
      s.wzdluz({
        nazwa: 'Deska progu',
        od: 0,
        do: dl,
        y: yPrzod - slupekB / 2 - 10,
        z: 200,
        obrot: 'sztorc',
        wkretow: 4,
        uwaga: 'zatrzymuje kubły, ale nie przeszkadza przy wytaczaniu',
      })

      s.ustaw('daszek', T(45, 70))
      const krokiewek = ileWRozstawie(dl, 800)
      for (const x of rownyRozstaw(60, dl - 60, krokiewek)) {
        s.ukos({
          nazwa: 'Krokiewka daszku',
          start: P(x, -100, wys + 35),
          koniec: P(x, gl + 60, wys - spadek + 35),
          plaszczyzna: P(0, 0, 1),
          wkretow: 4,
        })
      }
      s.tarcica(T(20, 140))
      s.polac({
        nazwa: 'Deska daszku',
        od: -40,
        do: dl + 40,
        odY: -100,
        odZ: wys + 80,
        doY: gl + 60,
        doZ: wys - spadek + 80,
        wkretow: 4,
      })

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Postaw słupki: po parze na granicy każdego stanowiska. Sprawdź w świetle, czy kubeł faktycznie wjeżdża — pojemnik 240 l ma 58 cm szerokości, ale kółka i uchwyt dokładają kilka centymetrów.',
      rama: 'Zwiąż słupki oczepami u góry i poprzeczkami nisko przy ziemi. Osłona stoi na wietrze jak żagiel, więc rama musi być sztywna.',
      sciany: 'Obszaluj trzy ściany, zostawiając kilkunastomilimetrowe szczeliny. Zamknięta na głucho osłona zatrzymuje zapach w środku i wypuszcza go skoncentrowany przy każdym otwarciu.',
      stezenia: 'Deskę progu przykręć nisko z przodu. Zatrzymuje kubły przed wyjeżdżaniem, ale zostaw ją na tyle nisko, żeby dało się je wytoczyć bez podnoszenia.',
      daszek: 'Daszek zrób uchylny, na zawiasach przy tylnym oczepie. Musi się otwierać na tyle, żeby dało się podnieść klapę pojemnika bez wytaczania go na zewnątrz.',
    },
    laczniki: () => [
      { nazwa: 'Zawias do daszku', sztuk: 3, jednostka: 'szt.' },
      { nazwa: 'Kotwa gruntowa albo kotwa do podłoża', sztuk: 4, jednostka: 'szt.', uwaga: 'osłona jest lekka i parusienna — musi być związana z podłożem' },
    ],
    wskazowki: [
      'Zmierz swoje kubły przed cięciem drewna. Pojemniki 120, 240 i 1100 l różnią się wszystkimi wymiarami, a gmina potrafi wymienić je na inne z miesiąca na miesiąc.',
      'Zostaw z tyłu 5 cm luzu za pojemnikiem. Bez tego kubeł wjeżdża idealnie, ale wyjeżdża tylko wtedy, gdy się go najpierw podniesie.',
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'regal-ogrodowy',
    nazwa: 'Regał ogrodowy',
    kategoria: 'przechowywanie',
    opis: 'Otwarty regał do szopy, garażu albo pod wiatę. Same proste cięcia, a mieści wszystko, co inaczej stoi na podłodze.',
    trudnosc: 1,
    czas: '3–4 godziny',
    narzedzia: ['piła', 'wkrętarka', 'poziomica', 'kątownik'],
    parametry: [
      par.szerokosc(900, 600, 1500, 'Powyżej 1 m półka ugina się pod ciężarem — wstaw wtedy podpórkę pośrednią.'),
      par.glebokosc(400, 250, 600),
      par.wysokosc(1800, 900, 2200),
      par.wlasny('polki', 'Liczba półek', 4, 2, 6),
    ],
    buduj: (w) => {
      const s = warsztat()
      const szer = w.szerokosc
      const gl = w.glebokosc
      const wys = w.wysokosc
      const polek = Math.round(w.polki)
      const nogaB = 45
      const xNog = [nogaB / 2, szer - nogaB / 2]
      const yNog = [nogaB / 2, gl - nogaB / 2]

      s.ustaw('nogi', T(nogaB, 70))
      for (const x of xNog) {
        for (const y of yNog) {
          s.pion({ nazwa: 'Noga', x, y, od: 0, do: wys, wkretow: 6 })
        }
      }

      s.ustaw('rama', T(25, 70))
      const wysokosciPolek = rownyRozstaw(150, wys - 150, polek)
      for (const z of wysokosciPolek) {
        for (const y of yNog) {
          s.wzdluz({ nazwa: 'Listwa nośna półki', od: xNog[0], do: xNog[1], y, z, obrot: 'sztorc', wkretow: 4 })
        }
        for (const x of xNog) {
          s.wszerz({ nazwa: 'Poprzeczka półki', x, od: yNog[0], do: yNog[1], z, obrot: 'sztorc', wkretow: 4 })
        }
      }

      s.ustaw('stezenia', T(20, 90))
      s.ukos({
        nazwa: 'Zastrzał tylny',
        start: P(xNog[0], yNog[1] + nogaB / 2 + 10, 150),
        koniec: P(xNog[1], yNog[1] + nogaB / 2 + 10, wys - 150),
        plaszczyzna: P(0, 1, 0),
        wkretow: 4,
        uwaga: 'jedna listwa po przekątnej tyłu wystarczy, żeby regał nie chodził na boki',
      })

      s.ustaw('polki', T(25, 140))
      for (const z of wysokosciPolek) {
        const polka = rozkladDesek(gl - nogaB, 140, 5)
        for (const yLok of polka.srodki) {
          s.wzdluz({
            nazwa: 'Deska półki',
            od: 0,
            do: szer,
            y: nogaB / 2 + yLok,
            z: z + 47,
            wkretow: 4,
          })
        }
      }

      return s.zbior()
    },
    opisyEtapow: {
      nogi: 'Zrób najpierw dwa boki na płasko: po dwie nogi i listwy nośne półek między nimi. Dopiero potem postaw je i zepnij poprzecznie.',
      rama: 'Wypoziomuj każdą półkę osobno, zanim dokręcisz na mocno. Regał na nierównej podłodze garażu wygląda potem, jakby był zrobiony krzywo.',
      stezenia: 'Jedna listwa przybita po przekątnej z tyłu zmienia regał chwiejny w sztywny. To najtańszy element całego mebla i najczęściej pomijany.',
      polki: 'Ułóż deski półek na listwach. Nie trzeba ich przykręcać wszystkich — dwie skrajne deski na półce wystarczą, resztę można zostawić luźno, żeby dało się je zdjąć do umycia.',
    },
    wskazowki: [
      'Przy półce szerszej niż metr wstaw dodatkową nogę pośrodku albo podepnij listwę nośną zastrzałem. Deska 25 mm z ciężarem puszek farby ugina się na metrze wyraźnie.',
      'Najniższą półkę zawieś 15 cm nad podłogą. Wtedy da się pod nią zamieść i nic nie stoi w wodzie, gdy garaż zaleje.',
    ],
  },
]
