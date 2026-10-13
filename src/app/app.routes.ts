import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'produtos' },
  {
    path: 'produtos',
    title: 'Produtos · Calculadora de Preço',
    loadComponent: () => import('./pages/produto-lista/produto-lista').then((m) => m.ProdutoLista),
  },
  {
    path: 'produtos/novo',
    title: 'Novo produto · Calculadora de Preço',
    loadComponent: () => import('./pages/produto-form/produto-form').then((m) => m.ProdutoForm),
  },
  {
    path: 'produtos/:id',
    title: 'Editar produto · Calculadora de Preço',
    loadComponent: () => import('./pages/produto-form/produto-form').then((m) => m.ProdutoForm),
  },
  { path: '**', redirectTo: 'produtos' },
];
