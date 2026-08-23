/**
 * Formatowanie liczb i wymiarów po polsku.
 *
 * W Polsce separatorem dziesiętnym jest przecinek, a tysiące oddziela się
 * spacją. Wszystkie liczby w aplikacji przechodzą przez ten moduł, żeby
 * ekran, wydruk i eksport wyglądały tak samo.
 */

const pl = (frac: number) =>
  new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })

/** Liczba z zadaną liczbą miejsc po przecinku. */
export function liczba(value: number, miejsca = 0): string {
  if (!Number.isFinite(value)) return '—'
  return pl(miejsca).format(value)
}

/** Milimetry na metry, np. 6055 → "6,06". */
export function mNaMetry(mm: number, miejsca = 2): string {
  if (!Number.isFinite(mm)) return '—'
  return liczba(mm / 1000, miejsca)
}

/** Milimetry zaokrąglone do pełnych, np. 46,7 → "47". */
export function mm(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return liczba(Math.round(value), 0)
}

/** Milimetry na centymetry z jednym miejscem, np. 46,7 → "4,7". */
export function cm(value: number, miejsca = 1): string {
  if (!Number.isFinite(value)) return '—'
  return liczba(value / 10, miejsca)
}

/** Kąt w stopniach, np. 35,264 → "35,3°". */
export function stopnie(value: number, miejsca = 1): string {
  if (!Number.isFinite(value)) return '—'
  return `${liczba(value, miejsca)}°`
}

/** Przekrój drewna, np. {b:80,h:180} → "80 × 180 mm". */
export function przekroj(b: number, h: number): string {
  return `${mm(b)} × ${mm(h)} mm`
}

/** Data ISO w czytelnej formie, np. "21.08.2026, 19:32". */
export function dataCzas(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Odmiana rzeczownika przez liczbę — polski ma trzy formy.
 * Przykład: odmiana(1,'sztuka','sztuki','sztuk') → "sztuka", a dla 3 → "sztuki".
 */
export function odmiana(n: number, poj: string, mnogaKilka: string, mnogaWiele: string): string {
  const abs = Math.abs(Math.round(n))
  if (abs === 1) return poj
  const ostatnia = abs % 10
  const dwie = abs % 100
  if (ostatnia >= 2 && ostatnia <= 4 && (dwie < 10 || dwie >= 20)) return mnogaKilka
  return mnogaWiele
}
