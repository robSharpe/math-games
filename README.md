# Mattedyket 🐠

Ett mattespel under havet för barn. Fisken Bubbel guidar barnet genom dyk med tio blandade uppgifter. Varje rätt svar ger en pärla, och pärlorna låser upp nya havsvänner i akvariet.

## Två lägen

| | Lilla dyket – 6 år | Stora dyket – 9 år |
|---|---|---|
| Svar | Tre stora svarsknappar | Sifferknappar på skärmen (eller tangentbordet) och flerval |
| Områden | Räkna, plus, minus, fem- och tiokompisar, störst/minst, talföljder, former, mönster | Addition, subtraktion, multiplikation, division, saknade tal, positionssystemet, större/mindre, talföljder, klockan, bråk, textuppgifter |
| Uppläsning | På från början | Av från början (knappen finns alltid) |

Uppgifterna följer svenska skolkonventioner: `·` för gånger, `/` för delat med och klockan läses som "halv fyra", "kvart i fem" och "fem i halv tre".

## Så fungerar spelet

- **Blandat:** varje dyk tar med alla valda områden innan något upprepas, och aldrig samma område två gånger i rad.
- **Anpassar sig:** varje område har fem nivåer. Tre rätt i rad på första försöket ger nästa nivå. Fel svar sänker nivån lite.
- **Snällt vid fel:** första felet ger en ledtråd och tar bort det felaktiga alternativet. Andra felet visar rätt svar med en förklaring. Ingen tidtagning.
- **Uppläsning:** högtalarknappen (eller ett tryck på fisken) läser frågan med enhetens svenska röst. Den fungerar utan internet på iPad, iPhone och de flesta Android-enheter.
- **För vuxna (kugghjulet):** ljud, uppläsning, vilka områden som ska övas, nivå och andel rätt per område, samt nollställning.

All data sparas lokalt på enheten. Inget skickas någonstans.

## Spela offline

**Som app (rekommenderas för surfplatta och mobil)**
1. Lägg upp mappen på en webbserver, till exempel GitHub Pages: *Settings → Pages → Deploy from a branch → main / (root)*.
2. Öppna sidan en gång med internet.
   - iPad/iPhone: Safari → Dela → *Lägg till på hemskärmen*.
   - Android: Chrome → ⋮ → *Installera app*.
3. Klart. Spelet startar från hemskärmen och fungerar helt utan internet.

**Som fil**
Kopiera `index.html` till enheten och öppna den i webbläsaren. Allt (grafik, typsnitt, ljud och kod) finns i den filen.

## Utveckling

Källkoden ligger i `src/`. `index.html` och `sw.js` byggs från den:

```sh
npm run build   # bygger index.html (en fil med allt) och sw.js
npm test        # testar att alla uppgiftstyper ger korrekta svar och giltiga alternativ
npm start       # lokal server på http://localhost:8080
npm run icons   # ritar om PNG-ikonerna från icons/icon.svg (kräver Playwright)
```

| Fil | Innehåll |
|---|---|
| `src/questions.js` | Uppgiftsgeneratorerna för båda lägena |
| `src/game.js` | Spelet: skärmar, svar, belöningar, uppläsning, ljud |
| `src/styles.css` | Utseendet |
| `src/index.html` | Sidans uppbyggnad |
| `src/sw.js` | Service worker för offlineläget |

Bygg om efter varje ändring i `src/` så att `index.html` och cacheversionen i `sw.js` uppdateras.

Typsnittet Fredoka används under SIL Open Font License (`src/fonts/OFL.txt`).
