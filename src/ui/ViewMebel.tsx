/**
 * Wybór mebla z katalogu i jego wymiary.
 *
 * Pola wymiarów nie są tu wypisane na sztywno — powstają z tego, co deklaruje
 * przepis. Dzięki temu ten sam ekran obsługuje ławkę z czterema parametrami
 * i budkę lęgową ze średnicą otworu, a dołożenie kolejnego mebla do katalogu
 * nie wymaga tknięcia żadnego komponentu.
 */

import { useState } from 'react'
import type { FurnitureInput, Gatunek, KategoriaMebla, ParametrDef, Wykonczenie } from '../core/furniture'
import {
  GATUNEK_INFO,
  KATEGORIA_LABELS,
  WYKONCZENIE_INFO,
  furnitureStockLengthsFor,
} from '../core/furniture'
import { KATALOG_MEBLI, przepisDla, przepisyKategorii, zmienMebel } from '../core/furnitureCatalog'
import type { FurnitureCalculation } from '../core/furnitureMaterials'
import type { StockMode } from '../core/types'
import { Karta, PoleLiczbowe, PoleWyboru, Przelacznik, Wynik, Komunikat } from './controls'
import { liczba } from './format'
import { useDlugosc } from './units'

const KATEGORIE = Object.keys(KATEGORIA_LABELS) as KategoriaMebla[]

export function ViewMebel({
  input,
  onChange,
  wynik,
}: {
  input: FurnitureInput
  onChange: (patch: Partial<FurnitureInput>) => void
  wynik: FurnitureCalculation
}) {
  const przepis = przepisDla(input.model)
  const [kategoria, setKategoria] = useState<KategoriaMebla>(przepis.kategoria)
  const { dl } = useDlugosc()

  const wybierz = (id: string) => {
    onChange({ model: id, wymiary: zmienMebel(id, input.wymiary) })
  }

  const zmienWymiar = (klucz: string, wartosc: number) => {
    onChange({ wymiary: { ...wynik.wymiary, [klucz]: wartosc } })
  }

  return (
    <div className="kolumny">
      <Karta
        tytul="Co robisz"
        podtytul={`${KATALOG_MEBLI.length} mebli do zrobienia samodzielnie. Wybierz jeden i dopasuj wymiary — reszta policzy się sama.`}
        pelna
      >
        <div className="rzad" role="group" aria-label="Dział katalogu">
          {KATEGORIE.map((k) => (
            <button
              key={k}
              type="button"
              className={kategoria === k ? 'przycisk glowny' : 'przycisk'}
              aria-pressed={kategoria === k}
              onClick={() => setKategoria(k)}
            >
              {KATEGORIA_LABELS[k].label}
            </button>
          ))}
        </div>
        <p className="podpowiedz" style={{ margin: '8px 0 12px' }}>
          {KATEGORIA_LABELS[kategoria].opis}
        </p>

        <div className="modele">
          {przepisyKategorii(kategoria).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === input.model}
              onClick={() => wybierz(m.id)}
              title={m.opis}
            >
              {m.nazwa}
              <span className="wymiar-modelu">
                {ZNAKI_TRUDNOSCI[m.trudnosc]} · {m.czas}
              </span>
              <small>{m.opis}</small>
            </button>
          ))}
        </div>
      </Karta>

      <Karta tytul={przepis.nazwa} podtytul={przepis.opis}>
        <div className="wyniki" style={{ marginBottom: 16 }}>
          <Wynik
            etykieta="Gotowy mebel"
            wartosc={`${dl(wynik.gabaryt.dlugosc)} × ${dl(wynik.gabaryt.szerokosc)}`}
            opis={`wysokość ${dl(wynik.gabaryt.wysokosc)}`}
            wyrozniony
          />
          <Wynik
            etykieta="Masa"
            wartosc={liczba(wynik.masaKg, 0)}
            jednostka="kg"
            opis={wynik.masaKg > 40 ? 'do przeniesienia we dwoje' : 'do przeniesienia w pojedynkę'}
          />
          <Wynik
            etykieta="Trudność"
            wartosc={ZNAKI_TRUDNOSCI[przepis.trudnosc]}
            opis={OPIS_TRUDNOSCI[przepis.trudnosc]}
          />
          <Wynik etykieta="Czas roboty" wartosc={przepis.czas} opis="bez schnięcia oleju" />
        </div>

        {przepis.narzedzia && (
          <p className="podpowiedz" style={{ marginBottom: 12 }}>
            <strong>Czym to zrobisz:</strong> {przepis.narzedzia.join(', ')}.
          </p>
        )}

        <div className="siatka-pol">
          {przepis.parametry.map((p) => (
            <PoleParametru
              key={p.klucz}
              parametr={p}
              wartosc={wynik.wymiary[p.klucz]}
              onChange={(v) => zmienWymiar(p.klucz, v)}
            />
          ))}
        </div>
      </Karta>

      <Karta
        tytul="Drewno i wykończenie"
        podtytul="Gatunek decyduje o tym, ile mebel wytrzyma. Wykończenie — jak długo będzie ładny."
      >
        <div className="siatka-pol">
          <PoleWyboru
            label="Gatunek drewna"
            value={input.gatunek}
            onChange={(gatunek: Gatunek) => onChange({ gatunek })}
            opcje={(Object.keys(GATUNEK_INFO) as Gatunek[]).map((g) => ({
              value: g,
              label: GATUNEK_INFO[g].label,
            }))}
            podpowiedz={GATUNEK_INFO[input.gatunek].opis}
          />
          <PoleWyboru
            label="Wykończenie"
            value={input.wykonczenie}
            onChange={(wykonczenie: Wykonczenie) => onChange({ wykonczenie })}
            opcje={(Object.keys(WYKONCZENIE_INFO) as Wykonczenie[]).map((v) => ({
              value: v,
              label: WYKONCZENIE_INFO[v].label,
            }))}
            podpowiedz={WYKONCZENIE_INFO[input.wykonczenie].opis}
          />
        </div>
        <p className="podpowiedz" style={{ marginTop: 8 }}>
          {GATUNEK_INFO[input.gatunek].label} na dworze wytrzyma orientacyjnie{' '}
          <strong>{GATUNEK_INFO[input.gatunek].trwaloscLat} lat</strong> przy normalnej
          pielęgnacji.
        </p>
      </Karta>

      <Karta
        tytul="Skąd bierzesz drewno"
        podtytul="Od dostępnych długości zależy plan cięcia i to, ile odpadu zostanie."
      >
        <div className="siatka-pol">
          <PoleWyboru
            label="Tarcica"
            value={input.stockMode}
            onChange={(stockMode: StockMode) =>
              onChange({ stockMode, stockLengths: furnitureStockLengthsFor(stockMode) })
            }
            opcje={[
              { value: 'handlowe', label: 'Z półki w markecie (do 4 m)' },
              { value: 'na-wymiar', label: 'Cięta w tartaku (do 6 m)' },
            ]}
            podpowiedz={
              input.stockMode === 'handlowe'
                ? 'Deski i kantówki gotowe, w typowych długościach. Tak kupuje większość.'
                : 'Tartak dotnie na wymiar i sprzeda taniej za metr, ale trzeba poczekać.'
            }
          />
          <PoleLiczbowe
            label="Naddatek na docięcie"
            value={input.cutAllowance}
            onChange={(cutAllowance) => onChange({ cutAllowance })}
            krok={5}
            max={100}
            podpowiedz="Doliczany do każdej części. Przy meblu tnie się dokładnie, więc 2 cm zwykle wystarcza."
          />
        </div>
      </Karta>

      {przepis.wskazowki && przepis.wskazowki.length > 0 && (
        <Karta tytul="Zanim zaczniesz" pelna>
          {przepis.wskazowki.map((w, i) => (
            <Komunikat key={i} rodzaj="info">
              {w}
            </Komunikat>
          ))}
        </Karta>
      )}
    </div>
  )
}

/** Jedno pole wymiaru — liczba albo przełącznik, zależnie od deklaracji. */
function PoleParametru({
  parametr,
  wartosc,
  onChange,
}: {
  parametr: ParametrDef
  wartosc: number
  onChange: (v: number) => void
}) {
  if (parametr.jednostka === 'tak-nie') {
    return (
      <div className="pole" style={{ gridColumn: 'span 2' }}>
        <Przelacznik
          label={parametr.label}
          opis={parametr.podpowiedz}
          checked={wartosc >= 1}
          onChange={(v) => onChange(v ? 1 : 0)}
        />
      </div>
    )
  }

  return (
    <PoleLiczbowe
      label={parametr.label}
      value={wartosc}
      onChange={onChange}
      jednostka={parametr.jednostka === 'szt' ? 'szt.' : (parametr.jednostka ?? 'mm')}
      krok={parametr.krok ?? 10}
      min={parametr.min}
      max={parametr.max}
      podpowiedz={
        <>
          {parametr.podpowiedz ? `${parametr.podpowiedz} ` : ''}
          <span style={{ whiteSpace: 'nowrap' }}>
            Zakres {opisZakresu(parametr)}.
          </span>
        </>
      }
    />
  )
}

function opisZakresu(p: ParametrDef): string {
  if (p.jednostka === 'szt') return `${p.min}–${p.max}`
  if (p.jednostka === '°') return `${p.min}–${p.max}°`
  return `${liczba(p.min / 10, 0)}–${liczba(p.max / 10, 0)} cm`
}

const ZNAKI_TRUDNOSCI: Record<1 | 2 | 3, string> = {
  1: '● łatwe',
  2: '●● średnie',
  3: '●●● wymagające',
}

const OPIS_TRUDNOSCI: Record<1 | 2 | 3, string> = {
  1: 'piła, wkrętarka i kątownik',
  2: 'trzeba pilnować kątów i poziomów',
  3: 'cięcia pod kątem, szablony, wprawa',
}
