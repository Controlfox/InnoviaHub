using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using backend.Models;
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

        // Ta emot fråga och userId (POST /api/chat) – kvar som icke-stream fallback
        public record ChatRequest(string question, Guid? userId);

        [HttpGet("ping")]
        public IActionResult Ping() => Ok("chat alive");

        /// <summary>Classic non-stream path (fallback / kompatibilitet).</summary>
        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            // 1) Profil
            var profile = request.userId.HasValue
                ? await _dbContext.UserAiProfiles.FindAsync([request.userId.Value])
                : null;

            // 2) Bokningsfakta (försök plocka datum)
            var date = TryExtractDate(request.question);
            var facts = date.HasValue
                ? await BuildBookingFactsForDate(date.Value)
                : "Kunde inte tolka datumet i frågan. Ingen bokningsdata hämtades.";

            // 3) Prompt
            var systemPrompt = BuildSystemPrompt(profile, facts);

            // 4) Skicka till OpenAI (icke-stream)
            var http = _httpClientFactory.CreateClient("openai");
            var body = new
            {
                model = "gpt-4.1",
                input = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user",   content = request.question }
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
            var answer = root.GetProperty("output")[0]
                             .GetProperty("content")[0]
                             .GetProperty("text")
                             .GetString() ?? "Inget svar";

            return Ok(answer);
        }

        /// <summary>
        /// STREAM: GET /api/chat/stream?q=...&userId=...
        /// Returnerar Server-Sent Events (text/event-stream) och proxar OpenAI:s SSE rad för rad.
        /// </summary>
        [HttpGet("stream")]
        public async Task Stream([FromQuery] string q, [FromQuery] Guid? userId, CancellationToken ct)
        {
            // SSE headers (Append istället för Add för att undvika ASP0019)
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");
            Response.Headers.Append("X-Accel-Buffering", "no");

            await Response.Body.FlushAsync(ct);

            try
            {
                // Profil
                var profile = userId.HasValue
                    ? await _dbContext.UserAiProfiles.FindAsync([userId.Value], ct)
                    : null;

                // Bokningsfakta
                var date = TryExtractDate(q);
                var facts = date.HasValue
                    ? await BuildBookingFactsForDate(date.Value)
                    : "Kunde inte tolka datumet i frågan. Ingen bokningsdata hämtades.";

                var systemPrompt = BuildSystemPrompt(profile, facts);

                var http = _httpClientFactory.CreateClient("openai");
                var reqBody = new
                {
                    model = "gpt-4.1",
                    stream = true,
                    input = new object[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user",   content = q }
                    }
                };

                using var msg = new HttpRequestMessage(HttpMethod.Post, "responses")
                {
                    Content = new StringContent(JsonSerializer.Serialize(reqBody), Encoding.UTF8, "application/json")
                };

                // ResponseHeadersRead: börja streama direkt
                using var resp = await http.SendAsync(msg, HttpCompletionOption.ResponseHeadersRead, ct);

                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    await WriteSseEvent("error", err, ct);
                    return;
                }

                using var stream = await resp.Content.ReadAsStreamAsync(ct);
                using var reader = new StreamReader(stream);

                string? line;
                while ((line = await reader.ReadLineAsync()) is not null && !ct.IsCancellationRequested)
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    // OpenAI SSE-rader: "data: {json}" och ibland ":"-kommentarer
                    if (!line.StartsWith("data: "))
                        continue;

                    var payload = line["data: ".Length..].Trim();

                    // 1) Skicka vidare till klienten (frontend parsar och bygger texten)
                    await WriteSseData(payload, ct);

                    // 2) Avsluta när Responses API signalerar klart
                    try
                    {
                        using var jd = JsonDocument.Parse(payload);
                        if (jd.RootElement.TryGetProperty("type", out var tProp))
                        {
                            var t = tProp.GetString();
                            if (t == "response.completed")
                            {
                                await WriteSseEvent("done", "[DONE]", ct);
                                break;
                            }
                            if (t == "response.error")
                            {
                                await WriteSseEvent("error", payload, ct);
                                break;
                            }
                        }
                    }
                    catch
                    {
                        // Ignorera JSON-parse fel på enstaka rader
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // klienten stängde anslutningen
            }
            catch (Exception ex)
            {
                await WriteSseEvent("error", ex.Message, ct);
            }
        }

        // ---------- SSE helpers ----------

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

        // ---------- Domän-helpers ----------

        private static string BuildSystemPrompt(UserAiProfile? profile, string facts)
        {
            var name      = profile?.AssistantName ?? "Receptionisten";
            var tone      = profile?.Tone ?? "neutral";
            var style     = profile?.Style ?? "concise";
            var emojiText = MapEmoji(profile?.Emoji ?? 0);

            return $@"Du är {name}, AI-receptionist för kontorshotellet InnoviaHub.
            Ton: {tone}. Stil: {style}. Du använder {emojiText}. Svara på svenska.
            Du är konsekvent med valt namn, ton och stil.

            Här är information du alltid har tillgång till:
            Öppettider: 08:00–18:00
            Pris för drop-in skrivbord: 200 kr/dag eller 3500 kr/månad
            Pris för mötesrum: 400 kr/dag eller 4000 kr/månad
            Pris för AI-server: 600 kr/dag (inget månadsabonnemang)
            Pris för VR-headset: 500 kr/dag eller 5000 kr/månad

            Du kan inte boka åt en användare, bara ge information om resurserna.
            Du svarar ENDAST på frågor som är relaterade till InnoviaHub.

            Här är information om resurser och bokningar:
            {facts}

            Om användaren frågar om tillgänglighet, använd denna information för att svara korrekt.
            Om du inte hittar relevant info, tipsa om att kontakta en admin för mer detaljer.";
        }

        private static string MapEmoji(int level) => level switch
        {
            <= 0 => "inga emojis",
            1    => "några emojis",
            2    => "lagom med emojis",
            >= 3 => "många emojis"
        };

        private DateTime? TryExtractDate(string? question)
        {
            var q = question ?? string.Empty;

            var patterns = new[]
            {
                @"(\d{4})-(\d{2})-(\d{2})",       // yyyy-mm-dd
                @"(\d{1,2})/(\d{1,2})/(\d{4})",   // dd/mm/yyyy
                @"(\d{1,2})[^\d]*(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)"
            };

            foreach (var pat in patterns)
            {
                var m = Regex.Match(q, pat, RegexOptions.IgnoreCase);
                if (!m.Success) continue;

                try
                {
                    if (pat.Contains("yyyy-mm-dd"))
                        return new DateTime(int.Parse(m.Groups[1].Value), int.Parse(m.Groups[2].Value), int.Parse(m.Groups[3].Value));
                    if (pat.Contains("dd/mm/yyyy"))
                        return new DateTime(int.Parse(m.Groups[3].Value), int.Parse(m.Groups[2].Value), int.Parse(m.Groups[1].Value));
                    if (m.Groups.Count >= 3)
                    {
                        var day       = int.Parse(m.Groups[1].Value);
                        var monthName = m.Groups[2].Value.ToLowerInvariant();
                        var month     = MonthNameToInt(monthName);
                        var year      = DateTime.UtcNow.Year;
                        return new DateTime(year, month, day);
                    }
                }
                catch
                {
                    // Ignorera parse-fel och testa nästa mönster
                }
            }

            return null;
        }

        private static int MonthNameToInt(string name) => name switch
        {
            "januari" => 1,  "februari" => 2, "mars" => 3,     "april" => 4,
            "maj"     => 5,  "juni"     => 6, "juli" => 7,     "augusti" => 8,
            "september" => 9,"oktober"  => 10,"november" => 11,"december" => 12,
            _ => DateTime.UtcNow.Month
        };

        private async Task<string> BuildBookingFactsForDate(DateTime date)
        {
            var day = date.Date;

            var bookings = await _dbContext.Bookings
                .Where(b => b.StartTime.Date == day)
                .OrderBy(b => b.StartTime)
                .ToListAsync();

            if (bookings.Count == 0)
                return $"Inga bokningar hittades för {day:yyyy-MM-dd}. Alla resurser verkar lediga.";

            var grouped = bookings
                .GroupBy(b => b.ResourceId)
                .Select(g => $"ResourceId {g.Key}: {g.Count()} bokningar");

            return $"Bokningar för {day:yyyy-MM-dd}: {string.Join(", ", grouped)}";
        }
    }
}
