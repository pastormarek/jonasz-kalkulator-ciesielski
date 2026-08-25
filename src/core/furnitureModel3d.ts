/**
 * Model przestrzenny mebla.
 *
 * Tu prawie nie ma pracy do wykonania i to jest zamierzone: przepis układa
 * części od razu we współrzędnych, a część ma dokładnie te same pola co belka
 * więźby — oś, przekrój i kierunek wysokości. Zamiana sprowadza się więc do
 * nadania identyfikatorów i dołożenia linii wymiarowych.
 *
 * Środek i promień liczymy z rzeczywistej bryły mebla zamiast z parametrów.
 * Meble w katalogu mają zbyt różne kształty, żeby dało się to zgadnąć ze
 * wzoru: półka ścienna sięga w dół pod zero, huśtawka jest cztery razy wyższa
 * niż głęboka, a podest tarasowy prawie płaski.
 */

import type { Belka, Model3D, Punkt3, Wymiar3 } from './model3d'
import { obrysCzesci, type Obrys } from './furniture'
import type { FurnitureCalculation } from './furnitureMaterials'

const p3 = (x: number, y: number, z: number): Punkt3 => ({ x, y, z })

export function zbudujModelMebla(w: FurnitureCalculation): Model3D {
  const belki: Belka[] = w.czesci.map((c, i) => ({
    id: `m${i}`,
    nazwa: c.nazwa,
    etap: c.etap,
    start: c.start,
    koniec: c.koniec,
    gora: c.gora,
    b: c.b,
    h: c.h,
  }))

  const pudlo = obrysCzesci(w.czesci)
  const srodek = p3(
    (pudlo.minX + pudlo.maxX) / 2,
    (pudlo.minY + pudlo.maxY) / 2,
    (pudlo.minZ + pudlo.maxZ) / 2,
  )
  const promien =
    Math.max(
      pudlo.maxX - pudlo.minX,
      pudlo.maxY - pudlo.minY,
      pudlo.maxZ - pudlo.minZ,
      // Najmniejsze meble w katalogu — budka lęgowa, karmnik — są na tyle
      // małe, że bez dolnej granicy kamera wchodziłaby w środek bryły.
      300,
    ) * 0.8

  return {
    belki,
    wymiary: zbudujWymiary(w, pudlo),
    srodek,
    promien,
  }
}

/**
 * Trzy linie wymiarowe: szerokość, głębokość i wysokość gabarytu.
 *
 * To są dokładnie te liczby, które trzeba znać, żeby stwierdzić, czy mebel
 * zmieści się tam, gdzie ma stać — i czy przejdzie przez drzwi.
 */
function zbudujWymiary(w: FurnitureCalculation, o: Obrys): Wymiar3[] {
  const cm = (mm: number) => `${Math.round(mm / 10)} cm`

  return [
    {
      od: p3(o.minX, o.minY, o.minZ),
      do: p3(o.maxX, o.minY, o.minZ),
      etykieta: `szerokość ${cm(w.gabaryt.dlugosc)}`,
      odsuniecie: p3(0, -1, 0),
    },
    {
      od: p3(o.minX, o.minY, o.minZ),
      do: p3(o.minX, o.maxY, o.minZ),
      etykieta: `głębokość ${cm(w.gabaryt.szerokosc)}`,
      odsuniecie: p3(-1, 0, 0),
    },
    {
      od: p3(o.maxX, o.minY, o.minZ),
      do: p3(o.maxX, o.minY, o.maxZ),
      etykieta: `wysokość ${cm(w.gabaryt.wysokosc)}`,
      odsuniecie: p3(1, 0, 0),
    },
  ]
}
