# Jonasz — kalkulator ciesielski

Aplikacja liczy więźbę dachową: długość i rozstaw krokwi, głębokość zaciosów,
geometrię naroży dachu kopertowego oraz pełne zestawienie materiału do zakupu.
Działa jako strona internetowa i jako aplikacja instalowana na telefonie (PWA).

## Uruchomienie

```bash
npm install     # tylko za pierwszym razem
npm run dev     # serwer deweloperski
npm run build   # wersja produkcyjna do katalogu dist/
npm test        # testy
```

Po `npm run dev` otwórz adres wypisany w terminalu. Adres z sieci lokalnej
(`http://192.168.x.x:5173`) otworzysz z telefonu, o ile jest w tej samej sieci
Wi-Fi — to najszybszy sposób, żeby sprawdzić aplikację na małym ekranie.

## Co aplikacja liczy

**Geometria więźby**

- długość krokwi z okapem, wysokość kalenicy, powierzchnia połaci,
- rozstaw krokwi rozłożony równo, bez przekroczenia zadanego maksimum,
- zacios na murłacie: siodło, pięta, kontrola normy 1/3 wysokości krokwi,
- jętka: rozpiętość na zadanej wysokości i długość do zamówienia,
- dach kopertowy: nachylenie krożyny, długości kulawek, kąty do nastawienia
  na pile (ukos kulawki, sfazowanie grzbietu krożyny),
- łączenie krokwi z dwóch kawałków nad ścianą kolankową, wieńcem albo płatwią.

**Zestawienie materiału**

- drewno konstrukcyjne pogrupowane po przekrojach, z objętością w m³,
- plan cięcia: z których belek handlowych wyciąć które elementy i ile zostanie
  odpadu,
- łaty i kontrłaty w metrach bieżących, membrana i ocieplenie w m²,
- łączniki: kotwy, kątowniki, wkręty,
- impregnat w litrach, liczony z powierzchni drewna.

**Model przestrzenny**

Konstrukcja rysowana z tych samych wymiarów, co zestawienie materiału. Da się ją
obracać, przybliżać i zapisać jako obrazek. Drugi tryb rozkłada dach na etapy
montażu — od murłat po łaty — z opisem każdego kroku i wykazem drewna właśnie na
ten krok.

Rysowanie robi własny silnik na płótnie (`src/ui/scene3d.ts`), bez biblioteki 3D.
Konstrukcja to same prostopadłościany, a gotowa biblioteka dołożyłaby do
aplikacji kilkaset kilobajtów — przy narzędziu, które ma działać na telefonie
w terenie, to zła zamiana.

**Projekt PDF**

Wczytany plik jest przeglądany w aplikacji, a z jego warstwy tekstowej
wyławiane są liczby wyglądające na wymiary. Każdą trzeba zatwierdzić ręcznie —
aplikacja czyta tekst, a nie rysunek, więc traktuje swoje znaleziska jak
propozycje, nie jak fakty. Skan bez warstwy tekstowej da tylko podgląd.

## Drewno z półki i na wymiar

Aplikacja rozróżnia dwa sposoby zaopatrzenia:

- **z półki** — długości dostępne w składzie, do 6 m,
- **na wymiar** — belki cięte w tartaku na zamówienie, realnie do 12 m.

Kiedy element nie mieści się w żadnej dostępnej belce, aplikacja mówi o tym
wprost i podpowiada dwa wyjścia: zamówić drewno na wymiar albo złączyć krokiew
z dwóch kawałków.

Łączenie jest w pełni poprawne konstrukcyjnie **pod warunkiem, że styk wypada
nad podporą** — na ścianie kolankowej, na wieńcu albo na płatwi. Dlatego
aplikacja nie dzieli krokwi „na pół gdzieś", tylko dokładnie w punkcie, który
podasz, i pokazuje na rysunku, gdzie ten styk wypada. Murłaty i płatwie są
łączone automatycznie, bo to elementy ciągłe leżące na podporze na całej
długości.

## Zapisywanie i udostępnianie

Projekty zapisują się lokalnie w przeglądarce. Przycisk **Udostępnij** pakuje
cały dach do adresu URL — link nie wygasa, działa bez logowania i bez serwera.
Kto go dostanie, otworzy dokładnie te obliczenia.

Przycisk **Drukuj / PDF** korzysta z okna drukowania przeglądarki. W ten sposób
PDF wychodzi z poprawnymi polskimi znakami, czego biblioteki generujące PDF po
stronie przeglądarki zwykle nie zapewniają bez osadzania własnych fontów.

## Budowa kodu

```
src/
  core/         obliczenia — czysty TypeScript, bez React
    geometry.ts   geometria dachu: połacie, zaciosy, naroża, jętki
    cutting.ts    plan cięcia i objętości drewna
    materials.ts  zestawienie materiału
    defaults.ts   wartości domyślne i słowniki
  ui/           interfejs
  pdf/          odczyt projektu z PDF
  state/        zapis projektów i link
```

Rdzeń obliczeniowy nie wie nic o interfejsie. Ten sam kod liczy podgląd na
ekranie, wydruk i testy, więc te trzy rzeczy nie mogą się rozjechać.

Wszystkie wymiary wewnątrz rdzenia są w **milimetrach**, kąty w **stopniach**.
Zamiana na metry i centymetry następuje dopiero przy wyświetlaniu.

## Konsultacja ciesielska

Założenia obliczeniowe zostały sprawdzone przez cieślę. Efektem są między innymi:
naddatek na docięcie 10 cm zamiast 5, rzaz piły 5 mm, dodatkowa łata pod gąsior
i na pas okapowy, kleszcze nieprzechodzące poza krokwie, wkręty ciesielskie
zamiast kątowników jako domyślne mocowanie krokwi, impregnat jako opcja (drewno
z tartaku bywa impregnowane w cenie) oraz centymetry jako domyślna jednostka.

Pełny zapis uwag jest w `docs/odpowiedzi-jonasza.md` (katalog nie trafia do
repozytorium). Zostały tam też rzeczy do zbudowania: wybór sposobu połączenia
w kalenicy, wysokość słupów liczona ze ścianki kolankowej zamiast zgadywana,
rozstaw krokwi dopasowany do okien dachowych i strefy śniegowe według lokalizacji.

## Zakres odpowiedzialności

Kalkulator liczy geometrię i ilości. **Nie sprawdza nośności ani doboru
przekrojów** — te muszą wynikać z projektu konstrukcyjnego. Przed zamówieniem
drewna wyniki należy porównać z rysunkami.

## Uwaga o OneDrive

Katalog projektu leży w OneDrive. Folder `node_modules` zawiera dziesiątki
tysięcy plików i jego synchronizacja potrafi spowolnić komputer. Jest wpisany
do `.gitignore`, ale OneDrive to osobna sprawa — jeśli zauważysz spowolnienia,
wyklucz ten folder z synchronizacji albo przenieś projekt poza OneDrive.
