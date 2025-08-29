using Microsoft.EntityFrameworkCore;
using TransferApp.Domain;

namespace TransferApp.Api;

public class TransferDbContext : DbContext
{
    public TransferDbContext(DbContextOptions<TransferDbContext> options) : base(options)
    {
    }

    public DbSet<District> Districts { get; set; }
    public DbSet<Institution> Institutions { get; set; }
    public DbSet<Vacancy> Vacancies { get; set; }
    public DbSet<Doctor> Doctors { get; set; }
    public DbSet<Preference> Preferences { get; set; }
    public DbSet<CoupleApplication> CoupleApplications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // District configuration
        modelBuilder.Entity<District>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(d => d.Name).IsUnique();
        });

        // Institution configuration
        modelBuilder.Entity<Institution>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(i => new { i.Name, i.DistrictId }).IsUnique();
            entity.HasOne(i => i.District)
                .WithMany(d => d.Institutions)
                .HasForeignKey(i => i.DistrictId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Vacancy configuration
        modelBuilder.Entity<Vacancy>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(v => new { v.Designation, v.InstitutionId }).IsUnique();
            entity.HasOne(v => v.Institution)
                .WithMany(i => i.Vacancies)
                .HasForeignKey(v => v.InstitutionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Doctor configuration
        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(d => d.MeritRank).IsUnique();
            entity.HasOne(d => d.PartnerDoctor)
                .WithMany(d => d.PartneredWith)
                .HasForeignKey(d => d.PartnerDoctorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Preference configuration
        modelBuilder.Entity<Preference>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(p => new { p.DoctorId, p.VacancyId }).IsUnique();
            entity.HasOne(p => p.Doctor)
                .WithMany(d => d.Preferences)
                .HasForeignKey(p => p.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.Vacancy)
                .WithMany(v => v.Preferences)
                .HasForeignKey(p => p.VacancyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CoupleApplication configuration
        modelBuilder.Entity<CoupleApplication>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(ca => new { ca.Doctor1Id, ca.Doctor2Id }).IsUnique();
            entity.HasOne(ca => ca.Doctor1)
                .WithMany(d => d.CoupleApplications)
                .HasForeignKey(ca => ca.Doctor1Id)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ca => ca.Doctor2)
                .WithMany()
                .HasForeignKey(ca => ca.Doctor2Id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}



