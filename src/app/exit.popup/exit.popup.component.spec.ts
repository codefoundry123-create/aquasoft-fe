import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Exit.PopupComponent } from './exit.popup.component';

describe('Exit.PopupComponent', () => {
  let component: Exit.PopupComponent;
  let fixture: ComponentFixture<Exit.PopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Exit.PopupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Exit.PopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
