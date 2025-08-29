using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<TransferApp.Api.Controllers.AdminOptions>(builder.Configuration.GetSection("Admin"));
builder.Services.AddDbContext<TransferApp.Api.TransferDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"));
});

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy => 
    {
        policy.WithOrigins("http://localhost", "http://localhost:80", "http://127.0.0.1")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    
    // Add a fallback policy for debugging
    options.AddPolicy("DebugPolicy", policy => 
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowLocalhost");
app.UseHttpsRedirection();

app.MapControllers();

// Initialize database and run migrations after middleware is configured
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<TransferApp.Api.TransferDbContext>();
    try
    {
        Console.WriteLine("Starting database migration...");
        var pendingMigrations = context.Database.GetPendingMigrations().ToList();
        Console.WriteLine($"Pending migrations: {string.Join(", ", pendingMigrations)}");
        
        if (pendingMigrations.Any())
        {
            context.Database.Migrate();
            Console.WriteLine("Database migration completed successfully.");
        }
        else
        {
            Console.WriteLine("No pending migrations.");
        }
    }
    catch (Exception ex)
    {
        // Log the error but continue - this allows the app to start even if DB is not ready
        Console.WriteLine($"Database migration failed: {ex.Message}");
        Console.WriteLine($"Exception details: {ex}");
    }
}

app.Run();


