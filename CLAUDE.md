# Jonasz — kalkulator ciesielski

Aplikacja licząca więźbę dachową: geometria krokwi, zaciosy, naroża dachu
kopertowego, zestawienie materiału do zakupu i model przestrzenny z instrukcją
montażu. Druga gałąź liczy **wiaty, zadaszenia przyścienne i pergole** — słupy,
oczepy, miecze, stopy fundamentowe i odwodnienie. Trzecia to **meble ogrodowe
i domowe do zrobienia samodzielnie**: katalog trzydziestu trzech przepisów,
z listą części, instrukcją montażu krok po kroku i rozpiską drewna do kupienia.
Działa jako strona i jako aplikacja instalowana na telefonie (PWA).

Odbiorcy: cieśla na budowie, osoba robiąca wycenę, klient bez wiedzy fachowej
i uczeń zawodu. Stąd duże kontrolki, wysoki kontrast i przełącznik „Pokaż
wyjaśnienia" z wyprowadzeniem wzorów.

## Polecenia

```bash
npm run dev      # serwer deweloperski
npm run build    # wersja produkcyjna do dist/
npm test         # 232 testy
python tools/formularz-docx.py    # formularz konsultacyjny, tura 1
python tools/formularz2-docx.py   # tura 2
```

## Architektura

```
src/core/    obliczenia — czysty TypeScript, ZERO importów z React
  geometry.ts   połacie, zaciosy, naroża koperty, jętki
  cutting.ts    plan cięcia i objętości drewna
  materials.ts  zestawienie materiału dachu, funkcja calculate()
  model3d.ts    zamiana wyników na bryły w przestrzeni
  defaults.ts   wartości domyślne i słowniki
  shelter.ts          model danych i geometria wiaty: słupy, miecze, stopy
  shelterMaterials.ts zestawienie wiaty, funkcja calculateShelter()
  shelterModel3d.ts   model przestrzenny wiaty w formacie modułu dachowego
  shelterPresets.ts   gotowe modele wiat, zadaszeń i pergoli do wczytania
  furniture.ts        model danych mebla i warsztat do pisania przepisów
  furnitureCatalog.ts scala przepisy i wydaje je reszcie aplikacji
  furnitureSiedziska.ts, furnitureStoly.ts, furnitureOgrod.ts,
  furniturePrzechowywanie.ts, furnitureDom.ts — same przepisy
  furnitureMaterials.ts zestawienie i instrukcja, funkcja calculateFurniture()
  furnitureModel3d.ts   model przestrzenny mebla
src/ui/      interfejs, rysunki SVG, silnik 3D na płótnie
src/pdf/     odczyt wymiarów z PDF-a
src/state/   zapis projektów i pakowanie projektu do adresu URL
tools/       generatory dokumentów .docx (Python, python-docx)
```

Rdzeń nie wie nic o interfejsie. Ten sam kod liczy podgląd na ekranie, wydruk,
model 3D i testy — dzięki temu nie mogą się rozjechać. **Nie przenoś obliczeń
do komponentów.**

## Trzy gałęzie: dach, wiata i meble

Przełącznik w nagłówku wybiera, co liczymy. Projekt trzyma wszystkie trzy
komplety danych naraz (`input` dla dachu, `shelter` dla wiaty, `furniture` dla
mebla) i pole `kind`, więc przełączenie niczego nie kasuje, a zapis i link
działają dla każdej gałęzi.

Zakładki dachu: Dach · Krokwie · Model · Materiał · Projekt.
Zakładki wiaty: Wiata · Konstrukcja · Model · Materiał.
Zakładki mebla: Mebel · Części i montaż · Model · Materiał.

Wiata **korzysta z modułów dachowych tam, gdzie problem jest ten sam**: plan
cięcia (`cutting.ts`), grupowanie po przekrojach i naddatki (`groupBySection`,
`withAllowance` z `materials.ts`), rozkład elementów (`layoutRafters`), silnik
3D i widok modelu. Nie dubluj tego kodu — jeśli coś przyda się obu gałęziom,
wyeksportuj to z modułu dachowego zamiast przepisywać.

Gotowe modele (`shelterPresets.ts`) są punktem wyjścia do zmian, nie katalogiem
produktów. **Każdy musi liczyć się bez ostrzeżeń** — pilnuje tego test; przy
dokładaniu nowego sprawdź prześwit pod okapem, minimalny spadek dla pokrycia
i czy najdłuższy nierozdzielny element mieści się w belce handlowej.

Etapy montażu w `model3d.ts` (`ETAPY`) są **wspólne dla wszystkich gałęzi**
i ułożone w kolejności stawiania: stopy → murłaty → słupy → oczepy → płatwie →
miecze → krokwie → jętki → wymiany → kontrłaty → łaty → szczebliny, a dalej
etapy meblowe: nogi → rama → stężenia → dno → ściany → półki → siedzisko →
oparcie → drabina → blat → daszek. Model pokazuje tylko te etapy, w których
faktycznie coś stoi, więc dach nigdy nie zobaczy etapów meblowych i odwrotnie.

## Meble: katalog przepisów, nie parametry

Dach i wiata to jedna konstrukcja z pokrętłami. Meble tak nie działają — ławka
i budka lęgowa nie mają wspólnych parametrów poza tym, że są z drewna. Dlatego
zamiast jednego modelu danych jest **katalog przepisów**: przepis deklaruje
swoje parametry i układa `Czesc[]` w przestrzeni, a z tej jednej listy powstaje
model 3D, spis części, plan cięcia i instrukcja montażu. Dołożenie mebla to
napisanie jednej funkcji — żaden komponent ani moduł obliczeń tego nie dotyka.

Przepisy pisze się **warsztatem** (`warsztat()` w `furniture.ts`): `pion`,
`wzdluz`, `wszerz`, `ukos` i `polac`. Deski dachu układaj wyłącznie przez
`polac` — ręczne rozkładanie poziomych desek na kilku wysokościach daje
schodki zamiast połaci i szczeliny w pokryciu.

Sprawdzenia, których nie da się wyprowadzić z geometrii, przepis zgłasza sam
przez `ostrzezenia` — tak działa kontrola barierki łóżka piętrowego, bo zależy
od grubości materaca, a nie od wymiaru mebla.

**Każdy przepis musi liczyć się bez ostrzeżeń, także na obu krańcach swoich
zakresów** — pilnuje tego test. Przy dokładaniu nowego sprawdź, czy żadna
część nie wychodzi szersza niż 200 mm: tarcicy szerszej nie ma na półce,
a powierzchnię trzeba wtedy złożyć z kilku desek.

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

- **Model 3D sprawdzaj okiem, nie tylko testem.** Wyeksportuj bryły do JSON
  krótkim testem, narysuj je Pythonem z PIL do PNG i obejrzyj narzędziem Read.
  Ta droga wyłapała rzeczy, których nie widać ani w kodzie, ani w asercjach:
  deski daszku układane schodkami zamiast w płaszczyźnie połaci, półki
  kwietnika cofnięte w złą stronę, barierkę zamykającą wejście na drabinkę.
  Uwaga: prosty renderer sortujący ściany po średniej głębokości potrafi
  pokazać artefakty przy przenikających się bryłach — zanim uznasz coś za błąd,
  sprawdź liczby.
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
`docs/odpowiedzi-jonasza.md`. Z drugiej wdrożone są zakładka w kalenicy
i deska podrynnowa (punkty 54–56, 67), reszta czeka —
`docs/odpowiedzi-jonasza-runda2.md`. Trzecia tura to wytyczne o jakości
rysunków i wyglądzie aplikacji — `docs/odpowiedzi-jonasza-runda3.md`.

Bieżący stan prac i otwarte wątki: **`docs/STAN.md`**.

## Zakres odpowiedzialności

Kalkulator liczy geometrię i ilości. Nie sprawdza nośności ani nie dobiera
przekrojów — to musi wynikać z projektu konstrukcyjnego. Przy wiacie dochodzi
druga granica: liczymy objętość stóp fundamentowych, ale nie sprawdzamy
nośności gruntu ani wpływu wiatru — wiata bez ścian jest na parcie wiatru
znacznie wrażliwsza niż dach na murach. Ta granica jest
świadoma i komunikowana w interfejsie; jeśli ma się zmienić, to decyzja Marka.
