/**
 * Testy interfejsu — sprawdzają, że aplikacja realnie działa jako całość,
 * a nie tylko że rdzeń liczy poprawnie.
 *
 * Świadomie testujemy to, co widzi użytkownik: wpisuję wymiar, patrzę na
 * wynik. Dzięki temu test nie rozsypuje się przy każdej zmianie w kodzie,
 * a wywraca się wtedy, kiedy naprawdę coś przestaje działać.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// pdf.js nie działa w jsdom i nie jest przedmiotem tych testów.
vi.mock('./pdf/extract', () => ({
  analizujPdf: vi.fn(),
  renderujStrone: vi.fn(),
  ROLA_LABELS: {},
}))

beforeEach(() => {
  cleanup()
  localStorage.clear()
  location.hash = ''
})

/** Przechodzi na wskazaną zakładkę. */
async function zakladka(user: ReturnType<typeof userEvent.setup>, nazwa: string) {
  await user.click(screen.getByRole('tab', { name: new RegExp(nazwa, 'i') }))
}

/** Wpisuje wartość do pola o podanej etykiecie. */
async function wpisz(
  user: ReturnType<typeof userEvent.setup>,
  etykieta: string | RegExp,
  wartosc: string,
) {
  const pole = screen.getByLabelText(etykieta)
  await user.clear(pole)
  await user.type(pole, wartosc)
}

/** Zwraca kafelek wyniku o danej etykiecie. */
function kafelek(etykieta: string): HTMLElement {
  const el = screen.getByText(etykieta).closest('.wynik')
  if (!el) throw new Error(`Nie ma kafelka „${etykieta}"`)
  return el as HTMLElement
}

describe('aplikacja jako całość', () => {
  it('startuje na zakładce z danymi dachu', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /dach/i })).toHaveProperty('ariaSelected', 'true')
    expect(screen.getByLabelText(/Rozpiętość budynku/i)).toBeDefined()
  })

  it('liczy krokiew z wpisanych wymiarów', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Trójkąt 3-4-5: bieg 4 m i wzniesienie 3 m dają krokiew równo 5 m.
    await wpisz(user, /Rozpiętość budynku/i, '8000')
    await wpisz(user, /^Kąt nachylenia/i, '36.87')
    await wpisz(user, /Wysunięcie okapu/i, '0')

    await zakladka(user, 'krokwie')
    // Domyślną jednostką są centymetry, więc pięciometrowa krokiew to 500.
    expect(within(kafelek('Długość krokwi')).getByText('500')).toBeDefined()
  })

  it('przełącznik jednostek zmienia sposób podawania wymiarów', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Rozpiętość budynku/i, '8000')
    await wpisz(user, /^Kąt nachylenia/i, '36.87')
    await wpisz(user, /Wysunięcie okapu/i, '0')
    await zakladka(user, 'krokwie')

    expect(within(kafelek('Długość krokwi')).getByText('500')).toBeDefined()
    expect(within(kafelek('Długość krokwi')).getByText('cm')).toBeDefined()

    await user.click(screen.getByRole('button', { name: /^m$/ }))
    expect(within(kafelek('Długość krokwi')).getByText('5,00')).toBeDefined()
    expect(within(kafelek('Długość krokwi')).getByText('m')).toBeDefined()
  })

  it('ostrzega o zbyt głębokim zaciosie i przestaje, gdy go zmniejszyć', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Głębokość zaciosu/i, '90')
    await zakladka(user, 'krokwie')
    const alerty = screen.getAllByRole('alert').map((a) => a.textContent ?? '')
    expect(alerty.some((t) => /za głęboki/i.test(t))).toBe(true)

    await zakladka(user, 'dach')
    await wpisz(user, /Głębokość zaciosu/i, '30')
    await zakladka(user, 'krokwie')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('zmiana kształtu na kopertowy pokazuje wyniki dla krożyn', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Kopertowy/i }))
    await zakladka(user, 'krokwie')

    expect(screen.getByText('Długość krożyny')).toBeDefined()
    expect(screen.getByText('Ukos kulawki')).toBeDefined()
  })

  it('więźba jętkowa pokazuje jętkę, krokwiowa ją chowa', async () => {
    const user = userEvent.setup()
    render(<App />)

    await zakladka(user, 'krokwie')
    expect(screen.getByText('Długość jętki')).toBeDefined()

    await zakladka(user, 'dach')
    await user.click(screen.getByRole('button', { name: /same krokwie/i }))
    await zakladka(user, 'krokwie')
    expect(screen.queryByText('Długość jętki')).toBeNull()
  })

  it('pokazuje zestawienie materiału z listą zakupów', async () => {
    const user = userEvent.setup()
    render(<App />)
    await zakladka(user, 'materiał')

    expect(screen.getByText('Drewno do kupienia')).toBeDefined()
    expect(screen.getByText(/Lista zakupów/i)).toBeDefined()
    expect(screen.getByText(/Wkręt ciesielski krokiew–murłata/i)).toBeDefined()
  })

  it('włączenie łączenia krokwi rozbija je na dwa odcinki', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('checkbox', { name: /Łączenie krokwi/i }))
    await zakladka(user, 'krokwie')

    expect(screen.getByText('Odcinek dolny')).toBeDefined()
    expect(screen.getByText('Odcinek górny')).toBeDefined()
  })

  it('przełączenie drewna na wymiar zmienia dostępne długości', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(/Dostępne długości: 3 m, 4 m, 5 m, 6 m/i)).toBeDefined()
    await user.click(screen.getByRole('button', { name: /Na wymiar/i }))
    expect(screen.getByText(/realnie do 12 m/i)).toBeDefined()
  })

  it('wyjaśnienia pojawiają się dopiero po włączeniu', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByText(/długość krokwi = /i)).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: /Pokaż wyjaśnienia/i }))
    expect(screen.getByText(/długość krokwi = /i)).toBeDefined()
  })

  it('dodany komin trafia do zestawienia jako wymian', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /\+ Komin/i }))
    expect(screen.getByText(/1\. Komin/i)).toBeDefined()

    await zakladka(user, 'materiał')
    expect(screen.getAllByText(/Wymian przy otworze/i).length).toBeGreaterThan(0)
  })

  it('zapisuje projekt i pozwala go odnaleźć na liście', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Nazwa projektu/i, 'Dom Kowalscy')
    await user.click(screen.getByRole('button', { name: /^Zapisz$/i }))
    await user.click(screen.getByRole('button', { name: /^Projekty$/i }))

    const okno = document.querySelector('.okno') as HTMLElement
    expect(within(okno).getByText('Dom Kowalscy')).toBeDefined()
  })

  it('projekt przetrwa odświeżenie strony', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await wpisz(user, /Rozpiętość budynku/i, '9500')
    unmount()

    render(<App />)
    expect(screen.getByLabelText(/Rozpiętość budynku/i)).toHaveProperty('value', '9500')
  })

  it('kąt i spadek w procentach są ze sobą powiązane', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /^Spadek/i, '100')
    expect(Number((screen.getByLabelText(/^Kąt nachylenia/i) as HTMLInputElement).value)).toBeCloseTo(
      45,
      0,
    )
  })
})
