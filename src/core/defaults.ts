/**
 * Wartości domyślne i słowniki.
 *
 * Domyślne przekroje i rozstawy odpowiadają typowemu domowi jednorodzinnemu
 * budowanemu w Polsce. Mają być punktem wyjścia, a nie zaleceniem
 * konstrukcyjnym — dlatego aplikacja w kilku miejscach przypomina, żeby
 * sprawdzić je z projektem.
 */

import type { RoofInput, Covering, StockMode, SpliceSupport, RafterFixing } from './types'

/** Długości drewna dostępne od ręki w składzie budowlanym [mm]. */
export const STOCK_LENGTHS = [3000, 4000, 5000, 6000]

/**
 * Długości cięte na zamówienie [mm]. Tartaki realnie robią belki do 12 m,
 * choć transport i wniesienie takiej sztuki na dach to osobny temat.
 */
export const CUSTOM_LENGTHS = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000]

/** Najdłuższa belka, jaką da się zamówić na wymiar [mm]. */
export const CUSTOM_MAX_LENGTH = 12000

/** Zwraca dostępne długości dla wybranego sposobu zaopatrzenia. */
export function stockLengthsFor(mode: StockMode): number[] {
  return mode === 'na-wymiar' ? [...CUSTOM_LENGTHS] : [...STOCK_LENGTHS]
}

/** Opis podpory pod stykiem krokwi, używany w wynikach i na wydruku. */
export const SPLICE_SUPPORT_LABELS: Record<SpliceSupport, string> = {
  'sciana-kolankowa': 'ściana kolankowa',
  platew: 'płatew',
  wieniec: 'wieniec',
}

/** Popularne przekroje drewna konstrukcyjnego [mm]. */
export const COMMON_SECTIONS = [
  { b: 45, h: 145 },
  { b: 50, h: 150 },
  { b: 60, h: 160 },
  { b: 70, h: 140 },
  { b: 80, h: 160 },
  { b: 80, h: 180 },
  { b: 80, h: 200 },
  { b: 100, h: 200 },
  { b: 120, h: 120 },
  { b: 140, h: 140 },
  { b: 160, h: 160 },
]

/** Zalecany rozstaw łat dla poszczególnych pokryć [mm]. */
export const COVERING_INFO: Record<Covering, { label: string; battenSpacing: number; hint: string }> = {
  'dachowka-ceramiczna': {
    label: 'Dachówka ceramiczna',
    battenSpacing: 320,
    hint: 'Rozstaw wynika z długości krycia dachówki — sprawdź w karcie producenta.',
  },
  'dachowka-betonowa': {
    label: 'Dachówka betonowa',
    battenSpacing: 335,
    hint: 'Zwykle 31–34 cm. Cięższa od ceramicznej, więc sprawdź nośność więźby.',
  },
  blachodachowka: {
    label: 'Blachodachówka',
    battenSpacing: 350,
    hint: 'Rozstaw musi trafić w moduł arkusza — inaczej nie zejdzie się na zamku.',
  },
  'blacha-trapezowa': {
    label: 'Blacha trapezowa',
    battenSpacing: 400,
    hint: 'Najtańsze pokrycie z blachy. Rozstaw łat zależy od wysokości profilu — im niższa fala, tym gęściej.',
  },
  'blacha-na-rabek': {
    label: 'Blacha na rąbek',
    battenSpacing: 400,
    hint: 'Wymaga pełnego deskowania albo bardzo gęstego łacenia.',
  },
  'gont-bitumiczny': {
    label: 'Gont bitumiczny',
    battenSpacing: 0,
    hint: 'Kładziony na pełnym poszyciu — łat nie ma.',
  },
  inne: {
    label: 'Inne',
    battenSpacing: 350,
    hint: 'Rozstaw dobierz według instrukcji producenta pokrycia.',
  },
}

/** Opisy sposobów mocowania krokwi. */
export const FIXING_INFO: Record<RafterFixing, { label: string; hint: string }> = {
  wkrety: {
    label: 'Wkręty ciesielskie',
    hint: 'Po dwa wkręty na oparcie, wkręcane wprost w murłatę. Typowe długości 8×220, 8×240, 10×240 mm.',
  },
  katowniki: {
    label: 'Kątowniki',
    hint: 'Po dwa kątowniki na oparcie, każdy na komplet wkrętów. Sprawdź, czy projekt tego wymaga.',
  },
}

/** Nazwy kształtów dachu widoczne w interfejsie. */
export const SHAPE_LABELS = {
  gable: 'Dwuspadowy',
  shed: 'Jednospadowy',
  hip: 'Kopertowy',
} as const

/** Nazwy typów więźby widoczne w interfejsie. */
export const TRUSS_LABELS = {
  rafter: 'Krokwiowa',
  collar: 'Krokwiowo-jętkowa',
  purlin: 'Płatwiowo-kleszczowa',
} as const

/** Świeży projekt z sensownymi wartościami startowymi. */
export function defaultInput(): RoofInput {
  return {
    shape: 'gable',
    truss: 'collar',

    span: 8000,
    length: 12000,
    pitchDeg: 35,
    eaves: 600,
    gableOverhang: 400,

    rafterSpacingMax: 900,
    rafterSection: { b: 80, h: 180 },
    wallPlateSection: { b: 140, h: 140 },

    notchDepth: 30,
    // Zakładka jest droższa w robociźnie i wydłuża krokiew, więc nie
    // narzucamy jej domyślnie — ale cieśla podaje ją jako sposób, w jaki
    // robi się to porządnie, i pole jest tuż obok.
    ridgeJoint: 'czolowe',
    hasFascia: true,
    fasciaHeight: 200,

    collarHeight: 2200,
    collarSection: { b: 80, h: 160 },

    purlinCount: 1,
    purlinSection: { b: 140, h: 140 },
    postSection: { b: 140, h: 140 },
    postSpacingMax: 3500,
    hasClamps: true,
    clampSection: { b: 45, h: 145 },
    hasBraces: true,
    braceArm: 800,
    braceSection: { b: 100, h: 100 },

    covering: 'dachowka-ceramiczna',
    battenSpacing: 320,
    battenSection: { b: 40, h: 60 },
    counterBattenSection: { b: 25, h: 50 },
    hasSheathing: false,
    hasMembrane: true,
    hasInsulation: true,
    rafterFixing: 'wkrety',
    hasImpregnation: false,

    openings: [],

    cutAllowance: 100,
    stockLengths: [...STOCK_LENGTHS],
    stockMode: 'handlowe',
    splice: {
      enabled: false,
      atRun: 1200,
      support: 'sciana-kolankowa',
      overlap: 600,
    },
  }
}
