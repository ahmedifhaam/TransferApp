import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoupleApplicationModalComponent } from './couple-application-modal.component';

describe('CoupleApplicationModalComponent', () => {
  let component: CoupleApplicationModalComponent;
  let fixture: ComponentFixture<CoupleApplicationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoupleApplicationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoupleApplicationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
