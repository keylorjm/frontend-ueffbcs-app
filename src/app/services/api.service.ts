// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl; // ej: '/api' o 'http://localhost:5000/api'

  /** 🔧 Helper para construir HttpParams desde un objeto plano */
  private buildParams(params?: Record<string, any>) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
      });
    }
    return httpParams;
  }

  /** JSON por defecto */
  private getHttpOptions(params?: Record<string, any>) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return {
      headers,
      params: this.buildParams(params),
      // withCredentials: true, // activa si usas cookies
    };
  }

  // === 🆕 POST para FormData (subidas) — sin fijar Content-Type ===
  postForm<T>(
    path: string,
    form: FormData,
    params?: Record<string, any>,
    opts?: { withCredentials?: boolean; authToken?: string }
  ): Observable<T> {
    let headers = new HttpHeaders();
    if (opts?.authToken) headers = headers.set('Authorization', `Bearer ${opts.authToken}`);
    return this.http.post<T>(`${this.baseUrl}/${path}`, form, {
      headers, // sin 'Content-Type' → el navegador pone multipart con boundary
      params: this.buildParams(params),
      withCredentials: !!opts?.withCredentials,
    });
  }

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, this.getHttpOptions(params));
  }
  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body, this.getHttpOptions());
  }
  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${path}`, body, this.getHttpOptions());
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${path}`, this.getHttpOptions());
  }
}
