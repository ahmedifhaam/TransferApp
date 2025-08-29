using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/doctors")]
public class DoctorsController(TransferDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllDoctors()
    {
        var doctors = await db.Doctors
            .OrderBy(d => d.MeritRank)
            .Take(20)
            .Select(d => new { d.MeritRank, d.FullName, d.PartnerDoctorId })
            .ToListAsync();
        return Ok(new { count = doctors.Count, doctors });
    }

    [HttpGet("rank/{meritRank:int}")]
    public async Task<IActionResult> GetDoctorByMeritRank(int meritRank)
    {
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
        if (doctor == null) return NotFound($"Doctor with merit rank {meritRank} not found");
        return Ok(new { doctor.Id, doctor.FullName, doctor.MeritRank, doctor.PartnerDoctorId });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDoctor(int id)
    {
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.Id == id);
        if (doctor == null) return NotFound();
        return Ok(new { doctor.Id, doctor.FullName, doctor.MeritRank, doctor.PartnerDoctorId });
    }
}
