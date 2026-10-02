# BotAnalyzer — Instagram, druge mreže i Chrome Web Store

Plan i izvršni prompt za Cursor · 1. oktobar 2026.

**Upotreba:** dodaj ovaj fajl u koren svog BotAnalyzer projekta. U Cursor Agent-u ga priloži kroz `@` i napiši: „Prati ovaj dokument. Pregledaj postojeći projekat i realizuj faze 0–5 redom. Sačuvaj moje postojeće izmene. Počni implementaciju, ne zaustavljaj se na predlogu plana.“

Ovaj dokument planira dalji razvoj; ne tvrdi da su navedene nove funkcije već napravljene. Polazna verzija je BotAnalyzer v0.1.0 iz prethodnog ZIP-a. Tvoj lokalni repozitorijum je merodavan ako si ga već menjao u Cursor-u.

## 1. Cilj i redosled

Nadogradi BotAnalyzer u lokalnu, open source Chrome/Chromium ekstenziju za pregled tragova mogućeg spama i povezane aktivnosti. Pripremi proverljivu beta verziju sa TikTok i Instagram adapterima i paket za Chrome Web Store. Zadrži MIT licencu.

Proizvod treba da pomaže korisniku da pronađe obrasce, proveri originale, sačuva dokaze i pripremi prijavu. Nalazi nisu potvrda automatizacije, kupovine naloga ili zajedničkog vlasništva. Ne računaj neprovereni „procenat da je bot“. Koristi formulacije „ponovljena poruka“, „slična profilna slika“, „više povezanih tragova“ i „potrebna provera“.

### Predlog mreža

Prioriteti ispod su procena razvoja, a ne tvrdnja o odobrenom pristupu svim podacima.

| Redosled | Mreža | Predloženi pristup | Ograničenje / odluka |
|---|---|---|---|
| Sada | TikTok | Stabilizacija postojeće evidencije; provereni uvoz; eksperimentalni korisnički pokrenut collector samo uz odgovarajuću osnovu | Trenutni DOM collector nije proveren na stvarnoj TikTok sesiji; proveriti i uslove pristupa pre Store izdanja. |
| Sledeća | Instagram | Profil/post/Reel adapter, ručni unos i uvoz; collector vidljivih komentara tek nakon provere pristupa i stvarnog DOM-a | Profesionalni Instagram API nije opšti interfejs za sve komentare na proizvoljnim tuđim nalozima. |
| Nakon beta izdanja | YouTube | Zvanični Data API za niti komentara, sa potrebnim ključem/odobrenjima i kvotama | `commentThreads` ne mora sadržati sve odgovore; potreban je i `comments.list`. Pristup zavisi i od dostupnosti komentara. |
| Naredna grupa | Bluesky | Javni AppView API za podržane objave/niti | Stabilan identitet graditi na DID-u kada je dostupan, uz odvojeni promenljivi handle. Poštovati limite. |
| Naredna grupa | Mastodon | API izabrane instance za javne objave i odgovore | Identitet uključuje domen instance; pravila, dostupnost i limiti zavise od instance. |
| Kasnije | Reddit | Tek nakon potvrde dozvoljenog API pristupa za konkretnu upotrebu | Pristup/odobrenje i uslovi su poseban zadatak, ne pretpostaviti da je otvoren za svaki slučaj. |
| Kasnije | X | API uz budžet i odobren pristup ili ručni uvoz | Aktuelna dokumentacija opisuje naplatu po upotrebi; tačne cene proveriti pred razvoj. |
| Istraživanje | Facebook / Threads | Zasebna analiza javnih API-ja, dozvola i prihvatljivog načina uvoza | Ne obećavati pokrivenost privatnih profila, grupa ili svih komentara. |

**Opseg ove implementacije:** TikTok + Instagram i priprema Store izdanja. Ostale mreže dokumentuj kroz adapter interfejs i roadmap; nemoj sada implementirati sve.

## 2. Faza 0 — pregled stvarnog projekta

Pre menjanja koda pročitaj README, package.json, manifest, storage, model, adaptere, UI, testove i AGENTS.md ako postoji. Proveri `git status` i sačuvaj postojeće izmene. Nemoj resetovati ili prepisati korisnikov rad. Ne uvodi novi framework samo radi prepisivanja funkcionalnog koda.

U poznatoj v0.1.0 osnovi postoje:

- `src/core/{model,text,image,analyze,report,storage}.js`;
- `src/adapters/{index,tiktok,tiktok-capture}.js`;
- `src/ui/app.js` i `style.css`;
- `extension/manifest.json` i `worker.js`;
- `scripts/server.mjs` i `build-extension.mjs`;
- `tests/core.test.js` i dokumentacija.

To je vanilla JavaScript ES modules projekat sa lokalnim Node serverom, bez runtime npm zavisnosti. Manifest V3 koristi `activeTab`, `scripting`, `storage`. Polazna verzija ima 15 core testova, ali nema potvrđeno testiranje UI-ja ili collectora na stvarnoj mreži. Ponovo pokreni testove; nemoj unapred tvrditi da prolaze u trenutnom repozitorijumu.

Napravi `docs/IMPLEMENTATION-STATUS.md`: stvarno stanje, razlike u odnosu na ovu osnovu, faze i rezultati. Nastavi na implementaciju samostalnih delova. Ako nedostaje stvarni HTML primer ili nalog za proveru, jasno zabeleži šta nije provereno i dovrši ostali rad.

## 3. Faza 1 — adapteri i podaci za više mreža

### Adapter ugovor

Proširi postojeći registry. Jedna definicija mreže treba da određuje:

```js
{
  id, name,
  supportedHosts,
  canonicalProfile(input),
  canonicalPost(input),
  parseProfileIdentity(input),
  detectPage(url),
  capabilities: { manualImport: true, visibleComments: false, apiImport: false },
  reporting: { helpUrl, steps, checkedAt }
}
```

Prilagodi nazive stvarnom kodu i obezbedi kompatibilnost sa postojećim `validPost`/`handle` metodama. Ne ostavljaj dva različita izvora istine za podržane domene: registry, extension dispatch i UI treba da se slažu.

Collector funkcija ubrizgana kroz `chrome.scripting.executeScript({func})` ne može se osloniti na closure ili importe iz service worker-a. Koristi samostalnu funkciju ili lokalno upakovanu content-script datoteku i eksplicitno testiraj stvarno izvršavanje.

UI treba da ima izbor mreže, filter nalaza po mreži i reporting korake koji odgovaraju svakom nalazu. U MVP-u ne grupiši Instagram i TikTok profile kao istu osobu zato što imaju isto ime/sliku. Odvojeni modeli mreža su obavezni.

### Evidence model

Zadrži originalni tekst i linkove. Dodaj ili formalizuj:

- `platform`, `accountKey`, `handle`, `displayName` ako stvarno postoji;
- `profileUrl`, `postUrl`, `commentUrl` i `commentId` ako su dostupni;
- `text`, `note`, `avatar` i poreklo slike;
- `observedAt` kao vreme prikupljanja;
- `publishedAt: null` po podrazumevanom stanju; popuni samo iz pouzdanog izvora, uz informaciju o preciznosti/poreklu;
- `source: manual | paste | visible-dom | approved-api`;
- `collectorVersion`, `schemaVersion`, `caseId`.

Nemoj konvertovati „pre 2h“ u lažno precizno vreme objave. Sačuvaj prikazani tekst vremena ako je potreban, bez zaključivanja o sinhronizaciji.

Kad platforma nudi stabilan ID, koristi ga. Ako postoji samo handle, označi tu činjenicu; nemoj izmišljati stabilan ID niti garantovati detekciju preimenovanih naloga.

### Čuvanje i konkurentni upisi

Obezbedi migraciju postojećeg JSON-a i skladišta. Preporuka je IndexedDB za evidenciju/slike i transakcije, uz chrome.storage.local za male postavke. Ako trenutni projekat već ima pouzdaniji sloj, nastavi njega.

- Migracija je verzionisana, ponovljiva i ne briše izvor pre potvrđenog upisa/provere.
- Korisnik može izvesti staru evidenciju pre migracije.
- Ne prepisuj noviji capture batch kada korisnik uveze stariji.
- Dva otvorena dashboard taba ne smeju izgubiti međusobne izmene.
- Service worker restart ne sme uništiti privremenu kolekciju.
- „Obriši sve“ obuhvata evidenciju, slike, odluke i privremene capture podatke; preuzete fajlove ne može obrisati.
- Import preview prikazuje koliko unosa je ispravno, duplirano ili odbačeno i zašto.
- Novi dokazi poništavaju odluke za nalaze čiji se sadržaj promenio. Ako nije bezbedno precizno odrediti zahvaćene nalaze, poništi sve odluke uz jasno obaveštenje.

## 4. Faza 2 — Instagram

### Uvek dostupni delovi

Napravi `instagram.js` adapter sa testovima za:

- `https://www.instagram.com/korisnik/` i oblik `@korisnik` kada je mreža eksplicitno izabrana;
- objave `/p/<shortcode>/` i Reels `/reel/<shortcode>/`;
- uklanjanje poznatih tracking parametara bez gubljenja identifikatora komentara;
- odbijanje lažnih domena, HTTP/javascript URL-ova i posebnih putanja koje nisu korisnici, kao što su `/accounts/`, `/direct/`, `/explore/`, `/stories/`;
- razdvajanje profila autora komentara od autora objave i @pominjanja u komentaru;
- odvojene Instagram instrukcije za ručnu prijavu, proverene na aktuelnom Help Center-u i označene datumom.

Omogući ručni unos, tekst/slika kombinaciju, TSV/JSON uvoz i isti sistem analize koji koristi TikTok. Profilne slike poredi kao slike, bez prepoznavanja identiteta osobe.

### Pristup komentarima i uslovi objavljivanja

Pre uključivanja automatskog collectora proveri zvanične uslove TikToka/Instagrama i Chrome Web Store pravila za konkretan način pristupa. To što je komentar vidljiv ili je korisnik kliknuo dugme nije samo po sebi dokaz dozvoljenosti automatizovanog prikupljanja. Chrome Web Store Developer Agreement obuhvata poštovanje tuđih uslova korišćenja.

Zabeleži nalaz i izvore u `docs/PLATFORM-ACCESS.md`. Ne predstavljaj ga kao pravni sertifikat. Ako nema jasne dozvoljene osnove za DOM prikupljanje, Store izdanje treba da koristi ručni unos/uvoz ili odgovarajući odobreni API. Ograničeni profesionalni Instagram API ne proširuj prečicama na tuđe naloge. Nemoj ostaviti nedozvoljenu funkciju skrivenu iza prekidača u Store paketu.

### Eksperimentalni collector — samo kada je pristup odgovarajući

Implementiraj i testiraj na stvarnim, dozvoljenim primerima stranica i anonimizovanim fixture-ima:

1. Korisnik otvara podržanu objavu ili Reel i prikazuje komentare.
2. Klikom na ekstenziju dobija jasan izbor „Prikupi vidljive komentare“ / „Otvori analizator“.
3. Collector čita trenutno vidljive komentare na aktivnoj objavi; nema stalnog osmatranja, automatskog skrolovanja ili obilaska profila.
4. Svaki rezultat ima pouzdanu vezu autor–tekst–objava. Kada nije pouzdana, preskoči komentar i objasni rezultat.
5. Korisnik pregleda rezultate, isključuje neželjene stavke i tek tada ih čuva.

Podrži poznate desktop post/Reel prikaze, otvorene odgovore, Unicode, emoji, duge komentare i „more“ dugme bez automatskog pritiskanja. Ne skupljaj DMs, Stories, privatne razgovore, skriveni React state ili pozadinske/private API odgovore.

Koristi što stabilnije semantičke elemente i jasne granice komentara, a ne jednu minifikovanu CSS klasu. Ne izmišljaj selektore. Ako nema stvarnog DOM-a za proveru, adapter za ručni unos može biti završen, ali collector ostaje označen kao neproveren i nije oglašen kao podržana Store funkcija.

## 5. Faza 3 — upotrebljiva analiza i prijava

Sačuvaj postojeće objašnjive signale:

- identične/vrlo slične poruke na različitim nalozima;
- moguće poklapanje avatara uz vizuelni pregled i isključivanje praznih/vrlo jednostavnih slika;
- korisnička imena sa istim korenom i promenjenim numeričkim nastavkom;
- ponavljanje istog obrasca na više različitih objava, samo kada stvarno postoje prikupljeni dokazi.

Svaki nalaz pokazuje originalne primere, različite naloge, različite objave i razlog označavanja. Jedan slab signal nije optužba. Česti slogani, citati i zajedničke fan slike moraju biti među negativnim/ambivalentnim test primerima. Privatnost profila, politički stav, jezik i nacionalnost nisu signali sumnje.

Uvedi lokalne „slučajeve“ kako se različita istraživanja ne bi mešala. Osnovni tok: izaberi slučaj → prikupi/uvezi → analiziraj → pregledaj → izvezi.

Prijava sadrži samo eksplicitno potvrđene nalaze iz aktivnog slučaja, tačne linkove i objašnjenje. Omogući ručni status `nije poslato / korisnik označio kao poslato / korisnik zabeležio ishod`. Aplikacija ne zna da li je platforma zaista prihvatila prijavu ako to korisnik ne unese.

Nemoj dodavati automatsko masovno prijavljivanje, koordinaciju prijava drugih korisnika ili javne spiskove „potvrđenih botova“. Ne traži pristup TikTok/Instagram lozinkama ili cookie-ima. Za sada korisnik završava slanje u originalnom interfejsu mreže.

UI: lokalizacija na srpski latinicom i engleski, pristupačne labele, vidljiv status praznog rezultata, greške dozvola, import preview, potrošnja prostora i oporavak nakon neuspelog upisa. Prikupljanje ne treba nasilno da odvodi korisnika sa objave pri svakom kliku; koristiti popup ili odgovarajući nenametljiv tok.

## 6. Faza 4 — priprema Chrome Web Store izdanja

### Tehnička priprema

- Manifest V3, usklađene verzije package.json/manifesta i opciono `version_name` za beta oznaku.
- Minimalne dozvole: zadrži `activeTab`, `scripting`, `storage` samo ako ih paket stvarno koristi. Ako Store izdanje nema collector, ukloni neupotrebljene dozvole.
- Nemoj unapred tražiti `<all_urls>`, cookies, history, webRequest, debugger ili pristup svim budućim mrežama.
- Eventualne API host dozvole dodavati po stvarno implementiranoj mreži i po mogućnosti tražiti kada korisnik uključi tu mogućnost.
- Sav izvršivi kod i zavisnosti u lokalnom paketu. Bez udaljenog JavaScript-a, eval-a, novih Function konstrukcija iz preuzetog sadržaja ili preuzimanja modela/koda sa CDN-a.
- CSP prilagoditi stvarnom ponašanju. Ako kasnije dođe API uvoz, sadašnji `connect-src 'none'` neće moći ostati za te zahteve: dokumentovati konkretne domene i dozvole.
- Nema telemetrije u ovoj verziji. Otvaranje originalnih linkova je obična korisnička navigacija; razlikovati je od slanja analitičkih podataka na server.
- Jasno razdvojiti grešku, praznu listu, nepodržanu stranicu i neproveren layout.

### Paket za objavljivanje

Dodaj komandu `npm run package:store` ili ekvivalent koja:

1. Pokreće odgovarajuće testove/build.
2. Priprema čist `dist/extension/` sa samo potrebnim runtime fajlovima.
3. Pravi `release/botanalyzer-<version>-chrome.zip`.
4. Proverava da je **manifest.json direktno u korenu ZIP-a**, a ne ispod `bot-analyzer/` ili `dist/extension/`.
5. Proverava postojanje deklarisanih ikonica, skripti, HTML i lokalizacija; skenira paket za tajne i nepotrebne izvezene podatke.
6. Generiše SHA-256 i beleži verziju, commit ako postoji, i datum.

Prethodni `BotAnalyzer-v0.1.0.zip` je arhiva projekta i nije gotov Store upload paket.

### Materijali

Pripremi:

- PNG ikonice 16, 32, 48 i 128 px;
- predlog naziva: **BotAnalyzer — Comment Pattern Review**;
- kratak i duži opis na engleskom i srpskom, bez tvrdnji o garantovanom otkrivanju botova;
- 3–5 stvarnih screenshotova funkcionalnog UI-ja, preporučeno 1280×800; proveri važeće dimenzije pre upload-a;
- mali promo vizual 440×280;
- support URL, homepage URL, source repository URL i javni privacy policy URL, uz PLACEHOLDER dok korisnik ne odredi tačne adrese;
- `docs/store/REVIEWER-INSTRUCTIONS.md`: koraci testa, sintetički demo podaci, očekivani rezultati, podržane stranice i ograničenja.

Nemoj izmišljati završene screenshotove, javne URL-ove ili potvrdu Store pregleda. Demo screenshotovi koriste jasno označene sintetičke podatke i ne optužuju stvarne naloge. Runtime sadržaj demo slučaja mora biti isključen iz stvarnog izveštaja za slanje.

### Privacy i single purpose

Jedina svrha proizvoda: lokalno prikupljanje/uvoz, pregled obrazaca u društvenim komentarima i priprema korisnički proverene evidencije.

Pripremi `PRIVACY-POLICY.md` i verziju pogodnu za objavu kao statička HTTPS stranica. Objasni koji se podaci pristupaju, gde se obrađuju i čuvaju, izvoz, brisanje, privremenu kolekciju, odsustvo telemetrije i kontakt. Nemoj pisati „ne obrađujemo nikakve podatke“ jer aplikacija čita tekst, profile i slike. U Chrome Dashboard-u razlikuj lokalnu obradu od prenosa/skupljanja po definicijama formulara; popuni izjave prema stvarnom kodu i aktuelnim zahtevima, ne automatskim „No“ za sve.

Napravi `docs/store/PERMISSIONS.md` sa kratkim opravdanjem svake dozvole. Listing, privacy izjava i stvarni paket moraju se slagati. Otvoren kod nije zamena za te izjave.

### Koraci za vlasnika naloga

Napravi `docs/store/PUBLISHING-CHECKLIST-SR.md`:

1. Izabrati Google nalog/publisher i uključiti 2-Step Verification.
2. Registrovati Chrome Web Store developer nalog, platiti jednokratnu registraciju i potvrditi kontakt email. Iznos proveriti u Dashboard-u; ne navoditi neproverenu cenu.
3. Postaviti izvorni kod na GitHub pod MIT licencom i obezbediti javne HTTPS stranice za privacy/support. To je predlog distribucije projekta; GitHub nije obavezna Store platforma.
4. Izabrati Add new item i upload-ovati **Store ZIP**.
5. Popuniti listing, privacy, dozvole, distribuciju i instrukcije za proveru prema tadašnjem Dashboard-u.
6. Za početak koristiti Private beta za testere ili Unlisted beta za pristup preko linka. Unlisted nije privatno: svako sa linkom može doći do izdanja. Obe opcije i dalje podležu odgovarajućem Store pregledu.
7. Proveriti instalaciju iz prodavnice, migraciju podataka i nadogradnju. Unpacked i Store izdanje mogu imati različit extension ID i odvojeno skladište, pa obezbediti JSON prenos.
8. Posle uspešne beta provere prebaciti isti listing na Public kada je moguće, kako bi se sačuvao extension ID.
9. Za buduće nadogradnje povećati verziju i slati update postojećeg listinga. Ne praviti novi listing za svaku verziju.

Nemoj obećavati datum ili ishod Google pregleda. Pripremi sve fajlove lokalno; ne registruj nalog, ne plaćaj i ne šalji javnu objavu u okviru ovog razvojnog zadatka.

## 7. Faza 5 — provere i kriterijumi završetka

Core testovi moraju pokriti:

- postojeće TikTok ponašanje i novi Instagram adapter;
- spoofen domen, @mention pogrešno protumačen kao autor, autor objave pomešan sa komentatorom;
- duple unose, ista imena na različitim mrežama, Unicode i prazne komentare;
- originalni tekst naspram normalizovanog teksta;
- kratke generičke poruke, zajedničke slike, slabe signale;
- migraciju stare evidencije i rollback pri grešci;
- konkurentne upise, restart service worker-a, stari i novi capture batch;
- isključenje nepregledanih, odbačenih i demo nalaza iz prijave;
- nedostatak prostora, neuspešan upis i validaciju uvoza;
- bezbedan CSV izvoz i renderovanje korisničkog teksta.

Dodaj browser testove, npr. Playwright kao razvojnu zavisnost, za stvarni Manifest V3 paket i dashboard: instalacija, manual/JSON import, unos slike, analiza, ručni pregled, izvoz, reload, migracija i pristupačnost osnovnih kontrola. Collector testirati i na anonimizovanim HTML fixture-ima. Fixture nije dokaz rada na trenutnom TikTok/Instagram sajtu.

Pre tvrdnje „podržava Instagram komentare“ uradi ručni acceptance test na stvarnoj dozvoljenoj post i Reel stranici u korisnikovom Chrome-u. Zabeleži datum, browser verziju i podržani layout. Ako to nije moguće, dovrši ručni Instagram adapter i označi collector kao neproveren. Ne izmišljaj rezultate.

Kriterijumi za Store-ready paket:

- korisnik može instalirati i koristiti ekstenziju bez Node-a, terminala ili API ključa za ručni tok;
- podržane funkcije rade na čistoj instalaciji i nadogradnji;
- nijedan korisnički podatak se ne šalje neobjavljenom servisu;
- nema neobjašnjivih dozvola ili reklamiranih budućih funkcija;
- svi neprovereni/platformski nerešeni collector-i su isključeni iz Store izdanja i opisa;
- build je ponovljiv, ZIP ima pravilan koren, sve ikone/linkovi su validni;
- stvarni screenshotovi i privacy/support stranice su spremni ili jasno označeni kao vlasnikovi preostali koraci;
- izveštaj o testovima razlikuje automatizovane, browser i stvarne platform testove.

## 8. Očekivani rezultat Cursor rada

Implementiraj faze redom uz kratke statusne izveštaje. Ne ostavljaj lažna dugmad ili TODO funkcije predstavljene kao završene.

Na kraju isporuči:

1. izmenjen izvorni kod i migraciju;
2. testove i stvarne rezultate izvršavanja;
3. čist `dist/extension` i Store ZIP;
4. ažuriran README, changelog i dokumente pomenute u planu;
5. listu podržanih funkcija i poznatih ograničenja;
6. precizne komande za pokretanje/build i putanju do paketa;
7. kratku listu vlasnikovih koraka: nalog, kontakt, URL-ovi, plaćanje, stvarna platform provera i slanje na review.

Ne prepisuj README tvrdnjom da je ekstenzija objavljena ili odobrena dok to nije stvarno potvrđeno.

## 9. Zvanični izvori za proveru

Provereni za ovaj plan 1.10.2026. Ponovo proveriti pre Store slanja. Granice pristupa, UI Dashboard-a i cene mogu se menjati.

- Instagram Platform overview: https://developers.facebook.com/documentation/instagram-platform/overview
- Instagram API with Instagram Login: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
- Instagram comment moderation: https://developers.facebook.com/documentation/instagram-platform/comment-moderation
- YouTube comment threads: https://developers.google.com/youtube/v3/docs/commentThreads
- YouTube comments list: https://developers.google.com/youtube/v3/docs/comments/list
- Bluesky public API: https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed
- Mastodon statuses/context: https://docs.joinmastodon.org/methods/statuses/
- Reddit developer terms: https://redditinc.com/policies/developer-terms
- X API pricing: https://docs.x.com/x-api/getting-started/pricing
- Chrome developer registration: https://developer.chrome.com/docs/webstore/register/
- Chrome account setup: https://developer.chrome.com/docs/webstore/set-up-account
- Chrome 2-Step Verification: https://developer.chrome.com/docs/webstore/program-policies/two-step-verification
- Chrome publishing: https://developer.chrome.com/docs/webstore/publish
- Chrome distribution: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- Chrome privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/
- Chrome policy: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome Developer Agreement: https://developer.chrome.com/docs/webstore/program-policies/terms
- Chrome listing images: https://developer.chrome.com/docs/webstore/images
- Chrome listing guidance: https://developer.chrome.com/docs/webstore/best-listing
- Manifest root: https://developer.chrome.com/docs/extensions/get-started
