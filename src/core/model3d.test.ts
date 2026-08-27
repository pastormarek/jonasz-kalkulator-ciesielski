import { describe, it, expect } from 'vitest'
import { calculate } from './materials'
import { defaultInput } from './defaults'
import { zbudujModel, wierzcholki, policzEtapy, SCIANY, type Belka } from './model3d'
import type { RoofInput } from './types'

const model = (over: Partial<RoofInput> = {}) =>
  zbudujModel(calculate({ ...defaultInput(), ...over }))

/** Długość belki mierzona po jej osi. */
const dlugosc = (b: Belka) =>
  Math.hypot(b.koniec.x - b.start.x, b.koniec.y - b.start.y, b.koniec.z - b.start.z)

const wg = (m: ReturnType<typeof model>, nazwa: string) =>
  m.belki.filter((b) => b.nazwa === nazwa)

describe('model przestrzenny', () => {
  it('powstaje z domyślnego dachu i ma wszystkie warstwy', () => {
    const m = model()
    expect(m.belki.length).toBeGreaterThan(50)
    const etapy = policzEtapy(m).map((e) => e.etap)
    expect(etapy).toContain('murlaty')
    expect(etapy).toContain('krokwie')
    expect(etapy).toContain('jetki')
    expect(etapy).toContain('laty')
  })

  it('murłaty leżą na obu krawędziach i mają długość budynku', () => {
    const m = model({ span: 8000, length: 12000 })
    const murlaty = wg(m, 'Murłata')
    expect(murlaty).toHaveLength(2)
    expect(murlaty.map((b) => b.start.y).sort((a, b) => a - b)).toEqual([0, 8000])
    for (const b of murlaty) expect(dlugosc(b)).toBeCloseTo(12000, 0)
  })

  it('krokwie sięgają od okapu do kalenicy', () => {
    const m = model({ span: 8000, pitchDeg: 35, eaves: 600, ridgeJoint: 'czolowe' })
    const krokiew = wg(m, 'Krokiew')[0]
    // Zaczyna się poza murłatą, czyli przy ujemnym Y.
    expect(krokiew.start.y).toBeCloseTo(-600, 0)
    // Kończy się w połowie rozpiętości, na wysokości kalenicy.
    expect(krokiew.koniec.y).toBeCloseTo(4000, 0)
    expect(krokiew.koniec.z).toBeGreaterThan(0)
  })

  it('przy zakładce krokwie mijają się w kalenicy', () => {
    const w = calculate({ ...defaultInput(), span: 8000, pitchDeg: 35, ridgeJoint: 'zakladka' })
    const m = zbudujModel(w)
    // Każda krokiew przechodzi za oś kalenicy o tyle, ile wyliczył rdzeń.
    const przejscie = w.ridge.overshootRun
    expect(przejscie).toBeGreaterThan(0)
    const kalenica = wg(m, 'Krokiew').map((b) => b.koniec.y)
    expect(Math.max(...kalenica)).toBeCloseTo(4000 + przejscie, 0)
    expect(Math.min(...kalenica)).toBeCloseTo(4000 - przejscie, 0)
  })

  it('długość krokwi w modelu zgadza się z obliczeniami', () => {
    const w = calculate(defaultInput())
    const m = zbudujModel(w)
    const krokiew = wg(m, 'Krokiew')[0]
    // Zakładka wydłuża krokiew ponad geometrię samej połaci.
    expect(dlugosc(krokiew)).toBeCloseTo(w.slope.rafterTotal + w.ridge.extension, 0)
  })

  it('krokwie stoją w rozstawie wyliczonym przez rdzeń', () => {
    const w = calculate(defaultInput())
    const m = zbudujModel(w)
    const naPolaci = wg(m, 'Krokiew').filter((b) => b.start.y < 0)
    const odstep = naPolaci[1].start.x - naPolaci[0].start.x
    expect(odstep).toBeCloseTo(w.layout.spacing, 0)
  })

  it('obie połacie mają tyle samo krokwi', () => {
    const m = model()
    const krokwie = wg(m, 'Krokiew')
    const lewa = krokwie.filter((b) => b.start.y < 0)
    const prawa = krokwie.filter((b) => b.start.y > 0)
    expect(lewa.length).toBe(prawa.length)
  })

  it('dach jednospadowy ma jedną murłatę i jedną połać krokwi', () => {
    const m = model({ shape: 'shed', truss: 'rafter' })
    expect(wg(m, 'Murłata')).toHaveLength(1)
    expect(wg(m, 'Krokiew').every((b) => b.start.y < b.koniec.y)).toBe(true)
  })

  it('kopertowy dokłada cztery krokwie narożne', () => {
    const m = model({ shape: 'hip', truss: 'rafter' })
    expect(wg(m, 'Krokiew narożna')).toHaveLength(4)
    expect(wg(m, 'Murłata szczytowa')).toHaveLength(2)
  })

  it('więźba płatwiowa stawia słupy i płatwie', () => {
    const m = model({ truss: 'purlin', purlinCount: 1 })
    expect(wg(m, 'Słup').length).toBeGreaterThan(0)
    expect(wg(m, 'Płatew pośrednia').length).toBeGreaterThan(0)
    // Słup stoi pionowo: zmienia się tylko wysokość.
    const slup = wg(m, 'Słup')[0]
    expect(slup.start.x).toBeCloseTo(slup.koniec.x, 6)
    expect(slup.start.y).toBeCloseTo(slup.koniec.y, 6)
    expect(slup.koniec.z).toBeGreaterThan(slup.start.z)
  })

  it('jętki są poziome i leżą na zadanej wysokości', () => {
    const m = model({ truss: 'collar', collarHeight: 2200 })
    const jetka = wg(m, 'Jętka')[0]
    expect(jetka.start.z).toBeCloseTo(jetka.koniec.z, 6)
    expect(jetka.start.z).toBeGreaterThan(2200)
  })

  it('łaty biegną wzdłuż budynku i nie wychodzą ponad kalenicę', () => {
    const w = calculate(defaultInput())
    const m = zbudujModel(w)
    const laty = wg(m, 'Łata')
    expect(laty.length).toBeGreaterThan(10)
    for (const l of laty) {
      expect(l.start.y).toBeCloseTo(l.koniec.y, 6) // stały przekrój poprzeczny
      expect(l.start.z).toBeLessThanOrEqual(w.slope.rise + 200)
    }
  })

  // Rozsunięcie krokwi przy zakładce jest zabiegiem rysunkowym, ale kontrłata
  // musi za nim pójść — inaczej wisi obok krokwi zamiast na niej.
  it('kontrłaty leżą nad krokwiami, a łaty jeszcze wyżej', () => {
    const m = model()
    const krokiew = wg(m, 'Krokiew').find((b) => b.start.y < 0)!
    const kontrlata = wg(m, 'Kontrłata').find((b) => b.start.y < 0)!
    // Ta sama linia w rzucie, ale kontrłata jest wyniesiona ponad krokiew.
    expect(kontrlata.start.x).toBeCloseTo(krokiew.start.x, 6)
    expect(kontrlata.start.z).toBeGreaterThan(krokiew.start.z)
  })

  it('komin dokłada dwa wymiany', () => {
    const m = model({
      openings: [{ id: '1', kind: 'komin', width: 900, height: 800, offsetAlong: 4000, slope: 'A' }],
    })
    expect(m.belki.filter((b) => b.etap === 'wymiany')).toHaveLength(2)
  })

  it('każda belka ma osiem wierzchołków i sześć ścian', () => {
    const m = model()
    for (const b of m.belki.slice(0, 20)) {
      expect(wierzcholki(b)).toHaveLength(8)
    }
    expect(SCIANY).toHaveLength(6)
    expect(SCIANY.every((s) => s.length === 4)).toBe(true)
  })

  it('bryła belki ma wymiary zgodne z jej przekrojem', () => {
    const m = model()
    const murlata = wg(m, 'Murłata')[0]
    const w = wierzcholki(murlata)
    // Krawędź czoła w poprzek osi to szerokość przekroju.
    const szerokosc = Math.hypot(w[1].x - w[0].x, w[1].y - w[0].y, w[1].z - w[0].z)
    const wysokosc = Math.hypot(w[3].x - w[0].x, w[3].y - w[0].y, w[3].z - w[0].z)
    expect(szerokosc).toBeCloseTo(murlata.b, 6)
    expect(wysokosc).toBeCloseTo(murlata.h, 6)
  })

  it('etapy są policzone i uporządkowane od murłat', () => {
    const etapy = policzEtapy(model())
    expect(etapy[0].etap).toBe('murlaty')
    expect(etapy.every((e) => e.liczba > 0)).toBe(true)
  })

  it('model podaje środek i promień do ustawienia widoku', () => {
    const m = model({ span: 8000, length: 12000 })
    expect(m.srodek.x).toBeCloseTo(6000, 0)
    expect(m.srodek.y).toBeCloseTo(4000, 0)
    expect(m.promien).toBeGreaterThan(0)
  })

  it('są linie wymiarowe z opisami', () => {
    const m = model()
    expect(m.wymiary.length).toBeGreaterThanOrEqual(4)
    expect(m.wymiary.some((w) => w.etykieta.includes('rozpiętość'))).toBe(true)
    expect(m.wymiary.some((w) => w.etykieta.includes('rozstaw'))).toBe(true)
  })

  it('większy dach daje więcej belek', () => {
    const maly = model({ span: 6000, length: 8000 })
    const duzy = model({ span: 10000, length: 18000 })
    expect(duzy.belki.length).toBeGreaterThan(maly.belki.length)
  })
})

describe('połacie pokrycia', () => {
  it('dach dwuspadowy ma dwie połacie, pulpitowy jedną, kopertowy cztery', () => {
    expect(zbudujModel(calculate(defaultInput())).polacie).toHaveLength(2)
    expect(zbudujModel(calculate({ ...defaultInput(), shape: 'shed' })).polacie).toHaveLength(1)
    expect(zbudujModel(calculate({ ...defaultInput(), shape: 'hip' })).polacie).toHaveLength(4)
  })

  it('połać leży nad krokwiami, a nie w nich', () => {
    const w = calculate(defaultInput())
    const model = zbudujModel(w)
    const kalenicaKrokwi = Math.max(...model.belki.filter((b) => b.etap === 'krokwie').map((b) => b.koniec.z))
    const kalenicaPolaci = Math.max(...model.polacie!.flatMap((p) => p.rogi.map((r) => r.z)))

    // Pokrycie idzie ponad osią krokwi o pół jej wysokości plus łacenie.
    expect(kalenicaPolaci).toBeGreaterThan(kalenicaKrokwi)
    expect(kalenicaPolaci - kalenicaKrokwi).toBeLessThan(300)
  })

  it('połacie sięgają poza okap, tak jak pokrycie na budowie', () => {
    const input = defaultInput()
    const model = zbudujModel(calculate(input))
    const najnizszy = Math.min(...model.polacie!.flatMap((p) => p.rogi.map((r) => r.y)))
    expect(najnizszy).toBeLessThan(-input.eaves + 1)
  })
})
