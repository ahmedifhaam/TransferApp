using CsvHelper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using TransferApp.Domain;

namespace TransferApp.Api.Controllers;

[ApiController]
[Route("api/import")] 
public class ImportController(TransferDbContext db) : ControllerBase
{
    [HttpPost("vacancies")]
    public async Task<IActionResult> ImportVacancies([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("CSV file is required");
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read(); csv.ReadHeader();
        while (csv.Read())
        {
            var districtName = csv.GetField("DISTRICT")?.Trim();
            var institutionName = csv.GetField("INSTITUTION")?.Trim();
            var designation = csv.GetField("DESIGNATION")?.Trim();
            var vacanciesRaw = csv.GetField("VACANCIES")?.Trim();

            // Skip invalid or summary rows
            if (string.IsNullOrWhiteSpace(districtName) || string.IsNullOrWhiteSpace(institutionName) || string.IsNullOrWhiteSpace(designation))
                continue;
            if (string.Equals(designation, "TOTAL", StringComparison.OrdinalIgnoreCase))
                continue;
            if (string.IsNullOrWhiteSpace(vacanciesRaw) || vacanciesRaw == "-")
                continue;
            if (!int.TryParse(vacanciesRaw, out var count) || count <= 0)
                continue;

            var district = await db.Districts.FirstOrDefaultAsync(d => d.Name == districtName) 
                           ?? db.Districts.Add(new District { Name = districtName }).Entity;
            await db.SaveChangesAsync();

            var institution = await db.Institutions.FirstOrDefaultAsync(i => i.Name == institutionName && i.DistrictId == district.Id)
                             ?? db.Institutions.Add(new Institution { Name = institutionName, DistrictId = district.Id }).Entity;
            await db.SaveChangesAsync();

            var vacancy = await db.Vacancies.FirstOrDefaultAsync(v => v.InstitutionId == institution.Id && v.Designation == designation);
            if (vacancy == null)
            {
                db.Vacancies.Add(new Vacancy { InstitutionId = institution.Id, Designation = designation, Count = count });
            }
            else
            {
                vacancy.Count = count;
            }
        }

        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("difficult-stations")]
    public async Task<IActionResult> ImportDifficultStations([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("CSV file is required");
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read(); csv.ReadHeader();
        while (csv.Read())
        {
            var districtName = csv.GetField("RDHS")?.Trim();
            var station = csv.GetField("STATION")?.Trim();
            if (string.IsNullOrWhiteSpace(districtName) || string.IsNullOrWhiteSpace(station)) continue;

            var district = await db.Districts.FirstOrDefaultAsync(d => d.Name == districtName);
            if (district == null) continue;

            var institution = await db.Institutions.FirstOrDefaultAsync(i => i.Name == station && i.DistrictId == district.Id);
            if (institution == null) continue;

            var vacancies = await db.Vacancies.Where(v => v.InstitutionId == institution.Id).ToListAsync();
            foreach (var v in vacancies) v.IsDifficultStation = true;
        }

        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> ImportDoctors([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("CSV file is required");
        
        // First, let's count the total lines in the file
        var totalLines = 0;
        using (var countStream = file.OpenReadStream())
        using (var countReader = new StreamReader(countStream))
        {
            while (await countReader.ReadLineAsync() != null)
            {
                totalLines++;
            }
        }
        
        Console.WriteLine($"Total lines in CSV file: {totalLines}");
        
        using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read(); csv.ReadHeader();
        
        // Log the headers to see what we're working with
        var headers = csv.HeaderRecord;
        Console.WriteLine($"CSV Headers: {string.Join(", ", headers)}");
        
        // Check if the expected columns exist
        if (!headers.Contains("SN/Intern Merit") || !headers.Contains("Full Name"))
        {
            return BadRequest($"CSV must contain 'SN/Intern Merit' and 'Full Name' columns. Found: {string.Join(", ", headers)}");
        }
        
        // Clear existing doctors first
        db.Doctors.RemoveRange(db.Doctors);
        await db.SaveChangesAsync();
        
        var importedCount = 0;
        var skippedCount = 0;
        var rowNumber = 0;
        
        while (csv.Read())
        {
            rowNumber++;
            var meritRankStr = csv.GetField("SN/Intern Merit")?.Trim();
            var fullName = csv.GetField("Full Name")?.Trim();
            
            // Log first few rows for debugging
            if (rowNumber <= 5)
            {
                Console.WriteLine($"Row {rowNumber}: Merit='{meritRankStr}', Name='{fullName}'");
            }
            
            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(meritRankStr)) 
            {
                skippedCount++;
                continue;
            }
            
            // Clean up merit rank string - remove asterisks and other non-numeric characters
            meritRankStr = meritRankStr.Replace("*", "").Replace(" ", "");
            
            // Try to parse merit rank, skip if invalid
            if (!int.TryParse(meritRankStr, out int meritRank)) 
            {
                Console.WriteLine($"Failed to parse merit rank: '{meritRankStr}' for doctor: '{fullName}' at row {rowNumber}");
                skippedCount++;
                continue;
            }
            
            // Validate merit rank range (should be positive and reasonable)
            if (meritRank <= 0 || meritRank > 10000)
            {
                Console.WriteLine($"Invalid merit rank: {meritRank} for doctor: '{fullName}' at row {rowNumber}");
                skippedCount++;
                continue;
            }
            
            // Check if doctor with this merit rank already exists
            if (!await db.Doctors.AnyAsync(d => d.MeritRank == meritRank))
            {
                db.Doctors.Add(new Doctor { FullName = fullName, MeritRank = meritRank });
                importedCount++;
                
                // Log every 100th import for progress tracking
                if (importedCount % 100 == 0)
                {
                    Console.WriteLine($"Imported {importedCount} doctors so far...");
                }
            }
        }

        await db.SaveChangesAsync();
        Console.WriteLine($"Import completed. Total lines in file: {totalLines}, Rows processed: {rowNumber}, Imported: {importedCount}, Skipped: {skippedCount}");
        return Ok(new { message = $"Imported {importedCount} doctors, Skipped {skippedCount}, Total rows: {rowNumber}, File lines: {totalLines}" });
    }

    [HttpPost("clear")]
    public async Task<IActionResult> ClearAll()
    {
        // Order matters due to FK constraints
        db.Preferences.RemoveRange(db.Preferences);
        await db.SaveChangesAsync();

        db.Vacancies.RemoveRange(db.Vacancies);
        await db.SaveChangesAsync();

        db.Institutions.RemoveRange(db.Institutions);
        db.Districts.RemoveRange(db.Districts);
        db.Doctors.RemoveRange(db.Doctors);
        await db.SaveChangesAsync();

        return Ok(new { message = "All data cleared" });
    }
}



