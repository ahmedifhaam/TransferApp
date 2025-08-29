using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransferApp.Domain;

public class District
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;

    public ICollection<Institution> Institutions { get; set; } = new List<Institution>();
}

public class Institution
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int DistrictId { get; set; }
    public District? District { get; set; }

    public ICollection<Vacancy> Vacancies { get; set; } = new List<Vacancy>();
}

public class Vacancy
{
    [Key]
    public int Id { get; set; }
    [Required]
    public int InstitutionId { get; set; }
    public Institution? Institution { get; set; }

    [Required]
    public string Designation { get; set; } = string.Empty;

    public int Count { get; set; }

    public bool IsDifficultStation { get; set; }
    public virtual ICollection<Preference> Preferences { get; set; } = new List<Preference>();
}

public class Doctor
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string FullName { get; set; } = string.Empty;

    // Lower rank value means higher priority (1 is top rank)
    [Range(1, int.MaxValue)]
    public int MeritRank { get; set; }

    public int? PartnerDoctorId { get; set; }
    public virtual Doctor? PartnerDoctor { get; set; }
    public virtual ICollection<Doctor> PartneredWith { get; set; } = new List<Doctor>();
    public virtual ICollection<Preference> Preferences { get; set; } = new List<Preference>();
    public virtual ICollection<CoupleApplication> CoupleApplications { get; set; } = new List<CoupleApplication>();
}

public class Preference
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DoctorId { get; set; }
    public Doctor? Doctor { get; set; }

    [Required]
    public int VacancyId { get; set; }
    public Vacancy? Vacancy { get; set; }

    // 0-based order index representing user preference order
    public int OrderIndex { get; set; }
}

public class CoupleApplication
{
    [Key]
    public int Id { get; set; }
    public int Doctor1Id { get; set; }
    public int Doctor2Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    
    public virtual Doctor Doctor1 { get; set; } = null!;
    public virtual Doctor Doctor2 { get; set; } = null!;
}



