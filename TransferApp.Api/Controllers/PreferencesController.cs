using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransferApp.Api;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/preferences")]
public class PreferencesController(TransferDbContext db) : ControllerBase
{
	public record PreferenceItemDto(int VacancyId, int OrderIndex);

	[HttpGet("rank/{meritRank:int}")]
	public async Task<IActionResult> GetPreferences(int meritRank)
	{
		var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
		if (doctor == null) return NotFound($"Doctor with merit rank {meritRank} not found");

		var list = await db.Preferences
			.Where(p => p.DoctorId == doctor.Id)
			.Include(p => p.Vacancy)
			.ThenInclude(v => v.Institution)
			.ThenInclude(i => i.District)
			.OrderBy(p => p.OrderIndex)
			.Select(p => new { p.Id, p.VacancyId, p.OrderIndex })
			.ToListAsync();
		return Ok(list);
	}

	[HttpPost("rank/{meritRank:int}")]
	public async Task<IActionResult> SavePreferences(int meritRank, [FromBody] List<PreferenceItemDto> items)
	{
		var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
		if (doctor == null) return NotFound($"Doctor with merit rank {meritRank} not found");

		var existing = await db.Preferences.Where(p => p.DoctorId == doctor.Id).ToListAsync();
		db.Preferences.RemoveRange(existing);

		foreach (var item in items.OrderBy(i => i.OrderIndex))
		{
			db.Preferences.Add(new TransferApp.Domain.Preference
			{
				DoctorId = doctor.Id,
				VacancyId = item.VacancyId,
				OrderIndex = item.OrderIndex
			});
		}

		await db.SaveChangesAsync();
		return Ok();
	}

	[HttpGet("assignment/rank/{meritRank:int}")]
	public async Task<ActionResult<object>> GetAssignedVacancy(int meritRank)
	{
		var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
		if (doctor == null) return NotFound($"Doctor with merit rank {meritRank} not found");

		var assignedVacancy = await GetAssignedVacancyForDoctor(meritRank);
		
		if (assignedVacancy == null)
			return Ok(new { assigned = false, message = "No vacancy assigned yet. Assignment will happen after all preferences are submitted." });

		return Ok(new {
			assigned = true,
			vacancy = new {
				assignedVacancy.Id,
				assignedVacancy.Designation,
				assignedVacancy.Count,
				institution = assignedVacancy.Institution.Name,
				district = assignedVacancy.Institution.District.Name
			},
			message = $"Assigned to {assignedVacancy.Institution.Name}, {assignedVacancy.Institution.District.Name} as {assignedVacancy.Designation}"
		});
	}

	[HttpGet("position/rank/{meritRank:int}")]
	public async Task<ActionResult<object>> GetCurrentPosition(int meritRank)
	{
		var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.MeritRank == meritRank);
		if (doctor == null) return NotFound($"Doctor with merit rank {meritRank} not found");

		var preferences = await db.Preferences
			.Where(p => p.DoctorId == doctor.Id)
			.Include(p => p.Vacancy)
			.ThenInclude(v => v.Institution)
			.ThenInclude(i => i.District)
			.OrderBy(p => p.OrderIndex)
			.ToListAsync();

		if (!preferences.Any())
			return Ok(new { position = "No preferences set", message = "Please set your preferences first" });

		// Get the assigned vacancy for this doctor
		var assignedVacancy = await GetAssignedVacancyForDoctor(meritRank);
		
		if (assignedVacancy == null)
			return Ok(new { position = "No assignment yet", message = "Assignment will happen after all preferences are submitted" });

		var result = new
		{
			position = $"Assigned to {assignedVacancy.Institution.Name}, {assignedVacancy.Institution.District.Name}",
			vacancy = new
			{
				institution = assignedVacancy.Institution.Name,
				district = assignedVacancy.Institution.District.Name,
				designation = assignedVacancy.Designation,
				count = assignedVacancy.Count
			},
			meritRank = doctor.MeritRank,
			message = $"You have been assigned to your preference #{GetPreferenceNumber(doctor.Id, assignedVacancy.Id, preferences)}"
		};

		return Ok(result);
	}

	private async Task<TransferApp.Domain.Vacancy?> GetAssignedVacancyForDoctor(int meritRank)
	{
		var allDoctors = await db.Doctors.ToListAsync();

		var allPreferences = await db.Preferences
			.Include(p => p.Vacancy).ThenInclude(v => v.Institution).ThenInclude(i => i.District)
			.OrderBy(p => p.OrderIndex)
			.ToListAsync();

		// Calculate effective merit rank for each doctor
		var doctorEffectiveRanks = new Dictionary<int, int>();
		foreach (var doctor in allDoctors)
		{
			// Check if doctor is in any active couple application
			var coupleApplication = await db.CoupleApplications
				.Where(ca => ca.IsActive && (ca.Doctor1Id == doctor.Id || ca.Doctor2Id == doctor.Id))
				.FirstOrDefaultAsync();

			if (coupleApplication != null)
			{
				var partnerId = coupleApplication.Doctor1Id == doctor.Id ? coupleApplication.Doctor2Id : coupleApplication.Doctor1Id;
				var partner = allDoctors.FirstOrDefault(d => d.Id == partnerId);
				if (partner != null)
				{
					var effectiveRank = Math.Max(doctor.MeritRank, partner.MeritRank);
					doctorEffectiveRanks[doctor.Id] = effectiveRank;
				}
				else
				{
					doctorEffectiveRanks[doctor.Id] = doctor.MeritRank;
				}
			}
			else
			{
				doctorEffectiveRanks[doctor.Id] = doctor.MeritRank;
			}
		}

		// Sort doctors by effective merit rank
		var sortedDoctors = allDoctors.OrderBy(d => doctorEffectiveRanks[d.Id]).ToList();

		var doctorAssignments = new Dictionary<int, TransferApp.Domain.Vacancy>();

		foreach (var currentDoctor in sortedDoctors)
		{
			var doctorPreferences = allPreferences
				.Where(p => p.DoctorId == currentDoctor.Id)
				.OrderBy(p => p.OrderIndex)
				.ToList();

			TransferApp.Domain.Vacancy? assignedVacancy = null;
			foreach (var preference in doctorPreferences)
			{
				var currentAssignmentsCount = doctorAssignments.Values.Count(v => v.Id == preference.VacancyId);
				if (currentAssignmentsCount < preference.Vacancy.Count)
				{
					assignedVacancy = preference.Vacancy;
					break;
				}
			}

			if (assignedVacancy != null)
			{
				doctorAssignments[currentDoctor.Id] = assignedVacancy;
			}
		}

		var targetDoctor = allDoctors.FirstOrDefault(d => d.MeritRank == meritRank);
		return targetDoctor != null && doctorAssignments.TryGetValue(targetDoctor.Id, out var assignment) ? assignment : null;
	}

	private int GetPreferenceNumber(int doctorId, int vacancyId, List<TransferApp.Domain.Preference> preferences)
	{
		var preference = preferences.FirstOrDefault(p => p.VacancyId == vacancyId);
		return preference?.OrderIndex + 1 ?? 0;
	}
}



