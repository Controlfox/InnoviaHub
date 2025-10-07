// Models/UserAiProfile.cs
using System;
namespace backend.Models;

public class UserAiProfile
{
    public Guid UserId { get; set; }          // PK = Azure AD oid
    public string? AssistantName { get; set; } // t.ex. "Anna"
    public string Tone { get; set; } = "neutral"; // "friendly" | "neutral" | "irritated" etc.
    public string Style { get; set; } = "concise"; // "concise" | "detailed"
    public int Emoji {get; set;} = 0;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
