using backend.Hubs;
using backend.Models;
using backend.Models.Interfaces;
using backend.Models.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using System.Net.Http.Headers;
using DotNetEnv;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (File.Exists(envPath))
{
    // Ladda nycklar från .env som processmiljövariabler
    Env.Load(envPath);
}

// Joel's ändringar för rätt userinfo - Azure AD Authentication för att få riktiga användar-ID och namn
// Add Azure AD Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
// Add Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => 
        policy.RequireRole("Admin"));
    options.AddPolicy("UserOrAdmin", policy => 
        policy.RequireRole("User", "Admin"));
    options.AddPolicy("AuthenticatedUser", policy => 
        policy.RequireAuthenticatedUser());
});
// Add services to the container.

builder.Services.AddControllers();
DotNetEnv.Env.Load();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddHttpClient("openai", client => {
   client.BaseAddress = new Uri("https://api.openai.com/v1/");
   var apiKey =
        builder.Configuration["OPENAI_API_KEY"] // om du även lägger i AppSettings eller KeyVault
        ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");

   if (string.IsNullOrWhiteSpace(apiKey))
    {
        Console.WriteLine("⚠️  OPENAI_API_KEY saknas i miljön (kolla .env och WorkingDirectory).");
    }

    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
    client.Timeout = TimeSpan.FromSeconds(60);
});


// För att använda inMemory-databas, sätt useInMemory till true
var useInMemory = false;

if (useInMemory)
{
   builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("innoviahub"));
}
else
{
   var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
   builder.Services.AddDbContext<AppDbContext>(options =>
      options.UseMySql(
         connectionString,
         ServerVersion.AutoDetect(connectionString))
      );
}

// Joel's ändringar för rätt userinfo - CORS för att tillåta frontend att anropa API
builder.Services.AddCors(opt => {
   opt.AddPolicy("ng", p => p
      .WithOrigins("http://localhost:4200", "https://innoviahub-app-v4x7o.ondigitalocean.app")
      .AllowAnyHeader()
      .AllowAnyMethod()
      .AllowCredentials()
   );
});

builder.Services.AddSignalR();

// Joel's ändringar för rätt userinfo - Dependency Injection för repositories
//DI för repositories
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IResourceRepository, ResourceRepository>();

var app = builder.Build();


// Joel's ändringar för rätt userinfo - CORS måste aktiveras före andra middleware
app.UseCors("ng");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
   app.MapOpenApi();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        var detail = app.Environment.IsDevelopment()
            ? feature?.Error.ToString()
            : "An unexpected error occurred.";
        var problem = new ProblemDetails
        {
            Status = 500,
            Title = "Server error",
            Detail = detail
        };
        await context.Response.WriteAsJsonAsync(problem);
    });
});

// Joel's ändringar för rätt userinfo - Authentication och Authorization middleware för Azure AD
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// Joel's ändringar för rätt userinfo - SignalR hub för realtidsuppdateringar av bokningar
app.MapHub<BookingHub>("/hubs/bookings");

app.Run();


