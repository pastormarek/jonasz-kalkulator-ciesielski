/**
 * Widok wprowadzania danych dachu.
 *
 * Kolejność sekcji odpowiada temu, jak cieśla poznaje dach: najpierw kształt,
 * potem wymiary z projektu, potem własne decyzje o drewnie, a na końcu
 * warstwy pokrycia i otwory.
 */

import type { RoofInput, Covering, StockMode, SpliceSupport, Opening, RafterFixing } from '../core/types'
import { COVERING_INFO, SHAPE_LABELS, TRUSS_LABELS, stockLengthsFor, COMMON_SECTIONS, FIXING_INFO } from '../core/defaults'
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

export function ViewDach({
  input,
  onChange,
  wyjasnienia,
}: {
  input: RoofInput
  onChange: (patch: Partial<RoofInput>) => void
  wyjasnienia: boolean
}) {
  const pokrycie = COVERING_INFO[input.covering]

  return (
    <div className="kolumny">
      <Karta tytul="Kształt dachu" podtytul="Od tego zależy, co w ogóle trzeba policzyć." pelna>
        <WyborKafelkowy
          value={input.shape}
          onChange={(shape) => onChange({ shape })}
          opcje={[
            { value: 'gable', label: SHAPE_LABELS.gable, opis: 'dwie połacie, kalenica' },
            { value: 'shed', label: SHAPE_LABELS.shed, opis: 'jedna połać' },
            { value: 'hip', label: SHAPE_LABELS.hip, opis: 'cztery połacie, krożyny' },
          ]}
        />
        <div className="odstep" />
        <label className="pole" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tekst-slaby)' }}>
            Typ więźby
          </span>
        </label>
        <WyborKafelkowy
          value={input.truss}
          onChange={(truss) => onChange({ truss })}
          opcje={[
            { value: 'rafter', label: TRUSS_LABELS.rafter, opis: 'same krokwie' },
            { value: 'collar', label: TRUSS_LABELS.collar, opis: 'krokwie + jętki' },
            { value: 'purlin', label: TRUSS_LABELS.purlin, opis: 'słupy i płatwie' },
          ]}
        />
      </Karta>

      <Karta tytul="Wymiary z projektu" podtytul="Podstawowe wymiary budynku i połaci.">
        <div className="siatka-pol">
          <PoleLiczbowe
            label="Rozpiętość budynku"
            value={input.span}
            onChange={(span) => onChange({ span })}
            krok={100}
            podpowiedz="Mierzona w poprzek, po zewnętrznych krawędziach murłat."
          />
          <PoleLiczbowe
            label="Długość budynku"
            value={input.length}
            onChange={(length) => onChange({ length })}
            krok={100}
            podpowiedz="Wzdłuż kalenicy."
          />
          <PoleLiczbowe
            label="Kąt nachylenia"
            value={input.pitchDeg}
            onChange={(pitchDeg) => onChange({ pitchDeg })}
            jednostka="°"
            krok={1}
            min={1}
            max={85}
            podpowiedz={`To samo co spadek ${liczba(degToPercent(input.pitchDeg), 0)}%.`}
          />
          <PoleLiczbowe
            label="Spadek"
            value={Math.round(degToPercent(input.pitchDeg))}
            onChange={(pct) => onChange({ pitchDeg: percentToDeg(Math.max(1, pct)) })}
            jednostka="%"
            krok={5}
            min={1}
            podpowiedz="Jeśli projekt podaje spadek, wpisz go tutaj."
          />
          <PoleLiczbowe
            label="Wysunięcie okapu"
            value={input.eaves}
            onChange={(eaves) => onChange({ eaves })}
            krok={50}
            podpowiedz="W poziomie, poza krawędź murłaty."
          />
          {input.shape !== 'hip' && (
            <PoleLiczbowe
              label="Wysunięcie szczytowe"
              value={input.gableOverhang}
              onChange={(gableOverhang) => onChange({ gableOverhang })}
              krok={50}
              podpowiedz="Poza ścianę szczytową, pod wiatrownicę."
            />
          )}
        </div>
        {wyjasnienia && (
          <Wzor>
            długość krokwi = (połowa rozpiętości + okap) ÷ cos(kąt)
            <br />
            wysokość kalenicy = połowa rozpiętości × tg(kąt)
          </Wzor>
        )}
      </Karta>

      <Karta tytul="Krokwie i zaciosy" podtytul="Przekroje i rozstaw sprawdź z projektem konstrukcyjnym.">
        <div className="siatka-pol">
          <PoleLiczbowe
            label="Największy rozstaw krokwi"
            value={input.rafterSpacingMax}
            onChange={(rafterSpacingMax) => onChange({ rafterSpacingMax })}
            krok={10}
            podpowiedz="Aplikacja rozłoży krokwie równo, nie przekraczając tej wartości."
          />
          <PoleLiczbowe
            label="Głębokość zaciosu"
            value={input.notchDepth}
            onChange={(notchDepth) => onChange({ notchDepth })}
            krok={5}
            podpowiedz={`Najwyżej 1/3 wysokości krokwi, czyli ${mm(input.rafterSection.h / 3)} mm.`}
          />
          <PolePrzekroju
            label="Przekrój krokwi"
            b={input.rafterSection.b}
            h={input.rafterSection.h}
            onChange={(rafterSection) => onChange({ rafterSection })}
            podpowiedz={<PodpowiedzPrzekroju />}
          />
          <PolePrzekroju
            label="Przekrój murłaty"
            b={input.wallPlateSection.b}
            h={input.wallPlateSection.h}
            onChange={(wallPlateSection) => onChange({ wallPlateSection })}
          />
        </div>
        {wyjasnienia && (
          <Wzor>
            siodło zaciosu = głębokość ÷ sin(kąt)
            <br />
            pięta zaciosu = głębokość ÷ cos(kąt)
          </Wzor>
        )}
      </Karta>

      {input.truss === 'collar' && (
        <Karta tytul="Jętki" podtytul="Poziome rygle spinające pary krokwi.">
          <div className="siatka-pol">
            <PoleLiczbowe
              label="Wysokość jętki nad murłatą"
              value={input.collarHeight}
              onChange={(collarHeight) => onChange({ collarHeight })}
              krok={100}
              podpowiedz="Im wyżej, tym krótsza jętka, ale i mniejszy prześwit poddasza."
            />
            <PolePrzekroju
              label="Przekrój jętki"
              b={input.collarSection.b}
              h={input.collarSection.h}
              onChange={(collarSection) => onChange({ collarSection })}
            />
          </div>
        </Karta>
      )}

      {input.truss === 'purlin' && (
        <Karta tytul="Płatwie, słupy, kleszcze" podtytul="Konstrukcja nośna pod krokwiami.">
          <div className="siatka-pol">
            <PoleWyboru
              label="Płatwie pośrednie na połać"
              value={String(input.purlinCount) as '0' | '1' | '2'}
              onChange={(v) => onChange({ purlinCount: Number(v) })}
              opcje={[
                { value: '0', label: 'Brak — tylko kalenicowa' },
                { value: '1', label: '1 płatew' },
                { value: '2', label: '2 płatwie' },
              ]}
            />
            <PoleLiczbowe
              label="Największy rozstaw słupów"
              value={input.postSpacingMax}
              onChange={(postSpacingMax) => onChange({ postSpacingMax })}
              krok={100}
            />
            <PolePrzekroju
              label="Przekrój płatwi"
              b={input.purlinSection.b}
              h={input.purlinSection.h}
              onChange={(purlinSection) => onChange({ purlinSection })}
            />
            <PolePrzekroju
              label="Przekrój słupa"
              b={input.postSection.b}
              h={input.postSection.h}
              onChange={(postSection) => onChange({ postSection })}
            />
          </div>
          <div className="odstep" />
          <Przelacznik
            label="Kleszcze"
            opis="Para desek obejmujących krokwie i słup z dwóch stron."
            checked={input.hasClamps}
            onChange={(hasClamps) => onChange({ hasClamps })}
          />
          <Przelacznik
            label="Miecze"
            opis="Zastrzały usztywniające słup wzdłuż płatwi."
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
                podpowiedz="Odcinek odmierzany na słupie i na płatwi, cięcie pod 45°."
              />
            </div>
          )}
        </Karta>
      )}

      <SekcjaDrewna input={input} onChange={onChange} wyjasnienia={wyjasnienia} />

      <Karta tytul="Pokrycie i warstwy" podtytul="Co idzie na krokwie.">
        <div className="siatka-pol">
          <PoleWyboru
            label="Rodzaj pokrycia"
            value={input.covering}
            onChange={(covering: Covering) =>
              onChange({
                covering,
                battenSpacing: COVERING_INFO[covering].battenSpacing || input.battenSpacing,
              })
            }
            opcje={(Object.keys(COVERING_INFO) as Covering[]).map((k) => ({
              value: k,
              label: COVERING_INFO[k].label,
            }))}
            podpowiedz={pokrycie.hint}
          />
          <PoleLiczbowe
            label="Rozstaw łat"
            value={input.battenSpacing}
            onChange={(battenSpacing) => onChange({ battenSpacing })}
            krok={5}
            podpowiedz="Mierzony wzdłuż spadku, w osiach łat."
          />
          <PolePrzekroju
            label="Przekrój łaty"
            b={input.battenSection.b}
            h={input.battenSection.h}
            onChange={(battenSection) => onChange({ battenSection })}
          />
          <PolePrzekroju
            label="Przekrój kontrłaty"
            b={input.counterBattenSection.b}
            h={input.counterBattenSection.h}
            onChange={(counterBattenSection) => onChange({ counterBattenSection })}
          />
        </div>
        <div className="odstep" />
        <Przelacznik
          label="Pełne deskowanie"
          opis="Deski albo płyty pod pokryciem."
          checked={input.hasSheathing}
          onChange={(hasSheathing) => onChange({ hasSheathing })}
        />
        <Przelacznik
          label="Membrana wstępnego krycia"
          opis="Liczona z 15% zapasu na zakłady."
          checked={input.hasMembrane}
          onChange={(hasMembrane) => onChange({ hasMembrane })}
        />
        <Przelacznik
          label="Ocieplenie międzykrokwiowe"
          opis="Wełna wchodzi tylko między krokwie."
          checked={input.hasInsulation}
          onChange={(hasInsulation) => onChange({ hasInsulation })}
        />
      </Karta>

      <Karta tytul="Łączniki i impregnat" podtytul="Jak krokiew trzyma się murłaty.">
        <WyborKafelkowy
          value={input.rafterFixing}
          onChange={(rafterFixing: RafterFixing) => onChange({ rafterFixing })}
          opcje={[
            { value: 'wkrety', label: FIXING_INFO.wkrety.label, opis: 'dwa na oparcie' },
            { value: 'katowniki', label: FIXING_INFO.katowniki.label, opis: 'blacha + wkręty' },
          ]}
        />
        <div className="podpowiedz" style={{ marginTop: 8 }}>
          {FIXING_INFO[input.rafterFixing].hint}
        </div>

        <div className="odstep" />

        <Przelacznik
          label="Licz impregnat"
          opis="Drewno z tartaku bywa impregnowane w cenie — wtedy nie ma czego doliczać."
          checked={input.hasImpregnation}
          onChange={(hasImpregnation) => onChange({ hasImpregnation })}
        />
      </Karta>

      <SekcjaOtworow input={input} onChange={onChange} />
    </div>
  )
}

/** Sekcja o tym, skąd bierzemy drewno i czy wolno je łączyć. */
function SekcjaDrewna({
  input,
  onChange,
  wyjasnienia,
}: {
  input: RoofInput
  onChange: (patch: Partial<RoofInput>) => void
  wyjasnienia: boolean
}) {
  const najdluzsza = Math.max(...input.stockLengths)

  return (
    <Karta tytul="Drewno" podtytul="Skąd bierzesz belki i czy wolno je łączyć.">
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
          ? `Dostępne długości: ${input.stockLengths.map((l) => `${l / 1000} m`).join(', ')}. Dłuższe elementy trzeba będzie połączyć.`
          : `Tartak utnie belkę na wymiar, realnie do ${najdluzsza / 1000} m. Trzeba to zamówić wcześniej i sprawdzić, czy da się dowieźć i wnieść na dach.`}
      </div>

      <div className="odstep" />

      <Przelacznik
        label="Łączenie krokwi z dwóch kawałków"
        opis="Dozwolone, o ile styk wypada dokładnie nad podporą."
        checked={input.splice.enabled}
        onChange={(enabled) => onChange({ splice: { ...input.splice, enabled } })}
      />

      {input.splice.enabled && (
        <>
          <div className="siatka-pol" style={{ marginTop: 12 }}>
            <PoleWyboru
              label="Co podpiera styk"
              value={input.splice.support}
              onChange={(support: SpliceSupport) =>
                onChange({ splice: { ...input.splice, support } })
              }
              opcje={[
                { value: 'sciana-kolankowa', label: 'Ściana kolankowa' },
                { value: 'wieniec', label: 'Wieniec' },
                { value: 'platew', label: 'Płatew' },
              ]}
            />
            <PoleLiczbowe
              label="Podpora od murłaty"
              value={input.splice.atRun}
              onChange={(atRun) => onChange({ splice: { ...input.splice, atRun } })}
              krok={100}
              podpowiedz="Odległość w poziomie od zewnętrznej krawędzi murłaty."
            />
            <PoleLiczbowe
              label="Nakładka na styku"
              value={input.splice.overlap}
              onChange={(overlap) => onChange({ splice: { ...input.splice, overlap } })}
              krok={50}
              podpowiedz="O tyle kawałki zachodzą na siebie."
            />
          </div>
          {wyjasnienia && (
            <Wzor>
              Styk musi opierać się na podporze. Krokiew złączona w powietrzu, w
              środku rozpiętości, to błąd konstrukcyjny — połączenie nie przeniesie
              momentu zginającego.
            </Wzor>
          )}
        </>
      )}

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
  )
}

/** Sekcja otworów: kominy i okna dachowe. */
function SekcjaOtworow({
  input,
  onChange,
}: {
  input: RoofInput
  onChange: (patch: Partial<RoofInput>) => void
}) {
  const dodaj = (kind: Opening['kind']) => {
    const nowy: Opening = {
      id: Math.random().toString(36).slice(2, 8),
      kind,
      width: kind === 'komin' ? 800 : 780,
      height: kind === 'komin' ? 800 : 1400,
      offsetAlong: Math.round(input.length / 2),
      slope: 'A',
    }
    onChange({ openings: [...input.openings, nowy] })
  }

  const zmien = (id: string, patch: Partial<Opening>) => {
    onChange({
      openings: input.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })
  }

  const usun = (id: string) => {
    onChange({ openings: input.openings.filter((o) => o.id !== id) })
  }

  return (
    <Karta
      tytul="Otwory w połaci"
      podtytul="Komin i okno dachowe przerywają krokwie i wymagają wymianów."
      pelna
    >
      {input.openings.length === 0 && (
        <p className="pusto">Brak otworów. Jeśli w dachu jest komin albo okno, dodaj je tutaj.</p>
      )}

      {input.openings.map((o, i) => (
        <div
          key={o.id}
          style={{
            border: '1px solid var(--linia)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div className="rzad" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <strong>
              {i + 1}. {o.kind === 'komin' ? 'Komin' : 'Okno dachowe'}
            </strong>
            <button type="button" className="przycisk niebezpieczny" onClick={() => usun(o.id)}>
              Usuń
            </button>
          </div>
          <div className="siatka-pol">
            <PoleLiczbowe
              label="Szerokość"
              value={o.width}
              onChange={(width) => zmien(o.id, { width })}
              krok={10}
              podpowiedz="Wzdłuż kalenicy."
            />
            <PoleLiczbowe
              label="Wysokość"
              value={o.height}
              onChange={(height) => zmien(o.id, { height })}
              krok={10}
              podpowiedz="Wzdłuż spadku połaci."
            />
            <PoleLiczbowe
              label="Odległość od szczytu"
              value={o.offsetAlong}
              onChange={(offsetAlong) => zmien(o.id, { offsetAlong })}
              krok={100}
              podpowiedz="Od lewej ściany szczytowej do lewej krawędzi otworu."
            />
            {input.shape !== 'shed' && (
              <PoleWyboru
                label="Połać"
                value={o.slope}
                onChange={(slope: 'A' | 'B') => zmien(o.id, { slope })}
                opcje={[
                  { value: 'A', label: 'Połać A' },
                  { value: 'B', label: 'Połać B' },
                ]}
              />
            )}
          </div>
        </div>
      ))}

      <div className="rzad">
        <button type="button" className="przycisk" onClick={() => dodaj('komin')}>
          + Komin
        </button>
        <button type="button" className="przycisk" onClick={() => dodaj('okno')}>
          + Okno dachowe
        </button>
      </div>
    </Karta>
  )
}

/** Lista popularnych przekrojów jako podpowiedź pod polem. */
function PodpowiedzPrzekroju() {
  return (
    <>Typowe: {COMMON_SECTIONS.slice(4, 9).map((s) => `${s.b}×${s.h}`).join(', ')} mm.</>
  )
}
