/**
 * Piktogramy do wyboru kształtu, rodzaju konstrukcji i działu katalogu.
 *
 * DLACZEGO RYSUNEK, A NIE SAM NAPIS
 * ---------------------------------
 * Cieśla poprosił wprost: „zamiast napisu «dach jednospadowy» dodaj mały
 * obrazek takiego dachu". Powód jest praktyczny — kalkulator otwiera też
 * klient, który nazw nie zna, a kształt rozpozna od razu. Rysunek robi tu
 * robotę, której nie zrobi żadne dopracowanie tekstu.
 *
 * ZASADY, KTÓRYCH TU PILNUJEMY
 * ----------------------------
 * Wszystkie ikony mają to samo pole widzenia i tę samą grubość kreski, więc
 * w rzędzie kafelków wyglądają jak jedna rodzina. Kolor biorą z `currentColor`,
 * dzięki czemu zaznaczony kafelek barwi ikonę razem z tekstem i nie trzeba
 * osobnych wariantów na motyw jasny i ciemny.
 *
 * Nie ma tu cieni ani wypełnień gradientem: te ikony mają być czytelne przy
 * wysokości 28 pikseli na telefonie w słońcu, a nie ładne w powiększeniu.
 */

import type { ReactNode } from 'react'

/** Wspólna oprawa każdej ikony — jedno pole widzenia i jedna kreska. */
function Ikona({ children, tytul }: { children: ReactNode; tytul: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      width="44"
      height="30"
      role="img"
      aria-label={tytul}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Kształty dachu
// ---------------------------------------------------------------------------

export const IkonaDachDwuspadowy = () => (
  <Ikona tytul="Dach dwuspadowy">
    <path d="M4 24 L24 8 L44 24" />
    <path d="M2 24 H46" strokeWidth={1.4} opacity={0.55} />
  </Ikona>
)

export const IkonaDachJednospadowy = () => (
  <Ikona tytul="Dach jednospadowy">
    <path d="M4 24 L44 9" />
    <path d="M2 24 H46" strokeWidth={1.4} opacity={0.55} />
    <path d="M43 10 V24" strokeWidth={1.4} opacity={0.55} />
  </Ikona>
)

export const IkonaDachKopertowy = () => (
  <Ikona tytul="Dach kopertowy">
    {/* Kalenica krótsza od budynku i cztery zbiegające się naroża. */}
    <path d="M4 24 L14 10 H34 L44 24" />
    <path d="M14 10 L4 24" opacity={0.9} />
    <path d="M34 10 L44 24" opacity={0.9} />
    <path d="M2 24 H46" strokeWidth={1.4} opacity={0.55} />
  </Ikona>
)

// ---------------------------------------------------------------------------
// Złącze krokwi w kalenicy
// ---------------------------------------------------------------------------

export const IkonaKalenicaCzolowa = () => (
  <Ikona tytul="Cięcie czołowe">
    <path d="M6 26 L24 9" />
    <path d="M42 26 L24 9" />
    <path d="M24 6 V13" strokeWidth={1.4} opacity={0.6} />
  </Ikona>
)

export const IkonaKalenicaZakladka = () => (
  <Ikona tytul="Zakładka ciesielska">
    {/* Krokwie przechodzą za oś i mijają się — końce sterczą ponad szczyt. */}
    <path d="M6 26 L30 5" />
    <path d="M42 26 L18 5" />
    <path d="M24 4 V12" strokeWidth={1.4} opacity={0.6} />
  </Ikona>
)

// ---------------------------------------------------------------------------
// Wiaty i zadaszenia
// ---------------------------------------------------------------------------

export const IkonaWiata = () => (
  <Ikona tytul="Wiata wolnostojąca">
    <path d="M5 13 L24 4 L43 13" />
    <path d="M9 13 V27" />
    <path d="M39 13 V27" />
  </Ikona>
)

export const IkonaZadaszenie = () => (
  <Ikona tytul="Zadaszenie przyścienne">
    {/* Gruba pionowa kreska to ściana budynku, do której dach jest dostawiony. */}
    <path d="M7 3 V29" strokeWidth={3} />
    <path d="M7 9 L42 17" />
    <path d="M39 16 V28" />
  </Ikona>
)

export const IkonaPergola = () => (
  <Ikona tytul="Pergola">
    <path d="M6 10 H42" />
    <path d="M9 10 V28" />
    <path d="M39 10 V28" />
    {/* Szczebliny zamiast pełnego pokrycia. */}
    <path d="M14 6 V14 M22 6 V14 M30 6 V14 M38 6 V14" strokeWidth={1.4} opacity={0.75} />
  </Ikona>
)

// ---------------------------------------------------------------------------
// Działy katalogu mebli
// ---------------------------------------------------------------------------

export const IkonaSiedziska = () => (
  <Ikona tytul="Siedziska">
    <path d="M10 18 H36" />
    <path d="M12 18 V27 M34 18 V27" />
    <path d="M34 18 V7" />
    <path d="M18 12 H34" strokeWidth={1.6} opacity={0.8} />
  </Ikona>
)

export const IkonaStoly = () => (
  <Ikona tytul="Stoły">
    <path d="M6 13 H42" />
    <path d="M10 13 V27 M38 13 V27" />
    <path d="M10 21 H38" strokeWidth={1.4} opacity={0.65} />
  </Ikona>
)

export const IkonaOgrod = () => (
  <Ikona tytul="Ogród">
    {/* Donica z rośliną — najkrótszy skrót na uprawę w skrzyni. */}
    <path d="M12 16 H36 L33 28 H15 Z" />
    <path d="M24 16 V9" strokeWidth={1.6} />
    <path d="M24 11 C20 11 18 8 18 5 C22 5 24 8 24 11 Z" strokeWidth={1.4} />
  </Ikona>
)

export const IkonaPrzechowywanie = () => (
  <Ikona tytul="Przechowywanie">
    <path d="M8 12 H40 V27 H8 Z" />
    <path d="M8 12 L12 6 H36 L40 12" />
    <path d="M20 12 V27 M28 12 V27" strokeWidth={1.4} opacity={0.6} />
  </Ikona>
)

export const IkonaDom = () => (
  <Ikona tytul="Do domu">
    {/* Regał: dwa boki i półki między nimi. */}
    <path d="M12 5 V28 M36 5 V28" />
    <path d="M12 12 H36 M12 19 H36 M12 26 H36" />
  </Ikona>
)

export const IkonaZwierzeta = () => (
  <Ikona tytul="Dla zwierząt i dzieci">
    <path d="M10 27 V13 L24 5 L38 13 V27 Z" />
    <circle cx="24" cy="18" r="5" />
  </Ikona>
)

// ---------------------------------------------------------------------------
// Słowniki — po nich sięgają widoki
// ---------------------------------------------------------------------------

export const IKONY_KSZTALTU_DACHU: Record<string, () => ReactNode> = {
  gable: IkonaDachDwuspadowy,
  shed: IkonaDachJednospadowy,
  hip: IkonaDachKopertowy,
}

export const IKONY_KALENICY: Record<string, () => ReactNode> = {
  czolowe: IkonaKalenicaCzolowa,
  zakladka: IkonaKalenicaZakladka,
}

export const IKONY_WIATY: Record<string, () => ReactNode> = {
  wiata: IkonaWiata,
  zadaszenie: IkonaZadaszenie,
  pergola: IkonaPergola,
}

export const IKONY_KATEGORII_MEBLI: Record<string, () => ReactNode> = {
  siedziska: IkonaSiedziska,
  stoly: IkonaStoly,
  ogrod: IkonaOgrod,
  przechowywanie: IkonaPrzechowywanie,
  dom: IkonaDom,
  zwierzeta: IkonaZwierzeta,
}
