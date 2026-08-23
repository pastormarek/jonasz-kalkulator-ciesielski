import { describe, it, expect } from 'vitest'
import {
  slopeGeometry,
  layoutRafters,
  notch,
  hipGeometry,
  collarGeometry,
  percentToDeg,
  degToPercent,
  ratioToDeg,
} from './geometry'

/** Pomocnik: porównanie z tolerancją w milimetrach lub stopniach. */
const close = (a: number, b: number, tol = 0.5) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('geometria połaci', () => {
  it('dach 45° daje krokiew o długości biegu razy √2', () => {
    const g = slopeGeometry(4000, 45, 0)
    close(g.rise, 4000) // przy 45° wzniesienie równa się biegowi
    close(g.rafterToRidge, 4000 * Math.SQRT2)
  })

  it('trójkąt 3-4-5: bieg 4 m i wzniesienie 3 m dają krokiew 5 m', () => {
    const pitch = ratioToDeg(3000, 4000) // ok. 36,87°
    const g = slopeGeometry(4000, pitch, 0)
    close(g.rise, 3000)
    close(g.rafterToRidge, 5000)
  })

  it('okap wydłuża krokiew o swoje wysunięcie podzielone przez cos α', () => {
    const g = slopeGeometry(4000, 30, 600)
    close(g.eavesLength, 600 / Math.cos((30 * Math.PI) / 180))
    close(g.rafterTotal, g.rafterToRidge + g.eavesLength)
  })

  it('dach płaski (0°) daje krokiew równą biegowi', () => {
    const g = slopeGeometry(3000, 0, 500)
    close(g.rise, 0)
    close(g.rafterTotal, 3500)
  })
})

describe('przeliczniki spadku', () => {
  it('100% odpowiada 45 stopniom', () => {
    close(percentToDeg(100), 45, 0.01)
    close(degToPercent(45), 100, 0.01)
  })

  it('przeliczniki są wzajemnie odwrotne', () => {
    close(percentToDeg(degToPercent(37)), 37, 0.001)
  })
})

describe('rozstaw krokwi', () => {
  it('nigdy nie przekracza zadanego maksimum', () => {
    const l = layoutRafters(12000, 900, 80)
    expect(l.spacing).toBeLessThanOrEqual(900)
    expect(l.countPerSlope).toBe(l.bays + 1)
  })

  it('rozkłada krokwie równo na całej długości osiowej', () => {
    const l = layoutRafters(12000, 900, 80)
    close(l.spacing * l.bays, 12000 - 80)
  })

  it('prześwit to rozstaw pomniejszony o grubość krokwi', () => {
    const l = layoutRafters(10000, 800, 80)
    close(l.clear, l.spacing - 80)
  })

  it('bardzo krótki budynek daje co najmniej jedno pole i dwie krokwie', () => {
    const l = layoutRafters(500, 900, 80)
    expect(l.bays).toBe(1)
    expect(l.countPerSlope).toBe(2)
  })
})

describe('zacios na murłacie', () => {
  it('siodło i pięta wynikają z kąta połaci', () => {
    const n = notch(30, 40, 200, 140)
    close(n.seatLength, 30 / Math.sin((40 * Math.PI) / 180), 0.01)
    close(n.heelHeight, 30 / Math.cos((40 * Math.PI) / 180), 0.01)
  })

  it('pilnuje normy jednej trzeciej wysokości krokwi', () => {
    expect(notch(60, 40, 200, 140).depthOk).toBe(true) // dokładnie 1/3
    expect(notch(70, 40, 200, 140).depthOk).toBe(false)
    close(notch(70, 40, 200, 140).maxDepth, 66.67, 0.01)
  })

  it('wykrywa, że siodło nie mieści się na murłacie', () => {
    // Płaski dach: siodło rozciąga się w nieskończoność, na pewno nie zmieści się na 140 mm.
    expect(notch(30, 10, 200, 140).seatFitsPlate).toBe(false)
    expect(notch(30, 45, 200, 140).seatFitsPlate).toBe(true)
  })
})

describe('dach kopertowy', () => {
  it('krożyna jest zawsze łagodniejsza niż połać', () => {
    const h = hipGeometry(8000, 12000, 45, 0, 800)
    expect(h.hipPitchDeg).toBeLessThan(45)
    close(h.hipPitchDeg, 35.264, 0.01) // arctan(1/√2)
  })

  it('dla dachu 45° daje tabelaryczne kąty ciesielskie', () => {
    const h = hipGeometry(8000, 12000, 45, 0, 800)
    close(h.jackCheekAngleDeg, 35.264, 0.01) // znane 35°16'
    close(h.hipBackingAngleDeg, 30, 0.01) // znane 30°
  })

  it('długość krożyny zgadza się z twierdzeniem Pitagorasa w przestrzeni', () => {
    const span = 8000
    const h = hipGeometry(span, 12000, 40, 0, 800)
    const rise = (span / 2) * Math.tan((40 * Math.PI) / 180)
    const diagonalRun = (span / 2) * Math.SQRT2
    close(h.hipLength, Math.hypot(diagonalRun, rise))
  })

  it('kulawki skracają się równomiernie o stały skok', () => {
    const h = hipGeometry(8000, 12000, 40, 0, 800)
    expect(h.jackLengths.length).toBeGreaterThan(1)
    const diff = h.jackLengths[0] - h.jackLengths[1]
    close(diff, h.jackDifference)
  })

  it('kalenica jest krótsza od budynku o dwa biegi naroży', () => {
    const h = hipGeometry(8000, 12000, 40, 0, 800)
    close(h.ridgeLength, 12000 - 8000)
  })

  it('budynek kwadratowy daje dach namiotowy — kalenica znika', () => {
    const h = hipGeometry(8000, 8000, 40, 0, 800)
    close(h.ridgeLength, 0)
  })
})

describe('jętka', () => {
  it('im wyżej, tym krótsza', () => {
    const low = collarGeometry(8000, 40, 1000, 80)
    const high = collarGeometry(8000, 40, 2000, 80)
    expect(high.span).toBeLessThan(low.span)
  })

  it('na poziomie murłaty ma pełną rozpiętość budynku', () => {
    close(collarGeometry(8000, 40, 0, 80).span, 8000)
  })

  it('odrzuca jętkę wyniesioną ponad kalenicę', () => {
    const rise = 4000 * Math.tan((40 * Math.PI) / 180) // ok. 3356 mm
    expect(collarGeometry(8000, 40, rise + 100, 80).valid).toBe(false)
    expect(collarGeometry(8000, 40, rise - 500, 80).valid).toBe(true)
  })
})
