import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VacancyFiltersComponent } from './vacancy-filters.component';

describe('VacancyFiltersComponent', () => {
  let component: VacancyFiltersComponent;
  let fixture: ComponentFixture<VacancyFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VacancyFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VacancyFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
