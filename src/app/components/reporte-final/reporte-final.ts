// src/app/pages/reportes/reporte-final.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteService } from '../../services/reporte.service';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-reporte-final',
  imports: [CommonModule, HttpClientModule, MatButtonModule],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-4 print:hidden">
      <h2 class="text-xl font-semibold">Informe Final Anual</h2>
      <button mat-flat-button color="primary" (click)="print()">Imprimir</button>
    </div>

    <div class="paper bg-white p-6 rounded-2xl shadow print:shadow-none" *ngIf="header()">
      <div class="mb-4">
        <div class="text-lg font-semibold">
          {{ header()?.curso?.nombre }} — Estudiante: {{ header()?.estudiante?.nombre }}
        </div>
        <div class="text-sm opacity-80">Año: {{ header()?.anio?.nombre }}</div>
      </div>

      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2">Materia</th>
            <th class="text-left p-2">T1</th>
            <th class="text-left p-2">T2</th>
            <th class="text-left p-2">T3</th>
            <th class="text-left p-2">Prom. Anual</th>
            <th class="text-left p-2">Cualitativa</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows()" class="border-b">
            <td class="p-2">{{ r.materia?.nombre }}</td>
            <td class="p-2">{{ r.T1?.promedioTrimestral ?? '—' }}</td>
            <td class="p-2">{{ r.T2?.promedioTrimestral ?? '—' }}</td>
            <td class="p-2">{{ r.T3?.promedioTrimestral ?? '—' }}</td>
            <td class="p-2">{{ r.promedioTrimestralAnual ?? '—' }}</td>
            <td class="p-2">{{ r.cualitativaFinal ?? '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 text-right text-sm">
        <strong>Promedio General:</strong> {{ promedioGeneral() ?? '—' }}
      </div>
    </div>
  </div>
  `,
  styles: [`
    @media print {
      .print\\:hidden { display: none !important; }
      .paper { box-shadow: none !important; border: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `]
})
export class ReporteFinalComponent {
  private route = inject(ActivatedRoute);
  private svc = inject(ReporteService);

  header = signal<any>(null);
  rows = signal<any[]>([]);
  promedioGeneral = signal<number | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe(qp => {
      const cursoId = qp.get('cursoId')!;
      const anioLectivoId = qp.get('anioLectivoId')!;
      const estudianteId = qp.get('estudianteId')!;
      if (cursoId && anioLectivoId && estudianteId) {
        this.svc.getFinal({ cursoId, anioLectivoId, estudianteId }).subscribe({
          next: (res) => {
            this.header.set(res?.header ?? null);
            this.rows.set(res?.rows ?? []);
            this.promedioGeneral.set(res?.promedioGeneral ?? null);
          }
        });
      }
    });
  }

  print() { window.print(); }
}
