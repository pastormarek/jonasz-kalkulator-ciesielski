import { describe, it, expect } from 'vitest'
import { calculate } from './../core/materials'
import { defaultInput } from './../core/defaults'
import { zbudujModel, ETAPY } from './../core/model3d'
import { rysuj, belkaPodKursorem, kameraPoczatkowa, WIDOKI, type Paleta } from './scene3d'

const model = zbudujModel(calculate(defaultInput()))
const kamera = kameraPoczatkowa(model)
const wszystkieEtapy = new Set<string>(ETAPY)

const PALETA: Paleta = {
  drewnoJasne: '#e5c294',
  drewnoSrednie: '#c8974f',
  drewnoCiemne: '#9a6b35',
  krawedz: '#6b4423',
  przyciemnione: '#ddd7ce',
  przyciemnioneKrawedz: '#c3bbb0',
  wyrozniony: '#b45309',
  wyroznionyKrawedz: '#7c3a06',
  tekst: '#1c1917',
  wymiar: '#6b6560',
  tlo: '#ffffff',
}

/**
 * Atrapa płótna, która zamiast rysować zapisuje, co miało zostać narysowane.
 * Pozwala sprawdzić rysowanie bez przeglądarki.
 */
function atrapaPlotna() {
  const wierzcholki: Array<{ x: number; y: number }> = []
  let wypelnienia = 0
  const teksty: string[] = []

  const ctx = {
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: (x: number, y: number) => wierzcholki.push({ x, y }),
    lineTo: (x: number, y: number) => wierzcholki.push({ x, y }),
    fill: () => {
      wypelnienia++
    },
    clip: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    measureText: () => ({ width: 40 }),
    fillText: (t: string) => teksty.push(t),
    setTransform: () => {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D

  return { ctx, wierzcholki, teksty, liczbaWypelnien: () => wypelnienia }
}

describe('rysowanie modelu', () => {
  it('rysuje setki ścian dla zwykłego dachu', () => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })
    expect(p.liczbaWypelnien()).toBeGreaterThan(200)
  })

  it('cała konstrukcja mieści się w kadrze', () => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    const xs = p.wierzcholki.map((w) => w.x)
    const ys = p.wierzcholki.map((w) => w.y)
    // Z zapasem na wystające okapy, ale bez uciekania poza ekran o rzędy wielkości.
    expect(Math.min(...xs)).toBeGreaterThan(-200)
    expect(Math.max(...xs)).toBeLessThan(1000)
    expect(Math.min(...ys)).toBeGreaterThan(-200)
    expect(Math.max(...ys)).toBeLessThan(700)
  })

  it('rysunek zajmuje sensowną część kadru, a nie punkcik', () => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })
    const xs = p.wierzcholki.map((w) => w.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(300)
  })

  it('widok z przodu ustawia kalenicę nad okapem', () => {
    const przod = WIDOKI.find((w) => w.nazwa === 'Z przodu')!
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera: { ...kamera, azymut: przod.azymut, elewacja: przod.elewacja },
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    // Na ekranie Y rośnie w dół, więc wyższa część dachu ma mniejsze Y.
    const ys = p.wierzcholki.map((w) => w.y)
    const srodek = 500 / 2
    expect(Math.min(...ys)).toBeLessThan(srodek)
    expect(Math.max(...ys)).toBeGreaterThan(srodek)
  })

  it('widok z dołu pokazuje konstrukcję od spodu, nie pustkę', () => {
    const gora = WIDOKI.find((w) => w.nazwa === 'Z góry')!
    const dol = WIDOKI.find((w) => w.nazwa === 'Z dołu')!

    const zGory = atrapaPlotna()
    rysuj(zGory.ctx, 800, 500, {
      model,
      kamera: { ...kamera, azymut: gora.azymut, elewacja: gora.elewacja },
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    const zDolu = atrapaPlotna()
    rysuj(zDolu.ctx, 800, 500, {
      model,
      kamera: { ...kamera, azymut: dol.azymut, elewacja: dol.elewacja },
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    // Spod spodu widać tyle samo brył co z góry — zmienia się tylko to,
    // która ściana każdej z nich jest zwrócona do obserwatora.
    expect(zDolu.liczbaWypelnien()).toBeGreaterThan(200)
    expect(Math.abs(zDolu.liczbaWypelnien() - zGory.liczbaWypelnien())).toBeLessThan(
      zGory.liczbaWypelnien() * 0.25,
    )
    // I nadal mieści się w kadrze, zamiast uciekać za obserwatora.
    const xs = zDolu.wierzcholki.map((w) => w.x)
    expect(Math.min(...xs)).toBeGreaterThan(-200)
    expect(Math.max(...xs)).toBeLessThan(1000)
  })

  it('pierwszy etap montażu rysuje mniej niż cała konstrukcja', () => {
    const jeden = atrapaPlotna()
    rysuj(jeden.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: new Set(['murlaty']),
      etapBiezacy: 'murlaty',
      pokazPoprzednie: false,
      pokazWymiary: false,
    })

    const wszystko = atrapaPlotna()
    rysuj(wszystko.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    expect(jeden.liczbaWypelnien()).toBeGreaterThan(0)
    expect(jeden.liczbaWypelnien()).toBeLessThan(wszystko.liczbaWypelnien())
  })

  it('wypisuje opisy wymiarów, gdy są włączone', () => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: true,
    })
    expect(p.teksty.some((t) => t.includes('rozpiętość'))).toBe(true)
    expect(p.teksty.some((t) => t.includes('cm'))).toBe(true)
  })

  it('nie rysuje wymiarów, gdy są wyłączone', () => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })
    expect(p.teksty).toHaveLength(0)
  })

  it('trafia we właściwą belkę w środku obrazu', () => {
    const belka = belkaPodKursorem(model, kamera, 800, 500, 400, 250, wszystkieEtapy)
    expect(belka).not.toBeNull()
    expect(belka!.nazwa.length).toBeGreaterThan(0)
  })

  it('poza konstrukcją nie wskazuje niczego', () => {
    expect(belkaPodKursorem(model, kamera, 800, 500, 2, 2, wszystkieEtapy)).toBeNull()
  })

  it('obrót zmienia rysunek', () => {
    const a = atrapaPlotna()
    rysuj(a.ctx, 800, 500, {
      model,
      kamera,
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    const b = atrapaPlotna()
    rysuj(b.ctx, 800, 500, {
      model,
      kamera: { ...kamera, azymut: kamera.azymut + 1.2 },
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
    })

    expect(a.wierzcholki[0]).not.toEqual(b.wierzcholki[0])
  })

  it('przybliżenie powiększa rysunek', () => {
    const zrob = (dystans: number) => {
      const p = atrapaPlotna()
      rysuj(p.ctx, 800, 500, {
        model,
        kamera: { ...kamera, dystans },
        paleta: PALETA,
        etapyAktywne: wszystkieEtapy,
        etapBiezacy: null,
        pokazPoprzednie: true,
        pokazWymiary: false,
      })
      const xs = p.wierzcholki.map((w) => w.x)
      return Math.max(...xs) - Math.min(...xs)
    }

    expect(zrob(model.promien * 2)).toBeGreaterThan(zrob(model.promien * 6))
  })
})

describe('podpisy elementów', () => {
  const zPodpisami = (m = model, pokazPodpisy = true) => {
    const p = atrapaPlotna()
    rysuj(p.ctx, 1000, 700, {
      model: m,
      kamera: { ...kameraPoczatkowa(m), dystans: m.promien * 2.9 },
      paleta: PALETA,
      etapyAktywne: wszystkieEtapy,
      etapBiezacy: null,
      pokazPoprzednie: true,
      pokazWymiary: false,
      pokazPodpisy,
    })
    return p.teksty
  }

  it('podpisuje elementy wymienione przez cieślę', () => {
    const platwiowy = zbudujModel(
      calculate({ ...defaultInput(), truss: 'purlin', purlinCount: 1, span: 8000, length: 12000 }),
    )
    const teksty = zPodpisami(platwiowy)
    for (const nazwa of ['Murłata', 'Krokiew', 'Słup', 'Kleszcze', 'Miecz']) {
      expect(teksty).toContain(nazwa)
    }
    expect(teksty.some((t) => t.startsWith('Płatew'))).toBe(true)
  })

  it('koperta podpisuje krożynę i kulawkę', () => {
    const koperta = zbudujModel(
      calculate({ ...defaultInput(), shape: 'hip', truss: 'rafter', span: 8000, length: 14000 }),
    )
    const teksty = zPodpisami(koperta)
    expect(teksty).toContain('Krożyna')
    expect(teksty).toContain('Kulawka')
  })

  // Każdy rodzaj dostaje jeden podpis — dwadzieścia razy „Krokiew" zamieniłoby
  // rysunek w ścianę tekstu.
  it('podpisuje rodzaj, a nie każdą sztukę', () => {
    const teksty = zPodpisami()
    const unikalne = new Set(teksty)
    expect(unikalne.size).toBe(teksty.length)
  })

  it('bez włączonej opcji nie pisze niczego', () => {
    expect(zPodpisami(model, false)).toHaveLength(0)
  })
})
