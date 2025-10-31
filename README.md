# InnoviaHub

InnoviaHub är en webbapplikation för bokning och hantering av resurser inom företag.
Appen är byggd med fokus på enkelhet, säkerthet och realtidsuppdateringar. Det är även
integrerat med Entra ID för säker autentisering.

## Vad är InnoviaHub?

InnoviaHub är en webbapplikation där användare kan:

- Logga in säkert med Microsoft-konto
- Boka rum, utrustning och andra resurser
- Se och hantera sina egna bokningar
- Se tillgängliga tider
- Få information om resurser i realtid
- Chatta med AI-Receptionisten

## Teknik

**Frontend (Webbsida):**

- Angular 19
- TypeScript
- Azure Entra ID för inloggning
- Tailwind CSS
- DigitalOcean

**Backend (Server):**

- .NET 9.0
- ASP.NET Core API
- Entity Framework
- Azure

## Kom igång

### Snabbstart

Om du inte vill installera applikationen själv finns produktionsmiljön tillgänglig på https://innoviahub-app-v4x7o.ondigitalocean.app/.

Om backend inte är tillgängligt visas meddelanden. Det går fortfarande att navigera och testa gränssnittet.

### Entra ID

För att logga in, oavsett om det är lokalt eller i produktionsmiljön, behöver du bli tillagd i Innovia Hubs Entra ID-katalog. Kontakta någon i teamet för att bli tillagd.

### Vad du behöver installerat

- Node.js (version 18 eller senare)
- .NET 9.0 SDK
- Git

### Starta projektet

1. **Klona projektet:**

   ```bash
   git clone https://github.com/Controlfox/InnoviaHub.git
   cd InnoviaHub
   ```

2. **Starta backend (API):**

   ```bash
   cd backend
   dotnet run
   ```

   Servern startar på: <http://localhost:5184>

3. **Starta frontend (webbsida):**

   ```bash
   cd frontend
   npm install
   ng serve
   ```

   Webbsidan öppnas på: <http://localhost:4200>

## Hur man använder systemet

1. **Öppna webbläsaren** och gå till <http://localhost:4200>
2. **Klicka "Login with Microsoft"** för att logga in
3. **Bokning** Visa och boka lediga resurser
4. **Profil** Visa och hantera dina bokningar. Välj personlighet för receptionist.
5. **Receptionisten** Chatta med InnoviaHubs egna AI-receptionist
6. **Admin** Hantera resurser och bokningar
7. **Sensorer** Se live-data från sensorerna i byggnaden.

## Utveckling

### Mappar

- `backend/` - Server-kod (.NET)
- `frontend/` - Webbsida-kod (Angular)
- `README.md` - Den här filen

### Brancher

- `main` - Huvudbranch (stabil kod)
- `dev` - Utvecklingsbranch

### Testning

Det finns en debug-sida på <http://localhost:4200/azure-debug> för att testa Azure-inloggning.

## Problem?

Om något inte fungerar:

1. Kontrollera att Node.js och .NET är installerat
2. Kör `npm install` i frontend-mappen
3. Kör `dotnet restore` i backend-mappen
4. Starta om både frontend och backend

## Bidra till projektet

1. Skapa en ny branch: `git checkout -b min-nya-feature`
2. Gör dina ändringar
3. Committa: `git commit -m "Lägg till min nya feature"`
4. Pusha: `git push origin min-nya-feature`
5. Skapa en Pull Request

## Funktioner jag själv vidareutvecklat efter uppdelning

- Skapat sensor och resursvyer
- Implementerat realtidsuppdatering via SignalR för mätvärden och varningar på sensorer
- Lagt till felhantering så att systemet visar tydliga meddelanden om servern inte nås
- Implementerat openai för AI-receptionisten och skapat UI för personlighets-val och chatt

---

**Skapad av InnoviaHub-teamet** 🚀
Utvecklad och vidareutvecklad av Tintin Larsson(Controlfox)
