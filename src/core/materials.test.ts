import { describe, it, expect } from 'vitest'
import { calculate } from './materials'
import { planCuts, volumeM3 } from './cutting'
import { defaultInput, stockLengthsFor } from './defaults'
import type { RoofInput } from './types'

const base = (over: Partial<RoofInput> = {}): RoofInput => ({ ...defaultInput(), ...over })

describe('plan cięcia', () => {
  it('nie gubi ani nie dubluje odcinków', () => {
    const pieces = [5200, 5200, 5200, 2100, 2100, 1400]
    const plan = planCuts(pieces, [4000, 5000, 6000])
    const laid = plan.bars.flatMap((b) => b.pieces).sort((a, b) => a - b)
    expect(laid).toEqual([...pieces].sort((a, b) => a - b))
  })

  it('żadna belka nie jest przepełniona', () => {
    const plan = planCuts([3800, 3800, 2000, 2000, 2000], [4000, 6000])
    for (const bar of plan.bars) {
      const used = bar.pieces.reduce((s, p) => s + p, 0)
      expect(used).toBeLessThanOrEqual(bar.stockLength)
    }
  })

  it('dokłada dwa odcinki 3 m do jednej belki 6 m', () => {
    const plan = planCuts([2900, 2900], [6000])
    expect(plan.bars).toHaveLength(1)
  })

  it('wskazuje elementy dłuższe niż dostępne belki', () => {
    const plan = planCuts([7500, 2000], [4000, 6000])
    expect(plan.impossible).toEqual([7500])
    expect(plan.bars.flatMap((b) => b.pieces)).not.toContain(7500)
  })

  it('wybiera najkrótszą belkę, w której element się mieści', () => {
    const plan = planCuts([3500], [3000, 4000, 5000, 6000])
    expect(plan.bars[0].stockLength).toBe(4000)
  })

  it('liczy odpad jako różnicę zakupu i potrzeb', () => {
    const plan = planCuts([2000, 2000], [6000])
    expect(plan.totalStock).toBe(6000)
    expect(plan.totalNeeded).toBe(4000)
    expect(plan.totalWaste).toBeLessThanOrEqual(2000)
    expect(plan.wastePct).toBeGreaterThan(0)
  })

  it('pusta lista nie wywraca obliczeń', () => {
    const plan = planCuts([], [6000])
    expect(plan.bars).toHaveLength(0)
    expect(plan.wastePct).toBe(0)
  })
})

describe('objętość drewna', () => {
  it('belka 100x200 mm o długości 6 m ma 0,12 m³', () => {
    expect(volumeM3(100, 200, 6000)).toBeCloseTo(0.12, 6)
  })
})

describe('zestawienie dachu', () => {
  it('dwuspadowy 8x12 m liczy się bez ostrzeżeń przy domyślnych danych', () => {
    const c = calculate(base())
    expect(c.warnings).toHaveLength(0)
    expect(c.totalVolumeM3).toBeGreaterThan(0)
  })

  it('powierzchnia połaci jest większa od rzutu i rośnie z kątem', () => {
    const flat = calculate(base({ pitchDeg: 20 }))
    const steep = calculate(base({ pitchDeg: 50 }))
    expect(flat.roofAreaM2).toBeGreaterThan(flat.planAreaM2)
    expect(steep.roofAreaM2).toBeGreaterThan(flat.roofAreaM2)
  })

  it('jednospadowy ma jedną połać i dłuższą krokiew niż dwuspadowy', () => {
    const gable = calculate(base({ shape: 'gable' }))
    const shed = calculate(base({ shape: 'shed', truss: 'rafter' }))
    expect(shed.mainSlopes).toBe(1)
    expect(shed.slope.rafterTotal).toBeGreaterThan(gable.slope.rafterTotal)
  })

  it('kopertowy dokłada cztery krożyny i kulawki', () => {
    const c = calculate(base({ shape: 'hip', truss: 'rafter' }))
    const hipRafter = c.timber.find((t) => t.name.includes('krożyna'))
    expect(hipRafter?.count).toBe(4)
    expect(c.timber.some((t) => t.name.startsWith('Kulawka'))).toBe(true)
    expect(c.hip).not.toBeNull()
  })

  it('ostrzega o zbyt głębokim zaciosie', () => {
    const c = calculate(base({ notchDepth: 90, rafterSection: { b: 80, h: 180 } }))
    expect(c.warnings.some((w) => w.includes('za głęboki'))).toBe(true)
  })

  it('ostrzega, gdy siodło nie mieści się na murłacie', () => {
    const c = calculate(base({ pitchDeg: 8, notchDepth: 30, wallPlateSection: { b: 100, h: 100 } }))
    expect(c.warnings.some((w) => w.includes('nie mieści się na murłacie'))).toBe(true)
  })

  it('ostrzega o długiej krokwi w więźbie krokwiowej bez jętek', () => {
    const c = calculate(base({ truss: 'rafter', span: 11000 }))
    expect(c.warnings.some((w) => w.includes('jętki'))).toBe(true)
  })

  it('więźba jętkowa dokłada jętki, krokwiowa nie', () => {
    expect(calculate(base({ truss: 'collar' })).timber.some((t) => t.name === 'Jętka')).toBe(true)
    expect(calculate(base({ truss: 'rafter' })).timber.some((t) => t.name === 'Jętka')).toBe(false)
  })

  it('więźba płatwiowa dokłada płatwie, słupy, kleszcze i miecze', () => {
    const c = calculate(base({ truss: 'purlin', hasClamps: true, hasBraces: true }))
    const names = c.timber.map((t) => t.name)
    expect(names.some((n) => n.startsWith('Płatew'))).toBe(true)
    expect(names).toContain('Słup')
    expect(names).toContain('Kleszcze (deska)')
    expect(names).toContain('Miecz')
  })

  it('komin przerywa krokwie i dokłada dwa wymiany', () => {
    const withHole = calculate(
      base({
        openings: [
          { id: '1', kind: 'komin', width: 1200, height: 800, offsetAlong: 4000, slope: 'A' },
        ],
      }),
    )
    const plain = calculate(base())
    const fullRafters = (c: typeof plain) => c.timber.find((t) => t.name === 'Krokiew')?.count ?? 0
    expect(fullRafters(withHole)).toBeLessThan(fullRafters(plain))
    expect(withHole.timber.find((t) => t.name.includes('Wymian'))?.count).toBe(2)
  })

  it('zakup drewna nigdy nie jest mniejszy niż zapotrzebowanie netto', () => {
    const c = calculate(base())
    expect(c.purchaseVolumeM3).toBeGreaterThanOrEqual(c.totalVolumeM3)
  })

  it('większy naddatek na docięcie podnosi objętość drewna', () => {
    const lean = calculate(base({ cutAllowance: 0 }))
    const rich = calculate(base({ cutAllowance: 200 }))
    expect(rich.totalVolumeM3).toBeGreaterThan(lean.totalVolumeM3)
  })

  it('murłatę dłuższą niż belka handlowa składa się z kilku kawałków', () => {
    const c = calculate(base({ length: 12000, stockLengths: [6000] }))
    const plate = c.groups.find((g) => g.items.some((i) => i.name === 'Murłata'))
    expect(plate?.plan.impossible).toHaveLength(0)
  })

  it('gęstsze łacenie zwiększa metry bieżące łat', () => {
    const sparse = calculate(base({ battenSpacing: 400 }))
    const dense = calculate(base({ battenSpacing: 250 }))
    const battens = (c: typeof sparse) => c.areas.find((x) => x.name === 'Łaty')?.net ?? 0
    expect(battens(dense)).toBeGreaterThan(battens(sparse))
  })

  it('wyłączone warstwy znikają z zestawienia', () => {
    const c = calculate(base({ hasMembrane: false, hasInsulation: false, hasSheathing: false }))
    const names = c.areas.map((x) => x.name)
    expect(names).not.toContain('Membrana wstępnego krycia')
    expect(names).not.toContain('Ocieplenie międzykrokwiowe')
    expect(names).toContain('Łaty') // łaty zostają
  })

  it('impregnat rośnie razem z ilością drewna, gdy jest włączony', () => {
    const small = calculate(base({ span: 6000, length: 8000, hasImpregnation: true }))
    const big = calculate(base({ span: 10000, length: 16000, hasImpregnation: true }))
    expect(big.impregnationLitres).toBeGreaterThan(small.impregnationLitres)
  })

  it('liczba kątowników odpowiada podwojonej liczbie krokwi', () => {
    const c = calculate(base({ rafterFixing: 'katowniki' }))
    const rafters = c.timber
      .filter((t) => t.name.startsWith('Krokiew') || t.name.startsWith('Kulawka'))
      .reduce((s, t) => s + t.count, 0)
    const angles = c.fasteners.find((f) => f.name.includes('Kątownik'))?.count
    expect(angles).toBe(rafters * 2)
  })

  it('każda grupa drewna ma policzony plan cięcia', () => {
    const c = calculate(base())
    expect(c.groups.length).toBeGreaterThan(0)
    for (const g of c.groups) {
      expect(g.plan.purchase.length).toBeGreaterThan(0)
      expect(g.volumeM3).toBeGreaterThan(0)
    }
  })
})

describe('drewno na wymiar i łączenie krokwi', () => {
  it('tryb handlowy nie sięga po belki dłuższe niż 6 m', () => {
    expect(Math.max(...stockLengthsFor('handlowe'))).toBe(6000)
  })

  it('tryb na wymiar pozwala zamówić belkę 12 m', () => {
    expect(Math.max(...stockLengthsFor('na-wymiar'))).toBe(12000)
  })

  it('długa krokiew nie mieści się w drewnie z półki, a mieści na wymiar', () => {
    const long = { span: 11000, pitchDeg: 40, truss: 'collar' as const }
    const shelf = calculate(base({ ...long, stockLengths: stockLengthsFor('handlowe'), stockMode: 'handlowe' }))
    const custom = calculate(base({ ...long, stockLengths: stockLengthsFor('na-wymiar'), stockMode: 'na-wymiar' }))
    expect(shelf.warnings.some((w) => w.includes('nie mieści się'))).toBe(true)
    expect(custom.warnings.some((w) => w.includes('nie mieści się'))).toBe(false)
  })

  it('podpowiada łączenie, gdy drewno jest z półki', () => {
    const c = calculate(base({ span: 11000, truss: 'collar', stockLengths: stockLengthsFor('handlowe') }))
    expect(c.warnings.some((w) => w.includes('ścianą kolankową') || w.includes('na wymiar'))).toBe(true)
  })

  it('łączenie dzieli krokiew na odcinek dolny i górny', () => {
    const c = calculate(
      base({ splice: { enabled: true, atRun: 1200, support: 'sciana-kolankowa', overlap: 600 } }),
    )
    const names = c.timber.map((t) => t.name)
    expect(names).toContain('Krokiew — odcinek dolny')
    expect(names).toContain('Krokiew — odcinek górny')
    expect(names).not.toContain('Krokiew')
    expect(c.splice.active).toBe(true)
  })

  it('oba odcinki razem są dłuższe od całej krokwi o nakładkę', () => {
    const plain = calculate(base())
    const spliced = calculate(
      base({ splice: { enabled: true, atRun: 1200, support: 'wieniec', overlap: 600 } }),
    )
    const full = plain.timber.find((t) => t.name === 'Krokiew')!.length
    const lower = spliced.timber.find((t) => t.name.includes('dolny'))!.length
    const upper = spliced.timber.find((t) => t.name.includes('górny'))!.length
    expect(lower + upper).toBeGreaterThan(full)
    expect(lower + upper).toBeLessThan(full + 1500)
  })

  it('styk wypada dokładnie nad wskazaną podporą', () => {
    const atRun = 1500
    const c = calculate(base({ eaves: 600, pitchDeg: 40, splice: { enabled: true, atRun, support: 'platew', overlap: 500 } }))
    const expected = (600 + atRun) / Math.cos((40 * Math.PI) / 180)
    expect(Math.abs(c.splice.atLength - expected)).toBeLessThan(0.5)
  })

  it('odrzuca podporę wypadającą poza połacią', () => {
    const c = calculate(
      base({ span: 8000, splice: { enabled: true, atRun: 9000, support: 'wieniec', overlap: 500 } }),
    )
    expect(c.splice.active).toBe(false)
    expect(c.warnings.some((w) => w.includes('Styk musi trafić w podporę'))).toBe(true)
  })

  it('łączenie pozwala zmieścić długą krokiew w drewnie z półki', () => {
    const cfg = { span: 11000, truss: 'collar' as const, stockLengths: stockLengthsFor('handlowe') }
    const whole = calculate(base(cfg))
    const spliced = calculate(
      base({ ...cfg, splice: { enabled: true, atRun: 2500, support: 'sciana-kolankowa', overlap: 600 } }),
    )
    expect(whole.warnings.some((w) => w.includes('nie mieści się'))).toBe(true)
    expect(spliced.warnings.some((w) => w.includes('nie mieści się'))).toBe(false)
  })

  it('informacja o styku trafia do uwag, a nie do ostrzeżeń', () => {
    const c = calculate(
      base({ splice: { enabled: true, atRun: 1200, support: 'sciana-kolankowa', overlap: 600 } }),
    )
    expect(c.notes.some((n) => n.includes('Styk wypada'))).toBe(true)
    expect(c.warnings).toHaveLength(0)
  })
})


describe('poprawki po konsultacji ciesielskiej', () => {
  it('domyślnie liczy wkręty do murłaty, a nie kątowniki', () => {
    const c = calculate(base())
    expect(c.fasteners.some((f) => f.name.includes('Wkręt ciesielski krokiew–murłata'))).toBe(true)
    expect(c.fasteners.some((f) => f.name.includes('Kątownik'))).toBe(false)
  })

  it('kątowniki pojawiają się dopiero po wybraniu ich wprost', () => {
    const c = calculate(base({ rafterFixing: 'katowniki' }))
    expect(c.fasteners.some((f) => f.name.includes('Kątownik'))).toBe(true)
    expect(c.fasteners.some((f) => f.name.includes('Wkręt ciesielski krokiew–murłata'))).toBe(false)
  })

  it('murłatę kotwi prętem gwintowanym na kotwie chemicznej', () => {
    const c = calculate(base())
    expect(c.fasteners.some((f) => f.name.includes('Pręt gwintowany'))).toBe(true)
  })

  it('w kalenicy liczy wkręty, nie gwoździe', () => {
    const c = calculate(base())
    const kalenica = c.fasteners.find((f) => f.name.includes('kalenicy'))
    expect(kalenica?.name).toContain('Wkręt')
    expect(kalenica?.name).not.toContain('Gwóźdź')
  })

  it('impregnatu nie liczy, dopóki nie zostanie włączony', () => {
    expect(calculate(base()).impregnationLitres).toBe(0)
    expect(calculate(base({ hasImpregnation: true })).impregnationLitres).toBeGreaterThan(0)
  })

  it('wyłączony impregnat zostawia uwagę o drewnie z tartaku', () => {
    const c = calculate(base())
    expect(c.notes.some((n) => n.includes('impregnowane'))).toBe(true)
  })

  it('kleszcze nie wystają poza krokwie', () => {
    const c = calculate(base({ truss: 'purlin', hasClamps: true, span: 8000, cutAllowance: 0 }))
    const kleszcze = c.timber.find((t) => t.name.startsWith('Kleszcze'))
    expect(kleszcze?.length).toBe(8000)
  })

  it('do łat dolicza rząd pod gąsior i na pas okapowy', () => {
    const c = calculate(base())
    const laty = c.areas.find((a) => a.name === 'Łaty')
    expect(laty?.note).toContain('gąsior')

    // Dwa dodatkowe rzędy ponad te, które wynikają z samego rozstawu.
    const zRozstawu = Math.ceil(c.slope.slopeLength / c.input.battenSpacing)
    const szerokoscM = (c.input.length + 2 * c.input.gableOverhang) / 1000
    expect(laty!.net).toBeCloseTo((zRozstawu + 2) * szerokoscM * c.mainSlopes, 1)
  })

  it('naddatek na docięcie wynosi 10 cm', () => {
    expect(defaultInput().cutAllowance).toBe(100)
  })
})

describe('ustalenia z czwartej tury', () => {
  const poz = (c: ReturnType<typeof calculate>, nazwa: string) =>
    c.areas.find((a) => a.name === nazwa)
  const lacznik = (c: ReturnType<typeof calculate>, fragment: string) =>
    c.fasteners.find((f) => f.name.includes(fragment))

  // Punkt 88: „większość więźb ma zakładkę i tego trzeba się trzymać".
  it('zakładka w kalenicy jest domyślna', () => {
    expect(defaultInput().ridgeJoint).toBe('zakladka')
    expect(calculate(base()).ridge.extension).toBeGreaterThan(0)
  })

  // Punkt 90: wkręt musi przejść przez obie połówki zakładki.
  it('kalenicę spinają cztery wkręty na parę krokwi, dobrane do grubości krokwi', () => {
    const c = calculate(base({ rafterSection: { b: 80, h: 180 } }))
    const w = lacznik(c, 'połączenie krokwi w kalenicy')!
    const krokwie = c.timber
      .filter((t) => t.name.startsWith('Krokiew') || t.name.startsWith('Kulawka'))
      .reduce((s, t) => s + t.count, 0)
    expect(w.count).toBe(Math.ceil(krokwie / 2) * 4)
    expect(w.note).toContain('80')
  })

  it('dach pulpitowy nie dostaje wkrętów do kalenicy, bo jej nie ma', () => {
    expect(lacznik(calculate(base({ shape: 'shed' })), 'w kalenicy')).toBeUndefined()
  })

  // Punkt 91: krokwie spięte zakładką trzymają się same.
  it('przy zakładce uprzedza, że płatew kalenicowa nie jest konieczna', () => {
    const c = calculate(base({ truss: 'purlin', purlinCount: 0, ridgeJoint: 'zakladka' }))
    expect(c.notes.join(' ')).toMatch(/płatew kalenicowa nie jest konieczna/i)
    const czolowe = calculate(base({ truss: 'purlin', purlinCount: 0, ridgeJoint: 'czolowe' }))
    expect(czolowe.notes.join(' ')).not.toMatch(/nie jest konieczna/i)
  })

  // Punkty 51-53 i 96: długość słupa liczona, nie zgadywana.
  it('słup mierzy się od podłogi poddasza do spodu płatwi', () => {
    const c = calculate(
      base({
        truss: 'purlin',
        purlinCount: 1,
        kneeWallHeight: 900,
        wallPlateSection: { b: 140, h: 140 },
        purlinSection: { b: 140, h: 140 },
        cutAllowance: 0,
      }),
    )
    const slup = c.timber.find((t) => t.name === 'Słup')!
    // Jedna płatew dzieli bieg połaci na pół, więc stoi w połowie biegu.
    const wzniesienie = (c.slope.run / 2) * Math.tan((c.input.pitchDeg * Math.PI) / 180)
    expect(slup.length).toBeCloseTo(900 + 140 + wzniesienie - 140, 0)
    expect(slup.note).toContain('podłogi poddasza')
  })

  it('wyższa ścianka kolankowa daje dłuższy słup', () => {
    const dl = (h: number) =>
      calculate(base({ truss: 'purlin', purlinCount: 1, kneeWallHeight: h })).timber.find(
        (t) => t.name === 'Słup',
      )!.length
    expect(dl(1200)).toBeCloseTo(dl(900) + 300, 0)
  })

  // Punkt 99: wiatrownice to łaty, dwie sztuki, przybijane ukośnie.
  it('wiatrownice trafiają do zestawienia jako łaty', () => {
    const c = calculate(base())
    const w = poz(c, 'Wiatrownice')!
    expect(w.note).toContain('dwie sztuki')
    // Biegną po skosie, więc są dłuższe niż dwie długości połaci.
    expect(w.net).toBeGreaterThan((2 * c.slope.slopeLength) / 1000)
  })

  // Punkt 100: druga łata pasa okapowego ma ten sam wymiar i idzie na całej długości.
  it('opis łat wspomina o drugiej łacie pasa okapowego', () => {
    expect(poz(calculate(base()), 'Łaty')!.note).toMatch(/pasa okapowego/i)
  })

  // Punkt 95: koniec krokwi ma dwa cięcia.
  it('uwaga wykonawcza opisuje oba cięcia przy okapie', () => {
    const c = calculate(base({ hasFascia: true, fasciaHeight: 200 }))
    expect(c.notes.join(' ')).toMatch(/pionowe.*poziome/i)
    expect(c.notes.join(' ')).toMatch(/podbitk/i)
  })

  // Punkt 98: obrys budynku to druga droga do tej samej liczby.
  it('obrys budynku przelicza się na rozstaw murłat', () => {
    const c = calculate(
      base({
        spanMode: 'obrys',
        outlineWidth: 8100,
        wallThickness: 250,
        wallPlateSection: { b: 140, h: 140 },
      }),
    )
    expect(c.input.span).toBe(7990)
    expect(c.slope.run).toBeCloseTo(7990 / 2, 6)
  })
})
