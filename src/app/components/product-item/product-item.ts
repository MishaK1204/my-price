import { Component, input } from '@angular/core';
import { Product } from '../../interfaces/home-products.interface';
import { Store } from '../../interfaces/settings.interface';

@Component({
  selector: 'my-price-product-item',
  standalone: true,
  imports: [],
  templateUrl: './product-item.html',
  styleUrl: './product-item.scss',
})
export class ProductItem {
  product = input.required<Product>();
  store = input<Store | null>(null);
  validityDate = input<string>('');

  onProductClick(): void {
    const productValue = this.product();
    if (productValue && productValue.url) {
      window.open(productValue.url, '_blank');
    }
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    // TODO: Implement favorite functionality
    console.log('Toggle favorite for:', this.product().productKey);
  }

  getDisplayPrice(): number {
    const productValue = this.product();
    return productValue.salePrice > 0 ? productValue.price - productValue.salePrice : productValue.price;
  }

  getDiscountPercent(): number | null {
    const productValue = this.product();
    if (productValue.salePrice > 0 && productValue.price > productValue.salePrice) {
      return Math.round(((productValue.price - productValue.salePrice) / productValue.price) * 100);
    }
    return null;
  }
}
