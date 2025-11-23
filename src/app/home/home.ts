import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductItem } from '../components/product-item/product-item';
import { SettingsService } from '../services/settings.service';
import { SettingsResponse, Store } from '../interfaces/settings.interface';
import { ProductsService } from '../services/products.service';
import { StoreData } from '../interfaces/home-products.interface';
import { Carousel } from '../components/carousel/carousel';
import { CategoryItem, CategoryItemData } from '../components/category-item/category-item';
import { StoreItem } from '../components/store-item/store-item';

@Component({
  selector: 'my-price-home',
  standalone: true,
  imports: [CommonModule, ProductItem, Carousel, CategoryItem, StoreItem],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private settingsService = inject(SettingsService);
  private productsService = inject(ProductsService);
  private router = inject(Router);

  protected storeData = signal<StoreData[]>([]);
  protected categories = signal<CategoryItemData[]>([]);
  protected stores = signal<Array<{ key: string; title: string; imageUrl?: string }>>([]);
  protected loading = signal<boolean>(true);
  protected productsLoading = signal<boolean>(true);
  protected error = signal<string | null>(null);
  protected storeMap = signal<Map<number, Store>>(new Map());
  protected showScrollToTop = signal<boolean>(false);

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

        // Load stores for the carousel
        const storeItems: Array<{ key: string; title: string; imageUrl?: string }> = [];
        if (settings.storeSetting) {
          Object.entries(settings.storeSetting).forEach(([key, store]) => {
            storeItems.push({ key, title: store.title, imageUrl: store.imageUrl });
          });
        }
        this.stores.set(storeItems);

        const items: CategoryItemData[] = [];

        if (settings.categories) {
          Object.entries(settings.categories).forEach(([key, category]) => {
            const storeCount =
              settings.categorizedStores && settings.categorizedStores[key]
                ? Object.keys(settings.categorizedStores[key]).length
                : 0;
            items.push({
              key,
              title: category.title,
              imageUrl: category.imageUrl,
              storeCount,
            });
          });
        }

        this.categories.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('კატეგორიების ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა მოგვიანებით.');
        this.loading.set(false);
      },
    });
  }

  protected onSelectCategory(key: string): void {
    this.router.navigate(['/search'], {
      queryParams: { category: key }
    });
  }

  protected onSelectStore(key: string): void {
    this.router.navigate(['/search'], {
      queryParams: { store: key }
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

  protected onSeeAll(storeId: number): void {
    this.router.navigate(['/search'], {
      queryParams: { store: storeId }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const scrollY = window.scrollY;
    // Show button when scrolled down more than 300px
    this.showScrollToTop.set(scrollY > 300);
  }

  protected scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
