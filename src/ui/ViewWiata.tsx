/**
 * Widok wprowadzania danych wiaty, zadaszenia albo pergoli.
 *
 * Kolejność sekcji odpowiada temu, jak taka konstrukcja powstaje na działce:
 * najpierw decyzja, co w ogóle stawiamy, potem obrys i wysokość, potem rama
 * ze słupów i oczepów, a na końcu pokrycie, fundamenty i odwodnienie.
 */

import type {
  ShelterInput,
  ShelterKind,
  ShelterShape,
  ShelterCovering,
  PostBase,
} from '../core/shelter'
import {
  SHELTER_KIND_LABELS,
  SHELTER_COVERING_INFO,
  POST_BASE_INFO,
  shelterGeometry,
} from '../core/shelter'
import { presetsFor, applyPreset, type ShelterPreset } from '../core/shelterPresets'
import type { StockMode } from '../core/types'
import { stockLengthsFor, COMMON_SECTIONS } from '../core/defaults'
import {
  Karta,
  PoleLiczbowe,
  PoleWyboru,
  PolePrzekroju,
  Przelacznik,
  WyborKafelkowy,
  Wzor,
} from './controls'
import { degToPercent, percentToDeg } from '../core/geometry'
import { liczba, mm } from './format'
import { IKONY_WIATY } from './ikony'

export function ViewWiata({
  input,
  onChange,
  wyjasnienia,
}: {
  input: ShelterInput
  onChange: (patch: Partial<ShelterInput>) => void
  wyjasnienia: boolean
}) {
  const pokrycie = SHELTER_COVERING_INFO[input.covering]
  const geom = shelterGeometry(input)
  const przyscienne = input.kind === 'zadaszenie'
  const pergola = input.kind === 'pergola'
  const dwuspadowy = geom.slopes === 2

  /**
   * Zmiana rodzaju konstrukcji przestawia też te ustawienia, które przy nowym
   * rodzaju byłyby bez sensu — pergola z dachówką albo zadaszenie dwuspadowe
   * przyklejone do ściany to nie są rzeczy, które ktoś chciał wybrać.
   */
  const zmienRodzaj = (kind: ShelterKind) => {
    if (kind === 'pergola') {
      onChange({
        kind,
        shape: 'jednospadowy',
        pitchDeg: Math.max(3, Math.min(input.pitchDeg, 10)),
        covering: 'brak',
        hasSlats: true,
        hasMembrane: false,
        hasGutters: false,
      })
      return
    }
    if (kind === 'zadaszenie') {
      onChange({ kind, shape: 'jednospadowy', hasSlats: false })
      return
    }
    onChange({ kind, hasSlats: false })
  }

  const zmienPokrycie = (covering: ShelterCovering) => {
    const info = SHELTER_COVERING_INFO[covering]
    onChange({
      covering,
      battenSpacing: info.battenSpacing || input.battenSpacing,
      // Membrana ma sens tylko pod pokryciem układanym na łatach.
      hasMembrane: info.podpora === 'lata' ? input.hasMembrane : false,
      hasGutters: covering === 'brak' ? false : input.hasGutters,
    })
  }

  return (
    <div className="kolumny">
      <Karta
        tytul="Co stawiasz"
        podtytul="Od tego zależy, na czym stoi konstrukcja i co ją usztywnia."
        pelna
      >
        <WyborKafelkowy
          value={input.kind}
          onChange={zmienRodzaj}
          opcje={(Object.keys(SHELTER_KIND_LABELS) as ShelterKind[]).map((k) => ({
            value: k,
            label: SHELTER_KIND_LABELS[k].label,
            opis: SHELTER_KIND_LABELS[k].opis,
            ikona: <IkonaRodzaju rodzaj={k} />,
          }))}
        />

        {!przyscienne && (
          <>
            <div className="odstep" />
            <label className="pole" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
                Kształt dachu
              </span>
            </label>
            <WyborKafelkowy
              value={input.shape}
              onChange={(shape: ShelterShape) => onChange({ shape })}
              opcje={[
                { value: 'dwuspadowy', label: 'Dwuspadowy', opis: 'dwie połacie, kalenica pośrodku' },
                { value: 'jednospadowy', label: 'Jednospadowy', opis: 'jedna połać, spadek w tył' },
              ]}
            />
          </>
        )}

        {przyscienne && (
          <p className="podpowiedz" style={{ marginTop: 12 }}>
            Zadaszenie przy budynku zawsze jest jednospadowe: wyższą stronę dźwiga
            belka przykręcona do ściany, niższą — rząd słupów.
          </p>
        )}

        <div className="odstep" />
        <ListaModeli input={input} onChange={onChange} />
      </Karta>

      <Karta tytul="Wymiary" podtytul="Obrys mierzony w osiach skrajnych słupów.">
        <div className="siatka-pol">
          <PoleLiczbowe
            label="Szerokość"
            value={input.width}
            onChange={(width) => onChange({ width })}
            krok={100}
            podpowiedz={
              przyscienne
                ? 'Od ściany budynku do osi słupów.'
                : 'W poprzek, między osiami rzędów słupów.'
            }
          />
          <PoleLiczbowe
            label="Długość"
            value={input.length}
            onChange={(length) => onChange({ length })}
            krok={100}
            podpowiedz="Wzdłuż, między osiami skrajnych słupów."
          />
          <PoleLiczbowe
            label="Wysokość w świetle"
            value={input.clearHeight}
            onChange={(clearHeight) => onChange({ clearHeight })}
            krok={50}
            podpowiedz="Od posadzki do spodu oczepu, po niższej stronie."
          />
          <PoleLiczbowe
            label="Kąt nachylenia"
            value={input.pitchDeg}
            onChange={(pitchDeg) => onChange({ pitchDeg })}
            jednostka="°"
            krok={1}
            min={0}
            max={55}
            podpowiedz={`To samo co spadek ${liczba(degToPercent(input.pitchDeg), 0)}%.`}
          />
          <PoleLiczbowe
            label="Spadek"
            value={Math.round(degToPercent(input.pitchDeg))}
            onChange={(pct) => onChange({ pitchDeg: percentToDeg(Math.max(0, pct)) })}
            jednostka="%"
            krok={5}
            min={0}
            podpowiedz="Jeśli producent pokrycia podaje spadek, wpisz go tutaj."
          />
          <PoleLiczbowe
            label="Okap w poprzek"
            value={input.eavesFront}
            onChange={(eavesFront) => onChange({ eavesFront })}
            krok={50}
            podpowiedz="O tyle dach wystaje poza słupy z przodu i z tyłu."
          />
          <PoleLiczbowe
            label="Okap wzdłuż"
            value={input.eavesSide}
            onChange={(eavesSide) => onChange({ eavesSide })}
            krok={50}
            podpowiedz="O tyle dach wystaje poza skrajne słupy na bokach."
          />
        </div>

        <div className="podpowiedz" style={{ marginTop: 12 }}>
          Dach zajmie {liczba(geom.roofWidth / 1000, 2)} × {liczba(geom.roofLength / 1000, 2)} m
          w rzucie, a najwyższy punkt konstrukcji stanie{' '}
          {liczba(geom.topHeight / 1000, 2)} m nad posadzką. Pod okapem zostanie{' '}
          {liczba(geom.eavesClearHeight / 1000, 2)} m prześwitu.
        </div>

        {wyjasnienia && (
          <Wzor>
            {dwuspadowy
              ? 'długość krokwi = (połowa szerokości + okap) ÷ cos(kąt)'
              : 'długość krokwi = (szerokość + 2 × okap) ÷ cos(kąt)'}
            <br />
            wysokość słupa wysokiego = wysokość w świetle + szerokość × tg(kąt)
          </Wzor>
        )}
      </Karta>

      <Karta tytul="Słupy i rama" podtytul="To, co dźwiga dach i trzyma go w pionie.">
        <div className="siatka-pol">
          <PoleLiczbowe
            label="Największy rozstaw słupów"
            value={input.postSpacingMax}
            onChange={(postSpacingMax) => onChange({ postSpacingMax })}
            krok={100}
            podpowiedz="Program rozłoży słupy równo, nie przekraczając tej wartości."
          />
          <PolePrzekroju
            label="Przekrój słupa"
            b={input.postSection.b}
            h={input.postSection.h}
            onChange={(postSection) => onChange({ postSection })}
            podpowiedz={<PodpowiedzSlupa />}
          />
          <PolePrzekroju
            label="Przekrój oczepu"
            b={input.beamSection.b}
            h={input.beamSection.h}
            onChange={(beamSection) => onChange({ beamSection })}
            podpowiedz="Belka leżąca na słupach wzdłuż konstrukcji."
          />
        </div>

        {dwuspadowy && (
          <>
            <div className="odstep" />
            <Przelacznik
              label="Belka kalenicowa na słupach"
              opis="Dla szerokich wiat: rząd słupów w osi podpiera kalenicę i skraca krokwie."
              checked={input.hasRidgeBeam}
              onChange={(hasRidgeBeam) => onChange({ hasRidgeBeam })}
            />
            {input.hasRidgeBeam && (
              <div className="siatka-pol" style={{ marginTop: 12 }}>
                <PolePrzekroju
                  label="Przekrój belki kalenicowej"
                  b={input.ridgeSection.b}
                  h={input.ridgeSection.h}
                  onChange={(ridgeSection) => onChange({ ridgeSection })}
                />
              </div>
            )}
          </>
        )}

        <div className="odstep" />
        <Przelacznik
          label="Miecze usztywniające"
          opis="Zastrzały między słupem a oczepem. Bez nich rama składa się pod naporem wiatru."
          checked={input.hasBraces}
          onChange={(hasBraces) => onChange({ hasBraces })}
        />
        {input.hasBraces && (
          <div className="siatka-pol" style={{ marginTop: 12 }}>
            <PoleLiczbowe
              label="Ramię miecza"
              value={input.braceArm}
              onChange={(braceArm) => onChange({ braceArm })}
              krok={50}
              podpowiedz="Odmierzane na słupie i na oczepie; cięcie zawsze pod 45°."
            />
            <PolePrzekroju
              label="Przekrój miecza"
              b={input.braceSection.b}
              h={input.braceSection.h}
              onChange={(braceSection) => onChange({ braceSection })}
            />
          </div>
        )}
      </Karta>

      <Karta
        tytul={pergola ? 'Belki poprzeczne' : 'Krokwie'}
        podtytul={
          pergola
            ? 'Belki leżące w poprzek, na oczepach.'
            : 'Leżą na oczepach i niosą pokrycie.'
        }
      >
        <div className="siatka-pol">
          <PoleLiczbowe
            label={pergola ? 'Największy rozstaw belek' : 'Największy rozstaw krokwi'}
            value={input.rafterSpacingMax}
            onChange={(rafterSpacingMax) => onChange({ rafterSpacingMax })}
            krok={50}
            podpowiedz={
              input.covering === 'poliweglan'
                ? 'Dobierz tak, żeby styk płyt wypadał na krokwi — płyty mają zwykle 105 albo 120 cm.'
                : 'Mierzony w osiach.'
            }
          />
          <PolePrzekroju
            label={pergola ? 'Przekrój belki poprzecznej' : 'Przekrój krokwi'}
            b={input.rafterSection.b}
            h={input.rafterSection.h}
            onChange={(rafterSection) => onChange({ rafterSection })}
            podpowiedz={<PodpowiedzKrokwi />}
          />
        </div>
      </Karta>

      <Karta tytul="Pokrycie i warstwy" podtytul="Co idzie na krokwie.">
        <div className="siatka-pol">
          <PoleWyboru
            label="Rodzaj pokrycia"
            value={input.covering}
            onChange={zmienPokrycie}
            opcje={(Object.keys(SHELTER_COVERING_INFO) as ShelterCovering[]).map((k) => ({
              value: k,
              label: SHELTER_COVERING_INFO[k].label,
            }))}
            podpowiedz={pokrycie.hint}
          />
          {input.covering !== 'brak' && pokrycie.podpora !== 'poszycie' && (
            <>
              <PoleLiczbowe
                label={pokrycie.podpora === 'platew' ? 'Rozstaw płatwi' : 'Rozstaw łat'}
                value={input.battenSpacing}
                onChange={(battenSpacing) => onChange({ battenSpacing })}
                krok={10}
                podpowiedz="Mierzony wzdłuż spadku, w osiach."
              />
              <PolePrzekroju
                label={pokrycie.podpora === 'platew' ? 'Przekrój płatwi' : 'Przekrój łaty'}
                b={input.battenSection.b}
                h={input.battenSection.h}
                onChange={(battenSection) => onChange({ battenSection })}
              />
            </>
          )}
          {input.hasMembrane && (
            <PolePrzekroju
              label="Przekrój kontrłaty"
              b={input.counterBattenSection.b}
              h={input.counterBattenSection.h}
              onChange={(counterBattenSection) => onChange({ counterBattenSection })}
            />
          )}
        </div>

        {input.covering !== 'brak' && (
          <div className="podpowiedz" style={{ marginTop: 8 }}>
            Najmniejszy dopuszczalny spadek dla tego pokrycia to {pokrycie.minPitchDeg}°.
            Ciężar własny: około {liczba(pokrycie.weightKgM2, 1)} kg/m².
          </div>
        )}

        {pokrycie.podpora === 'lata' && (
          <>
            <div className="odstep" />
            <Przelacznik
              label="Membrana wstępnego krycia"
              opis="Wymaga kontrłat — to one robią szczelinę wentylacyjną."
              checked={input.hasMembrane}
              onChange={(hasMembrane) => onChange({ hasMembrane })}
            />
          </>
        )}

        <div className="odstep" />
        <Przelacznik
          label="Szczebliny na wierzchu"
          opis="Poprzeczki dające cień. Typowe dla pergoli, ale pasują też do wiaty bez ścian."
          checked={input.hasSlats}
          onChange={(hasSlats) => onChange({ hasSlats })}
        />
        {input.hasSlats && (
          <div className="siatka-pol" style={{ marginTop: 12 }}>
            <PoleLiczbowe
              label="Rozstaw szczeblin"
              value={input.slatSpacing}
              onChange={(slatSpacing) => onChange({ slatSpacing })}
              krok={10}
              podpowiedz={`Przy przekroju ${mm(input.slatSection.b)} mm zostaje ${mm(Math.max(0, input.slatSpacing - input.slatSection.b))} mm prześwitu.`}
            />
            <PolePrzekroju
              label="Przekrój szczebliny"
              b={input.slatSection.b}
              h={input.slatSection.h}
              onChange={(slatSection) => onChange({ slatSection })}
            />
          </div>
        )}
      </Karta>

      <Karta tytul="Fundamenty" podtytul="Wiata nie ma murów — całość stoi na stopach pod słupami.">
        <div className="siatka-pol">
          <PoleWyboru
            label="Osadzenie słupa"
            value={input.postBase}
            onChange={(postBase: PostBase) => onChange({ postBase })}
            opcje={(Object.keys(POST_BASE_INFO) as PostBase[]).map((k) => ({
              value: k,
              label: POST_BASE_INFO[k].label,
            }))}
            podpowiedz={POST_BASE_INFO[input.postBase].hint}
          />
          <PoleLiczbowe
            label="Bok stopy"
            value={input.footingSize}
            onChange={(footingSize) => onChange({ footingSize })}
            krok={50}
            podpowiedz="Stopa kwadratowa, wylewana w wykopie."
          />
          <PoleLiczbowe
            label="Głębokość stopy"
            value={input.footingDepth}
            onChange={(footingDepth) => onChange({ footingDepth })}
            krok={100}
            podpowiedz="Poniżej strefy przemarzania: 0,8 m na zachodzie kraju, 1,4 m na wschodzie i w górach."
          />
        </div>
        {wyjasnienia && (
          <Wzor>
            objętość jednej stopy = bok × bok × głębokość
            <br />
            beton do zamówienia = objętość stóp + 10% na nierówny wykop
          </Wzor>
        )}
      </Karta>

      <Karta tytul="Odwodnienie" podtytul="Woda z dachu musi mieć dokąd odpłynąć.">
        <Przelacznik
          label="Rynny i rury spustowe"
          opis="Liczone razem z hakami, sztucerami i kolanami."
          checked={input.hasGutters}
          onChange={(hasGutters) => onChange({ hasGutters })}
        />
        {input.covering === 'brak' && (
          <p className="podpowiedz" style={{ marginTop: 8 }}>
            Konstrukcja bez pokrycia nie zbiera wody, więc odwodnienia nie liczymy.
          </p>
        )}
      </Karta>

      <Karta tytul="Drewno" podtytul="Skąd bierzesz belki i co z nimi zrobisz przed montażem.">
        <WyborKafelkowy
          value={input.stockMode}
          onChange={(stockMode: StockMode) =>
            onChange({ stockMode, stockLengths: stockLengthsFor(stockMode) })
          }
          opcje={[
            { value: 'handlowe', label: 'Z półki', opis: 'skład, do 6 m, od ręki' },
            { value: 'na-wymiar', label: 'Na wymiar', opis: 'tartak, do 12 m, na zamówienie' },
          ]}
        />
        <div className="podpowiedz" style={{ marginTop: 8 }}>
          {input.stockMode === 'handlowe'
            ? `Dostępne długości: ${input.stockLengths.map((l) => `${l / 1000} m`).join(', ')}. Oczep i płatwie wolno łączyć nad słupem.`
            : `Tartak utnie belkę na wymiar, realnie do ${Math.max(...input.stockLengths) / 1000} m.`}
        </div>

        <div className="odstep" />
        <Przelacznik
          label="Impregnacja"
          opis="Wiata stoi na dworze i moknie z każdej strony — bez impregnacji liczy się ją w latach."
          checked={input.hasImpregnation}
          onChange={(hasImpregnation) => onChange({ hasImpregnation })}
        />

        <div className="siatka-pol" style={{ marginTop: 12 }}>
          <PoleLiczbowe
            label="Naddatek na docięcie"
            value={input.cutAllowance}
            onChange={(cutAllowance) => onChange({ cutAllowance })}
            krok={10}
            podpowiedz="Doliczany do każdego elementu. Odpad z rozkroju liczy osobno plan cięcia."
          />
        </div>
      </Karta>
    </div>
  )
}

/**
 * Gotowe modele do wczytania.
 *
 * Pokazujemy tylko te z wybranego rodzaju: po kliknięciu w „Pergolę" nikt nie
 * szuka wiaty garażowej. Wczytanie podmienia całą konstrukcję, ale zostawia
 * ustawienia zaopatrzenia — tego akurat nikt nie chce ustawiać po raz drugi.
 */
function ListaModeli({
  input,
  onChange,
}: {
  input: ShelterInput
  onChange: (patch: Partial<ShelterInput>) => void
}) {
  const modele = presetsFor(input.kind)
  if (modele.length === 0) return null

  const wymiar = (m: ShelterPreset) =>
    `${liczba((m.dane.width ?? 0) / 1000, 1)} × ${liczba((m.dane.length ?? 0) / 1000, 1)} m`

  return (
    <>
      <label className="pole" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
          Typowe modele — kliknij, żeby wczytać i przerobić po swojemu
        </span>
      </label>
      <div className="modele">
        {modele.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(applyPreset(m, input))}
            title={m.opis}
          >
            {m.nazwa}
            <span className="wymiar-modelu">{wymiar(m)}</span>
            <small>{m.opis}</small>
          </button>
        ))}
      </div>
      <p className="podpowiedz" style={{ marginTop: 8 }}>
        Model podmienia wymiary, przekroje i pokrycie. Sposób zaopatrzenia w drewno,
        naddatek na docięcie i impregnację zostawia takie, jakie masz ustawione.
      </p>
    </>
  )
}

/** Typowe przekroje słupów wiatowych. */
function PodpowiedzSlupa() {
  const typowe = COMMON_SECTIONS.filter((s) => s.b === s.h)
  return <>Słup zwykle kwadratowy: {typowe.map((s) => `${s.b}×${s.h}`).join(', ')} mm.</>
}

/** Typowe przekroje krokwi. */
function PodpowiedzKrokwi() {
  return <>Typowe: {COMMON_SECTIONS.slice(4, 9).map((s) => `${s.b}×${s.h}`).join(', ')} mm.</>
}

/** Piktogram rodzaju konstrukcji: wiata, zadaszenie albo pergola. */
function IkonaRodzaju({ rodzaj }: { rodzaj: string }) {
  const Rysunek = IKONY_WIATY[rodzaj]
  return Rysunek ? <>{Rysunek()}</> : null
}
