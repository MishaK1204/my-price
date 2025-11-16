import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../components/product-item/product-item';
import { SettingsService } from '../services/settings.service';
import { SettingsResponse, Store } from '../interfaces/settings.interface';
import { ProductsService } from '../services/products.service';
import { StoreData } from '../interfaces/home-products.interface';

@Component({
  selector: 'my-price-home',
  standalone: true,
  imports: [CommonModule, ProductItem],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private settingsService = inject(SettingsService);
  private productsService = inject(ProductsService);

  protected storeData = signal<StoreData[]>([]);
  protected categories = signal<string[]>([]);
  protected loading = signal<boolean>(true);
  protected productsLoading = signal<boolean>(true);
  protected error = signal<string | null>(null);
  protected storeMap = signal<Map<number, Store>>(new Map());

  ngOnInit(): void {
    this.loadSettings();
    this.loadProducts();
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.settingsService.getSettings().subscribe({
      next: (settings: SettingsResponse) => {
        const storeMap = new Map<number, Store>();
        if (settings.storeSetting) {
          Object.entries(settings.storeSetting).forEach(([key, store]) => {
            const storeNumber = parseInt(key, 10);
            if (!isNaN(storeNumber)) {
              storeMap.set(storeNumber, store);
            }
          });
        }
        this.storeMap.set(storeMap);

        const names = settings?.categories
          ? Object.values(settings.categories)
              .map((category) => category.title)
              .filter((title): title is string => Boolean(title?.trim()))
          : [];

        this.categories.set(names);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('კატეგორიების ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა მოგვიანებით.');
        this.loading.set(false);
      },
    });
  }

  protected loadProducts(): void {
    this.productsLoading.set(true);
    
    this.productsService.getProductsStream().subscribe({
      next: (storeData: StoreData) => {
        this.storeData.set([...this.storeData(), storeData]);

        this.productsLoading.set(false);
      },
      error: (error) => {
        console.error('Error receiving products stream:', error);
        this.productsLoading.set(false);
      },
      complete: () => {
        console.log('Products stream completed');
        this.productsLoading.set(false);
      }
    });
  }
}
