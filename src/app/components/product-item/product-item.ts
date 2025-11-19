import { Component, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../interfaces/home-products.interface';
import { Store } from '../../interfaces/settings.interface';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'my-price-product-item',
  standalone: true,
  imports: [],
  templateUrl: './product-item.html',
  styleUrl: './product-item.scss',
})
export class ProductItem {
  private interactionService = inject(InteractionService);
  private route = inject(ActivatedRoute);

  product = input.required<Product>();
  store = input<Store | null>(null);
  validityDate = input<string>('');

  onProductClick(): void {
    const productValue = this.product();
    if (productValue && productValue.url) {
      window.open(productValue.url, '_blank');
    }

    const query = this.route.snapshot.queryParamMap.get('query') || '';

    this.interactionService.trackInteraction({
      productKey: this.product().productKey,
      name: this.product().name,
      price: this.product().price,
      salePrice: this.product().salePrice,
      url: this.product().url,
      imageUrl: this.product().imageUrl,
      source: this.product().source,
      eventType: 2,
      relevanceScore: this.product().relevanceScore,
      query: query,
    }).subscribe();
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
