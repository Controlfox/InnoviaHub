import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReceptionistPersonalityComponent } from './receptionist-personality.component';

describe('ReceptionistPersonalityComponent', () => {
  let component: ReceptionistPersonalityComponent;
  let fixture: ComponentFixture<ReceptionistPersonalityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistPersonalityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReceptionistPersonalityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
