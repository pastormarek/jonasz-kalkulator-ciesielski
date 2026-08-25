import { describe, it, expect } from 'vitest'
import {
  defaultShelter,
  shelterGeometry,
  layoutPosts,
  braceGeometry,
  footings,
  gutters,
  type ShelterInput,
} from './shelter'
import { calculateShelter } from './shelterMaterials'
import { deg2rad } from './geometry'

const wiata = (over: Partial<ShelterInput> = {}): ShelterInput => ({ ...defaultShelter(), ...over })

/** Suma sztuk pozycji, których nazwa zaczyna się od podanego tekstu. */
function sztuk(items: Array<{ name: string; count: number }>, nazwa: string): number {
  return items.filter((t) => t.name.startsWith(nazwa)).reduce((s, t) => s + t.count, 0)
}

describe('rozkład słupów', () => {
  it('nie przekracza zadanego rozstawu', () => {
    const p = layoutPosts(9000, 3000, 2)
    expect(p.spacing).toBeLessThanOrEqual(3000)
    expect(p.bays).toBe(3)
    expect(p.perRow).toBe(4)
    expect(p.total).toBe(8)
  })

  it('dokłada słup, gdy pole wychodzi choćby o centymetr za szerokie', () => {
    const p = layoutPosts(6100, 3000, 2)
    expect(p.bays).toBe(3)
    expect(p.spacing).toBeCloseTo(2033.3, 1)
  })

  it('przy krótkiej wiacie zostawia same słupy narożne', () => {
    const p = layoutPosts(2500, 3000, 2)
    expect(p.bays).toBe(1)
    expect(p.perRow).toBe(2)
  })
})

describe('geometria wiaty', () => {
  it('dwuspadowa dzieli szerokość na dwie połacie', () => {
    const g = shelterGeometry(wiata({ width: 6000, pitchDeg: 30, eavesFront: 500 }))
    expect(g.slopes).toBe(2)
    expect(g.run).toBe(3000)
    expect(g.rafterLength).toBeCloseTo(3500 / Math.cos(deg2rad(30)), 3)
  })

  it('jednospadowa ma jedną połać na całej szerokości', () => {
    const g = shelterGeometry(wiata({ shape: 'jednospadowy', width: 4000, pitchDeg: 15, eavesFront: 300 }))
    expect(g.slopes).toBe(1)
    expect(g.run).toBe(4000)
    // Okap wystaje z obu stron jednej połaci.
    expect(g.rafterLength).toBeCloseTo(4600 / Math.cos(deg2rad(15)), 3)
  })

  it('przy jednospadowej drugi rząd słupów jest wyższy o wzniesienie połaci', () => {
    const g = shelterGeometry(
      wiata({ shape: 'jednospadowy', width: 4000, pitchDeg: 10, clearHeight: 2500 }),
    )
    expect(g.lowPostHeight).toBe(2500)
    expect(g.highPostHeight).toBeCloseTo(2500 + 4000 * Math.tan(deg2rad(10)), 3)
  })

  it('zadaszenie przyścienne stoi na jednym rzędzie słupów', () => {
    const g = shelterGeometry(wiata({ kind: 'zadaszenie', shape: 'jednospadowy' }))
    expect(g.postRows).toBe(1)
    expect(g.slopes).toBe(1)
  })

  it('zadaszenie ma okap tylko od frontu — po drugiej stronie stoi ściana', () => {
    const wolne = shelterGeometry(
      wiata({ shape: 'jednospadowy', width: 4000, eavesFront: 500, pitchDeg: 0 }),
    )
    const przy = shelterGeometry(
      wiata({ kind: 'zadaszenie', shape: 'jednospadowy', width: 4000, eavesFront: 500, pitchDeg: 0 }),
    )
    expect(wolne.rafterLength).toBeCloseTo(5000, 6)
    expect(przy.rafterLength).toBeCloseTo(4500, 6)
    expect(przy.roofWidth).toBe(4500)
  })

  it('zadaszenie przyścienne nigdy nie jest dwuspadowe, choćby wybrano ten kształt', () => {
    const g = shelterGeometry(wiata({ kind: 'zadaszenie', shape: 'dwuspadowy' }))
    expect(g.slopes).toBe(1)
  })

  it('belka kalenicowa dokłada trzeci rząd słupów', () => {
    const g = shelterGeometry(wiata({ hasRidgeBeam: true }))
    expect(g.postRows).toBe(3)
    expect(g.ridgePostHeight).toBeGreaterThan(g.lowPostHeight)
  })

  it('wierzch belki kalenicowej trafia w linię połaci', () => {
    const w = wiata({ hasRidgeBeam: true, width: 6000, pitchDeg: 25 })
    const g = shelterGeometry(w)
    const liniaPolaci = w.clearHeight + w.beamSection.h + g.run * Math.tan(deg2rad(25))
    expect(g.ridgePostHeight + w.ridgeSection.h).toBeCloseTo(liniaPolaci, 6)
  })

  it('okap obniża prześwit — im dłuższy i bardziej stromy, tym niżej', () => {
    const g = shelterGeometry(wiata({ clearHeight: 2400, eavesFront: 800, pitchDeg: 25 }))
    expect(g.eavesClearHeight).toBeCloseTo(2400 - 800 * Math.tan(deg2rad(25)), 3)
    expect(g.eavesClearHeight).toBeLessThan(2400)
  })

  it('powierzchnia połaci jest większa od rzutu dokładnie o 1/cos', () => {
    const g = shelterGeometry(wiata({ pitchDeg: 30 }))
    expect(g.roofAreaM2).toBeCloseTo(g.planAreaM2 / Math.cos(deg2rad(30)), 6)
  })

  it('dach płaski nie rośnie ponad rzut', () => {
    const g = shelterGeometry(wiata({ kind: 'pergola', shape: 'jednospadowy', pitchDeg: 0 }))
    expect(g.roofAreaM2).toBeCloseTo(g.planAreaM2, 6)
    expect(g.rise).toBe(0)
  })
})

describe('miecz', () => {
  it('przy równych ramionach tnie się pod 45°', () => {
    const b = braceGeometry(600)
    expect(b.cutAngleDeg).toBe(45)
    expect(b.length).toBeCloseTo(848.5, 1)
  })
})

describe('fundamenty', () => {
  it('liczy objętość stopy jako bok razy bok razy głębokość', () => {
    const f = footings(6, 400, 900)
    expect(f.volumeEachM3).toBeCloseTo(0.144, 6)
    expect(f.volumeM3).toBeCloseTo(0.864, 6)
    expect(f.count).toBe(6)
  })

  it('do zamówienia dokłada zapas, a wykop jest szerszy od stopy', () => {
    const f = footings(4, 400, 1000)
    expect(f.volumeWithSpareM3).toBeGreaterThan(f.volumeM3)
    expect(f.excavationM3).toBeGreaterThan(f.volumeM3)
  })
})

describe('odwodnienie', () => {
  it('kładzie rynnę na każdym okapie i liczy haki co 60 cm', () => {
    const g = gutters(2, 6000, 40, 2400)
    expect(g.gutterLength).toBe(12000)
    expect(g.hooks).toBe(22)
    expect(g.downpipes).toBeGreaterThanOrEqual(2)
  })

  it('dokłada rurę spustową, gdy jedna nie odbierze całej połaci', () => {
    const maly = gutters(1, 6000, 30, 2400)
    const duzy = gutters(1, 6000, 300, 2400)
    expect(maly.downpipes).toBe(1)
    expect(duzy.downpipes).toBeGreaterThan(maly.downpipes)
    expect(duzy.areaPerDownpipeM2).toBeLessThanOrEqual(80)
  })

  it('długość rury spustowej bierze się z wysokości okapu', () => {
    const g = gutters(1, 6000, 30, 2400)
    expect(g.downpipeLength).toBe(2400)
    expect(g.elbows).toBe(2)
  })
})

describe('zestawienie materiału wiaty', () => {
  it('domyślna wiata nie ma żadnych ostrzeżeń', () => {
    const w = calculateShelter(defaultShelter())
    expect(w.warnings).toEqual([])
  })

  it('liczy tyle słupów, ile wypada z rozkładu', () => {
    const w = calculateShelter(wiata({ length: 9000, postSpacingMax: 3000 }))
    expect(w.posts.total).toBe(8)
    expect(sztuk(w.timber, 'Słup')).toBe(8)
  })

  it('jednospadowa dzieli słupy na niskie i wysokie', () => {
    const w = calculateShelter(wiata({ shape: 'jednospadowy', length: 6000, postSpacingMax: 3000 }))
    expect(sztuk(w.timber, 'Słup niski')).toBe(3)
    expect(sztuk(w.timber, 'Słup wysoki')).toBe(3)
    const niski = w.timber.find((t) => t.name === 'Słup niski')!
    const wysoki = w.timber.find((t) => t.name === 'Słup wysoki')!
    expect(wysoki.length).toBeGreaterThan(niski.length)
  })

  it('zadaszenie przyścienne ma jeden rząd słupów, belkę ścienną i kotwy do muru', () => {
    const w = calculateShelter(wiata({ kind: 'zadaszenie', shape: 'jednospadowy', length: 6000 }))
    expect(w.posts.rows).toBe(1)
    expect(w.timber.some((t) => t.name === 'Belka ścienna')).toBe(true)
    expect(w.fasteners.some((f) => f.name.includes('Kotwa belki ściennej'))).toBe(true)
  })

  it('słup wbetonowany jest dłuższy o całą głębokość stopy', () => {
    const naPodstawie = calculateShelter(wiata({ postBase: 'podstawa-u', footingDepth: 1000 }))
    const wBetonie = calculateShelter(wiata({ postBase: 'w-betonie', footingDepth: 1000 }))
    const a = naPodstawie.timber.find((t) => t.name === 'Słup')!
    const b = wBetonie.timber.find((t) => t.name === 'Słup')!
    expect(b.length - a.length).toBeCloseTo(1000, 6)
  })

  it('ostrzega, gdy spadek jest za mały dla wybranego pokrycia', () => {
    const w = calculateShelter(wiata({ covering: 'dachowka', pitchDeg: 10, battenSpacing: 320 }))
    expect(w.warnings.some((t) => t.includes('Dachówka'))).toBe(true)
  })

  it('ostrzega, gdy wolnostojąca wiata nie ma mieczy', () => {
    const w = calculateShelter(wiata({ hasBraces: false }))
    expect(w.warnings.some((t) => t.includes('mieczy'))).toBe(true)
    expect(sztuk(w.timber, 'Miecz')).toBe(0)
  })

  it('ostrzega o stopie płytszej niż strefa przemarzania', () => {
    const w = calculateShelter(wiata({ footingDepth: 500 }))
    expect(w.warnings.some((t) => t.includes('przemarzania'))).toBe(true)
  })

  it('ostrzega, gdy pod okapem nie da się przejść', () => {
    const w = calculateShelter(wiata({ clearHeight: 2100, eavesFront: 900, pitchDeg: 30 }))
    expect(w.warnings.some((t) => t.includes('prześwitu'))).toBe(true)
  })

  it('zadaszenie przyścienne nie dostaje mieczy poprzecznych — trzyma je ściana', () => {
    const w = calculateShelter(wiata({ kind: 'zadaszenie', shape: 'jednospadowy' }))
    expect(sztuk(w.timber, 'Miecz poprzeczny')).toBe(0)
    expect(sztuk(w.timber, 'Miecz wzdłużny')).toBeGreaterThan(0)
  })

  it('pergola bez pokrycia nie liczy łat, rynien ani membrany', () => {
    const w = calculateShelter(
      wiata({ kind: 'pergola', shape: 'jednospadowy', pitchDeg: 3, covering: 'brak', hasSlats: true }),
    )
    expect(w.gutter).toBeNull()
    expect(w.timber.some((t) => t.name === 'Łata')).toBe(false)
    expect(sztuk(w.timber, 'Szczeblina')).toBeGreaterThan(0)
    expect(w.areas.some((a) => a.name.includes('Membrana'))).toBe(false)
  })

  it('pergola nazywa krokwie belkami poprzecznymi — tak mówi się o tej konstrukcji', () => {
    const w = calculateShelter(wiata({ kind: 'pergola', shape: 'jednospadowy', pitchDeg: 3, covering: 'brak' }))
    expect(w.timber.some((t) => t.name === 'Belka poprzeczna')).toBe(true)
    expect(w.timber.some((t) => t.name === 'Krokiew')).toBe(false)
  })

  it('poliwęglan wchodzi na płatwie poprzeczne, dachówka na łaty', () => {
    const poli = calculateShelter(wiata({ covering: 'poliweglan', pitchDeg: 10, battenSpacing: 700 }))
    const dach = calculateShelter(wiata({ covering: 'dachowka', pitchDeg: 30, battenSpacing: 320 }))
    expect(poli.timber.some((t) => t.name === 'Płatew poprzeczna')).toBe(true)
    expect(dach.timber.some((t) => t.name === 'Łata')).toBe(true)
  })

  it('gont kładzie się na poszyciu, więc łat nie ma wcale', () => {
    const w = calculateShelter(wiata({ covering: 'gont', pitchDeg: 20 }))
    expect(w.timber.some((t) => t.name === 'Łata')).toBe(false)
    expect(w.areas.some((a) => a.name.includes('Poszycie'))).toBe(true)
  })

  it('plan cięcia obejmuje całe zamówione drewno', () => {
    const w = calculateShelter(defaultShelter())
    expect(w.groups.length).toBeGreaterThan(0)
    expect(w.purchaseVolumeM3).toBeGreaterThanOrEqual(w.totalVolumeM3)
    for (const g of w.groups) {
      expect(g.plan.impossible).toEqual([])
    }
  })

  it('liczy beton na tyle stóp, ile jest słupów', () => {
    const w = calculateShelter(wiata({ length: 6000, postSpacingMax: 3000 }))
    expect(w.footing.count).toBe(w.posts.total)
    expect(w.footing.volumeM3).toBeCloseTo(w.footing.volumeEachM3 * w.posts.total, 6)
  })

  it('bez impregnatu ostrzega, bo wiata moknie z każdej strony', () => {
    const w = calculateShelter(wiata({ hasImpregnation: false }))
    expect(w.impregnationLitres).toBe(0)
    expect(w.warnings.some((t) => t.includes('impregnacji'))).toBe(true)
  })

  it('szersza wiata to więcej drewna', () => {
    const waska = calculateShelter(wiata({ width: 4000 }))
    const szeroka = calculateShelter(wiata({ width: 7000 }))
    expect(szeroka.totalVolumeM3).toBeGreaterThan(waska.totalVolumeM3)
  })
})
