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

describe('wiaty, zadaszenia i pergole', () => {
  /** Przełącza aplikację na gałąź wiat. */
  async function naWiate(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /^Wiata$/ }))
  }

  it('przełącznik w nagłówku podmienia zakładki na wiatowe', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('tab', { name: /dach/i })).toBeDefined()
    await naWiate(user)

    expect(screen.getByRole('tab', { name: /wiata/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /konstrukcja/i })).toBeDefined()
    expect(screen.queryByRole('tab', { name: /krokwie/i })).toBeNull()
    expect(screen.getByLabelText(/Wysokość w świetle/i)).toBeDefined()
  })

  it('liczy długość krokwi wiaty z wpisanych wymiarów', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    // Jednospadowa 4 m szerokości pod 45°, bez okapów: krokiew = 4 m × √2.
    await user.click(screen.getByRole('button', { name: /Jednospadowy/i }))
    await wpisz(user, /^Szerokość/i, '4000')
    await wpisz(user, /Okap w poprzek/i, '0')
    await wpisz(user, /^Kąt nachylenia/i, '45')

    await zakladka(user, 'konstrukcja')
    expect(within(kafelek('Długość krokwi')).getByText('566')).toBeDefined()
  })

  it('pokazuje liczbę słupów i beton na stopy', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await wpisz(user, /^Długość/i, '9000')
    await wpisz(user, /Największy rozstaw słupów/i, '3000')
    await zakladka(user, 'konstrukcja')

    // Cztery słupy w rzędzie, dwa rzędy.
    expect(within(kafelek('Słupy')).getByText('8')).toBeDefined()
    expect(screen.getByText('Beton na stopy')).toBeDefined()
  })

  it('ostrzega, gdy ktoś wyłączy miecze', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await user.click(screen.getByRole('checkbox', { name: /Miecze usztywniające/i }))
    await zakladka(user, 'konstrukcja')

    const alerty = screen.getAllByRole('alert').map((a) => a.textContent ?? '')
    expect(alerty.some((t) => /mieczy/i.test(t))).toBe(true)
  })

  it('pergola przestawia się na szczebliny i chowa rynny', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await user.click(screen.getByRole('button', { name: /Pergola/i }))
    expect(screen.getByLabelText(/Rozstaw szczeblin/i)).toBeDefined()
    expect(screen.getByText(/nie zbiera wody/i)).toBeDefined()

    await zakladka(user, 'materiał')
    expect(screen.getAllByText(/Szczeblina/i).length).toBeGreaterThan(0)
  })

  it('zadaszenie przyścienne dokłada belkę ścienną i kotwy do muru', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await user.click(screen.getByRole('button', { name: /Zadaszenie przyścienne/i }))
    await zakladka(user, 'materiał')

    expect(screen.getAllByText(/Belka ścienna/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Kotwa belki ściennej/i)).toBeDefined()
  })

  it('zestawienie wiaty pokazuje fundamenty i pokrycie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)
    await zakladka(user, 'materiał')

    expect(screen.getByText('Drewno do kupienia')).toBeDefined()
    expect(screen.getAllByText(/Stopa fundamentowa/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Blacha trapezowa/i).length).toBeGreaterThan(0)
  })

  it('model przestrzenny wiaty prowadzi przez montaż od stóp fundamentowych', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)
    await zakladka(user, 'model')

    expect(screen.getByRole('button', { name: /Cała wiata/i })).toBeDefined()
    expect(screen.getByText(/Stopy fundamentowe/i)).toBeDefined()
  })

  it('przełączenie rodzaju nie kasuje danych drugiej konstrukcji', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Rozpiętość budynku/i, '9500')
    await naWiate(user)
    await wpisz(user, /^Szerokość/i, '4200')

    await user.click(screen.getByRole('button', { name: /^Dach$/ }))
    expect(screen.getByLabelText(/Rozpiętość budynku/i)).toHaveProperty('value', '9500')

    await naWiate(user)
    expect(screen.getByLabelText(/^Szerokość/i)).toHaveProperty('value', '4200')
  })

  it('gotowy model wczytuje komplet wymiarów jednym kliknięciem', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await user.click(screen.getByRole('button', { name: /Garażowa na jedno auto/i }))

    expect(screen.getByLabelText(/^Szerokość/i)).toHaveProperty('value', '3500')
    expect(screen.getByLabelText(/^Długość/i)).toHaveProperty('value', '5500')
    expect(screen.getByLabelText(/Wysokość w świetle/i)).toHaveProperty('value', '2400')

    // Model ma się policzyć od razu, bez ostrzeżeń do poprawienia.
    await zakladka(user, 'konstrukcja')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lista modeli pokazuje tylko te z wybranego rodzaju', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    expect(screen.getByRole('button', { name: /Garażowa na dwa auta/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Pergola ogrodowa/i })).toBeNull()

    // Kafelek rodzaju rozpoznajemy po opisie, bo nazwy modeli też zaczynają się od „Pergola".
    await user.click(screen.getByRole('button', { name: /rama ze szczeblinami/i }))
    expect(screen.getByRole('button', { name: /Pergola ogrodowa/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Garażowa na dwa auta/i })).toBeNull()
  })

  it('wczytany model nie kasuje ustawienia drewna na wymiar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await user.click(screen.getByRole('button', { name: /Na wymiar/i }))
    await user.click(screen.getByRole('button', { name: /Gospodarcza na maszyny/i }))

    expect(screen.getByLabelText(/^Szerokość/i)).toHaveProperty('value', '8000')
    expect(screen.getByText(/realnie do 12 m/i)).toBeDefined()
  })

  it('zapisana wiata wraca z listy projektów jako wiata', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naWiate(user)

    await wpisz(user, /Nazwa projektu/i, 'Wiata na drewno')
    await user.click(screen.getByRole('button', { name: /^Zapisz$/i }))
    await user.click(screen.getByRole('button', { name: /^Projekty$/i }))

    const okno = document.querySelector('.okno') as HTMLElement
    expect(within(okno).getByText('Wiata na drewno')).toBeDefined()
    expect(within(okno).getByText(/Wiata wolnostojąca/i)).toBeDefined()

    await user.click(within(okno).getByRole('button', { name: /Otwórz/i }))
    expect(screen.getByRole('tab', { name: /wiata/i })).toHaveProperty('ariaSelected', 'true')
  })
})

describe('meble ogrodowe i domowe', () => {
  /** Przełącza aplikację na gałąź mebli. */
  async function naMeble(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /^Meble$/ }))
  }

  it('przełącznik w nagłówku podmienia zakładki na meblowe', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    expect(screen.getByRole('tab', { name: /^Mebel$/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /części i montaż/i })).toBeDefined()
    expect(screen.queryByRole('tab', { name: /krokwie/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /konstrukcja/i })).toBeNull()
    // Startujemy od ławki — to od niej ludzie najczęściej zaczynają.
    expect(screen.getByRole('heading', { name: /Ławka ogrodowa z oparciem/i })).toBeDefined()
  })

  it('wybór innego mebla z katalogu podmienia komplet parametrów', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    expect(screen.getByLabelText(/Wysokość oparcia/i)).toBeDefined()

    await user.click(screen.getByRole('button', { name: /Ławka prosta bez oparcia/i }))

    expect(screen.getByRole('heading', { name: /Ławka prosta bez oparcia/i })).toBeDefined()
    expect(screen.queryByLabelText(/Wysokość oparcia/i)).toBeNull()
  })

  it('filtr kategorii pokazuje meble tylko z wybranego działu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    expect(screen.getByRole('button', { name: /Ławka ogrodowa z oparciem/i })).toBeDefined()

    await user.click(screen.getByRole('button', { name: /^Ogród$/ }))

    expect(screen.getByRole('button', { name: /Grządka podwyższona/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Ławka ogrodowa z oparciem/i })).toBeNull()
  })

  it('zmiana wymiaru przelicza gabaryt gotowego mebla', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    await wpisz(user, /^Długość$/i, '2000')

    expect(within(kafelek('Gotowy mebel')).getByText(/200 cm/)).toBeDefined()
  })

  it('lista części ma oznaczenia literowe, a instrukcja ponumerowane kroki', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)
    await zakladka(user, 'części i montaż')

    // Pierwsza pozycja listy części dostaje literę A i wraca w instrukcji.
    const tabela = document.querySelector('.tabela-otoczka table') as HTMLElement
    expect(within(tabela).getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getByText(/Krok 1:/i)).toBeDefined()
    expect(screen.getByText(/Na koniec: szlif i wykończenie/i)).toBeDefined()
    expect(screen.getAllByText(/Noga tylna z oparciem/i).length).toBeGreaterThan(0)
  })

  it('zestawienie mebla podaje tarcicę w metrach bieżących i wkręty', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)
    await zakladka(user, 'materiał')

    expect(within(kafelek('Tarcica do kupienia')).getByText('mb')).toBeDefined()
    expect(screen.getAllByText(/Wkręt do drewna/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Plan cięcia/i).length).toBeGreaterThan(0)
  })

  it('ostrzega, gdy ktoś wybierze świerk na mebel stojący w ziemi', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    await user.click(screen.getByRole('button', { name: /^Ogród$/ }))
    await user.click(screen.getByRole('button', { name: /Grządka podwyższona/i }))
    await user.selectOptions(screen.getByLabelText(/Gatunek drewna/i), 'swierk')
    await zakladka(user, 'materiał')

    expect(screen.getByText(/w kontakcie z ziemią/i)).toBeDefined()
  })

  it('model przestrzenny mebla prowadzi przez montaż od nóg', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)
    await zakladka(user, 'model')

    expect(screen.getByRole('button', { name: /Gotowy mebel/i })).toBeDefined()
    await user.click(screen.getByRole('button', { name: /Montaż krok po kroku/i }))
    expect(screen.getAllByText(/Nogi i boki/i).length).toBeGreaterThan(0)
  })

  it('przełączanie rodzajów nie kasuje danych pozostałych gałęzi', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Rozpiętość budynku/i, '9000')
    await naMeble(user)
    await wpisz(user, /^Długość$/i, '1900')

    await user.click(screen.getByRole('button', { name: /^Dach$/ }))
    expect(screen.getByLabelText(/Rozpiętość budynku/i)).toHaveProperty('value', '9000')

    await naMeble(user)
    expect(screen.getByLabelText(/^Długość$/i)).toHaveProperty('value', '1900')
  })

  it('zapisany mebel wraca z listy projektów jako mebel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await naMeble(user)

    await wpisz(user, /Nazwa projektu/i, 'Ławka na taras')
    await user.click(screen.getByRole('button', { name: /^Zapisz$/i }))
    await user.click(screen.getByRole('button', { name: /^Projekty$/i }))

    const okno = document.querySelector('.okno') as HTMLElement
    expect(within(okno).getByText('Ławka na taras')).toBeDefined()
    expect(within(okno).getByText(/Ławka ogrodowa z oparciem/i)).toBeDefined()

    await user.click(within(okno).getByRole('button', { name: /Otwórz/i }))
    expect(screen.getByRole('tab', { name: /^Mebel$/i })).toHaveProperty('ariaSelected', 'true')
  })
})

describe('kalenica i deska podrynnowa', () => {
  it('zakładka ciesielska wydłuża krokiew, cięcie czołowe nie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await zakladka(user, 'krokwie')

    const przedZmiana = kafelek('Długość krokwi').textContent ?? ''

    await zakladka(user, 'dach')
    await user.click(screen.getByRole('button', { name: /Zakładka ciesielska/i }))
    await zakladka(user, 'krokwie')

    // Ta sama krokiew liczona z zakładką musi wyjść dłuższa.
    expect(kafelek('Długość krokwi').textContent).not.toBe(przedZmiana)
    expect(kafelek('Wydłużenie krokwi')).toBeDefined()
    expect(kafelek('Głębokość wybrania')).toBeDefined()
  })

  it('przy dachu pulpitowym zakładka nie ma czego zazębiać', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Jednospadowy/i }))
    await user.click(screen.getByRole('button', { name: /Zakładka ciesielska/i }))

    expect(screen.getByText(/nie ma kalenicy, w której schodzą się dwie krokwie/i)).toBeDefined()

    await zakladka(user, 'krokwie')
    // Mimo wybranej zakładki liczymy cięcie czołowe.
    expect(kafelek('Kalenica').textContent).toMatch(/czołowe/i)
  })

  it('deska podrynnowa wyznacza pionowe cięcie krokwi i trafia do materiału', async () => {
    const user = userEvent.setup()
    render(<App />)

    await wpisz(user, /Wysokość deski podrynnowej/i, '250')
    await zakladka(user, 'krokwie')
    expect(kafelek('Cięcie pionowe przy okapie').textContent).toMatch(/230/)

    await zakladka(user, 'materiał')
    expect(screen.getAllByText(/Deska podrynnowa/i).length).toBeGreaterThan(0)
  })

  it('deska wyższa niż krokiew jest zgłaszana jako błąd', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Krokiew 180 mm przy 35° ma w pionie 220 mm — deska 300 mm się nie zmieści.
    await wpisz(user, /Wysokość deski podrynnowej/i, '300')
    await zakladka(user, 'krokwie')

    expect(screen.getByText(/Weź niższą deskę/i)).toBeDefined()
  })

  it('wyłączona deska podrynnowa znika z zestawienia', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByLabelText(/Deska podrynnowa/i))
    await zakladka(user, 'materiał')

    expect(screen.queryByText(/Deska podrynnowa/i)).toBeNull()
  })
})
