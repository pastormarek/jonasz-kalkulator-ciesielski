# Jonasz — kalkulator ciesielski

Aplikacja licząca więźbę dachową: geometria krokwi, zaciosy, naroża dachu
kopertowego, zestawienie materiału do zakupu i model przestrzenny z instrukcją
montażu. Działa jako strona i jako aplikacja instalowana na telefonie (PWA).

Odbiorcy: cieśla na budowie, osoba robiąca wycenę, klient bez wiedzy fachowej
i uczeń zawodu. Stąd duże kontrolki, wysoki kontrast i przełącznik „Pokaż
wyjaśnienia" z wyprowadzeniem wzorów.

## Polecenia

```bash
npm run dev      # serwer deweloperski
npm run build    # wersja produkcyjna do dist/
npm test         # 111 testów
python tools/formularz-docx.py    # formularz konsultacyjny, tura 1
python tools/formularz2-docx.py   # tura 2
```

## Architektura

```
src/core/    obliczenia — czysty TypeScript, ZERO importów z React
  geometry.ts   połacie, zaciosy, naroża koperty, jętki
  cutting.ts    plan cięcia i objętości drewna
  materials.ts  zestawienie materiału, funkcja calculate()
  model3d.ts    zamiana wyników na bryły w przestrzeni
  defaults.ts   wartości domyślne i słowniki
src/ui/      interfejs, rysunki SVG, silnik 3D na płótnie
src/pdf/     odczyt wymiarów z PDF-a
src/state/   zapis projektów i pakowanie projektu do adresu URL
tools/       generatory dokumentów .docx (Python, python-docx)
```

Rdzeń nie wie nic o interfejsie. Ten sam kod liczy podgląd na ekranie, wydruk,
model 3D i testy — dzięki temu nie mogą się rozjechać. **Nie przenoś obliczeń
do komponentów.**

## Konwencje

- **Wszystkie wymiary w rdzeniu są w milimetrach**, kąty w stopniach. Zamiana
  na centymetry i metry dopiero przy wyświetlaniu (`src/ui/units.tsx`).
- **Domyślną jednostką wyświetlania są centymetry** — tak odmierza cieśla na
  drewnie. Handlowe długości belek zawsze w metrach („sześciometrówka").
- Kod, komentarze, nazwy zmiennych i interfejs — **po polsku**, z pełną
  diakrytyką. Wyjątek: typy i pola w `src/core/types.ts` mają angielskie nazwy
  z czasów pierwszej wersji; nie ma potrzeby ich przepisywać.
- Komentarze tłumaczą **dlaczego**, nie co robi kod.
- `warnings` to problemy do naprawienia przed cięciem drewna, `notes` to uwagi
  wykonawcze. Nie mieszaj ich.

## Uwagi, które łatwo przeoczyć

- **Heredoc w bashu wykłada się na apostrofach** (np. `35°16'`). Do plików
  źródłowych używaj narzędzia Write albo skryptu Pythona.
- **`git push` przez zwykły helper zawiesza się** na uwierzytelnianiu. Działa:
  `git -c credential.helper='!gh auth git-credential' push origin main`
- Projekt leży w OneDrive. `node_modules` i `dist` są w `.gitignore`, ale
  synchronizacja i tak potrafi spowolnić komputer.
- **`docs/` jest poza repozytorium** — trzyma materiały konsultacyjne
  z pytaniami do konkretnych osób, a repozytorium jest publiczne.

## Wdrożenie

Publiczne repo `pastormarek/jonasz-kalkulator-ciesielski`, GitHub Pages pod
adresem https://pastormarek.github.io/jonasz-kalkulator-ciesielski/.
Każdy push do `main` uruchamia testy i publikuje — jeśli testy padną, poprzednia
wersja zostaje na miejscu.

**Service worker był już raz przyczyną białego ekranu**: serwował z pamięci stary
`index.html`, wskazujący na pliki, których po wdrożeniu już nie było. Dlatego
nawigacje idą teraz do sieci (NetworkFirst), a w `index.html` siedzi ratunek
kasujący workera, gdy aplikacja nie wstanie w osiem sekund. Nie cofaj tego.

## Konsultacja ciesielska

Założenia obliczeniowe sprawdza cieśla (Jonasz). Proces: generujemy ponumerowany
formularz .docx, on wpisuje odpowiedzi, my wdrażamy poprawki i pytamy dalej.
Numeracja punktów jest **ciągła między turami** (tura 1: 1–50, tura 2: 51–73),
żeby odwołania się nie myliły.

Pierwsza tura zmieniła dziewięć rzeczy w obliczeniach — zapis w
`docs/odpowiedzi-jonasza.md`. Druga tura czeka na odpowiedzi.

Bieżący stan prac i otwarte wątki: **`docs/STAN.md`**.

## Zakres odpowiedzialności

Kalkulator liczy geometrię i ilości. Nie sprawdza nośności ani nie dobiera
przekrojów — to musi wynikać z projektu konstrukcyjnego. Ta granica jest
świadoma i komunikowana w interfejsie; jeśli ma się zmienić, to decyzja Marka.
