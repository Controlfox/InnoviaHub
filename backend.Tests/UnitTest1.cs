using System;
using System.Threading;
using System.Threading.Tasks;
using backend.Controllers;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests
{
    public class UnitTest1
    {
        private AppDbContext CreateDb()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task AiProfile_CanBeSaved_AndFetched()
        {
            using var db = CreateDb();
            var controller = new AiProfileController(db);
            var userId = Guid.NewGuid();

            var dto = new AiProfileController.AiProfileDto(
                UserId: userId,
                AssistantName: "TestBot",
                Tone: "neutral",
                Style: "short",
                Emoji: 1
            );

            await controller.Upsert(userId, dto, CancellationToken.None);
            var result = await controller.Get(userId, CancellationToken.None);

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var data = Assert.IsType<AiProfileController.AiProfileDto>(ok.Value);

            Assert.Equal("TestBot", data.AssistantName);
        }

        [Fact]
        public void MapEmoji_ReturnsExpectedText()
        {
            var method = typeof(ChatController)
                .GetMethod("MapEmoji", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
            Assert.NotNull(method);

            var result = (string?)method!.Invoke(null, new object[] { 2 });

            Assert.Equal("lagom med emojis", result);
        }

        [Fact]
        public async Task BookingFacts_ReturnsText_WhenNoBookings()
        {
            using var db = CreateDb();
            var httpFactory = new DummyHttpClientFactory();
            var chat = new ChatController(httpFactory, db);

            var date = DateTime.Today;
            var method = typeof(ChatController)
                .GetMethod("BuildBookingFactsForDate", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.NotNull(method);

            var task = (Task<string>)method!.Invoke(chat, new object[] { date })!;
            var result = await task;

            Assert.Contains("Inga bokningar hittades", result);
        }

        private class DummyHttpClientFactory : IHttpClientFactory
        {
            public HttpClient CreateClient(string name) => new HttpClient();
        }
    }
}
