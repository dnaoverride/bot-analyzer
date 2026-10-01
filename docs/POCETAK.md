# BotAnalyzer — početak na Linux Mint-u ili Windows-u

## Najbrže: dodatak za Chrome / Chromium

1. Raspakuj ZIP u stalni folder, na primer `~/Projects/bot-analyzer`.
2. Otvori `chrome://extensions`.
3. Uključi **Developer mode**.
4. Klikni **Load unpacked** i izaberi `bot-analyzer/dist/extension`.
5. Zakači BotAnalyzer ikonicu kroz meni dodataka.
6. Otvori TikTok u istom pregledaču i prikaži komentare.
7. Klikni BotAnalyzer ikonicu. Otvoriće se kontrolna tabla.
8. Klikni **Dodaj / uvezi → Uvezi poslednju kolekciju iz dodatka**.
9. Pregledaj naloge i tekstove, odčekiraj pogrešno izdvojene primere, pa sačuvaj izabrane.
10. Vrati se na TikTok, ručno skroluj komentare i ponovi postupak za sledeću grupu.

Ako kontrolna tabla kaže da nema prepoznatih komentara iako ih vidiš, selektori možda ne odgovaraju tvojoj verziji TikToka. Koristi ručni unos i prijavi problem projektu sa anonimizovanim HTML primerom. LIVE chat nije podržan u ovoj verziji.

## Profilne slike i numerisani klonovi

U **Dodaj / uvezi** upiši profil i dodaj **isečenu profilnu sliku**. Za drugi nalog uradi isto. Ako isti nalog već ima komentar u evidenciji, slika može biti zaseban unos pod istim profilom.

Analiza traži moguće poklapanje slika i imena sa drugačijim brojčanim nastavkom, na primer `primer22` i `primer23`. Minimalna dužina korena imena je 5 znakova. To su tragovi za ručni pregled. Alatka ne prepoznaje lica i ne dokazuje ko kontroliše nalog.

## Prijava

1. Otvori **Analiza**.
2. Pregledaj sačuvane primere i originalne objave.
3. Kod opravdanog nalaza izaberi **Uključi u nacrt prijave**.
4. Otvori **Prijava**, proveri tekst i preuzmi nacrt/dokaze.
5. Pošalji prijavu kroz TikTok i priloži originalne screenshotove gde je to moguće.

Nijedan nalaz nije automatski uključen. Ne postoji dugme za masovno prijavljivanje naloga.

## Samostalna aplikacija

Iz foldera projekta pokreni:

```sh
npm start
```

Otvori `http://127.0.0.1:4173`. Potreban je Node.js 20 ili noviji. Nema instalacije paketa. Za gašenje pritisni Ctrl+C. Za drugi port koristi promenljivu `BOT_ANALYZER_PORT`.

Kod samostalne aplikacije nema direktnog čitanja drugog taba: koristi ručni unos ili JSON iz dodatka. Nemoj otvarati `index.html` dvoklikom: aplikacija koristi JS module i pokreće se preko lokalnog servera.

## Stari fajl tiktok-dokazi.html

U staroj alatki preuzmi JSON rezervnu kopiju, pa je uvezi u novi BotAnalyzer. Stari tekstovi i profili se prenose. Stare slike imaju drugačiji otisak, pa ih dodaj ponovo; unosi koji sadrže samo staru sliku biće navedeni kao preskočeni. Originalni backup ostaje netaknut.

## Čuvanje

U **Evidencija** redovno koristi **JSON rezervna kopija**. Browser i dodatak imaju odvojene lokalne podatke. Brisanje podataka pregledača ili dodatka može obrisati evidenciju. Novi podaci i promena pravila poništavaju ranije odluke o uključivanju, pa nalaze treba ponovo pregledati.
