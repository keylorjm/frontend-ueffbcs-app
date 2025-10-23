import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { CalificacionService } from '../../services/calificacion.service';

@Component({
  selector: 'app-profesor-notas-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatSelectModule],
  template: `
  <div class="container">
    <h1>Notas del Curso</h1>

    <div class="filters">
      <mat-form-field>
        <mat-label>Trimestre (opcional)</mat-label>
        <select matNativeControl [(ngModel)]="trimestre">
          <option [ngValue]="''">Todos</option>
          <option value="T1">Primer Trimestre</option>
          <option value="T2">Segundo Trimestre</option>
          <option value="T3">Tercer Trimestre</option>
        </select>
      </mat-form-field>
      <button mat-raised-button (click)="cargar()">Refrescar</button>
    </div>

    <table mat-table [dataSource]="rows" class="mat-elevation-z8" *ngIf="rows?.length">
      <ng-container matColumnDef="estudiante">
        <th mat-header-cell *matHeaderCellDef>Estudiante</th>
        <td mat-cell *matCellDef="let r">{{ r.estudiante?.nombre }}</td>
      </ng-container>

      <ng-container matColumnDef="T1">
        <th mat-header-cell *matHeaderCellDef>T1</th>
        <td mat-cell *matCellDef="let r">{{ r.T1?.promedioTrimestral ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="T2">
        <th mat-header-cell *matHeaderCellDef>T2</th>
        <td mat-cell *matCellDef="let r">{{ r.T2?.promedioTrimestral ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="T3">
        <th mat-header-cell *matHeaderCellDef>T3</th>
        <td mat-cell *matCellDef="let r">{{ r.T3?.promedioTrimestral ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="final">
        <th mat-header-cell *matHeaderCellDef>Final</th>
        <td mat-cell *matCellDef="let r">{{ r.evaluacionFinal ?? '—' }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols"></tr>
    </table>

    <div *ngIf="!rows?.length" class="empty">Sin datos</div>
  </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .filters { display:flex; gap: 8px; align-items:center; margin-bottom: 8px; }
    .empty { opacity: .7; }
  `],
})
export class ProfesorNotasCursoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cali = inject(CalificacionService);

  cursoId!: string;
  materiaId!: string;
  anioLectivoId!: string;
  trimestre: '' | 'T1' | 'T2' | 'T3' = '';

  rows: any[] = [];
  cols = ['estudiante', 'T1', 'T2', 'T3', 'final'];

  ngOnInit(): void {
    this.cursoId = this.route.snapshot.paramMap.get('id')!;
    this.materiaId = this.route.snapshot.queryParamMap.get('materiaId')!;
    this.anioLectivoId = this.route.snapshot.queryParamMap.get('anioLectivoId')!;
    this.cargar();
  }

  cargar() {
    const params: any = { cursoId: this.cursoId, materiaId: this.materiaId, anioLectivoId: this.anioLectivoId };
    if (this.trimestre) params.trimestre = this.trimestre;

    this.cali.cargarTrimestreBulk(params).subscribe((res: any) => {
      this.rows = res?.data || res || [];
    });
  }
}
