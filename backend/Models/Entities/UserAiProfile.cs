
using System;
namespace backend.Models;

public class UserAiProfile
{
    public Guid UserId { get; set; }
    public string? AssistantName { get; set; }
    public string Tone { get; set; } = "neutral";
    public string Style { get; set; } = "concise";
    public int Emoji {get; set;} = 0;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
