using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransferApp.Api;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/vacancies")]
public class VacanciesController(TransferDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetVacancies(
        [FromQuery] string? search,
        [FromQuery] string? district,
        [FromQuery] string? institution,
        [FromQuery] string? designation,
        [FromQuery] bool? isDifficultStation,
        [FromQuery] int? minCount,
        [FromQuery] int? maxCount)
    {
        var query = db.Vacancies
            .Include(v => v.Institution)
            .ThenInclude(i => i.District)
            .AsQueryable();

        // Apply search filter (searches across all text fields)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(v =>
                v.Designation.ToLower().Contains(searchLower) ||
                v.Institution.Name.ToLower().Contains(searchLower) ||
                v.Institution.District.Name.ToLower().Contains(searchLower)
            );
        }

        // Apply specific filters
        if (!string.IsNullOrWhiteSpace(district))
        {
            query = query.Where(v => v.Institution.District.Name.ToLower().Contains(district.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(institution))
        {
            query = query.Where(v => v.Institution.Name.ToLower().Contains(institution.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(designation))
        {
            query = query.Where(v => v.Designation.ToLower().Contains(designation.ToLower()));
        }

        if (isDifficultStation.HasValue)
        {
            query = query.Where(v => v.IsDifficultStation == isDifficultStation.Value);
        }

        if (minCount.HasValue)
        {
            query = query.Where(v => v.Count >= minCount.Value);
        }

        if (maxCount.HasValue)
        {
            query = query.Where(v => v.Count <= maxCount.Value);
        }

        var vacancies = await query
            .OrderBy(v => v.Institution.District.Name)
            .ThenBy(v => v.Institution.Name)
            .ThenBy(v => v.Designation)
            .Select(v => new
            {
                v.Id,
                v.Designation,
                v.Count,
                v.IsDifficultStation,
                Institution = v.Institution.Name,
                District = v.Institution.District.Name
            })
            .ToListAsync();

        return Ok(vacancies);
    }

    [HttpGet("filters")]
    public async Task<ActionResult<object>> GetFilterOptions()
    {
        var districts = await db.Districts
            .OrderBy(d => d.Name)
            .Select(d => d.Name)
            .Distinct()
            .ToListAsync();

        var institutions = await db.Institutions
            .OrderBy(i => i.Name)
            .Select(i => i.Name)
            .Distinct()
            .ToListAsync();

        var designations = await db.Vacancies
            .OrderBy(v => v.Designation)
            .Select(v => v.Designation)
            .Distinct()
            .ToListAsync();

        var countRange = await db.Vacancies
            .GroupBy(v => 1)
            .Select(g => new
            {
                MinCount = g.Min(v => v.Count),
                MaxCount = g.Max(v => v.Count)
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            districts,
            institutions,
            designations,
            countRange = countRange ?? new { MinCount = 0, MaxCount = 0 }
        });
    }
}



