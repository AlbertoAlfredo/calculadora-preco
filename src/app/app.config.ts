import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ProdutoService } from './services/produto.service';
import { ProdutoRepository, criarProdutoRepository } from './data/produto.repository';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // SQLite nativo no Android; localStorage no navegador (desenvolvimento com `ng serve`).
    { provide: ProdutoRepository, useFactory: criarProdutoRepository },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // Abre o banco local e carrega os produtos antes de exibir a primeira tela.
    provideAppInitializer(() => inject(ProdutoService).inicializar()),
  ]
};
