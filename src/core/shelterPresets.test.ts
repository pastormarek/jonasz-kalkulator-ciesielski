import { describe, it, expect } from 'vitest'
import { SHELTER_PRESETS, presetsFor, applyPreset } from './shelterPresets'
import { defaultShelter, type ShelterKind } from './shelter'
import { calculateShelter } from './shelterMaterials'

const RODZAJE: ShelterKind[] = ['wiata', 'zadaszenie', 'pergola']

describe('gotowe modele', () => {
  it('każdy rodzaj ma z czego wybierać', () => {
    for (const kind of RODZAJE) {
      expect(presetsFor(kind).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('identyfikatory i nazwy się nie powtarzają', () => {
    const id = SHELTER_PRESETS.map((p) => p.id)
    const nazwy = SHELTER_PRESETS.map((p) => p.nazwa)
    expect(new Set(id).size).toBe(id.length)
    expect(new Set(nazwy).size).toBe(nazwy.length)
  })

  it('model trafia na listę tego rodzaju, który deklaruje', () => {
    for (const kind of RODZAJE) {
      for (const p of presetsFor(kind)) {
        expect(applyPreset(p, defaultShelter()).kind).toBe(kind)
      }
    }
  })

  // To jest właściwy sens tych testów: model, który po wczytaniu od razu
  // krzyczy ostrzeżeniem, byłby gorszy niż jego brak.
  it('żaden model nie startuje z ostrzeżeniem', () => {
    for (const p of SHELTER_PRESETS) {
      const w = calculateShelter(applyPreset(p, defaultShelter()))
      expect(`${p.id}: ${w.warnings.join(' | ')}`).toBe(`${p.id}: `)
    }
  })

  it('każdy model da się policzyć i zamówić z belek handlowych', () => {
    for (const p of SHELTER_PRESETS) {
      const w = calculateShelter(applyPreset(p, defaultShelter()))
      expect(w.timber.length).toBeGreaterThan(3)
      expect(w.purchaseVolumeM3).toBeGreaterThan(0)
      expect(w.footing.count).toBe(w.posts.total)
      for (const g of w.groups) expect(g.plan.impossible).toEqual([])
    }
  })

  it('wczytanie modelu zostawia ustawienia zaopatrzenia', () => {
    const moje = {
      ...defaultShelter(),
      stockMode: 'na-wymiar' as const,
      stockLengths: [8000, 10000, 12000],
      cutAllowance: 150,
      hasImpregnation: false,
    }
    const wynik = applyPreset(SHELTER_PRESETS[0], moje)
    expect(wynik.stockMode).toBe('na-wymiar')
    expect(wynik.stockLengths).toEqual([8000, 10000, 12000])
    expect(wynik.cutAllowance).toBe(150)
    expect(wynik.hasImpregnation).toBe(false)
    // ...ale wymiary bierze już z modelu.
    expect(wynik.width).toBe(SHELTER_PRESETS[0].dane.width)
  })

  it('wczytanie modelu czyści to, co zostało po poprzednim', () => {
    const poPergoli = { ...defaultShelter(), hasSlats: true, slatSpacing: 150, hasRidgeBeam: true }
    const wiata = SHELTER_PRESETS.find((p) => p.id === 'wiata-jedno-auto')!
    const wynik = applyPreset(wiata, poPergoli)
    expect(wynik.hasSlats).toBe(false)
    expect(wynik.hasRidgeBeam).toBe(false)
  })
})
