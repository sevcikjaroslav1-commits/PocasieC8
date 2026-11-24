# PocasieC8

Počasie s **online radarom zrážok priamo na hlavnej obrazovke** – dážď aj sneh, upozornenia
kedy začne pršať / snežiť / kedy príde víchrica, predpoveď na hodiny a 7 dní.
Android appka (Capacitor) – VESPAL s. r. o.

## Inštalácia do mobilu

1. V mobile otvor **https://github.com/sevcikjaroslav1-commits/PocasieC8/releases/latest**
2. Stiahni súbor `PocasieC8-1.0.X.apk`
3. Otvor ho a povoľ inštaláciu z tohto zdroja (prehliadač / Súbory)
4. Pri prvom spustení povoľ **polohu** a **notifikácie**

Každá nová verzia sa nainštaluje ako aktualizácia cez starú (všetky buildy majú rovnaký testovací podpis).

## Čo appka vie

- Radar zrážok (RainViewer) s animáciou posledných ~2 hodín, dážď a sneh vlastnými farbami
- Prepínač **Moje okolie / Krajina** – krajina podľa polohy alebo vybraná (SK, CZ, AT, HU, PL, DE, SI, HR, IT, CH, RO, UA, Európa), dá sa zapamätať ako predvolená
- Priblíženie / oddialenie (prsty aj tlačidlá +/−), radar na celú obrazovku, vrstva **Vietor a nárazy**
- Legenda s hodnotami v mm/h a vysvetlenie farieb (ⓘ)
- Upozornenia: dážď (minútová predpoveď na 2 h), sneženie (cm), víchrica (nárazy), mráz – časová os 48 h
- Notifikácie vopred (15 min – 3 h), dajú sa vypnúť po typoch
- Hľadanie miest, poloha cez GPS, uložené miesta
- Hodinová predpoveď na 24 h a predpoveď na 7 dní, detaily (vietor, vlhkosť, UV, tlak, viditeľnosť, slnko)

## Vývoj

```bash
npm install
npm run sync          # skopíruje www/ do android projektu
cd android && ./gradlew assembleDebug
```

Celá appka je v `www/index.html`. Build APK robí GitHub Actions (`.github/workflows/android.yml`) pri každom pushi do `main`.

## Dáta a licencie – pred Google Play treba vyriešiť

- **Open-Meteo** (predpoveď, hľadanie miest) – zadarmo len na nekomerčné použitie; pre komerčnú appku je potrebné ich predplatné.
- **RainViewer** (radar) – bezplatné API len na osobné a vzdelávacie použitie, max. priblíženie radaru je obmedzené, predpoveď radaru do budúcnosti už nie je k dispozícii.
- **CARTO / OpenStreetMap** (podkladová mapa) – vyžaduje uvedenie zdroja; pri vyššej návštevnosti platená licencia CARTO.
- **BigDataCloud** (názov miesta z GPS) – bezplatné klientske API.
- Upozornenia počíta appka z predpovede – nie sú to oficiálne výstrahy SHMÚ.
- `android/keystore/pocasiec8-test.jks` je **len testovací kľúč** (heslo je v `app/build.gradle`). Na Google Play treba vlastný tajný release kľúč.
