// src/app/services/materia.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

// Estructura mínima del Profesor que viene populada desde el backend
export interface Profesor {
    _id: string; // ID del usuario/profesor
    nombre: string;
}

// Interfaz de Materia: incluye la descripción y el objeto Profesor
export interface Materia {
    uid?: string; 
    nombre: string;
    descripcion: string;
    profesor: Profesor; // Objeto del profesor populado
    estado?: boolean;
}

// Interfaz para la respuesta completa de la API
interface MateriaResponse {
    ok: boolean;
    total: number;
    materias: Materia[]; // El array que debemos extraer
}

@Injectable({
  providedIn: 'root'
})
export class MateriaService {
  getById(id: Materia): any {
      throw new Error('Method not implemented.');
  }
  private api = inject(ApiService);
  private basePath = 'materias'; 

  // OBTENER TODAS LAS MATERIAS (GET)
  getAll(): Observable<Materia[]> {
    return this.api.get<MateriaResponse>(this.basePath).pipe(
      // CRÍTICO: Extrae solo el array 'materias'
      map(response => response.materias) 
    );
  }

  // CREAR MATERIA (POST)
  create(materia: Partial<Materia>): Observable<Materia> {
    // Nota: Aquí se envía solo el 'uid' del profesor, no el objeto completo
    return this.api.post<Materia>(this.basePath, materia);
  }

  // ACTUALIZAR MATERIA (PUT)
  update(id: string, materia: Partial<Materia>): Observable<Materia> {
    return this.api.put<Materia>(`${this.basePath}/${id}`, materia);
  }

  // ELIMINAR MATERIA (DELETE - Lógico)
  delete(id: string): Observable<any> {
    return this.api.delete<any>(`${this.basePath}/${id}`);
  }
}