import { describe, it, expect } from 'vitest'
import { calculateShelter } from './shelterMaterials'
import { defaultShelter, type ShelterInput } from './shelter'
import { zbudujModelWiaty } from './shelterModel3d'
import { policzEtapy, wierzcholki, SCIANY, type Belka } from './model3d'
import { deg2rad } from './geometry'

const model = (over: Partial<ShelterInput> = {}) =>
  zbudujModelWiaty(calculateShelter({ ...defaultShelter(), ...over }))

/** Długość belki mierzona po jej osi. */
const dlugosc = (b: Belka) =>
  Math.hypot(b.koniec.x - b.start.x, b.koniec.y - b.start.y, b.koniec.z - b.start.z)

const wg = (m: ReturnType<typeof model>, nazwa: string) => m.belki.filter((b) => b.nazwa === nazwa)

describe('model przestrzenny wiaty', () => {
  it('ma komplet etapów montażu, od stóp po pokrycie', () => {
    const etapy = policzEtapy(model()).map((e) => e.etap)
    expect(etapy).toContain('stopy')
    expect(etapy).toContain('slupy')
    expect(etapy).toContain('oczepy')
    expect(etapy).toContain('zastrzaly')
    expect(etapy).toContain('krokwie')
  })

  it('etapy idą w kolejności stawiania: najpierw fundament, potem słupy, na końcu dach', () => {
    const etapy = policzEtapy(model()).map((e) => e.etap)
    expect(etapy.indexOf('stopy')).toBeLessThan(etapy.indexOf('slupy'))
    expect(etapy.indexOf('slupy')).toBeLessThan(etapy.indexOf('oczepy'))
    expect(etapy.indexOf('oczepy')).toBeLessThan(etapy.indexOf('krokwie'))
  })

  it('stawia tyle słupów, ile policzył rdzeń', () => {
    const w = calculateShelter({ ...defaultShelter(), length: 9000, postSpacingMax: 3000 })
    const m = zbudujModelWiaty(w)
    expect(wg(m, 'Słup')).toHaveLength(w.posts.total)
  })

  it('stopy sięgają pod ziemię na zadaną głębokość', () => {
    const m = model({ footingDepth: 1200 })
    const stopa = wg(m, 'Stopa fundamentowa')[0]
    expect(stopa.start.z).toBe(-1200)
    expect(stopa.koniec.z).toBe(0)
  })

  it('słupy stoją na posadzce i kończą się pod oczepem', () => {
    const w = calculateShelter(defaultShelter())
    const m = zbudujModelWiaty(w)
    for (const s of wg(m, 'Słup')) {
      expect(s.start.z).toBe(0)
      expect(s.koniec.z).toBeCloseTo(w.geom.lowPostHeight, 6)
    }
  })

  it('oczep leży na całej długości dachu, razem z wysunięciami bocznymi', () => {
    const w = calculateShelter({ ...defaultShelter(), length: 6000, eavesSide: 400 })
    const m = zbudujModelWiaty(w)
    const oczepy = wg(m, 'Oczep')
    expect(oczepy).toHaveLength(2)
    for (const o of oczepy) expect(dlugosc(o)).toBeCloseTo(6800, 0)
  })

  it('krokiew w modelu ma tę samą długość, co w zestawieniu materiału', () => {
    const w = calculateShelter(defaultShelter())
    const m = zbudujModelWiaty(w)
    expect(dlugosc(wg(m, 'Krokiew')[0])).toBeCloseTo(w.geom.rafterLength, 0)
  })

  it('krokwie dwuspadowej schodzą się w osi wiaty', () => {
    const m = model({ width: 5000, shape: 'dwuspadowy' })
    const krokwie = wg(m, 'Krokiew')
    for (const k of krokwie) expect(k.koniec.y).toBeCloseTo(2500, 6)
    // Po jednej z każdej strony: część zaczyna się przed wiatą, część za nią.
    expect(krokwie.some((k) => k.start.y < 0)).toBe(true)
    expect(krokwie.some((k) => k.start.y > 5000)).toBe(true)
  })

  it('krokiew jednospadowej przechodzi nad całą szerokością', () => {
    const m = model({ shape: 'jednospadowy', width: 4000, eavesFront: 300 })
    const k = wg(m, 'Krokiew')[0]
    expect(k.start.y).toBeCloseTo(-300, 6)
    expect(k.koniec.y).toBeCloseTo(4300, 6)
    expect(k.koniec.z).toBeGreaterThan(k.start.z)
  })

  it('krokwie leżą na oczepie, a nie w nim', () => {
    const w = calculateShelter({ ...defaultShelter(), pitchDeg: 0.0001 })
    const m = zbudujModelWiaty(w)
    const oczep = wg(m, 'Oczep')[0]
    const krokiew = wg(m, 'Krokiew')[0]
    const wierzchOczepu = oczep.start.z + w.input.beamSection.h / 2
    const spodKrokwi = krokiew.start.z - w.input.rafterSection.h / 2
    expect(spodKrokwi).toBeCloseTo(wierzchOczepu, 0)
  })

  it('miecze wychodzą ze słupa i wracają na oczep', () => {
    const w = calculateShelter({ ...defaultShelter(), braceArm: 600 })
    const m = zbudujModelWiaty(w)
    const miecze = wg(m, 'Miecz wzdłużny')
    expect(miecze.length).toBeGreaterThan(0)
    for (const mi of miecze) {
      expect(dlugosc(mi)).toBeCloseTo(600 * Math.SQRT2, 0)
      expect(mi.koniec.z).toBeCloseTo(w.geom.lowPostHeight, 6)
      expect(mi.start.z).toBeCloseTo(w.geom.lowPostHeight - 600, 6)
    }
  })

  it('wyłączone miecze znikają też z modelu', () => {
    const m = model({ hasBraces: false })
    expect(policzEtapy(m).map((e) => e.etap)).not.toContain('zastrzaly')
  })

  it('zadaszenie przyścienne ma słupy tylko po jednej stronie i belkę na ścianie', () => {
    const m = model({ kind: 'zadaszenie', shape: 'jednospadowy', width: 4000 })
    for (const s of wg(m, 'Słup')) expect(s.start.y).toBe(0)
    const belka = wg(m, 'Belka ścienna')
    expect(belka).toHaveLength(1)
    expect(belka[0].start.y).toBe(4000)
  })

  it('krokiew zadaszenia dobiega do belki ściennej, a nie za nią', () => {
    const m = model({ kind: 'zadaszenie', shape: 'jednospadowy', width: 4000, eavesFront: 300 })
    const k = wg(m, 'Krokiew')[0]
    expect(k.start.y).toBeCloseTo(-300, 6)
    expect(k.koniec.y).toBeCloseTo(4000, 6)
  })

  it('belka kalenicowa biegnie w osi wiaty, na własnych słupach', () => {
    const m = model({ hasRidgeBeam: true, width: 6000 })
    const belka = wg(m, 'Belka kalenicowa')[0]
    expect(belka.start.y).toBeCloseTo(3000, 6)
    expect(wg(m, 'Słup kalenicowy').length).toBeGreaterThan(0)
  })

  it('pergola dostaje szczebliny zamiast łat', () => {
    const m = model({
      kind: 'pergola',
      shape: 'jednospadowy',
      pitchDeg: 3,
      covering: 'brak',
      hasSlats: true,
    })
    expect(wg(m, 'Szczeblina').length).toBeGreaterThan(0)
    expect(wg(m, 'Łata')).toHaveLength(0)
  })

  it('płatwie poprzeczne pod poliwęglanem leżą w rozstawie mierzonym po spadku', () => {
    const w = calculateShelter({
      ...defaultShelter(),
      covering: 'poliweglan',
      pitchDeg: 10,
      battenSpacing: 700,
      shape: 'jednospadowy',
    })
    const m = zbudujModelWiaty(w)
    const platwie = wg(m, 'Płatew poprzeczna').sort((a, b) => a.start.y - b.start.y)
    expect(platwie.length).toBeGreaterThan(1)
    const odstepPoSpadku = (platwie[1].start.y - platwie[0].start.y) / Math.cos(deg2rad(10))
    expect(odstepPoSpadku).toBeCloseTo(700, 0)
  })

  it('każda belka ma dodatnią długość i sześć poprawnych ścian', () => {
    const m = model()
    for (const b of m.belki) {
      expect(dlugosc(b)).toBeGreaterThan(0)
      const rogi = wierzcholki(b)
      expect(rogi).toHaveLength(8)
      for (const sciana of SCIANY) expect(sciana).toHaveLength(4)
      for (const r of rogi) {
        expect(Number.isFinite(r.x)).toBe(true)
        expect(Number.isFinite(r.y)).toBe(true)
        expect(Number.isFinite(r.z)).toBe(true)
      }
    }
  })

  it('bryła ma sensowny środek i promień, więc kamera znajdzie kadr', () => {
    const m = model()
    expect(m.promien).toBeGreaterThan(0)
    expect(m.srodek.z).toBeGreaterThan(0)
    expect(m.wymiary.length).toBeGreaterThan(2)
  })
})
