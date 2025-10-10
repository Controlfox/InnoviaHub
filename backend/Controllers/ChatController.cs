using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _dbContext;

        public ChatController(IHttpClientFactory httpClientFactory, AppDbContext dbContext)
        {
            _httpClientFactory = httpClientFactory;
            _dbContext = dbContext;
        }

        //Ta emot fråga och userId (POST /api/chat) – behåll som icke-stream fallback
        public record ChatRequest(string question, Guid? userId);

        [HttpGet("ping")]
        public IActionResult Ping() => Ok("chat alive");

        /// <summary>
        /// Klassisk icke-streamad variant (behålls för kompatibilitet)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            //Hämta profil
            var profile = request.userId.HasValue
                ? await _dbContext.UserAiProfiles.FindAsync([request.userId.Value])
                : null;

            var name = profile?.AssistantName ?? "Receptionisten";
            var tone = profile?.Tone ?? "neutral";
            var style = profile?.Style ?? "concise";
            var emojiText = MapEmoji(profile?.Emoji ?? 0);

            //hämta bokningsinfo
            var date = TryExtractDate(request.question);
            string facts = date.HasValue
                ? await BuildBookingFactsForDate(date.Value)
                : "Kunde inte tolka datumet i frågan. Ingen bokningsdata hämtades";

            //Bygger prompten
            var systemPrompt = $@"Du är {name}, AI-receptionist för kontorshotellet InnoviaHub. Din ton är {tone}. Din svarsstil är {style}. Du använder {emojiText}. Svara på svenska. Du är konsekvent med valt namn, ton och stil.
            
Här är information du alltid har tillgång till:
Öpptettider: Varje dag mellan 08:00-18:00
Pris för drop-in skrivbord: 200kr/dag eller 3500kr/månad
Pris för Mötesrum: 400kr/dag eller 4000kr/månad
Pris för AI-server: 600kr/dag, inget månadsabonnemang
Pris för VR-headset: 500kr/dag eller 5000kr/månad
Du kan inte boka åt en användare, bara ge information om resurserna.
Du svarar ENDAST på frågor som är relaterade till kontorshotellet InnoviaHub.
Här är information om resurser och bokningar:
{facts}

Om användaren frågar om tillgänglighet, använd denna information för att svara korrekt.
Om du inte hittar relevant info, säg att de kan kontakta en admin för mer detaljer.";

            //Skicka till OpenAI (icke-stream)
            var http = _httpClientFactory.CreateClient("openai");
            var body = new
            {
                model = "gpt-4.1",
                input = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = request.question },
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await http.PostAsync("responses", content);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"❌ OpenAI error: {(int)response.StatusCode} {response.StatusCode}");
                Console.WriteLine(raw);

                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    return StatusCode(502, "OpenAI-nyckel saknas eller ogiltig (401 från OpenAI).");

                if ((int)response.StatusCode == 429)
                    return StatusCode(503, "OpenAI rate limit (429). Försök igen strax.");

                return StatusCode(502, "Kunde inte nå språkmodellen just nu.");
            }

            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            string answer = root.GetProperty("output")[0]
                .GetProperty("content")[0].GetProperty("text").GetString() ?? "Inget svar";

            return Ok(answer);
        }

[HttpGet("stream")]
public async Task Stream([FromQuery] string q, [FromQuery] Guid? userId, CancellationToken ct)
{
    // SSE headers
    Response.StatusCode = StatusCodes.Status200OK;
    Response.Headers["Content-Type"] = "text/event-stream";
    Response.Headers["Cache-Control"] = "no-cache";
    Response.Headers["Connection"] = "keep-alive";
    Response.Headers["X-Accel-Buffering"] = "no"; // nginx-friendly
    await Response.Body.FlushAsync(ct);

    try
    {
        var profile = userId.HasValue
            ? await _dbContext.UserAiProfiles.FindAsync([userId.Value], ct)
            : null;

        var name  = profile?.AssistantName ?? "Receptionisten";
        var tone  = profile?.Tone ?? "neutral";
        var style = profile?.Style ?? "concise";
        var emojiText = MapEmoji(profile?.Emoji ?? 0);

        var date = TryExtractDate(q);
        string facts = date.HasValue
            ? await BuildBookingFactsForDate(date.Value)
            : "Kunde inte tolka datumet i frågan. Ingen bokningsdata hämtades";

        var systemPrompt = $@"Du är {name}, AI-receptionist för kontorshotellet InnoviaHub. Ton: {tone}. Stil: {style}. Du använder {emojiText}. Svara på svenska.
Öpptettider: 08:00–18:00
Pris: Skrivbord 200/dag | Mötesrum 400/dag | AI-server 600/dag | VR 500/dag
Du kan inte boka åt användaren. Svara endast på InnoviaHub-relaterade frågor.
Bokningsfakta:
{facts}";

        var http = _httpClientFactory.CreateClient("openai");

        var reqBody = new
        {
            model  = "gpt-4.1",
            stream = true, // 👈 viktigt
            input  = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user",   content = q }
            }
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "responses")
        {
            Content = new StringContent(JsonSerializer.Serialize(reqBody), Encoding.UTF8, "application/json")
        };
        // För säkerhets skull: tala om att vi vill ha SSE tillbaka
        msg.Headers.Accept.Clear();
        msg.Headers.Accept.ParseAdd("text/event-stream");

        // 👇 Viktigt för att börja läsa direkt
        using var resp = await http.SendAsync(msg, HttpCompletionOption.ResponseHeadersRead, ct);

        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync(ct);
            await WriteSseEvent("error", err, ct);
            return;
        }

        // proxy:a OpenAI:s SSE rad för rad
        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        string? line;
        while ((line = await reader.ReadLineAsync()) is not null && !ct.IsCancellationRequested)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            // OpenAI skickar "event: <name>" och "data: {...}"-rader.
            // Vi forwardar *minst* data-raderna. (EventSource triggar .onmessage på "data:")
            if (line.StartsWith("event:"))
            {
                // Forwarda eventnamn till klienten så den även kan lyssna på "done" m.m.
                await Response.WriteAsync(line + "\n", ct);
            }
            else if (line.StartsWith("data: "))
            {
                var payload = line.Substring("data: ".Length).Trim();

                if (payload == "[DONE]")
                {
                    await WriteSseEvent("done", "[DONE]", ct);
                    break;
                }

                // Skicka vidare payloaden rakt av
                await WriteSseData(payload, ct);
            }
            // Skicka tomrad mellan events
            if (line.Length == 0)
            {
                await Response.WriteAsync("\n", ct);
            }

            await Response.Body.FlushAsync(ct);
        }
    }
    catch (OperationCanceledException)
    {
        // klienten stängde
    }
    catch (Exception ex)
    {
        await WriteSseEvent("error", ex.Message, ct);
    }
}

private async Task WriteSseData(string jsonData, CancellationToken ct)
{
    await Response.WriteAsync($"data: {jsonData}\n\n", ct);
    await Response.Body.FlushAsync(ct);
}

private async Task WriteSseEvent(string eventName, string data, CancellationToken ct)
{
    await Response.WriteAsync($"event: {eventName}\n", ct);
    await Response.WriteAsync($"data: {data}\n\n", ct);
    await Response.Body.FlushAsync(ct);
}


        // ==================== HELPERS ====================

        private static string MapEmoji(int level) => level switch
        {
            <= 0 => "inga emojis",
            1 => "några emojis",
            2 => "lagom med emojis",
            >= 3 => "många emojis"
        };

        private DateTime? TryExtractDate(string question)
        {
            var patterns = new[]
            {
                @"(\d{4})-(\d{2})-(\d{2})",       // yyyy-mm-dd
                @"(\d{1,2})/(\d{1,2})/(\d{4})",   // dd/mm/yyyy
                @"(\d{1,2})[^\d]*(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)"
            };

            foreach (var pat in patterns)
            {
                var m = Regex.Match(question ?? "", pat, RegexOptions.IgnoreCase);
                if (m.Success)
                {
                    try
                    {
                        if (pat.Contains("yyyy-mm-dd"))
                            return new DateTime(int.Parse(m.Groups[1].Value), int.Parse(m.Groups[2].Value), int.Parse(m.Groups[3].Value));
                        if (pat.Contains("dd/mm/yyyy"))
                            return new DateTime(int.Parse(m.Groups[3].Value), int.Parse(m.Groups[2].Value), int.Parse(m.Groups[1].Value));
                        if (m.Groups.Count >= 3)
                        {
                            var day = int.Parse(m.Groups[1].Value);
                            var monthName = m.Groups[2].Value.ToLower();
                            var month = MonthNameToInt(monthName);
                            var year = DateTime.UtcNow.Year;
                            return new DateTime(year, month, day);
                        }
                    }
                    catch { }
                }
            }
            return null;
        }

        private int MonthNameToInt(string name) =>
            name switch
            {
                "januari" => 1,
                "februari" => 2,
                "mars" => 3,
                "april" => 4,
                "maj" => 5,
                "juni" => 6,
                "juli" => 7,
                "augusti" => 8,
                "september" => 9,
                "oktober" => 10,
                "november" => 11,
                "december" => 12,
                _ => DateTime.UtcNow.Month
            };

        private async Task<string> BuildBookingFactsForDate(DateTime date)
        {
            var bookings = await _dbContext.Bookings
                .Where(b => b.StartTime.Date == date.Date)
                .OrderBy(b => b.StartTime)
                .ToListAsync();

            if (!bookings.Any())
                return $"Inga bokningar hittades för {date:yyyy-MM-dd}. Alla resurser verkar lediga.";

            var grouped = bookings
                .GroupBy(b => b.ResourceId)
                .Select(g => $"ResourceId {g.Key}: {g.Count()} bokningar");

            return $"Bokningar för {date:yyyy-MM-dd}: {string.Join(", ", grouped)}";
        }
    }
}
