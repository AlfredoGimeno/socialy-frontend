import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private http = inject(HttpClient);

  message = 'Cargando...';

  constructor() {
    this.http.get('http://localhost:8080/api/test', { responseType: 'text' })
      .subscribe({
        next: (response) => {
          this.message = response;
          console.log(response);
        },
        error: (error) => {
          console.error(error);
          this.message = 'Error al conectar con el backend';
        }
      });
  }
}
