/**
 * Rysowanie modelu przestrzennego na płótnie.
 *
 * DLACZEGO WŁASNY SILNIK, A NIE BIBLIOTEKA 3D
 * -------------------------------------------
 * Więźba to wyłącznie prostopadłościany, a takich brył jest tu najwyżej kilkaset.
 * Gotowa biblioteka dołożyłaby do aplikacji grube kilkaset kilobajtów, a ta ma
 * działać na telefonie w terenie, często bez zasięgu. Ten moduł zajmuje kilka
 * kilobajtów i robi dokładnie tyle, ile potrzeba.
 *
 * JAK TO DZIAŁA
 * Ściany bryły rzutujemy na płaszczyznę ekranu, odrzucamy te odwrócone tyłem,
 * a resztę sortujemy od najdalszej do najbliższej i rysujemy w tej kolejności.
 * Bliższe zamalowują dalsze. Metoda jest stara jak malarstwo i zawodzi przy
 * bryłach, które się przenikają — ale w prawdziwej więźbie belki przylegają do
 * siebie, a nie wnikają w siebie nawzajem, więc tutaj wystarcza.
 */

import { wierzcholki, SCIANY, type Belka, type Model3D, type Punkt3 } from '../core/model3d'

/** Położenie obserwatora względem modelu. */
export interface Kamera {
  /** Obrót poziomy [rad] — obchodzenie budynku dookoła. */
  azymut: number
  /** Uniesienie [rad] — od poziomu terenu po widok z lotu ptaka. */
  elewacja: number
  /** Odległość od środka modelu [mm]. */
  dystans: number
}

/** Kamera pokazująca dach z góry, pod kątem — punkt wyjścia po otwarciu. */
export function kameraPoczatkowa(model: Model3D): Kamera {
  return {
    azymut: -0.7,
    elewacja: 0.5,
    dystans: model.promien * 3.4,
  }
}

/** Gotowe ustawienia widoku, dostępne pod przyciskami. */
export const WIDOKI: Array<{ nazwa: string; azymut: number; elewacja: number }> = [
  { nazwa: 'Z ukosa', azymut: -0.7, elewacja: 0.5 },
  { nazwa: 'Z przodu', azymut: 0, elewacja: 0.12 },
  { nazwa: 'Z boku', azymut: -Math.PI / 2, elewacja: 0.12 },
  { nazwa: 'Z góry', azymut: -Math.PI / 2, elewacja: 1.45 },
]

/** Punkt po rzutowaniu: położenie na ekranie i odległość od obserwatora. */
interface PunktEkranu {
  x: number
  y: number
  glebia: number
  /** Czy punkt jest przed obserwatorem. */
  widoczny: boolean
}

interface Widok {
  rzutuj: (p: Punkt3) => PunktEkranu
  /** Kierunek patrzenia — potrzebny do odrzucania ścian odwróconych tyłem. */
  doObserwatora: (p: Punkt3) => Punkt3
}

/** Buduje przekształcenie ze współrzędnych budynku na piksele płótna. */
function przygotujWidok(
  kamera: Kamera,
  srodek: Punkt3,
  szerokosc: number,
  wysokosc: number,
): Widok {
  const cosA = Math.cos(kamera.azymut)
  const sinA = Math.sin(kamera.azymut)
  const cosE = Math.cos(kamera.elewacja)
  const sinE = Math.sin(kamera.elewacja)

  // Ogniskowa dobrana tak, żeby model wypełniał kadr niezależnie od proporcji okna.
  const ogniskowa = Math.min(szerokosc, wysokosc * 1.35) * 0.9

  /** Zamienia punkt świata na układ związany z obserwatorem. */
  const doUkladuKamery = (p: Punkt3): Punkt3 => {
    const dx = p.x - srodek.x
    const dy = p.y - srodek.y
    const dz = p.z - srodek.z

    // Obrót wokół osi pionowej — obchodzimy budynek dookoła.
    const x1 = dx * cosA - dy * sinA
    const y1 = dx * sinA + dy * cosA

    // Uniesienie obserwatora nad poziom.
    const y2 = y1 * sinE + dz * cosE
    const z2 = -y1 * cosE + dz * sinE

    return { x: x1, y: y2, z: z2 + kamera.dystans }
  }

  return {
    rzutuj: (p: Punkt3): PunktEkranu => {
      const k = doUkladuKamery(p)
      // Punkty za obserwatorem odsuwamy na minimalną odległość, żeby rzut
      // nie eksplodował dzieleniem przez zero.
      const glebia = Math.max(k.z, 1)
      const skala = ogniskowa / glebia
      return {
        x: szerokosc / 2 + k.x * skala,
        y: wysokosc / 2 - k.y * skala,
        glebia: k.z,
        widoczny: k.z > 1,
      }
    },
    doObserwatora: (p: Punkt3): Punkt3 => {
      const k = doUkladuKamery(p)
      return { x: -k.x, y: -k.y, z: -k.z }
    },
  }
}

/** Paleta rysunku, pobierana ze zmiennych motywu. */
export interface Paleta {
  drewnoJasne: string
  drewnoSrednie: string
  drewnoCiemne: string
  krawedz: string
  przyciemnione: string
  przyciemnioneKrawedz: string
  wyrozniony: string
  wyroznionyKrawedz: string
  tekst: string
  wymiar: string
  tlo: string
}

/** Co narysować i jak. */
export interface OpcjeRysowania {
  model: Model3D
  kamera: Kamera
  paleta: Paleta
  /** Belki z tych etapów są w pełnym kolorze; reszta jest przygaszona. */
  etapyAktywne: Set<string>
  /** Belki z tych etapów są dodatkowo wyróżnione jako montowane teraz. */
  etapBiezacy: string | null
  /** Czy belki spoza aktywnych etapów mają być w ogóle widoczne. */
  pokazPoprzednie: boolean
  /** Czy rysować linie wymiarowe. */
  pokazWymiary: boolean
}

/** Ściana przygotowana do narysowania. */
interface SciannaDoRysowania {
  punkty: PunktEkranu[]
  glebia: number
  wypelnienie: string
  obrys: string
}

/**
 * Rysuje model na płótnie.
 *
 * @param ctx kontekst płótna
 * @param szerokosc szerokość rysunku w pikselach (bez mnożnika gęstości)
 * @param wysokosc wysokość rysunku w pikselach
 */
export function rysuj(
  ctx: CanvasRenderingContext2D,
  szerokosc: number,
  wysokosc: number,
  opcje: OpcjeRysowania,
): void {
  const { model, kamera, paleta } = opcje
  const widok = przygotujWidok(kamera, model.srodek, szerokosc, wysokosc)

  ctx.clearRect(0, 0, szerokosc, wysokosc)
  ctx.fillStyle = paleta.tlo
  ctx.fillRect(0, 0, szerokosc, wysokosc)

  const doRysowania: SciannaDoRysowania[] = []

  for (const belka of model.belki) {
    const aktywna = opcje.etapyAktywne.has(belka.etap)
    if (!aktywna && !opcje.pokazPoprzednie) continue

    const biezaca = opcje.etapBiezacy === belka.etap
    const rogi = wierzcholki(belka)
    const rzutowane = rogi.map(widok.rzutuj)

    // Belka choćby częściowo za obserwatorem nie ma sensownego rzutu.
    if (rzutowane.some((p) => !p.widoczny)) continue

    for (const sciana of SCIANY) {
      const punkty = sciana.map((i) => rzutowane[i])

      // Ściana odwrócona tyłem jest zasłonięta przez własną bryłę.
      if (poleZeZnakiem(punkty) <= 0) continue

      const jasnosc = oswietlenie(rogi, sciana, widok)
      doRysowania.push({
        punkty,
        glebia: punkty.reduce((s, p) => s + p.glebia, 0) / punkty.length,
        wypelnienie: kolorSciany(jasnosc, aktywna, biezaca, paleta),
        obrys: biezaca
          ? paleta.wyroznionyKrawedz
          : aktywna
            ? paleta.krawedz
            : paleta.przyciemnioneKrawedz,
      })
    }
  }

  // Od najdalszej do najbliższej — bliższe zamalowują dalsze.
  doRysowania.sort((a, b) => b.glebia - a.glebia)

  for (const s of doRysowania) {
    ctx.beginPath()
    ctx.moveTo(s.punkty[0].x, s.punkty[0].y)
    for (let i = 1; i < s.punkty.length; i++) ctx.lineTo(s.punkty[i].x, s.punkty[i].y)
    ctx.closePath()
    ctx.fillStyle = s.wypelnienie
    ctx.fill()
    ctx.strokeStyle = s.obrys
    ctx.lineWidth = 0.6
    ctx.stroke()
  }

  if (opcje.pokazWymiary) {
    rysujWymiary(ctx, model, widok, paleta, szerokosc, wysokosc)
  }
}

/**
 * Pole wielokąta ze znakiem. Dodatnie oznacza, że ściana jest zwrócona do nas —
 * to najtańszy sposób odrzucenia ścian, których i tak nie widać.
 */
function poleZeZnakiem(punkty: PunktEkranu[]): number {
  let suma = 0
  for (let i = 0; i < punkty.length; i++) {
    const a = punkty[i]
    const b = punkty[(i + 1) % punkty.length]
    suma += a.x * b.y - b.x * a.y
  }
  return suma / 2
}

/**
 * Jasność ściany: im bardziej odwrócona od obserwatora, tym ciemniejsza.
 * Bez tego bryły zlewają się w jednolite plamy i nie widać krawędzi.
 */
function oswietlenie(rogi: Punkt3[], sciana: number[], widok: Widok): number {
  const a = rogi[sciana[0]]
  const b = rogi[sciana[1]]
  const c = rogi[sciana[2]]

  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }
  const n = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  }
  const dlN = Math.hypot(n.x, n.y, n.z) || 1

  // Światło pada z góry i lekko z boku — jak słońce przed południem.
  const swiatlo = { x: 0.35, y: 0.25, z: 0.9 }
  const dlS = Math.hypot(swiatlo.x, swiatlo.y, swiatlo.z)
  const iloczyn = (n.x * swiatlo.x + n.y * swiatlo.y + n.z * swiatlo.z) / (dlN * dlS)

  void widok
  // Przenosimy zakres z [-1, 1] na [0.45, 1], żeby nic nie było zupełnie czarne.
  return 0.45 + 0.55 * Math.abs(iloczyn)
}

/** Dobiera kolor ściany do jej jasności i stanu montażu. */
function kolorSciany(
  jasnosc: number,
  aktywna: boolean,
  biezaca: boolean,
  paleta: Paleta,
): string {
  if (!aktywna) return paleta.przyciemnione
  const bazowy = biezaca
    ? paleta.wyrozniony
    : jasnosc > 0.85
      ? paleta.drewnoJasne
      : jasnosc > 0.65
        ? paleta.drewnoSrednie
        : paleta.drewnoCiemne
  return bazowy
}

/** Rysuje linie wymiarowe z opisami. */
function rysujWymiary(
  ctx: CanvasRenderingContext2D,
  model: Model3D,
  widok: Widok,
  paleta: Paleta,
  szerokosc: number,
  wysokosc: number,
): void {
  ctx.save()
  ctx.strokeStyle = paleta.wymiar
  ctx.fillStyle = paleta.tekst
  ctx.lineWidth = 1.2
  ctx.font = '600 12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const wym of model.wymiary) {
    const a = widok.rzutuj(wym.od)
    const b = widok.rzutuj(wym.do)
    if (!a.widoczny || !b.widoczny) continue

    // Linia wymiarowa odsunięta od mierzonej krawędzi, żeby jej nie zasłaniać.
    const odsuniecieEkranu = 26
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dl = Math.hypot(dx, dy) || 1
    const nx = (-dy / dl) * odsuniecieEkranu
    const ny = (dx / dl) * odsuniecieEkranu

    const ax = a.x + nx
    const ay = a.y + ny
    const bx = b.x + nx
    const by = b.y + ny

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()

    // Kreski odbijające końce wymiaru.
    for (const [px, py, qx, qy] of [
      [a.x, a.y, ax, ay],
      [b.x, b.y, bx, by],
    ]) {
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(qx, qy)
      ctx.stroke()
    }

    const sx = (ax + bx) / 2
    const sy = (ay + by) / 2
    if (sx < 0 || sx > szerokosc || sy < 0 || sy > wysokosc) continue

    // Tło pod opisem, żeby liczba była czytelna na tle konstrukcji.
    const szer = ctx.measureText(wym.etykieta).width
    ctx.fillStyle = paleta.tlo
    ctx.globalAlpha = 0.85
    ctx.fillRect(sx - szer / 2 - 4, sy - 9, szer + 8, 18)
    ctx.globalAlpha = 1
    ctx.fillStyle = paleta.tekst
    ctx.fillText(wym.etykieta, sx, sy)
  }

  ctx.restore()
}

/** Belka wskazana palcem lub kursorem — do podpowiedzi z nazwą. */
export function belkaPodKursorem(
  model: Model3D,
  kamera: Kamera,
  szerokosc: number,
  wysokosc: number,
  ekranX: number,
  ekranY: number,
  etapyAktywne: Set<string>,
): Belka | null {
  const widok = przygotujWidok(kamera, model.srodek, szerokosc, wysokosc)
  let najblizsza: { belka: Belka; glebia: number } | null = null

  for (const belka of model.belki) {
    if (!etapyAktywne.has(belka.etap)) continue
    const rzutowane = wierzcholki(belka).map(widok.rzutuj)
    if (rzutowane.some((p) => !p.widoczny)) continue

    for (const sciana of SCIANY) {
      const punkty = sciana.map((i) => rzutowane[i])
      if (poleZeZnakiem(punkty) <= 0) continue
      if (!wWielokacie(punkty, ekranX, ekranY)) continue

      const glebia = punkty.reduce((s, p) => s + p.glebia, 0) / punkty.length
      if (!najblizsza || glebia < najblizsza.glebia) najblizsza = { belka, glebia }
    }
  }

  return najblizsza?.belka ?? null
}

/** Czy punkt leży wewnątrz wielokąta — klasyczny test promienia. */
function wWielokacie(punkty: PunktEkranu[], x: number, y: number): boolean {
  let wewnatrz = false
  for (let i = 0, j = punkty.length - 1; i < punkty.length; j = i++) {
    const xi = punkty[i].x
    const yi = punkty[i].y
    const xj = punkty[j].x
    const yj = punkty[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      wewnatrz = !wewnatrz
    }
  }
  return wewnatrz
}
