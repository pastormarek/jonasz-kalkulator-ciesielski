/**
 * Jednostki długości w wynikach.
 *
 * Cieśla odmierza na drewnie w centymetrach — „pięćset sześćdziesiąt siedem",
 * nie „pięć i sześćdziesiąt siedem setnych metra". Dlatego centymetry są
 * domyślne, a metry zostają dla tych, którzy wolą czytać jak w projekcie.
 *
 * Wyjątkiem są handlowe długości belek. Sześciometrówkę zamawia się jako
 * sześciometrówkę i nikt nie mówi o niej „sześćset centymetrów", więc te
 * zawsze pokazujemy w metrach — niezależnie od ustawienia.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { liczba } from './format'

export type Jednostka = 'cm' | 'm'

const KontekstJednostki = createContext<Jednostka>('cm')

export function DostawcaJednostek({
  jednostka,
  children,
}: {
  jednostka: Jednostka
  children: ReactNode
}) {
  return <KontekstJednostki.Provider value={jednostka}>{children}</KontekstJednostki.Provider>
}

/** Wartość i jednostka osobno — do kafelków, gdzie mają inny rozmiar. */
export interface Wymiar {
  wartosc: string
  jednostka: Jednostka
}

/** Zwraca funkcje formatujące długość zgodnie z wybraną jednostką. */
export function useDlugosc() {
  const jednostka = useContext(KontekstJednostki)

  /** Rozbite na wartość i jednostkę. */
  const rozbita = (mm: number): Wymiar =>
    jednostka === 'cm'
      ? { wartosc: liczba(mm / 10, 0), jednostka: 'cm' }
      : { wartosc: liczba(mm / 1000, 2), jednostka: 'm' }

  /** Gotowy tekst z jednostką, np. „562 cm". */
  const dl = (mm: number): string => {
    const w = rozbita(mm)
    return `${w.wartosc} ${w.jednostka}`
  }

  return { jednostka, dl, rozbita }
}

/** Długość handlowa belki — zawsze w metrach, bo tak się drewno zamawia. */
export const belka = (mm: number): string => `${liczba(mm / 1000, 1)} m`
