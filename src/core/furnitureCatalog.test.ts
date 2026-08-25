import { describe, it, expect } from 'vitest'
import { KATALOG_MEBLI, przepisDla, przepisyKategorii, domyslneWymiary, zmienMebel } from './furnitureCatalog'
import { calculateFurniture } from './furnitureMaterials'
import { zbudujModelMebla } from './furnitureModel3d'
import { defaultFurniture, dlugoscCzesci, KATEGORIA_LABELS, type KategoriaMebla, type Wymiary } from './furniture'

const KATEGORIE = Object.keys(KATEGORIA_LABELS) as KategoriaMebla[]

/** Liczy mebel z zadanymi wymiarami i domyślną resztą ustawień. */
function policz(id: string, wymiary: Wymiary) {
  return calculateFurniture({ ...defaultFurniture(), model: id, wymiary })
}

describe('katalog mebli', () => {
  it('ma z czego wybierać w każdej kategorii', () => {
    expect(KATALOG_MEBLI.length).toBeGreaterThanOrEqual(30)
    for (const k of KATEGORIE) {
      expect(przepisyKategorii(k).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('identyfikatory i nazwy się nie powtarzają', () => {
    const id = KATALOG_MEBLI.map((p) => p.id)
    const nazwy = KATALOG_MEBLI.map((p) => p.nazwa)
    expect(new Set(id).size).toBe(id.length)
    expect(new Set(nazwy).size).toBe(nazwy.length)
  })

  it('nieznany mebel nie wywraca aplikacji', () => {
    expect(przepisDla('mebel-ktorego-nie-ma').id).toBe(KATALOG_MEBLI[0].id)
  })

  it('każdy parametr ma domyślną wartość wewnątrz swojego zakresu', () => {
    for (const p of KATALOG_MEBLI) {
      for (const par of p.parametry) {
        expect(`${p.id}.${par.klucz}`).toBe(`${p.id}.${par.klucz}`)
        expect(par.min).toBeLessThan(par.max)
        expect(par.domyslna).toBeGreaterThanOrEqual(par.min)
        expect(par.domyslna).toBeLessThanOrEqual(par.max)
      }
      // Klucze parametrów muszą być unikalne — inaczej jedno pole nadpisuje drugie.
      const klucze = p.parametry.map((x) => x.klucz)
      expect(new Set(klucze).size).toBe(klucze.length)
    }
  })
})

describe('obliczenia mebli', () => {
  // To jest właściwy sens tych testów: mebel, który po wybraniu z katalogu
  // od razu krzyczy ostrzeżeniem albo nie da się go kupić, byłby gorszy
  // niż jego brak.
  it('żaden mebel nie startuje z ostrzeżeniem', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      expect(`${p.id}: ${w.warnings.join(' | ')}`).toBe(`${p.id}: `)
    }
  })

  it('każdy mebel da się policzyć i kupić z tarcicy handlowej', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      expect(w.czesci.length, p.id).toBeGreaterThan(1)
      expect(w.pozycje.length, p.id).toBeGreaterThan(0)
      expect(w.purchaseVolumeM3, p.id).toBeGreaterThan(0)
      expect(w.totalVolumeM3, p.id).toBeLessThanOrEqual(w.purchaseVolumeM3 + 1e-9)
      for (const g of w.groups) expect(g.plan.impossible, p.id).toEqual([])
    }
  })

  it('żadna część nie ma zerowej ani ujemnej długości', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      for (const c of w.czesci) {
        const dl = dlugoscCzesci(c)
        expect(Number.isFinite(dl), `${p.id}: ${c.nazwa}`).toBe(true)
        expect(dl, `${p.id}: ${c.nazwa}`).toBeGreaterThan(0)
        expect(c.b, `${p.id}: ${c.nazwa}`).toBeGreaterThan(0)
        expect(c.h, `${p.id}: ${c.nazwa}`).toBeGreaterThan(0)
      }
    }
  })

  // Suwaki w interfejsie pozwalają dojechać do obu krańców zakresu, więc
  // obie skrajności muszą dawać mebel, a nie ujemne długości i puste listy.
  it('mebel liczy się także przy skrajnych wymiarach', () => {
    for (const p of KATALOG_MEBLI) {
      for (const kraniec of ['min', 'max'] as const) {
        const wymiary: Wymiary = {}
        for (const par of p.parametry) wymiary[par.klucz] = kraniec === 'min' ? par.min : par.max
        const w = policz(p.id, wymiary)
        const etykieta = `${p.id} (${kraniec})`
        expect(w.czesci.length, etykieta).toBeGreaterThan(1)
        for (const c of w.czesci) {
          expect(dlugoscCzesci(c), `${etykieta}: ${c.nazwa}`).toBeGreaterThan(0)
        }
        expect(Number.isFinite(w.masaKg), etykieta).toBe(true)
        expect(w.gabaryt.wysokosc, etykieta).toBeGreaterThan(0)
      }
    }
  })

  // Deska szersza niż 20 cm nie leży na półce w składzie, a mebel, którego
  // nie da się kupić, jest bezużyteczny niezależnie od tego, jak ładnie liczy.
  it('wszystkie przekroje da się kupić jako tarcicę', () => {
    for (const p of KATALOG_MEBLI) {
      for (const kraniec of ['min', 'max'] as const) {
        const wymiary: Wymiary = {}
        for (const par of p.parametry) wymiary[par.klucz] = kraniec === 'min' ? par.min : par.max
        const w = policz(p.id, wymiary)
        for (const c of w.czesci) {
          if (c.nieDrewno) continue
          const opis = `${p.id} (${kraniec}): ${c.nazwa} ${c.b} × ${c.h}`
          expect(c.h, opis).toBeLessThanOrEqual(200)
          expect(c.b, opis).toBeLessThanOrEqual(100)
          expect(c.b, opis).toBeGreaterThanOrEqual(12)
        }
      }
    }
  })

  it('instrukcja montażu ma kroki i wszystkie części trafiają do któregoś z nich', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      expect(w.kroki.length, p.id).toBeGreaterThan(0)
      const wKrokach = w.kroki.reduce((s, k) => s + k.pozycje.reduce((n, x) => n + x.count, 0), 0)
      const wszystkie = w.pozycje.reduce((n, x) => n + x.count, 0)
      expect(wKrokach, p.id).toBe(wszystkie)
      // Numeracja musi być ciągła — instrukcja z krokiem 1, 2, 4 jest błędem.
      w.kroki.forEach((k, i) => expect(k.numer, p.id).toBe(i + 1))
    }
  })

  it('lista części zgadza się z listą zakupów co do liczby sztuk', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      // Elementy kupowane gotowe — palety, łańcuch — są w spisie części,
      // ale nie w zamówieniu tarcicy, bo nikt ich nie tnie z deski.
      const sztukCzesci = w.pozycje.filter((x) => !x.gotowy).reduce((n, x) => n + x.count, 0)
      const sztukWGrupach = w.groups.reduce(
        (n, g) => n + g.items.reduce((m, it) => m + it.count, 0),
        0,
      )
      expect(sztukWGrupach, p.id).toBe(sztukCzesci)
    }
  })

  it('wkręty i wykończenie są policzone dla każdego mebla', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      expect(w.fasteners.length, p.id).toBeGreaterThan(0)
      for (const f of w.fasteners) expect(f.count, p.id).toBeGreaterThan(0)
      expect(w.powierzchniaM2, p.id).toBeGreaterThan(0)
      expect(w.wykonczenieLitry, p.id).toBeGreaterThan(0)
    }
  })

  it('bez wykończenia nie liczymy litrów', () => {
    const w = calculateFurniture({
      ...defaultFurniture(),
      gatunek: 'modrzew',
      wykonczenie: 'brak',
    })
    expect(w.wykonczenieLitry).toBe(0)
  })

  it('świerkowa grządka dostaje ostrzeżenie, modrzewiowa nie', () => {
    const zle = calculateFurniture({
      ...defaultFurniture(),
      model: 'grzadka-podwyzszona',
      wymiary: {},
      gatunek: 'swierk',
    })
    expect(zle.warnings.join(' ')).toMatch(/ziemi/i)

    const dobrze = calculateFurniture({
      ...defaultFurniture(),
      model: 'grzadka-podwyzszona',
      wymiary: {},
      gatunek: 'modrzew',
    })
    expect(dobrze.warnings).toEqual([])
  })

  it('mebel do wnętrza nie wymusza drewna ogrodowego', () => {
    const w = calculateFurniture({
      ...defaultFurniture(),
      model: 'stolik-nocny',
      wymiary: {},
      gatunek: 'swierk',
      wykonczenie: 'olej',
    })
    expect(w.warnings).toEqual([])
  })
})

describe('model przestrzenny mebla', () => {
  it('powstaje dla każdego mebla i mieści się w sensownej kuli', () => {
    for (const p of KATALOG_MEBLI) {
      const w = policz(p.id, domyslneWymiary(p))
      const model = zbudujModelMebla(w)
      expect(model.belki.length, p.id).toBe(w.czesci.length)
      expect(model.promien, p.id).toBeGreaterThan(0)
      expect(Number.isFinite(model.srodek.x), p.id).toBe(true)
      expect(model.wymiary.length, p.id).toBe(3)
    }
  })
})

describe('przełączanie mebla', () => {
  it('zachowuje parametry, które nowy mebel też ma', () => {
    const wymiary = zmienMebel('lawka-prosta', { dlugosc: 2000, glebokosc: 300, wysokosc: 450 })
    expect(wymiary.dlugosc).toBe(2000)
  })

  it('odrzuca wartości spoza zakresu nowego mebla', () => {
    // Ławka bywa długa na 2,4 m, budka lęgowa nie ma takiego parametru wcale.
    const wymiary = zmienMebel('budka-legowa', { dlugosc: 2400, wysokosc: 2000 })
    const przepis = przepisDla('budka-legowa')
    const wysokosc = przepis.parametry.find((p) => p.klucz === 'wysokosc')!
    expect(wymiary.wysokosc).toBe(wysokosc.domyslna)
    expect(wymiary.dlugosc).toBeUndefined()
  })
})
