## Ändringar som gjorts

# DeviceRegistry.Api

- Lagt till cors-policy för att kunna läsa APIet från min app.
- Lagt till Get för specifik tenant och alla tenants för att kunna pusha alerts till rätt signalR grupp.

# Edge.Simulator

- Skapat variabel för min tenant slug och lista för mina devices för att loopa igenom och skicka mätdata till varje device
  och koppla dom till min tenant.

# Portal.Adapter

- Fixat så att Get tar emot Guid och inte string för att minska konflikter.

# RealTime.Hub

- Lagt till cors-policy för kontakt med min app.
- Skapat PublishAlert för RealTimeAlert. För att ta emot och skicka alert.

# DeviceRegistryClient

- Skapat en klient för att hämta tenant via slug för att översätta mellan hubben och rules.engine utan att behöva hårdkoda slug.

# Rules.Engine

- builder service för att slå upp tenant slug i deviceRegistry.
- Lagt till registry i RulesWorker för att kalla på GetTenantSlug
- Lagt till tenantSlug i alert för att skicka alert till rätt grupp.

# Sensor-page

- Kopplar signalR och joinTenant så appen börjar ta emot measurementRecieved och alertRaised från Realtime hubben.
- Prenumererar på mätningar för att uppdatera värdet och tid.
- Prenumererar på alerts för att ta emot larm från rules.engine och lägger dom per enhet.
- Hämtar devices från APIet.

## VG

- Skapa regel: Skapat temperatur regel för DEV-07
- Utvärdering: RulesWorker tar senaste värdet och jämför
- Alert: Vid uppfylld regel skapas AlertRow och PublishAlert med tenant slug till hubben
- Integrering: Appen är ansluten till realtime hubben och lyssnar på alertRaised och visar varningen
