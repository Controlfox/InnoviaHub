using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    public AiProfileController(AppDbContext db) => _db = db;

    public record AiProfileDto(Guid UserId, string? AssistantName, string Tone, string Style, int Emoji);

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<AiProfileDto>> Get(Guid userId, CancellationToken ct)
    {
            try
    {
        var p = await _db.UserAiProfiles.FindAsync([userId], ct);
        if (p is null)
            return Ok(new AiProfileDto(userId, null, "neutral", "concise", 0));

        return Ok(new AiProfileDto(p.UserId, p.AssistantName, p.Tone, p.Style, p.Emoji));
    }
    catch (Exception ex)
    {
        Console.WriteLine($" Error in AiProfileController.Get: {ex}");
        return StatusCode(500, "Internal server error in Get profile");
    }

    }

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<AiProfileDto>> Upsert(Guid userId, [FromBody] AiProfileDto dto, CancellationToken ct)
    {
        if (dto.UserId != userId) return BadRequest("UserId mismatch");

        var existing = await _db.UserAiProfiles.FindAsync([userId], ct);
        if (existing is null)
        {
            existing = new UserAiProfile
            {
                UserId = userId,
                AssistantName = dto.AssistantName,
                Tone = string.IsNullOrWhiteSpace(dto.Tone) ? "neutral" : dto.Tone,
                Style = string.IsNullOrWhiteSpace(dto.Style) ? "concise" : dto.Style,
                Emoji = Math.Clamp(dto.Emoji, 0, 3),
                UpdatedAt = DateTime.UtcNow
            };
            _db.UserAiProfiles.Add(existing);
        }
        else
        {
            existing.AssistantName = dto.AssistantName;
            existing.Tone = string.IsNullOrWhiteSpace(dto.Tone) ? "neutral" : dto.Tone;
            existing.Style = string.IsNullOrWhiteSpace(dto.Style) ? "concise" : dto.Style;
            existing.Emoji = Math.Clamp(dto.Emoji, 0, 3);
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new AiProfileDto(existing.UserId, existing.AssistantName, existing.Tone, existing.Style, existing.Emoji));
    }
}
