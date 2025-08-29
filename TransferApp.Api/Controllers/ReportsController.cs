using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransferApp.Api;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController(TransferDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetReportsSummary()
    {
        try
        {
            // Get all doctors with their preferences and assignments
            var doctors = await db.Doctors
                .OrderBy(d => d.MeritRank)
                .Select(d => new
                {
                    d.Id,
                    d.MeritRank,
                    d.FullName,
                    PreferencesCount = d.Preferences.Count,
                    AssignedVacancy = d.Preferences
                        .Where(p => p.OrderIndex == 0)
                        .Select(p => new
                        {
                            p.Vacancy.Designation,
                            Institution = p.Vacancy.Institution.Name,
                            p.Vacancy.Count
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            // Get all vacancies with preference counts
            var vacancies = await db.Vacancies
                .Include(v => v.Institution)
                .Include(v => v.Institution.District)
                .Include(v => v.Preferences)
                .Select(v => new
                {
                    v.Id,
                    v.Designation,
                    v.Count,
                    v.IsDifficultStation,
                    Institution = v.Institution.Name,
                    District = v.Institution.District.Name,
                    PreferenceCount = v.Preferences.Count,
                    AssignedDoctors = v.Preferences
                        .Where(p => p.OrderIndex == 0)
                        .Select(p => new
                        {
                            p.Doctor.MeritRank,
                            p.Doctor.FullName
                        })
                        .ToList()
                })
                .ToListAsync();

            // Get couple applications
            var couples = await db.CoupleApplications
                .Where(ca => ca.IsActive)
                .Include(ca => ca.Doctor1)
                .Include(ca => ca.Doctor2)
                .Select(ca => new
                {
                    ca.Id,
                    Doctor1 = new
                    {
                        ca.Doctor1.MeritRank,
                        ca.Doctor1.FullName
                    },
                    Doctor2 = new
                    {
                        ca.Doctor2.MeritRank,
                        ca.Doctor2.FullName
                    },
                    EffectiveMeritRank = Math.Max(ca.Doctor1.MeritRank, ca.Doctor2.MeritRank),
                    ca.CreatedAt
                })
                .OrderBy(ca => ca.EffectiveMeritRank)
                .ToListAsync();

            // Calculate statistics
            var totalDoctors = doctors.Count;
            var assignedCount = doctors.Count(d => d.AssignedVacancy != null);
            var unassignedCount = totalDoctors - assignedCount;
            var totalVacancies = vacancies.Count;
            var totalPositions = vacancies.Sum(v => v.Count);
            var difficultStations = vacancies.Count(v => v.IsDifficultStation);
            var totalCouples = couples.Count;
            var averagePreferencesPerDoctor = totalDoctors > 0 
                ? Math.Round((double)doctors.Sum(d => d.PreferencesCount) / totalDoctors, 1)
                : 0.0;

            // Calculate vacancy assignment status
            var vacancyApplications = vacancies.Select(v => new
            {
                v.Id,
                v.Designation,
                v.Institution,
                v.District,
                v.Count,
                v.IsDifficultStation,
                v.PreferenceCount,
                v.AssignedDoctors,
                IsFullyAssigned = v.AssignedDoctors.Count >= v.Count
            }).OrderByDescending(v => v.PreferenceCount).ToList();

            return Ok(new
            {
                doctors,
                vacancyApplications,
                couples,
                statistics = new
                {
                    totalDoctors,
                    totalVacancies,
                    totalPositions,
                    difficultStations,
                    totalCouples,
                    averagePreferencesPerDoctor
                },
                assignmentSummary = new
                {
                    totalDoctors,
                    assignedCount,
                    unassignedCount,
                    assignmentRate = totalDoctors > 0 
                        ? Math.Round((double)assignedCount / totalDoctors * 100, 1)
                        : 0.0
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("doctors")]
    public async Task<ActionResult<object>> GetDoctorsReport()
    {
        try
        {
            var doctors = await db.Doctors
                .Include(d => d.Preferences)
                .OrderBy(d => d.MeritRank)
                .Select(d => new
                {
                    d.Id,
                    d.MeritRank,
                    d.FullName,
                    PreferencesCount = d.Preferences.Count,
                    Preferences = d.Preferences
                        .OrderBy(p => p.OrderIndex)
                        .Select(p => new
                        {
                            p.Vacancy.Designation,
                            Institution = p.Vacancy.Institution.Name,
                            p.Vacancy.Count,
                            p.OrderIndex
                        })
                        .ToList(),
                    AssignedVacancy = d.Preferences
                        .Where(p => p.OrderIndex == 0)
                        .Select(p => new
                        {
                            p.Vacancy.Designation,
                            Institution = p.Vacancy.Institution.Name,
                            p.Vacancy.Count
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(doctors);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("vacancies")]
    public async Task<ActionResult<object>> GetVacanciesReport()
    {
        try
        {
            var vacancies = await db.Vacancies
                .Include(v => v.Institution)
                .Include(v => v.Institution.District)
                .Include(v => v.Preferences)
                .ThenInclude(p => p.Doctor)
                .Select(v => new
                {
                    v.Id,
                    v.Designation,
                    v.Count,
                    v.IsDifficultStation,
                    Institution = v.Institution.Name,
                    District = v.Institution.District.Name,
                    PreferenceCount = v.Preferences.Count,
                    AssignedDoctors = v.Preferences
                        .Where(p => p.OrderIndex == 0)
                        .Select(p => new
                        {
                            p.Doctor.MeritRank,
                            p.Doctor.FullName
                        })
                        .ToList(),
                    AllPreferences = v.Preferences
                        .OrderBy(p => p.OrderIndex)
                        .Select(p => new
                        {
                            p.Doctor.MeritRank,
                            p.Doctor.FullName,
                            p.OrderIndex
                        })
                        .ToList()
                })
                .OrderByDescending(v => v.PreferenceCount)
                .ToListAsync();

            return Ok(vacancies);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("couples")]
    public async Task<ActionResult<object>> GetCouplesReport()
    {
        try
        {
            var couples = await db.CoupleApplications
                .Where(ca => ca.IsActive)
                .Include(ca => ca.Doctor1)
                .Include(ca => ca.Doctor2)
                .Select(ca => new
                {
                    ca.Id,
                    Doctor1 = new
                    {
                        ca.Doctor1.Id,
                        ca.Doctor1.MeritRank,
                        ca.Doctor1.FullName
                    },
                    Doctor2 = new
                    {
                        ca.Doctor2.Id,
                        ca.Doctor2.MeritRank,
                        ca.Doctor2.FullName
                    },
                    EffectiveMeritRank = Math.Max(ca.Doctor1.MeritRank, ca.Doctor2.MeritRank),
                    ca.CreatedAt
                })
                .OrderBy(ca => ca.EffectiveMeritRank)
                .ToListAsync();

            return Ok(couples);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}
