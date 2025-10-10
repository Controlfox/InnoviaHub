## Enhetstester

Jag har skrivit tre enhetstester där målet är att säkra så att allt fungerar som det ska:

1. **`AiProfile_CanBeSaved_AndFetched`**  
   Testar att användarens AI-profil kan sparas och sedan hämtas rätt från databasen.  
   Det är viktigt för att profilen promtar hur receptionisten ska bete sig och om den inte sparas på rätt sätt skulle användarens profilinställningar försvinna.

2. **`MapEmoji_ReturnsExpectedText`**  
   Testar att metoden som översätter emoji-nivåer till text fungerar som den ska.  
   Har lite med AI-profilen att göra, men efter en timme av felsökning för att emoji-nivån inte uppdaterades så kändes den här viktig.

3. **`BookingFacts_ReturnsText_WhenNoBookings`**  
   Testar att systemet hanterar tomma bokningslistor korrekt och ger ett svar när inga bokningar finns.  
   Detta är viktigt för att receptionisten inte ska ge förvirrande svar till användaren vid frågor om tillgänglighet.

Tillsammans täcker testerna både databaslogik, hjälpfunktioner och hur AIn visar information.

---

## Vidareutveckling

Jag har försökt bygga projektet så att det är enkelt att bygga vidare på.  
Varje del av systemet t.ex `ChatController`, `AiProfileController` och `ResourceController` – är separerade och har tydliga ansvarsområden.  
Det gör det lätt att lägga till nya funktioner utan att påverka tidigare logik.

---

## Säkerhet

Hemliga nycklar som OpenAI-nyckeln och databaslösenord hanteras aldrig direkt i koden.  
Istället används en .env-fil som laddas av servern i produktion, och filen delas inte till github.
På servern (Azure) ligger nycklarna som miljövariabler i systemd-servicen, vilket gör att appen kan läsa dom vid uppstart men att dom inte syns i källkoden eller i byggstegen.

Det minimerar risken att känsliga uppgifter sprids eller checkas in av misstag, och gör det säkert att deploya automatiskt via GitHub Actions.
