/**
 * Katalog mebli — jedno miejsce, w którym schodzą się wszystkie przepisy.
 *
 * Reszta aplikacji nie wie, w którym pliku leży dany mebel: pyta katalog
 * o przepis po identyfikatorze albo o listę przepisów w kategorii. Dzięki temu
 * dopisanie mebla sprowadza się do dwóch rzeczy — napisania przepisu i dodania
 * jego tablicy tutaj.
 */

import type { KategoriaMebla, PrzepisMebla, Wymiary } from './furniture'
import { wymiaryDla } from './furniture'
import { PRZEPISY_SIEDZISKA } from './furnitureSiedziska'
import { PRZEPISY_STOLY } from './furnitureStoly'
import { PRZEPISY_OGROD } from './furnitureOgrod'
import { PRZEPISY_PRZECHOWYWANIE } from './furniturePrzechowywanie'
import { PRZEPISY_DOM } from './furnitureDom'

/** Wszystkie meble, w kolejności pokazywania. */
export const KATALOG_MEBLI: PrzepisMebla[] = [
  ...PRZEPISY_SIEDZISKA,
  ...PRZEPISY_STOLY,
  ...PRZEPISY_OGROD,
  ...PRZEPISY_PRZECHOWYWANIE,
  ...PRZEPISY_DOM,
]

/**
 * Przepis po identyfikatorze.
 *
 * Gdy identyfikator jest nieznany — bo ktoś otworzył stary link do mebla,
 * którego już nie ma — oddajemy pierwszy z katalogu zamiast wywracać
 * aplikację. Utrata wymiarów jest przykra, biały ekran gorszy.
 */
export function przepisDla(id: string): PrzepisMebla {
  return KATALOG_MEBLI.find((p) => p.id === id) ?? KATALOG_MEBLI[0]
}

/** Czy taki mebel w ogóle jest w katalogu. */
export function znanyMebel(id: string): boolean {
  return KATALOG_MEBLI.some((p) => p.id === id)
}

/** Meble jednej kategorii. */
export function przepisyKategorii(kategoria: KategoriaMebla): PrzepisMebla[] {
  return KATALOG_MEBLI.filter((p) => p.kategoria === kategoria)
}

/** Komplet domyślnych wymiarów przepisu. */
export function domyslneWymiary(przepis: PrzepisMebla): Wymiary {
  return wymiaryDla(przepis, {})
}

/**
 * Przełącza projekt na inny mebel.
 *
 * Wymiary poprzedniego mebla są bezużyteczne przy następnym — „głębokość”
 * ławki i „głębokość” budki lęgowej to zupełnie inne liczby. Bierzemy więc
 * domyślne nowego przepisu, ale zachowujemy te parametry, które nowy mebel
 * też ma i które mieszczą się w jego zakresie. Zmiana ławki 1,8 m na ławkę
 * bez oparcia zostawia więc długość, a nie wraca do 1,5 m.
 */
export function zmienMebel(nowyId: string, poprzednie: Wymiary): Wymiary {
  const przepis = przepisDla(nowyId)
  const wynik = domyslneWymiary(przepis)
  for (const p of przepis.parametry) {
    const stara = poprzednie[p.klucz]
    if (Number.isFinite(stara) && stara >= p.min && stara <= p.max) {
      wynik[p.klucz] = stara
    }
  }
  return wynik
}
