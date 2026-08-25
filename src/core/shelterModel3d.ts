/**
 * Model przestrzenny wiaty — te same bryły i ten sam format co przy dachu,
 * więc rysuje je ten sam silnik i ta sama instrukcja montażu.
 *
 * UKŁAD WSPÓŁRZĘDNYCH (w milimetrach)
 *   X — wzdłuż wiaty; 0 na końcu okapu, osie skrajnych słupów odsunięte
 *       o wysunięcie boczne
 *   Y — w poprzek; 0 w osi pierwszego rzędu słupów, `width` w osi drugiego
 *   Z — w górę; 0 na POSADZCE, nie na oczepie. Wiata stoi na gruncie i to
 *       od gruntu mierzy się wszystkie wysokości, łącznie z głębokością stóp.
 */

import type { Belka, Model3D, Punkt3, Wymiar3 } from './model3d'
import type { ShelterCalculation } from './shelterMaterials'
import { deg2rad } from './geometry'

const p3 = (x: number, y: number, z: number): Punkt3 => ({ x, y, z })

/** Buduje model przestrzenny wiaty na podstawie wyników obliczeń. */
export function zbudujModelWiaty(w: ShelterCalculation): Model3D {
  const { input, geom, posts } = w
  const belki: Belka[] = []
  let licznik = 0
  const dodaj = (b: Omit<Belka, 'id'>) => {
    belki.push({ ...b, id: `w${licznik++}` })
  }

  const a = deg2rad(input.pitchDeg)
  const tan = Math.tan(a)
  const dwuspadowy = geom.slopes === 2
  const przyscienne = input.kind === 'zadaszenie'

  const szer = input.width
  const okapBok = input.eavesSide
  const okapPrzod = input.eavesFront
  const dlugoscDachu = geom.roofLength

  // Wierzch oczepu po stronie niskiej — poziom, na którym leżą krokwie.
  const oczepGora = input.clearHeight + input.beamSection.h
  /** Wysokość wierzchu połaci nad posadzką w danym miejscu przekroju. */
  const zPolaci = (y: number): number =>
    dwuspadowy
      ? oczepGora + (geom.run - Math.abs(y - szer / 2)) * tan
      : oczepGora + y * tan

  // Osie słupów wzdłuż wiaty.
  const osieX: number[] = []
  for (let i = 0; i < posts.perRow; i++) osieX.push(okapBok + i * posts.spacing)

  // Rzędy słupów w poprzek: przyścienne ma tylko przedni.
  const rzedyY = przyscienne ? [0] : [0, szer]

  // ---------- stopy fundamentowe ----------
  for (const y of rzedyY) {
    for (const x of osieX) {
      dodaj({
        nazwa: 'Stopa fundamentowa',
        etap: 'stopy',
        start: p3(x, y, -input.footingDepth),
        koniec: p3(x, y, 0),
        gora: p3(0, 1, 0),
        b: input.footingSize,
        h: input.footingSize,
      })
    }
  }
  if (dwuspadowy && input.hasRidgeBeam) {
    for (const x of osieX) {
      dodaj({
        nazwa: 'Stopa fundamentowa',
        etap: 'stopy',
        start: p3(x, szer / 2, -input.footingDepth),
        koniec: p3(x, szer / 2, 0),
        gora: p3(0, 1, 0),
        b: input.footingSize,
        h: input.footingSize,
      })
    }
  }

  // ---------- słupy ----------
  const slup = input.postSection
  for (const y of rzedyY) {
    // Przy jednospadowym drugi rząd sięga wyżej o całe wzniesienie połaci.
    const wysokosc = y === 0 ? geom.lowPostHeight : geom.highPostHeight
    for (const x of osieX) {
      dodaj({
        nazwa: dwuspadowy || przyscienne ? 'Słup' : y === 0 ? 'Słup niski' : 'Słup wysoki',
        etap: 'slupy',
        start: p3(x, y, 0),
        koniec: p3(x, y, wysokosc),
        gora: p3(0, 1, 0),
        b: slup.b,
        h: slup.h,
      })
    }
  }
  if (dwuspadowy && input.hasRidgeBeam) {
    for (const x of osieX) {
      dodaj({
        nazwa: 'Słup kalenicowy',
        etap: 'slupy',
        start: p3(x, szer / 2, 0),
        koniec: p3(x, szer / 2, geom.ridgePostHeight),
        gora: p3(0, 1, 0),
        b: slup.b,
        h: slup.h,
      })
    }
  }

  // ---------- oczepy i belka ścienna ----------
  const oczep = input.beamSection
  for (const y of rzedyY) {
    const spod = y === 0 ? geom.lowPostHeight : geom.highPostHeight
    dodaj({
      nazwa: 'Oczep',
      etap: 'oczepy',
      start: p3(0, y, spod + oczep.h / 2),
      koniec: p3(dlugoscDachu, y, spod + oczep.h / 2),
      gora: p3(0, 0, 1),
      b: oczep.b,
      h: oczep.h,
    })
  }
  if (przyscienne) {
    dodaj({
      nazwa: 'Belka ścienna',
      etap: 'oczepy',
      start: p3(0, szer, geom.highPostHeight + oczep.h / 2),
      koniec: p3(dlugoscDachu, szer, geom.highPostHeight + oczep.h / 2),
      gora: p3(0, 0, 1),
      b: oczep.b,
      h: oczep.h,
    })
  }
  if (dwuspadowy && input.hasRidgeBeam) {
    dodaj({
      nazwa: 'Belka kalenicowa',
      etap: 'platwie',
      start: p3(0, szer / 2, geom.ridgePostHeight + input.ridgeSection.h / 2),
      koniec: p3(dlugoscDachu, szer / 2, geom.ridgePostHeight + input.ridgeSection.h / 2),
      gora: p3(0, 0, 1),
      b: input.ridgeSection.b,
      h: input.ridgeSection.h,
    })
  }

  // ---------- miecze ----------
  if (input.hasBraces) {
    const arm = input.braceArm
    const mie = input.braceSection

    // Wzdłużne: w płaszczyźnie oczepu, po parze na każde pole między słupami.
    for (const y of rzedyY) {
      const spod = y === 0 ? geom.lowPostHeight : geom.highPostHeight
      for (let i = 0; i < posts.bays; i++) {
        const xLewy = osieX[i]
        const xPrawy = osieX[i + 1]
        dodaj({
          nazwa: 'Miecz wzdłużny',
          etap: 'zastrzaly',
          start: p3(xLewy, y, spod - arm),
          koniec: p3(xLewy + arm, y, spod),
          gora: p3(0, 1, 0),
          b: mie.b,
          h: mie.h,
        })
        dodaj({
          nazwa: 'Miecz wzdłużny',
          etap: 'zastrzaly',
          start: p3(xPrawy, y, spod - arm),
          koniec: p3(xPrawy - arm, y, spod),
          gora: p3(0, 1, 0),
          b: mie.b,
          h: mie.h,
        })
      }
    }

    // Poprzeczne: usztywniają ramę w drugą stronę. Przy zadaszeniu tę rolę
    // przejmuje ściana budynku, więc ich nie ma.
    if (!przyscienne) {
      for (const x of osieX) {
        for (const y of rzedyY) {
          const spod = y === 0 ? geom.lowPostHeight : geom.highPostHeight
          const znak = y === 0 ? 1 : -1
          dodaj({
            nazwa: 'Miecz poprzeczny',
            etap: 'zastrzaly',
            start: p3(x, y, spod - arm),
            koniec: p3(x, y + znak * arm, spod),
            gora: p3(1, 0, 0),
            b: mie.b,
            h: mie.h,
          })
        }
      }
    }
  }

  // ---------- krokwie ----------
  const kro = input.rafterSection
  /** Wektor prostopadły do połaci, skierowany na zewnątrz dachu. */
  const goraPolaci = (znak: 1 | -1): Punkt3 => p3(0, -znak * Math.sin(a), Math.cos(a))

  const osieKrokwi: number[] = []
  for (let i = 0; i < w.rafters.countPerSlope; i++) {
    osieKrokwi.push(kro.b / 2 + i * w.rafters.spacing)
  }

  /**
   * Krokiew leży na wierzchu oczepu, więc jej oś idzie o pół wysokości wyżej.
   * Podnosimy ją PIONOWO, a nie prostopadle do połaci: czoła krokwi są cięte
   * pionowo, więc ich położenie w poprzek wiaty ma zostać nietknięte.
   */
  const cosA = Math.cos(a)
  const ponadPolac = (y: number, ile: number): number =>
    zPolaci(y) + (cosA > 1e-9 ? ile / cosA : ile)
  const osKrokwi = (y: number): Punkt3 => p3(0, y, ponadPolac(y, kro.h / 2))

  const nazwaKrokwi = input.kind === 'pergola' ? 'Belka poprzeczna' : 'Krokiew'

  for (const x of osieKrokwi) {
    if (dwuspadowy) {
      for (const znak of [1, -1] as const) {
        const yOkap = znak === 1 ? -okapPrzod : szer + okapPrzod
        const poczatek = osKrokwi(yOkap)
        const koniec = osKrokwi(szer / 2)
        dodaj({
          nazwa: nazwaKrokwi,
          etap: 'krokwie',
          start: p3(x, poczatek.y, poczatek.z),
          koniec: p3(x, koniec.y, koniec.z),
          gora: goraPolaci(znak),
          b: kro.b,
          h: kro.h,
        })
      }
    } else {
      // Przy zadaszeniu krokiew kończy się na belce ściennej — dalej jest mur.
      const poczatek = osKrokwi(-okapPrzod)
      const koniec = osKrokwi(przyscienne ? szer : szer + okapPrzod)
      dodaj({
        nazwa: nazwaKrokwi,
        etap: 'krokwie',
        start: p3(x, poczatek.y, poczatek.z),
        koniec: p3(x, koniec.y, koniec.z),
        gora: goraPolaci(1),
        b: kro.b,
        h: kro.h,
      })
    }
  }

  // ---------- warstwy na krokwiach ----------
  dodajWarstwy(dodaj, w, {
    osieKrokwi,
    zPolaci,
    goraPolaci,
    dwuspadowy,
    szer,
    okapPrzod,
    gornaKrawedz: przyscienne ? szer : szer + okapPrzod,
    dlugoscDachu,
  })

  const wymiary = zbudujWymiary(w, osieX, dlugoscDachu)

  const zasieg = Math.max(dlugoscDachu, geom.roofWidth, geom.topHeight)
  return {
    belki,
    wymiary,
    srodek: p3(dlugoscDachu / 2, szer / 2, geom.topHeight / 2),
    promien: zasieg * 0.75 + Math.max(okapPrzod, okapBok),
  }
}

/** Wspólne dane potrzebne przy układaniu łat, kontrłat i szczeblin. */
interface KontekstWarstw {
  osieKrokwi: number[]
  zPolaci: (y: number) => number
  goraPolaci: (znak: 1 | -1) => Punkt3
  dwuspadowy: boolean
  szer: number
  okapPrzod: number
  /** Miejsce, w którym połać się kończy: kalenica, okap albo ściana budynku. */
  gornaKrawedz: number
  dlugoscDachu: number
}

/**
 * Dokłada kontrłaty, łaty i szczebliny.
 *
 * Wszystkie leżą NA krokwiach, więc każdą trzeba podnieść prostopadle do
 * połaci o połowę wysokości krokwi i połowę własnej — inaczej wtapiałyby się
 * w krokiew i model pokazywałby coś, czego na budowie nie ma.
 */
function dodajWarstwy(
  dodaj: (b: Omit<Belka, 'id'>) => void,
  w: ShelterCalculation,
  k: KontekstWarstw,
): void {
  const { input } = w
  const kro = input.rafterSection
  const a = deg2rad(input.pitchDeg)
  const cos = Math.cos(a)

  // Tak jak krokwie, warstwy podnosimy pionowo — inaczej rozstaw mierzony
  // po połaci przestałby się zgadzać z tym, co wyszło w zestawieniu.
  const naKrokwi = (y: number, wysokoscElementu: number): Punkt3 =>
    p3(0, y, k.zPolaci(y) + (kro.h / 2 + wysokoscElementu / 2) / (cos > 1e-9 ? cos : 1))

  const kierunki: Array<1 | -1> = k.dwuspadowy ? [1, -1] : [1]
  const pokrycie = input.covering

  // Kontrłaty wchodzą tylko tam, gdzie jest membrana — czyli pod dachówką
  // i blachodachówką. Przy blasze na płatwiach nie ma ich po co kłaść.
  if (input.hasMembrane && pokrycie !== 'brak') {
    const kon = input.counterBattenSection
    for (const znak of kierunki) {
      for (const x of k.osieKrokwi) {
        const yOkap = znak === 1 ? -k.okapPrzod : k.szer + k.okapPrzod
        const yGora = k.dwuspadowy ? k.szer / 2 : k.gornaKrawedz
        const od = naKrokwi(yOkap, kon.h)
        const doGory = naKrokwi(yGora, kon.h)
        dodaj({
          nazwa: 'Kontrłata',
          etap: 'kontrlaty',
          start: p3(x, od.y, od.z),
          koniec: p3(x, doGory.y, doGory.z),
          gora: k.goraPolaci(znak),
          b: kon.b,
          h: kon.h,
        })
      }
    }
  }

  // Łaty albo płatwie poprzeczne pod pokryciem.
  if (pokrycie !== 'brak' && input.battenSpacing > 0) {
    const lata = input.battenSection
    const podniesienie = input.hasMembrane ? input.counterBattenSection.h : 0
    // Rozstaw podany jest wzdłuż spadku, a rozkładamy je po rzucie poziomym.
    const krokY = input.battenSpacing * cos

    for (const znak of kierunki) {
      const yStart = znak === 1 ? -k.okapPrzod : k.szer + k.okapPrzod
      const yKoniec = k.dwuspadowy ? k.szer / 2 : k.gornaKrawedz
      const zasieg = Math.abs(yKoniec - yStart)
      const ile = Math.max(1, Math.floor(zasieg / Math.max(1, krokY)))

      for (let i = 0; i <= ile; i++) {
        const y = yStart + znak * Math.min(i * krokY, zasieg)
        const os = naKrokwi(y, lata.h + 2 * podniesienie)
        dodaj({
          nazwa: input.covering === 'poliweglan' || input.covering === 'blacha-trapezowa'
            ? 'Płatew poprzeczna'
            : 'Łata',
          etap: 'laty',
          start: p3(0, os.y, os.z),
          koniec: p3(k.dlugoscDachu, os.y, os.z),
          gora: k.goraPolaci(znak),
          b: lata.b,
          h: lata.h,
        })
      }
    }
  }

  // Szczebliny pergoli — leżą wzdłuż wiaty, na wierzchu belek poprzecznych.
  if (input.hasSlats) {
    const sz = input.slatSection
    const krokY = input.slatSpacing * cos
    for (const znak of kierunki) {
      const yStart = znak === 1 ? -k.okapPrzod : k.szer + k.okapPrzod
      const yKoniec = k.dwuspadowy ? k.szer / 2 : k.gornaKrawedz
      const zasieg = Math.abs(yKoniec - yStart)
      const ile = Math.max(1, Math.floor(zasieg / Math.max(1, krokY)))
      for (let i = 0; i <= ile; i++) {
        const y = yStart + znak * Math.min(i * krokY, zasieg)
        const os = naKrokwi(y, sz.h)
        dodaj({
          nazwa: 'Szczeblina',
          etap: 'poprzeczki',
          start: p3(0, os.y, os.z),
          koniec: p3(k.dlugoscDachu, os.y, os.z),
          gora: k.goraPolaci(znak),
          b: sz.b,
          h: sz.h,
        })
      }
    }
  }
}

/** Linie wymiarowe pokazywane przy modelu wiaty. */
function zbudujWymiary(
  w: ShelterCalculation,
  osieX: number[],
  dlugoscDachu: number,
): Wymiar3[] {
  const { input, geom, posts } = w
  const cm = (mm: number) => `${Math.round(mm / 10)} cm`
  const xPierwszy = osieX[0] ?? 0
  const xDrugi = osieX[1] ?? xPierwszy

  const wymiary: Wymiar3[] = [
    {
      od: p3(xPierwszy, 0, 0),
      do: p3(xPierwszy, input.width, 0),
      etykieta: `szerokość ${cm(input.width)}`,
      odsuniecie: p3(-1, 0, 0),
    },
    {
      od: p3(xPierwszy, 0, 0),
      do: p3(osieX[osieX.length - 1] ?? dlugoscDachu, 0, 0),
      etykieta: `długość ${cm(input.length)}`,
      odsuniecie: p3(0, -1, 0),
    },
    {
      od: p3(xPierwszy, 0, 0),
      do: p3(xPierwszy, 0, geom.lowPostHeight),
      etykieta: `w świetle ${cm(geom.lowPostHeight)}`,
      odsuniecie: p3(0, -1, 0),
    },
  ]

  if (posts.perRow > 1) {
    wymiary.push({
      od: p3(xPierwszy, 0, 0),
      do: p3(xDrugi, 0, 0),
      etykieta: `słupy co ${cm(posts.spacing)}`,
      odsuniecie: p3(0, -1, 0),
    })
  }

  // Wysokość całości mierzymy tam, gdzie konstrukcja sięga najwyżej.
  const yNajwyzej = geom.slopes === 2 ? input.width / 2 : input.width
  wymiary.push({
    od: p3(dlugoscDachu, yNajwyzej, 0),
    do: p3(dlugoscDachu, yNajwyzej, geom.topHeight),
    etykieta: `wysokość ${cm(geom.topHeight)}`,
    odsuniecie: p3(1, 0, 0),
  })

  return wymiary
}
