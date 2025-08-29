using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using iTextSharp.text.pdf;
using iTextSharp.text.pdf.parser;
using System.Text;
using System.Text.RegularExpressions;
using TransferApp.Domain;

namespace TransferApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PdfPreferencesController : ControllerBase
    {
        private readonly TransferDbContext _context;
        private readonly ILogger<PdfPreferencesController> _logger;

        public PdfPreferencesController(TransferDbContext context, ILogger<PdfPreferencesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("extract-preferences")]
        public async Task<IActionResult> ExtractPreferences(IFormFile pdfFile)
        {
            if (pdfFile == null || pdfFile.Length == 0)
                return BadRequest("No PDF file provided");

            if (!pdfFile.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest("File must be a PDF");

            try
            {
                var extractedPreferences = await ExtractPreferencesFromPdf(pdfFile);
                
                return Ok(new { 
                    success = true, 
                    preferences = extractedPreferences,
                    message = $"Preferences extracted successfully. {extractedPreferences.Count(p => p.IsMatched)} out of {extractedPreferences.Count} matched with database."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting preferences from PDF");
                return StatusCode(500, new { 
                    success = false, 
                    message = "Error processing PDF: " + ex.Message 
                });
            }
        }

        [HttpPost("confirm-preferences")]
        public async Task<IActionResult> ConfirmPreferences([FromBody] ConfirmPreferencesRequest request)
        {
            try
            {
                // Validate the request
                if (request.DoctorId <= 0 || request.Preferences == null || !request.Preferences.Any())
                    return BadRequest("Invalid request data");

                // Check for duplicates and return 400 if found
                var duplicateCount = request.Preferences.Count - request.Preferences.Distinct().Count();
                if (duplicateCount > 0)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = $"Duplicate preferences detected. Found {duplicateCount} duplicate(s). Please remove duplicates before saving.",
                        duplicateCount = duplicateCount,
                        totalCount = request.Preferences.Count,
                        uniqueCount = request.Preferences.Distinct().Count()
                    });
                }

                // Clear existing preferences for this doctor
                var existingPreferences = _context.Preferences
                    .Where(p => p.DoctorId == request.DoctorId)
                    .ToList();
                
                _context.Preferences.RemoveRange(existingPreferences);

                // Add new preferences with proper order index
                var newPreferences = request.Preferences.Select((vacancyId, index) => new Preference
                {
                    DoctorId = request.DoctorId,
                    VacancyId = vacancyId,
                    OrderIndex = index
                }).ToList();

                _context.Preferences.AddRange(newPreferences);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    message = $"Preferences confirmed and saved successfully. {newPreferences.Count} preferences saved." 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming preferences");
                return StatusCode(500, new { 
                    success = false, 
                    message = "Error saving preferences: " + ex.Message 
                });
            }
        }

        private async Task<List<ExtractedPreference>> ExtractPreferencesFromPdf(IFormFile pdfFile)
        {
            var preferences = new List<ExtractedPreference>();
            
            using var stream = pdfFile.OpenReadStream();
            using var reader = new PdfReader(stream);
            
            var textBuilder = new StringBuilder();
            
            // Extract text from page 7 onwards (as requested)
            for (int i = 7; i <= reader.NumberOfPages; i++)
            {
                var pageText = PdfTextExtractor.GetTextFromPage(reader, i);
                textBuilder.AppendLine(pageText);
            }

            var fullText = textBuilder.ToString();
            _logger.LogInformation($"Extracted text length: {fullText.Length} characters");
            
            // Get available designations from database (ordered by length)
            var availableDesignations = await GetAvailableDesignations();
            _logger.LogInformation($"Found {availableDesignations.Count} available designations in database");
            
            // Parse the text to extract preferences using the new algorithm
            var extractedPreferences = await ExtractPreferencesUsingDesignationMatching(fullText, availableDesignations);
            
            return extractedPreferences;
        }



        private async Task<List<string>> GetAvailableDesignations()
        {
            var designations = await _context.Vacancies
                .Select(v => v.Designation)
                .Distinct()
                .ToListAsync();
            
            // Order by length (longest first) for better matching
            return designations.OrderByDescending(d => d.Length).ToList();
        }

        private async Task<List<ExtractedPreference>> ExtractPreferencesUsingDesignationMatching(string fullText, List<string> availableDesignations)
        {
            var preferences = new List<ExtractedPreference>();
            var processedLines = new HashSet<string>();
            
            // Split text into lines and process each line
            var lines = fullText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var line in lines)
            {
                var trimmedLine = line.Trim();
                if (string.IsNullOrEmpty(trimmedLine) || trimmedLine.Length < 10) continue;
                
                // Skip header lines
                var lowerLine = trimmedLine.ToLower();
                if (lowerLine.Contains("page") || lowerLine.Contains("total") || 
                    lowerLine.Contains("merit") || lowerLine.Contains("rank") ||
                    lowerLine.Contains("name") || lowerLine.Contains("preference"))
                    continue;
                
                // Skip if we've already processed this line
                if (processedLines.Contains(trimmedLine)) continue;
                
                // Try to find a matching designation in this line
                var matchedDesignation = FindMatchingDesignation(trimmedLine, availableDesignations);
                
                if (!string.IsNullOrEmpty(matchedDesignation))
                {
                    // Extract hospital name from everything before the matched designation
                    var hospitalName = ExtractHospitalNameFromLine(trimmedLine, matchedDesignation);
                    
                    // Find the vacancy ID for this designation
                    var vacancyId = await FindVacancyIdByDesignation(matchedDesignation, hospitalName);
                    
                    var preference = new ExtractedPreference
                    {
                        VacancyName = $"{hospitalName} - {matchedDesignation}",
                        Institute = hospitalName,
                        PostDesignation = matchedDesignation,
                        RawLine = trimmedLine,
                        MatchedVacancyId = vacancyId,
                        MatchedVacancyName = vacancyId.HasValue ? $"{hospitalName} - {matchedDesignation}" : null,
                        IsMatched = vacancyId.HasValue
                    };
                    
                    preferences.Add(preference);
                    processedLines.Add(trimmedLine);
                    
                    _logger.LogInformation($"Found preference: {preference.VacancyName} with designation '{matchedDesignation}'");
                }
            }
            
            // If no matches found, try to extract any text that looks like preferences
            if (!preferences.Any())
            {
                preferences = await ExtractFallbackPreferences(fullText);
            }
            
            return preferences;
        }

        private string FindMatchingDesignation(string line, List<string> availableDesignations)
        {
            var lowerLine = line.ToLower();
            
            // Try to find the longest matching designation with proper word boundaries
            foreach (var designation in availableDesignations)
            {
                var lowerDesignation = designation.ToLower();
                
                // Check for exact word boundary match (space before and after, or start/end of line)
                var pattern = $@"\b{Regex.Escape(lowerDesignation)}\b";
                if (Regex.IsMatch(lowerLine, pattern))
                {
                    _logger.LogInformation($"Found designation match: '{designation}' in line: '{line}'");
                    return designation; // Return the original case
                }
            }
            
            _logger.LogDebug($"No designation match found in line: '{line}'");
            return string.Empty;
        }
        
        private string ExtractHospitalNameFromLine(string line, string matchedDesignation)
        {
            try
            {
                var lowerLine = line.ToLower();
                var lowerDesignation = matchedDesignation.ToLower();
                
                // Find the position of the designation in the line using word boundaries
                var pattern = $@"\b{Regex.Escape(lowerDesignation)}\b";
                var match = Regex.Match(lowerLine, pattern);
                
                if (match.Success && match.Index > 0)
                {
                    // Extract everything before the designation
                    var beforeDesignation = line.Substring(0, match.Index).Trim();
                    
                    // Skip the ID part (usually starts with numbers and ends with space)
                    // Look for the first meaningful word (skip ID pattern like "17-LKY0001016U104")
                    var words = beforeDesignation.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    
                    if (words.Length > 0)
                    {
                        // Skip the first word if it looks like an ID (contains numbers and special characters)
                        var startIndex = 0;
                        if (words.Length > 1 && IsLikelyId(words[0]))
                        {
                            startIndex = 1;
                        }
                        
                        // Join all remaining words to form the hospital name
                        var hospitalWords = words.Skip(startIndex);
                        var hospitalName = string.Join(" ", hospitalWords).Trim();
                        
                        return hospitalName;
                    }
                    
                    return beforeDesignation;
                }
                
                // Fallback: return the first part of the line
                var parts = line.Split(' ');
                if (parts.Length > 1)
                {
                    return parts[0];
                }
                
                return line;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error extracting hospital name from line");
                return "Unknown Hospital";
            }
        }
        
        private bool IsLikelyId(string word)
        {
            // Check if the word looks like an ID (contains numbers, hyphens, letters)
            // Pattern: numbers-letters-numbers (like "17-LKY0001016U104")
            // Also check for other ID patterns like "MO123456" or "12345-MO"
            if (string.IsNullOrEmpty(word) || word.Length < 3) return false;
            
            var hasHyphen = word.Contains('-');
            var hasDigits = word.Any(char.IsDigit);
            var hasLetters = word.Any(char.IsLetter);
            var hasSpecialChars = word.Any(c => !char.IsLetterOrDigit(c) && c != '-');
            
            // Common ID patterns
            if (hasHyphen && hasDigits && hasLetters) return true;
            if (hasDigits && hasLetters && !hasSpecialChars) return true;
            if (word.Length > 8 && hasDigits && hasLetters) return true; // Long alphanumeric strings
            
            return false;
        }
        
        private async Task<int?> FindVacancyIdByDesignation(string designation, string institution)
        {
            try
            {
                var vacancy = await _context.Vacancies
                    .Where(v => v.Designation == designation && v.Institution.Name == institution)
                    .FirstOrDefaultAsync();
                
                return vacancy?.Id;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error finding vacancy ID for designation: {designation}");
                return null;
            }
        }

        private async Task<List<ExtractedPreference>> ExtractFallbackPreferences(string fullText)
        {
            var preferences = new List<ExtractedPreference>();
            
            // Fallback: try to extract any meaningful lines that could be preferences
            var lines = fullText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var line in lines)
            {
                var trimmedLine = line.Trim();
                if (string.IsNullOrEmpty(trimmedLine) || trimmedLine.Length < 10) continue;
                
                // Skip header lines
                var lowerLine = trimmedLine.ToLower();
                if (lowerLine.Contains("page") || lowerLine.Contains("total") || 
                    lowerLine.Contains("merit") || lowerLine.Contains("rank") ||
                    lowerLine.Contains("name") || lowerLine.Contains("preference"))
                    continue;
                
                // Try to extract meaningful parts with better parsing
                var parts = trimmedLine.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 3)
                {
                    // Skip ID-like parts at the beginning
                    var startIndex = 0;
                    for (int i = 0; i < Math.Min(3, parts.Length); i++)
                    {
                        if (IsLikelyId(parts[i]))
                        {
                            startIndex = i + 1;
                        }
                        else
                        {
                            break;
                        }
                    }
                    
                    if (startIndex < parts.Length - 1)
                    {
                        var preference = new ExtractedPreference
                        {
                            VacancyName = trimmedLine,
                            Institute = parts[startIndex],
                            PostDesignation = parts[startIndex + 1],
                            RawLine = trimmedLine,
                            IsMatched = false
                        };
                        
                        preferences.Add(preference);
                    }
                }
            }
            
            return preferences;
        }




    }

    public class ExtractedPreference
    {
        public string VacancyName { get; set; } = string.Empty;
        public string Institute { get; set; } = string.Empty;
        public string PostDesignation { get; set; } = string.Empty;
        public string RawLine { get; set; } = string.Empty;
        public int? MatchedVacancyId { get; set; }
        public string? MatchedVacancyName { get; set; }
        public bool IsMatched { get; set; } = false;
    }



    public class ConfirmPreferencesRequest
    {
        public int DoctorId { get; set; }
        public List<int> Preferences { get; set; } = new();
    }
}

