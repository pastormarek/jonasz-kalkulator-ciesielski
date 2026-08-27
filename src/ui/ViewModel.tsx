/**
 * Widok przestrzenny konstrukcji — więźby dachowej albo wiaty.
 *
 * Gotowy model dostaje z zewnątrz, więc ten sam ekran obsługuje obie gałęzie
 * aplikacji: dach i wiatę. Różnią się tylko podpisami.
 *
 * Dwa tryby:
 *  - CAŁOŚĆ — gotowy dach, obracany dowolnie, do obejrzenia i pokazania klientowi,
 *  - MONTAŻ — ta sama konstrukcja rozłożona na etapy, po jednym kroku naraz,
 *    z opisem i wykazem drewna potrzebnego akurat na ten krok.
 *
 * Widok da się zapisać jako obrazek, żeby zabrać go na budowę albo wysłać.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  policzEtapy,
  OPIS_ETAPU,
  ETAPY,
  type Etap,
  type Belka,
  type Model3D,
} from '../core/model3d'
import {
  rysuj,
  belkaPodKursorem,
  kameraPoczatkowa,
  WIDOKI,
  type Kamera,
  type Paleta,
} from './scene3d'
import { Karta, Komunikat } from './controls'
import { liczba, odmiana } from './format'
import { useDlugosc } from './units'

/**
 * Warstwa łacenia — to ją chowamy w widoku całości. W trybie montażu zostaje,
 * bo tam jest osobnym krokiem i trzeba zobaczyć, co się przybija.
 */
const WARSTWA_LACENIA = ['laty', 'kontrlaty']

/**
 * Kolory pokryć spotykane na dachach w Polsce.
 *
 * To nie jest paleta producenta — cieśla odesłał do kart Bratexu
 * i Blachotrapezu — tylko zestaw, który sam wymienił jako podstawowy:
 * jasny i ciemny brąz, grafit, czarny, antracyt, zieleń, czerwień, srebrny.
 * Ceglasty zostaje na początku listy, bo taki jest najczęstszy dach z dachówki.
 */
const KOLORY_POKRYCIA: Array<{ nazwa: string; hex: string }> = [
  { nazwa: 'Ceglasty', hex: '#a8452b' },
  { nazwa: 'Czerwień', hex: '#7b2f27' },
  { nazwa: 'Jasny brąz', hex: '#8a5c3b' },
  { nazwa: 'Ciemny brąz', hex: '#4a2f1d' },
  { nazwa: 'Grafit', hex: '#404751' },
  { nazwa: 'Antracyt', hex: '#2b3037' },
  { nazwa: 'Czarny', hex: '#17191c' },
  { nazwa: 'Zieleń', hex: '#314a3b' },
  { nazwa: 'Srebrny', hex: '#98a1a9' },
]

export function ViewModel({
  model,
  nazwaProjektu,
  etykietaCalosci = 'Cały dach',
  opisPlotna = 'Przestrzenny model więźby dachowej',
  wskazowka,
}: {
  model: Model3D
  nazwaProjektu: string
  /** Podpis przycisku trybu „całość" — inny dla dachu, inny dla wiaty. */
  etykietaCalosci?: string
  /** Opis płótna dla czytnika ekranu. */
  opisPlotna?: string
  /** Uwaga pod wykazem elementów. */
  wskazowka?: ReactNode
}) {
  const etapyObecne = useMemo(() => policzEtapy(model), [model])

  const [kamera, setKamera] = useState<Kamera>(() => kameraPoczatkowa(model))
  const [tryb, setTryb] = useState<'calosc' | 'montaz'>('calosc')
  const [krok, setKrok] = useState(0)
  const [pokazWymiary, setPokazWymiary] = useState(true)
  // Podpisy elementów są wyłączone na starcie: przy pierwszym spojrzeniu
  // liczy się bryła, a nazwy zasłaniają to, co się ogląda. Włącza je ten,
  // kto uczy się więźby albo tłumaczy ją komuś innemu.
  const [pokazPodpisy, setPokazPodpisy] = useState(false)
  const [pokazPoprzednie, setPokazPoprzednie] = useState(true)
  // Cieśla poprosił wprost, żeby nie rysować łat na konstrukcji: zasłaniają
  // to, co się ogląda, a jak wygląda łata, każdy wie. Zostają w zestawieniu
  // materiału i w instrukcji montażu — znikają tylko z widoku całości.
  const [pokazLacenie, setPokazLacenie] = useState(false)
  // Pokrycie jest wyłączone na starcie: pierwsze, po co się tu wchodzi, to
  // obejrzeć więźbę. Kolor trzymamy nawet po wyłączeniu, żeby powrót nie
  // wymagał wybierania go od nowa.
  const [pokazPokrycie, setPokazPokrycie] = useState(false)
  const [kolorPokrycia, setKolorPokrycia] = useState(KOLORY_POKRYCIA[0].hex)
  const [wskazana, setWskazana] = useState<Belka | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const otoczkaRef = useRef<HTMLDivElement>(null)
  const { dl } = useDlugosc()

  // Zmiana dachu zmienia jego rozmiar, więc kamerę trzeba cofnąć na tyle,
  // żeby całość znów mieściła się w kadrze.
  useEffect(() => {
    setKamera((k) => ({ ...k, dystans: model.promien * 3.4 }))
    setKrok((s) => Math.min(s, Math.max(0, etapyObecne.length - 1)))
  }, [model, etapyObecne.length])

  const etapBiezacy: Etap | null =
    tryb === 'montaz' ? (etapyObecne[krok]?.etap ?? null) : null

  const etapyAktywne = useMemo(() => {
    if (tryb !== 'calosc') {
      return new Set<string>(etapyObecne.slice(0, krok + 1).map((e) => e.etap))
    }
    const zbior = new Set<string>(ETAPY)
    if (!pokazLacenie) for (const e of WARSTWA_LACENIA) zbior.delete(e)
    return zbior
  }, [tryb, krok, etapyObecne, pokazLacenie])

  /** Mebel nie ma połaci, więc i wyboru pokrycia nie pokazujemy. */
  const maPokrycie = (model.polacie?.length ?? 0) > 0

  /** Czy w tej konstrukcji łacenie w ogóle występuje — mebel go nie ma. */
  const maLacenie = useMemo(
    () => model.belki.some((b) => WARSTWA_LACENIA.includes(b.etap)),
    [model],
  )

  const rysujScene = useCallback(() => {
    const canvas = canvasRef.current
    const otoczka = otoczkaRef.current
    if (!canvas || !otoczka) return

    const szerokosc = otoczka.clientWidth
    const wysokosc = Math.max(320, Math.min(560, Math.round(szerokosc * 0.62)))
    const gestosc = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = szerokosc * gestosc
    canvas.height = wysokosc * gestosc
    canvas.style.width = `${szerokosc}px`
    canvas.style.height = `${wysokosc}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(gestosc, 0, 0, gestosc, 0, 0)

    rysuj(ctx, szerokosc, wysokosc, {
      model,
      kamera,
      paleta: pobierzPalete(otoczka),
      etapyAktywne,
      etapBiezacy,
      pokazPoprzednie: tryb === 'calosc' || pokazPoprzednie,
      pokazWymiary,
      pokazPodpisy,
      pokrycie: pokazPokrycie ? kolorPokrycia : null,
    })
  }, [
    model,
    kamera,
    etapyAktywne,
    etapBiezacy,
    tryb,
    pokazPoprzednie,
    pokazWymiary,
    pokazPodpisy,
    pokazPokrycie,
    kolorPokrycia,
  ])

  useEffect(() => {
    rysujScene()
  }, [rysujScene])

  useEffect(() => {
    const przy = () => rysujScene()
    window.addEventListener('resize', przy)
    return () => window.removeEventListener('resize', przy)
  }, [rysujScene])

  // --- obracanie i przybliżanie ---

  const przeciaganie = useRef<{ x: number; y: number } | null>(null)
  const rozstawPalcow = useRef<number | null>(null)

  const obroc = (dx: number, dy: number) => {
    setKamera((k) => ({
      ...k,
      azymut: k.azymut - dx * 0.008,
      // Blokada tuż przed pionem — w obie strony. Dokładnie w pionie widok
      // traci orientację, ale poza tym obrót jest symetryczny: pod model
      // trzeba dać się podejrzeć, bo tam wypada większość połączeń.
      elewacja: Math.max(-1.5, Math.min(1.5, k.elewacja + dy * 0.006)),
    }))
  }

  const przybliz = (mnoznik: number) => {
    setKamera((k) => ({
      ...k,
      dystans: Math.max(model.promien * 1.2, Math.min(model.promien * 9, k.dystans * mnoznik)),
    }))
  }

  const wskaz = (klientX: number, klientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const belka = belkaPodKursorem(
      model,
      kamera,
      r.width,
      r.height,
      klientX - r.left,
      klientY - r.top,
      etapyAktywne,
    )
    setWskazana(belka)
  }

  // --- zapis obrazka ---

  const zapiszObrazek = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const czesc = etapBiezacy ? `-${krok + 1}-${OPIS_ETAPU[etapBiezacy].tytul}` : ''
      a.href = url
      a.download = `${bezpiecznaNazwa(nazwaProjektu)}${bezpiecznaNazwa(czesc)}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const belkiEtapu = useMemo(() => {
    if (!etapBiezacy) return []
    return zgrupuj(model.belki.filter((b) => b.etap === etapBiezacy))
  }, [model, etapBiezacy])

  return (
    <div>
      <Karta
        tytul="Model konstrukcji"
        podtytul="Rysowany z tych samych wymiarów, co zestawienie materiału. Obracaj przeciągnięciem, przybliżaj kółkiem albo dwoma palcami."
        pelna
      >
        <div className="rzad" style={{ marginBottom: 12 }}>
          <div className="wybor" style={{ gridTemplateColumns: '1fr 1fr', flex: '1 1 240px' }}>
            <button type="button" aria-pressed={tryb === 'calosc'} onClick={() => setTryb('calosc')}>
              {etykietaCalosci}
              <small>gotowa konstrukcja</small>
            </button>
            <button type="button" aria-pressed={tryb === 'montaz'} onClick={() => setTryb('montaz')}>
              Montaż krok po kroku
              <small>{etapyObecne.length} etapów</small>
            </button>
          </div>
        </div>

        <div ref={otoczkaRef} style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className="model-plotno"
            role="img"
            aria-label={opisPlotna}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              przeciaganie.current = { x: e.clientX, y: e.clientY }
            }}
            onPointerMove={(e) => {
              if (przeciaganie.current) {
                obroc(e.clientX - przeciaganie.current.x, e.clientY - przeciaganie.current.y)
                przeciaganie.current = { x: e.clientX, y: e.clientY }
              } else if (e.pointerType === 'mouse') {
                wskaz(e.clientX, e.clientY)
              }
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              przeciaganie.current = null
            }}
            onPointerLeave={() => {
              przeciaganie.current = null
              setWskazana(null)
            }}
            onWheel={(e) => {
              przybliz(e.deltaY > 0 ? 1.12 : 0.89)
            }}
            onTouchMove={(e) => {
              if (e.touches.length !== 2) return
              const [a, b] = [e.touches[0], e.touches[1]]
              const rozstaw = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
              if (rozstawPalcow.current) {
                przybliz(rozstawPalcow.current / rozstaw)
              }
              rozstawPalcow.current = rozstaw
            }}
            onTouchEnd={() => {
              rozstawPalcow.current = null
            }}
          />

          {wskazana && (
            <div className="podpis-belki">
              {wskazana.nazwa} · {wskazana.b} × {wskazana.h} mm
            </div>
          )}
        </div>

        <div className="rzad" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <div className="rzad">
            {WIDOKI.map((w) => (
              <button
                key={w.nazwa}
                type="button"
                className="przycisk"
                onClick={() => setKamera((k) => ({ ...k, azymut: w.azymut, elewacja: w.elewacja }))}
              >
                {w.nazwa}
              </button>
            ))}
          </div>
          <div className="rzad">
            <button type="button" className="przycisk" onClick={() => przybliz(0.85)} aria-label="Przybliż">
              +
            </button>
            <button type="button" className="przycisk" onClick={() => przybliz(1.18)} aria-label="Oddal">
              −
            </button>
            <button type="button" className="przycisk glowny" onClick={zapiszObrazek}>
              Zapisz obrazek
            </button>
          </div>
        </div>

        {maPokrycie && pokazPokrycie && (
          <div className="rzad" style={{ marginTop: 12, gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
              Kolor:
            </span>
            {KOLORY_POKRYCIA.map((k) => (
              <button
                key={k.hex}
                type="button"
                title={k.nazwa}
                aria-label={`Kolor pokrycia: ${k.nazwa}`}
                aria-pressed={kolorPokrycia === k.hex}
                onClick={() => setKolorPokrycia(k.hex)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: k.hex,
                  border:
                    kolorPokrycia === k.hex
                      ? '3px solid var(--akcent)'
                      : '1px solid var(--linia)',
                }}
              />
            ))}
          </div>
        )}

        <div className="rzad" style={{ marginTop: 12, gap: 20 }}>
          <label className="przelacznik" style={{ minHeight: 40 }}>
            <input
              type="checkbox"
              checked={pokazWymiary}
              onChange={(e) => setPokazWymiary(e.target.checked)}
            />
            <span className="przelacznik-opis">
              <strong>Wymiary</strong>
            </span>
          </label>
          <label className="przelacznik" style={{ minHeight: 40 }}>
            <input
              type="checkbox"
              checked={pokazPodpisy}
              onChange={(e) => setPokazPodpisy(e.target.checked)}
            />
            <span className="przelacznik-opis">
              <strong>Podpisy</strong>
              <span>nazwa przy każdym rodzaju elementu</span>
            </span>
          </label>
          {maPokrycie && (
            <label className="przelacznik" style={{ minHeight: 40 }}>
              <input
                type="checkbox"
                checked={pokazPokrycie}
                onChange={(e) => setPokazPokrycie(e.target.checked)}
              />
              <span className="przelacznik-opis">
                <strong>Pokrycie</strong>
                <span>jak dach będzie wyglądał</span>
              </span>
            </label>
          )}
          {tryb === 'calosc' && maLacenie && (
            <label className="przelacznik" style={{ minHeight: 40 }}>
              <input
                type="checkbox"
                checked={pokazLacenie}
                onChange={(e) => setPokazLacenie(e.target.checked)}
              />
              <span className="przelacznik-opis">
                <strong>Łaty i kontrłaty</strong>
                <span>domyślnie ukryte, żeby było widać więźbę</span>
              </span>
            </label>
          )}
          {tryb === 'montaz' && (
            <label className="przelacznik" style={{ minHeight: 40 }}>
              <input
                type="checkbox"
                checked={pokazPoprzednie}
                onChange={(e) => setPokazPoprzednie(e.target.checked)}
              />
              <span className="przelacznik-opis">
                <strong>Pokaż wcześniejsze etapy</strong>
                <span>przygaszone, jako tło</span>
              </span>
            </label>
          )}
        </div>
      </Karta>

      {tryb === 'montaz' && etapBiezacy && (
        <Karta
          tytul={`Krok ${krok + 1} z ${etapyObecne.length}: ${OPIS_ETAPU[etapBiezacy].tytul}`}
          podtytul={OPIS_ETAPU[etapBiezacy].opis}
          pelna
        >
          <div className="tabela-otoczka">
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th className="liczba">Długość</th>
                  <th className="liczba">Sztuk</th>
                </tr>
              </thead>
              <tbody>
                {belkiEtapu.map((g) => (
                  <tr key={`${g.nazwa}-${Math.round(g.dlugosc)}`}>
                    <td>
                      {g.nazwa}
                      <small>
                        {g.b} × {g.h} mm
                      </small>
                    </td>
                    <td className="liczba">{dl(g.dlugosc)}</td>
                    <td className="liczba">
                      <strong>{liczba(g.liczba)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rzad" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <button
              type="button"
              className="przycisk"
              onClick={() => setKrok((s) => Math.max(0, s - 1))}
              disabled={krok === 0}
            >
              ← Poprzedni krok
            </button>
            <span style={{ fontWeight: 600, color: 'var(--tekst-slaby)', fontSize: 14 }}>
              {krok + 1} / {etapyObecne.length}
            </span>
            <button
              type="button"
              className="przycisk glowny"
              onClick={() => setKrok((s) => Math.min(etapyObecne.length - 1, s + 1))}
              disabled={krok >= etapyObecne.length - 1}
            >
              Następny krok →
            </button>
          </div>

          <div className="kroki-pasek">
            {etapyObecne.map((e, i) => (
              <button
                key={e.etap}
                type="button"
                className={i === krok ? 'krok biezacy' : i < krok ? 'krok zrobiony' : 'krok'}
                onClick={() => setKrok(i)}
                title={OPIS_ETAPU[e.etap].tytul}
              >
                <span>{i + 1}</span>
                {OPIS_ETAPU[e.etap].tytul}
              </button>
            ))}
          </div>
        </Karta>
      )}

      {tryb === 'calosc' && (
        <Karta tytul="Co jest na modelu" pelna>
          <div className="tabela-otoczka">
            <table>
              <thead>
                <tr>
                  <th>Etap montażu</th>
                  <th className="liczba">Elementów</th>
                </tr>
              </thead>
              <tbody>
                {etapyObecne.map((e) => (
                  <tr key={e.etap}>
                    <td>
                      {OPIS_ETAPU[e.etap].tytul}
                      <small>{OPIS_ETAPU[e.etap].opis}</small>
                    </td>
                    <td className="liczba">
                      <strong>{liczba(e.liczba)}</strong>{' '}
                      {odmiana(e.liczba, 'sztuka', 'sztuki', 'sztuk')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Komunikat rodzaj="info">
            {wskazowka ?? (
              <>
                Model pokazuje rozmieszczenie i wymiary elementów. Nie rysuje zaciosów ani
                połączeń — te znajdziesz w zakładce „Krokwie".
              </>
            )}
          </Komunikat>
        </Karta>
      )}
    </div>
  )
}

/** Grupuje belki tego samego rodzaju i długości. */
function zgrupuj(belki: Belka[]) {
  const mapa = new Map<string, { nazwa: string; dlugosc: number; b: number; h: number; liczba: number }>()

  for (const belka of belki) {
    const dlugosc = Math.hypot(
      belka.koniec.x - belka.start.x,
      belka.koniec.y - belka.start.y,
      belka.koniec.z - belka.start.z,
    )
    // Długości zaokrąglamy do centymetra, żeby drobne różnice nie mnożyły wierszy.
    const klucz = `${belka.nazwa}|${Math.round(dlugosc / 10)}|${belka.b}x${belka.h}`
    const wpis = mapa.get(klucz)
    if (wpis) wpis.liczba++
    else mapa.set(klucz, { nazwa: belka.nazwa, dlugosc, b: belka.b, h: belka.h, liczba: 1 })
  }

  return [...mapa.values()].sort((a, b) => b.dlugosc - a.dlugosc)
}

/** Czyta kolory z motywu, żeby model pasował do jasnej i ciemnej wersji. */
function pobierzPalete(element: HTMLElement): Paleta {
  const styl = getComputedStyle(element)
  const zmienna = (nazwa: string, zapas: string) =>
    styl.getPropertyValue(nazwa).trim() || zapas

  return {
    drewnoJasne: zmienna('--drewno-jasne', '#e8c99b'),
    drewnoSrednie: zmienna('--drewno-srednie', '#c99a63'),
    drewnoCiemne: zmienna('--drewno-ciemne', '#9c6f43'),
    krawedz: zmienna('--drewno-krawedz', '#6b4423'),
    przyciemnione: zmienna('--drewno-tlo', '#d8d2ca'),
    przyciemnioneKrawedz: zmienna('--drewno-tlo-krawedz', '#bdb5ab'),
    wyrozniony: zmienna('--akcent', '#b45309'),
    wyroznionyKrawedz: zmienna('--akcent-tekst', '#7c3a06'),
    tekst: zmienna('--tekst', '#1c1917'),
    wymiar: zmienna('--tekst-slaby', '#6b6560'),
    tlo: zmienna('--tlo-karta', '#ffffff'),
  }
}

/** Zamienia nazwę projektu na bezpieczną nazwę pliku. */
function bezpiecznaNazwa(tekst: string): string {
  return (
    tekst
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'dach'
  )
}
