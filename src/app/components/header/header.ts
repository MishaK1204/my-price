import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'my-price-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  searchQuery: string = '';
  constructor(private router: Router) {}

  onSearch(): void {
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim();
      this.router.navigate(['/search'], { queryParams: { query } });
    }
  }
}
