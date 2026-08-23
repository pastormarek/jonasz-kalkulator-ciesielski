/**
 * Optymalizacja docinania drewna.
 *
 * Problem jest prosty do opisania i trudny do rozwiązania idealnie: mamy listę
 * potrzebnych odcinków i belki w kilku długościach handlowych. Chcemy kupić
 * jak najmniej metrów sześciennych.
 *
 * Używamy heurystyki "najdłuższy najpierw" (first-fit-decreasing): sortujemy
 * odcinki od najdłuższego i każdy wkładamy do pierwszej belki, w której się
 * zmieści. To rozwiązanie nie jest matematycznie optymalne, ale w praktyce
 * ciesielskiej wypada bardzo blisko optimum i — co ważniejsze — daje wynik
 * powtarzalny i zrozumiały dla człowieka, który ma to potem przeciąć.
 */

/** Jedna belka handlowa z rozpisanym planem cięcia. */
export interface CutPlanBar {
  /** Długość kupowanej belki [mm]. */
  stockLength: number
  /** Odcinki wycinane z tej belki [mm]. */
  pieces: number[]
  /** Odpad pozostały po wycięciu wszystkich odcinków [mm]. */
  waste: number
}

/** Wynik planowania cięcia dla jednego przekroju. */
export interface CutPlan {
  bars: CutPlanBar[]
  /** Zestawienie zakupowe: ile sztuk każdej długości handlowej. */
  purchase: Array<{ length: number; count: number }>
  /** Łączna długość kupionego drewna [mm]. */
  totalStock: number
  /** Łączna długość odcinków faktycznie potrzebnych [mm]. */
  totalNeeded: number
  /** Łączny odpad [mm]. */
  totalWaste: number
  /** Odpad jako procent kupionego drewna. */
  wastePct: number
  /** Odcinki, których nie da się wyciąć z żadnej dostępnej długości. */
  impossible: number[]
}

/** Szerokość rzazu piły [mm] — każde cięcie zjada trochę materiału. */
const KERF = 4

/**
 * Układa plan cięcia dla jednego przekroju drewna.
 *
 * @param pieces potrzebne odcinki [mm]
 * @param stockLengths dostępne długości handlowe [mm]
 */
export function planCuts(pieces: number[], stockLengths: number[]): CutPlan {
  const stock = [...stockLengths].filter((s) => s > 0).sort((a, b) => a - b)
  const maxStock = stock.length > 0 ? stock[stock.length - 1] : 0

  const impossible: number[] = []
  const usable: number[] = []
  for (const p of pieces) {
    if (p <= 0) continue
    if (p > maxStock) impossible.push(p)
    else usable.push(p)
  }

  // Najdłuższe odcinki są najtrudniejsze do upchnięcia, więc idą pierwsze.
  usable.sort((a, b) => b - a)

  const bars: CutPlanBar[] = []
  for (const piece of usable) {
    // Zmieści się w którejś z już rozpoczętych belek?
    const bar = bars.find((b) => remaining(b) >= piece + (b.pieces.length > 0 ? KERF : 0))
    if (bar) {
      if (bar.pieces.length > 0) bar.waste -= KERF
      bar.pieces.push(piece)
      bar.waste -= piece
      continue
    }
    // Nie — otwieramy nową belkę. Nie bierzemy jednak najkrótszej, w której
    // odcinek się mieści, tylko tę, z której zejdzie najmniej odpadu przy
    // cięciu takich samych odcinków. Jętka 1,93 m z trzymetrówki marnuje
    // ponad jedną trzecią materiału, a z czterometrówki wychodzą dwie
    // sztuki i zostaje kilka centymetrów.
    bars.push(otworzBelke(piece, stock, maxStock))
  }

  const purchaseMap = new Map<number, number>()
  for (const bar of bars) {
    purchaseMap.set(bar.stockLength, (purchaseMap.get(bar.stockLength) ?? 0) + 1)
  }

  const totalStock = bars.reduce((sum, b) => sum + b.stockLength, 0)
  const totalNeeded = usable.reduce((sum, p) => sum + p, 0)
  const totalWaste = bars.reduce((sum, b) => sum + b.waste, 0)

  return {
    bars,
    purchase: [...purchaseMap.entries()]
      .map(([length, count]) => ({ length, count }))
      .sort((a, b) => a.length - b.length),
    totalStock,
    totalNeeded,
    totalWaste,
    wastePct: totalStock > 0 ? (totalWaste / totalStock) * 100 : 0,
    impossible,
  }
}

/**
 * Wybiera długość handlową dla nowego odcinka.
 *
 * Dla każdej dostępnej długości sprawdzamy, ile takich odcinków da się z niej
 * wyciąć i jaka część belki zostanie wykorzystana. Wygrywa najlepsze
 * wykorzystanie, a przy równym — belka krótsza, bo łatwiej ją dowieźć.
 */
function otworzBelke(piece: number, stock: number[], maxStock: number): CutPlanBar {
  let najlepsza = stock.find((s) => s >= piece) ?? maxStock
  let najlepszeWykorzystanie = -1

  for (const dlugosc of stock) {
    if (dlugosc < piece) continue
    const sztuk = Math.floor((dlugosc + KERF) / (piece + KERF))
    const wykorzystanie = (sztuk * piece) / dlugosc
    if (wykorzystanie > najlepszeWykorzystanie + 1e-9) {
      najlepszeWykorzystanie = wykorzystanie
      najlepsza = dlugosc
    }
  }

  return { stockLength: najlepsza, pieces: [piece], waste: najlepsza - piece }
}

/** Ile miejsca zostało w belce, z uwzględnieniem już wykonanych rzazów. */
function remaining(bar: CutPlanBar): number {
  return bar.waste
}

/**
 * Objętość drewna [m³] dla zadanego przekroju i łącznej długości.
 *
 * @param b szerokość przekroju [mm]
 * @param h wysokość przekroju [mm]
 * @param totalLength łączna długość [mm]
 */
export function volumeM3(b: number, h: number, totalLength: number): number {
  return (b / 1000) * (h / 1000) * (totalLength / 1000)
}

/**
 * Pole powierzchni bocznej drewna [m²] — potrzebne do wyliczenia impregnatu.
 *
 * @param b szerokość przekroju [mm]
 * @param h wysokość przekroju [mm]
 * @param totalLength łączna długość [mm]
 */
export function surfaceM2(b: number, h: number, totalLength: number): number {
  const perimeter = (2 * (b + h)) / 1000
  return perimeter * (totalLength / 1000)
}
