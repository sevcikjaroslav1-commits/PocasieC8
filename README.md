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
- Hľadanie miest **offline** (72 000 európskych miest priamo v appke), poloha cez GPS, uložené miesta
- Hodinová predpoveď na 24 h a predpoveď na 7 dní, detaily (vietor, vlhkosť, UV, tlak, viditeľnosť, slnko)

## Vývoj

```bash
npm install
npm run sync          # skopíruje www/ do android projektu
cd android && ./gradlew assembleDebug
```

Celá appka je v `www/index.html`. Build APK robí GitHub Actions (`.github/workflows/android.yml`) pri každom pushi do `main`.

## Dáta a licencie

| Čo | Zdroj | Licencia | Google Play |
|---|---|---|---|
| Predpoveď, upozornenia, vietor | [MET Norway](https://api.met.no/) Locationforecast 2.0 | CC BY 4.0 – zadarmo aj komerčne | ✅ |
| Mapa | [OpenFreeMap](https://openfreemap.org) (OpenMapTiles, © OpenStreetMap) | zadarmo, bez limitov | ✅ |
| Hľadanie miest | [GeoNames](https://www.geonames.org/) cities1000 (súbor `www/places.txt`) | CC BY 4.0 | ✅ |
| Východ/západ slnka | výpočet v appke (algoritmus SunCalc) | – | ✅ |
| **Radar** | [RainViewer](https://www.rainviewer.com/api.html) | **len osobné/vzdelávacie použitie** | ❌ treba vymeniť |

**Pred vydaním na Google Play:** radar nahradiť európskym radarom EUMETNET OPERA (MeteoGate, CC BY 4.0)
cez vlastný malý server, ktorý dáta prevedie na mapové dlaždice (napr. open-source LibreWXR).

MET Norway vyžaduje, aby sa appka identifikovala – rieši to `appendUserAgent` v `capacitor.config.json`.
Upozornenia počíta appka z predpovede – nie sú to oficiálne výstrahy SHMÚ.

`android/keystore/pocasiec8-test.jks` je **len testovací kľúč** (heslo je v `app/build.gradle`).
Na Google Play treba vlastný tajný release kľúč.
