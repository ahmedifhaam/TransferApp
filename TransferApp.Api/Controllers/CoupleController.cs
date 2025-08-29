using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransferApp.Api;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/couple")]
public class CoupleController(TransferDbContext db) : ControllerBase
{
    [HttpPost("apply")]
    public async Task<ActionResult<object>> ApplyAsCouple([FromBody] CoupleApplicationRequest request)
    {
        try
        {
            // Validate that both doctors exist
            var doctor1 = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == request.Doctor1MeritRank);
            var doctor2 = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == request.Doctor2MeritRank);

            if (doctor1 == null || doctor2 == null)
            {
                return BadRequest("One or both doctors not found");
            }

            if (doctor1.Id == doctor2.Id)
            {
                return BadRequest("Cannot apply as couple with yourself");
            }

            // Check if either doctor is already in a couple application
            var existingApplication = await db.CoupleApplications
                .Where(ca => ca.IsActive && 
                    (ca.Doctor1Id == doctor1.Id || ca.Doctor1Id == doctor2.Id ||
                     ca.Doctor2Id == doctor1.Id || ca.Doctor2Id == doctor2.Id))
                .FirstOrDefaultAsync();

            if (existingApplication != null)
            {
                return BadRequest("One or both doctors are already in a couple application");
            }

            // Create the couple application
            var coupleApplication = new TransferApp.Domain.CoupleApplication
            {
                Doctor1Id = doctor1.Id,
                Doctor2Id = doctor2.Id,
                IsActive = true
            };

            db.CoupleApplications.Add(coupleApplication);
            await db.SaveChangesAsync();

            return Ok(new
            {
                message = "Couple application created successfully",
                coupleApplication = new
                {
                    id = coupleApplication.Id,
                    doctor1 = new { id = doctor1.Id, meritRank = doctor1.MeritRank, fullName = doctor1.FullName },
                    doctor2 = new { id = doctor2.Id, meritRank = doctor2.MeritRank, fullName = doctor2.FullName },
                    effectiveMeritRank = Math.Max(doctor1.MeritRank, doctor2.MeritRank)
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("doctor/{meritRank:int}")]
    public async Task<ActionResult<object>> GetCoupleInfo(int meritRank)
    {
        try
        {
            var doctor = await db.Doctors
                .FirstOrDefaultAsync(d => d.MeritRank == meritRank);

            if (doctor == null)
            {
                return NotFound("Doctor not found");
            }

            // Check if doctor is in any active couple application
            var coupleApplication = await db.CoupleApplications
                .Where(ca => ca.IsActive && (ca.Doctor1Id == doctor.Id || ca.Doctor2Id == doctor.Id))
                .Include(ca => ca.Doctor1)
                .Include(ca => ca.Doctor2)
                .FirstOrDefaultAsync();

            if (coupleApplication == null)
            {
                return Ok(new
                {
                    isInCouple = false,
                    effectiveMeritRank = doctor.MeritRank
                });
            }

            var partner = coupleApplication.Doctor1Id == doctor.Id 
                ? coupleApplication.Doctor2 
                : coupleApplication.Doctor1;

            return Ok(new
            {
                isInCouple = true,
                coupleApplicationId = coupleApplication.Id,
                partner = new
                {
                    id = partner.Id,
                    meritRank = partner.MeritRank,
                    fullName = partner.FullName
                },
                effectiveMeritRank = Math.Max(doctor.MeritRank, partner.MeritRank)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<object>> RemoveCoupleApplication(int id)
    {
        try
        {
            var coupleApplication = await db.CoupleApplications.FindAsync(id);
            if (coupleApplication == null)
            {
                return NotFound("Couple application not found");
            }

            coupleApplication.IsActive = false;
            await db.SaveChangesAsync();

            return Ok(new { message = "Couple application removed successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("all")]
    public async Task<ActionResult<object>> GetAllCoupleApplications()
    {
        try
        {
            var coupleApplications = await db.CoupleApplications
                .Where(ca => ca.IsActive)
                .Include(ca => ca.Doctor1)
                .Include(ca => ca.Doctor2)
                .Select(ca => new
                {
                    id = ca.Id,
                    doctor1 = new { id = ca.Doctor1.Id, meritRank = ca.Doctor1.MeritRank, fullName = ca.Doctor1.FullName },
                    doctor2 = new { id = ca.Doctor2.Id, meritRank = ca.Doctor2.MeritRank, fullName = ca.Doctor2.FullName },
                    effectiveMeritRank = Math.Max(ca.Doctor1.MeritRank, ca.Doctor2.MeritRank),
                    createdAt = ca.CreatedAt
                })
                .OrderBy(ca => ca.effectiveMeritRank)
                .ToListAsync();

            return Ok(coupleApplications);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}

public class CoupleApplicationRequest
{
    public int Doctor1MeritRank { get; set; }
    public int Doctor2MeritRank { get; set; }
}
