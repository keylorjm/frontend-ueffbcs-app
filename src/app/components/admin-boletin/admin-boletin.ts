import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ReporteService } from '../../services/reporte.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-boletin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatButtonModule],
  template: `
  <div class="container">
    <h1>Reportes y Boletines</h1>

    <div class="filters">
      <mat-form-field>
        <mat-label>Trimestre</mat-label>
        <select matNativeControl [(ngModel)]="trimestre">
          <option value="T1">Primer Trimestre</option>
          <option value="T2">Segundo Trimestre</option>
          <option value="T3">Tercer Trimestre</option>
        </select>
      </mat-form-field>

      <button mat-raised-button color="primary" (click)="descargarTrimestre()">Descargar Trimestral</button>
      <button mat-raised-button color="accent" (click)="descargarFinal()">Descargar Final</button>
    </div>
  </div>
  `,
  styles: [`.container { padding: 20px; }`],
})
export class AdminBoletinComponent {
  private reporte = inject(ReporteService);
  private snack = inject(MatSnackBar);

  cursoId = '';
  materiaId = '';
  anioLectivoId = '';
  trimestre: 'T1' | 'T2' | 'T3' = 'T1';

  descargarTrimestre() {
    if (!this.cursoId || !this.materiaId || !this.anioLectivoId) {
      this.snack.open('Seleccione curso, materia y año lectivo', 'Cerrar', { duration: 4000 });
      return;
    }
    this.reporte.trimestrePDF({
      cursoId: this.cursoId, materiaId: this.materiaId,
      anioLectivoId: this.anioLectivoId, trimestre: this.trimestre
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Boletin-${this.trimestre}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  descargarFinal() {
    if (!this.cursoId || !this.materiaId || !this.anioLectivoId) {
      this.snack.open('Seleccione curso, materia y año lectivo', 'Cerrar', { duration: 4000 });
      return;
    }
    this.reporte.finalPDF({
      cursoId: this.cursoId, materiaId: this.materiaId, anioLectivoId: this.anioLectivoId
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Boletin-Final.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
