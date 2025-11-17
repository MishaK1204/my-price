import { Component, effect, inject, signal, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'my-price-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private router = inject(Router);
  private productsService = inject(ProductsService);

  searchQuery: string = '';
  protected isVisible = signal<boolean>(true);
  private lastScrollY = 0;
  private scrollThreshold = 100;

  constructor() {
    effect(() => {
      if (this.productsService.categoryChanged()) {
        this.searchQuery = '';
      }
    });
  }

  ngOnInit(): void {
    this.lastScrollY = window.scrollY;
    if (window.scrollY < 50) {
      this.isVisible.set(true);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const currentScrollY = window.scrollY;
    const scrollDifference = currentScrollY - this.lastScrollY;

    if (Math.abs(scrollDifference) < this.scrollThreshold) {
      return;
    }

    if (currentScrollY < 50) {
      this.isVisible.set(true);
    }
    else if (scrollDifference > 0) {
      this.isVisible.set(false);
    }
    else if (scrollDifference < 0) {
      this.isVisible.set(true);
    }

    this.lastScrollY = currentScrollY;
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim();
      this.router.navigate(['/search'], { queryParams: { query }, queryParamsHandling: 'merge' });
    }
  }
}
