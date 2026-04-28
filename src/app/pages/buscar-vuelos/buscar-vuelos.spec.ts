import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarVuelos } from './buscar-vuelos';

describe('BuscarVuelos', () => {
  let component: BuscarVuelos;
  let fixture: ComponentFixture<BuscarVuelos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscarVuelos],
    }).compileComponents();

    fixture = TestBed.createComponent(BuscarVuelos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

