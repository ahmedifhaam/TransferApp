using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

namespace TransferApp.Api.Controllers;

public class AdminOptions
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

[ApiController]
[Route("api/auth")]
public class AuthController(TransferDbContext db, IOptionsSnapshot<AdminOptions> adminOptions) : ControllerBase
{
    public record AdminLoginRequest(string Username, string Password);

    [HttpPost("admin/login")]
    public IActionResult AdminLogin([FromBody] AdminLoginRequest req)
    {
        if (string.Equals(req.Username, adminOptions.Value.Username, StringComparison.Ordinal)
            && string.Equals(req.Password, adminOptions.Value.Password, StringComparison.Ordinal))
        {
            return Ok(new { role = "admin", name = "Administrator" });
        }
        return Unauthorized();
    }

    [HttpPost("doctor/login/rank/{meritRank:int}")]
    public async Task<IActionResult> DoctorLogin(int meritRank)
    {
        var doc = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
        if (doc == null) return NotFound($"Doctor with merit rank {meritRank} not found");
        return Ok(new { role = "doctor", id = doc.Id, fullName = doc.FullName, meritRank = doc.MeritRank });
    }
}
