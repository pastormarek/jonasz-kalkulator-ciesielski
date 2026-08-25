/**
 * Zestawienie materiału mebla — od przepisu do listy zakupów i instrukcji.
 *
 * Ten moduł nie wie nic o żadnym konkretnym meblu. Bierze części, które ułożył
 * przepis, i robi z nich cztery rzeczy: listę części z wymiarami, plan cięcia
 * i zakupy, wykaz wkrętów i wykończenia oraz instrukcję montażu rozbitą na
 * ponumerowane kroki. Dlatego dopisanie mebla do katalogu nie wymaga tknięcia
 * ani jednej linii tutaj.
 *
 * PLAN CIĘCIA JEST TEN SAM CO PRZY DACHU. Problem „mam listę odcinków i belki
 * w kilku długościach handlowych, kupić jak najmniej” nie zmienia się od tego,
 * że zamiast krokwi tniemy nogi ławki — więc korzystamy z `groupBySection`
 * i `planCuts` z modułu dachowego zamiast pisać drugi taki sam kod.
 */

import type { Etap } from './model3d'
import { OPIS_ETAPU, ETAPY } from './model3d'
import { groupBySection, type TimberGroup, type FastenerItem } from './materials'
import { surfaceM2 } from './cutting'
import {
  GATUNEK_INFO,
  WYKONCZENIE_INFO,
  czesciDoTarcicy,
  dlugoscCzesci,
  obrysCzesci,
  pozycjeCzesci,
  wymiaryDla,
  type Czesc,
  type DodatkowyLacznik,
  type FurnitureInput,
  type PozycjaCzesci,
  type PrzepisMebla,
  type Wymiary,
} from './furniture'
import { przepisDla } from './furnitureCatalog'

/** Jeden ponumerowany krok instrukcji montażu. */
export interface KrokMontazu {
  numer: number
  etap: Etap
  tytul: string
  opis: string
  /** Części, które montuje się w tym kroku. */
  pozycje: PozycjaCzesci[]
  /** Orientacyjna liczba wkrętów na ten krok. */
  wkretow: number
}

/** Wymiary gabarytowe gotowego mebla [mm]. */
export interface Gabaryt {
  dlugosc: number
  szerokosc: number
  wysokosc: number
}

/** Komplet wyników obliczeń jednego mebla. */
export interface FurnitureCalculation {
  input: FurnitureInput
  przepis: PrzepisMebla
  /** Wymiary po uzupełnieniu domyślnych i przycięciu do zakresu. */
  wymiary: Wymiary
  czesci: Czesc[]
  /** Lista części: nazwa, przekrój, długość, sztuki. */
  pozycje: PozycjaCzesci[]
  groups: TimberGroup[]
  kroki: KrokMontazu[]
  fasteners: FastenerItem[]
  laczniki: DodatkowyLacznik[]
  gabaryt: Gabaryt
  /** Powierzchnia drewna do pomalowania [m²]. */
  powierzchniaM2: number
  /** Ile litrów oleju albo lakierobejcy trzeba kupić. */
  wykonczenieLitry: number
  /** Masa gotowego mebla [kg] — czy da się go w ogóle przenieść. */
  masaKg: number
  totalVolumeM3: number
  purchaseVolumeM3: number
  /** Metry bieżące tarcicy do kupienia — tak liczy się drewno meblowe. */
  metryBiezace: number
  warnings: string[]
  notes: string[]
}

/** Handlowe długości wkrętów do drewna [mm]. */
const DLUGOSCI_WKRETOW = [30, 40, 50, 60, 70, 80, 90, 100, 120]

/** Na tyle wkręt musi wejść w element, do którego przykręcamy [mm]. */
const ZAKOTWIENIE = 40

/**
 * Dłuższych wkrętów do mebla się nie używa — tam, gdzie trzeba więcej,
 * idzie śruba przelotowa, a te przepis wymienia osobno jako łączniki.
 */
const MAX_DLUGOSC_WKRETA = 120

/** Domyślna liczba wkrętów mocujących jedną część, gdy przepis nie mówi inaczej. */
const WKRETOW_DOMYSLNIE = 2

/** Zapas wkrętów — zawsze któryś się zerwie albo wpadnie w trawę. */
const ZAPAS_WKRETOW = 1.15

export function calculateFurniture(input: FurnitureInput): FurnitureCalculation {
  const warnings: string[] = []
  const notes: string[] = []

  const przepis = przepisDla(input.model)
  const wymiary = wymiaryDla(przepis, input.wymiary)
  const gatunek = GATUNEK_INFO[input.gatunek]
  const wykonczenie = WYKONCZENIE_INFO[input.wykonczenie]

  const czesci = przepis.buduj(wymiary, { gatunek: input.gatunek })
  const pozycje = pozycjeCzesci(czesci)

  // --- drewno ---
  const tarcica = czesciDoTarcicy(pozycje, input.cutAllowance)
  const groups = groupBySection(tarcica, input.stockLengths)
  const totalVolumeM3 = groups.reduce((s, g) => s + g.volumeM3, 0)
  const purchaseVolumeM3 = groups.reduce(
    (s, g) => s + (g.section.b / 1000) * (g.section.h / 1000) * (g.plan.totalStock / 1000),
    0,
  )
  const metryBiezace = groups.reduce((s, g) => s + g.plan.totalStock / 1000, 0)

  for (const g of groups) {
    if (g.plan.impossible.length > 0) {
      const najdluzszy = Math.max(...g.plan.impossible)
      warnings.push(
        `Element o przekroju ${g.label} ma ${fmtM(najdluzszy)} m i nie zmieści się w żadnej dostępnej długości tarcicy. Zamów drewno na wymiar albo zmniejsz wymiar mebla.`,
      )
    }
  }

  // --- wkręty ---
  const fasteners = policzWkrety(czesci)
  const laczniki = przepis.laczniki ? przepis.laczniki(wymiary) : []

  // --- wykończenie ---
  // Liczymy pole powierzchni bocznej każdej części osobno. Czoła pomijamy:
  // przy meblu z desek stanowią ułamek całości i mieszczą się w zapasie
  // wynikającym z tego, że nikt nie maluje idealnie równą warstwą.
  let powierzchniaM2 = 0
  for (const c of czesci) {
    if (c.nieDrewno) continue
    powierzchniaM2 += surfaceM2(c.b, c.h, dlugoscCzesci(c))
  }
  const wykonczenieLitry =
    wykonczenie.wydajnoscM2NaLitr > 0
      ? (powierzchniaM2 * wykonczenie.warstwy) / wykonczenie.wydajnoscM2NaLitr
      : 0

  // --- masa i gabaryt ---
  const masaKg = totalVolumeM3 * gatunek.gestosc
  const gabaryt = gabarytZCzesci(czesci)

  // Sprawdzenia własne przepisu — o rzeczach, o których wie tylko on sam.
  if (przepis.ostrzezenia) warnings.push(...przepis.ostrzezenia(wymiary))

  // --- ostrzeżenia i uwagi doboru materiału ---
  const gdzieStoi = przepis.wilgoc ?? (przepis.kategoria === 'dom' ? 'wnetrze' : 'zewnatrz')
  if (gdzieStoi === 'grunt' && !gatunek.naZewnatrz) {
    warnings.push(
      `${gatunek.label} w kontakcie z ziemią i stałą wilgocią wytrzyma około ${gatunek.trwaloscLat} lat. Do tego mebla weź sosnę impregnowaną ciśnieniowo, modrzew, dąb albo akację.`,
    )
  } else if (gdzieStoi !== 'wnetrze' && !gatunek.naZewnatrz) {
    if (input.wykonczenie === 'brak') {
      warnings.push(
        `${gatunek.label} bez żadnego wykończenia nie nadaje się na dwór — wytrzyma około ${gatunek.trwaloscLat} lat. Wybierz inny gatunek albo dołóż impregnat i olej.`,
      )
    } else {
      notes.push(
        `${gatunek.label} na dworze wymaga odnawiania powłoki co sezon. Trwalej wyjdzie modrzew albo sosna impregnowana ciśnieniowo.`,
      )
    }
  }

  if (gdzieStoi === 'wnetrze' && input.gatunek === 'sosna-impregnowana') {
    notes.push(
      'Do wnętrza nie bierz drewna impregnowanego ciśnieniowo — potrafi pachnieć tygodniami. Zwykła sosna albo świerk plus olej wewnętrzny wystarczą.',
    )
  }

  if (input.gatunek === 'dab' || input.gatunek === 'akacja') {
    notes.push(
      `${gatunek.label} jest twardy: nawiercaj otwór pod każdy wkręt, inaczej rozłupiesz deskę albo urwiesz łeb.`,
    )
  }

  if (input.gatunek === 'sosna-impregnowana') {
    notes.push(
      'Do drewna impregnowanego ciśnieniowo bierz wkręty nierdzewne albo ocynkowane ogniowo. Zwykły ocynk galwaniczny koroduje w kontakcie z solami miedzi i zostawia czarne smugi wokół każdego łba.',
      'Końce docinanych elementów zamaluj preparatem do impregnacji. Wnętrze belki nie jest nasączone tak jak powierzchnia i to od czoła zaczyna się gnicie.',
    )
  }

  if (gdzieStoi !== 'wnetrze' && input.wykonczenie === 'brak' && gatunek.naZewnatrz) {
    notes.push(
      `${gatunek.label} bez wykończenia zszarzeje w ciągu roku, ale nie straci wytrzymałości. To decyzja o wyglądzie, nie o trwałości.`,
    )
  }

  if (masaKg > 60) {
    notes.push(
      `Gotowy mebel waży około ${Math.round(masaKg)} kg. Skręcaj go tam, gdzie ma stać, albo zaplanuj złącza rozbieralne — sam go nie przeniesiesz.`,
    )
  }

  // --- instrukcja ---
  const kroki = zbudujKroki(przepis, pozycje, czesci)

  return {
    input,
    przepis,
    wymiary,
    czesci,
    pozycje,
    groups,
    kroki,
    fasteners,
    laczniki,
    gabaryt,
    powierzchniaM2,
    wykonczenieLitry,
    masaKg,
    totalVolumeM3,
    purchaseVolumeM3,
    metryBiezace,
    warnings,
    notes,
  }
}

/**
 * Liczy wkręty na podstawie tego, co i do czego jest przykręcane.
 *
 * Długość wkrętu to grubość mocowanej części plus zakotwienie w elemencie,
 * do którego przykręcamy — te 40 mm to głębokość, przy której gwint trzyma
 * naprawdę, a nie tylko rozpycha drewno. Kusi reguła „trzy razy grubość”,
 * ale przy kantówce 70 × 70 dawałaby wkręt dwudziestocentymetrowy, którego
 * nikt do mebla nie kupuje.
 */
function policzWkrety(czesci: Czesc[]): FastenerItem[] {
  const wg = new Map<number, number>()

  for (const c of czesci) {
    if (c.nieDrewno) continue
    const ile = c.wkretow ?? WKRETOW_DOMYSLNIE
    if (ile <= 0) continue
    const dlugosc = dlugoscWkreta(c.b)
    wg.set(dlugosc, (wg.get(dlugosc) ?? 0) + ile)
  }

  return [...wg.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dlugosc, sztuk]) => ({
      name: `Wkręt do drewna ${srednicaWkreta(dlugosc)} × ${dlugosc} mm`,
      count: Math.ceil((sztuk * ZAPAS_WKRETOW) / 10) * 10,
      unit: 'szt.',
      note: 'z zapasem, zaokrąglone do pełnych dziesiątek',
    }))
}

function dlugoscWkreta(grubosc: number): number {
  const potrzebna = Math.min(grubosc + ZAKOTWIENIE, MAX_DLUGOSC_WKRETA)
  return DLUGOSCI_WKRETOW.find((d) => d >= potrzebna) ?? MAX_DLUGOSC_WKRETA
}

/** Średnica dobrana do długości — tak sprzedaje je każdy skład. */
function srednicaWkreta(dlugosc: number): string {
  if (dlugosc <= 40) return '3,5'
  if (dlugosc <= 60) return '4,0'
  if (dlugosc <= 90) return '4,5'
  return '5,0'
}

/**
 * Rozbija montaż na ponumerowane kroki.
 *
 * Kolejność bierzemy z `ETAPY`, czyli z tej samej listy, po której idzie
 * montaż dachu i wiaty. Etapy, w których nic nie stoi, wypadają same —
 * dzięki temu instrukcja półki ściennej ma dwa kroki, a budy dla psa cztery,
 * i nikt nie musi tego nigdzie deklarować.
 */
function zbudujKroki(
  przepis: PrzepisMebla,
  pozycje: PozycjaCzesci[],
  czesci: Czesc[],
): KrokMontazu[] {
  const kroki: KrokMontazu[] = []

  for (const etap of ETAPY) {
    const wEtapie = pozycje.filter((p) => p.etap === etap)
    if (wEtapie.length === 0) continue

    const wkretow = czesci
      .filter((c) => c.etap === etap && !c.nieDrewno)
      .reduce((s, c) => s + (c.wkretow ?? WKRETOW_DOMYSLNIE), 0)

    kroki.push({
      numer: kroki.length + 1,
      etap,
      tytul: OPIS_ETAPU[etap].tytul,
      opis: przepis.opisyEtapow?.[etap] ?? OPIS_ETAPU[etap].opis,
      pozycje: wEtapie,
      wkretow,
    })
  }

  return kroki
}

/** Wymiary gabarytowe bryły mebla. */
function gabarytZCzesci(czesci: Czesc[]): Gabaryt {
  const o = obrysCzesci(czesci)
  return {
    dlugosc: Math.round(o.maxX - o.minX),
    szerokosc: Math.round(o.maxY - o.minY),
    wysokosc: Math.round(o.maxZ - o.minZ),
  }
}

const fmtM = (mm: number): string => (mm / 1000).toFixed(2)
