import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RegistroAdmin = Record<string, any>;

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = 'https://localhost:44398/api';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return new HttpHeaders();
    }

    const token = localStorage.getItem('token');

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  listar(endpoint: string): Observable<RegistroAdmin[]> {
    return this.http.get<RegistroAdmin[]>(`${this.baseUrl}/${endpoint}`, {
      headers: this.headers()
    });
  }

  crear(endpoint: string, data: RegistroAdmin): Observable<RegistroAdmin> {
    return this.http.post<RegistroAdmin>(`${this.baseUrl}/${endpoint}`, data, {
      headers: this.headers()
    });
  }

  actualizar(endpoint: string, id: number | string, data: RegistroAdmin): Observable<RegistroAdmin> {
    return this.http.put<RegistroAdmin>(`${this.baseUrl}/${endpoint}/${id}`, data, {
      headers: this.headers()
    });
  }
}
