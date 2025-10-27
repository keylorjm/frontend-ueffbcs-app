// src/app/pages/reportes/reporte-trimestral.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReporteService } from '../../services/reporte.service';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-reporte-trimestral',
  imports: [CommonModule, HttpClientModule, MatButtonModule],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-4 print:hidden">
      <h2 class="text-xl font-semibold">Reporte Trimestral</h2>
      <button mat-flat-button color="primary" (click)="print()">Imprimir</button>
    </div>

    <div class="paper bg-white p-6 rounded-2xl shadow print:shadow-none">
      <div class="mb-4">
        <div class="text-lg font-semibold">{{ header()?.curso?.nombre }} — {{ header()?.materia?.nombre }}</div>
        <div class="text-sm opacity-80">
          Profesor: {{ header()?.materia?.profesor?.nombre ?? '—' }} ·
          Año: {{ header()?.anio?.nombre }} ·
          Trimestre: {{ header()?.trimestre }}
        </div>
      </div>

      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2">Estudiante</th>
            <th class="text-left p-2">Prom.</th>
            <th class="text-left p-2">F. Just</th>
            <th class="text-left p-2">F. Injust</th>
            <th class="text-left p-2">Asist.</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows()" class="border-b">
            <td class="p-2">{{ r.estudiante?.nombre }}</td>
            <td class="p-2">{{ r.promedioTrimestral ?? '—' }}</td>
            <td class="p-2">{{ r.faltasJustificadas ?? 0 }}</td>
            <td class="p-2">{{ r.faltasInjustificadas ?? 0 }}</td>
            <td class="p-2">{{ r.asistenciaTotal ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
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
export class ReporteTrimestralComponent {
  private route = inject(ActivatedRoute);
  private svc = inject(ReporteService);

  header = signal<any>(null);
  rows = signal<any[]>([]);

  constructor() {
    this.route.queryParamMap.subscribe(qp => {
      const cursoId = qp.get('cursoId')!;
      const anioLectivoId = qp.get('anioLectivoId')!;
      const materiaId = qp.get('materiaId')!;
      const trimestre = (qp.get('trimestre') ?? 'T1') as 'T1'|'T2'|'T3';

      if (cursoId && anioLectivoId && materiaId && trimestre) {
        this.svc.getTrimestral({ cursoId, anioLectivoId, materiaId, trimestre }).subscribe({
          next: (res) => {
            this.header.set(res?.header ?? null);
            this.rows.set(res?.data ?? []);
          }
        });
      }
    });
  }

  print() { window.print(); }
}
