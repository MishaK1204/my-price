import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Carousel } from '../components/carousel/carousel';
import { CategoryItem, CategoryItemData } from '../components/category-item/category-item';
import { StoreItem } from '../components/store-item/store-item';
import { ProductItem } from '../components/product-item/product-item';
import { SettingsService } from '../services/settings.service';
import { SettingsResponse } from '../interfaces/settings.interface';
import { computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductsService } from '../services/products.service';
import { Product, StoreData } from '../interfaces/home-products.interface';
import { SearchService } from '../services/search.service';
import { Pagination } from '../components/pagination/pagination';
import { SearchProductsResponse } from '../interfaces/search-products.interface';

@Component({
  selector: 'my-price-search',
  standalone: true,
  imports: [CommonModule, Carousel, CategoryItem, StoreItem, ProductItem, Pagination],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  // Services
  private settingsService = inject(SettingsService);
  private productsService = inject(ProductsService);
  private searchService = inject(SearchService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef$ = inject(DestroyRef);
  
  protected categories = signal<CategoryItemData[]>([]);
  protected allStores = signal<Array<{ key: string; title: string; imageUrl?: string }>>([]);
  protected selectedKey = signal<string | null>(null);
  protected loading = signal<boolean>(true);
  protected error = signal<string | null>(null);
  protected categorizedStores = signal<Record<string, Record<string, { title: string; imageUrl?: string }>>>({});
  protected visibleStores = computed(() => {
    const selected = this.selectedKey();
    if (!selected) {
      return this.allStores();
    }

    const catMap = this.categorizedStores()[selected] || {};

    return Object.entries(catMap).map(([key, store]) => ({
      key,
      title: store.title,
      imageUrl: store.imageUrl,
    }));
  });

  // Products
  protected productsLoading = signal<boolean>(false);
  protected products = signal<Product[]>([]);
  protected selectedStores = signal<Set<string>>(new Set<string>());

  // Query params
  protected categoryId = signal<string | null>(null);

  // Pagination
  protected pageSize = signal<number>(24);
  protected currentPage = signal<number>(1);
  protected currentQuery = signal<string | null>(null);
  protected pagedProducts = computed(() => {
    const list = this.products();
    const size = this.pageSize();
    const page = this.currentPage();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadCategories();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef$)).subscribe((params) => {
      this.categoryId.set(params.get('category'));
      const qpQuery = params.get('query');
      const qpStores = params.getAll('store');

      this.selectedKey.set(this.categoryId());
      this.currentQuery.set(qpQuery);

      if (qpStores.length > 0) {
        this.selectedStores.set(new Set(qpStores));
      } else {
        this.selectedStores.set(new Set());
      }

      if (!qpQuery) {
        this.loadProductsForCategory();
      } else {
        this.productsLoading.set(true);
        this.currentPage.set(1);
        
        this.searchService.searchProducts(qpQuery!, {
          storeTypes: this.getSelectedStoreTypeIds(),
          categoryId: Number(this.categoryId()),
        }).subscribe({
          next: (response: SearchProductsResponse) => {
            this.products.set(response.products);
            this.productsLoading.set(false);
          },
          error: (err) => {
            this.productsLoading.set(false);
          },
          complete: () => {
            this.productsLoading.set(false);
          },
        });
      }
    });
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    this.settingsService.getSettings().subscribe({
      next: (settings: SettingsResponse) => {
        const stores: Array<{ key: string; title: string; imageUrl?: string }> = [];
        if (settings.storeSetting) {
          Object.entries(settings.storeSetting).forEach(([key, store]) => {
            stores.push({ key, title: store.title, imageUrl: store.imageUrl });
          });
        }

        this.allStores.set(stores);

        const catStores: Record<string, Record<string, { title: string; imageUrl?: string }>> = {};

        if (settings.categorizedStores) {
          Object.entries(settings.categorizedStores).forEach(([catKey, storeMap]) => {
            catStores[catKey] = {};
            Object.entries(storeMap).forEach(([storeKey, store]) => {
              catStores[catKey][storeKey] = { title: store.title, imageUrl: store.imageUrl };
            });
          });
        }

        this.categorizedStores.set(catStores);

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
        this.error.set('კატეგორიების ჩატვირთვა ვერ მოხერხდა.');
        this.loading.set(false);
      },
    });
  }

  protected onSelectCategory(key: string): void {
    this.selectedKey.set(key);
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: key },
      replaceUrl: true,
    });
  }

  private loadProductsForCategory(): void {
    this.productsLoading.set(true);
    this.currentPage.set(1);

    this.productsService
      .getProductsStream(this.categoryId() || undefined, { storeTypes: this.getSelectedStoreTypeIds() })
      .pipe(takeUntilDestroyed(this.destroyRef$))
      .subscribe({
        next: (storeData: StoreData) => {
          console.log(storeData.products);
          this.products.set([...storeData.products]);
        },
        error: () => {
          this.productsLoading.set(false);
        },
        complete: () => {
          this.productsLoading.set(false);
        },
      });
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  protected isStoreSelected(key: string): boolean {
    return this.selectedStores().has(key);
  }

  protected onToggleStore(key: string): void {
    if (this.selectedStores().has(key)) {
      this.selectedStores().delete(key);
    } else {
      this.selectedStores().add(key);
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        query: this.currentQuery(),
        store: this.getSelectedStoreTypeIds(),
        category: this.selectedKey(),
      },
      queryParamsHandling: 'merge',
    });
  }

  private getSelectedStoreTypeIds(): number[] | undefined {
    const ids = Array.from(this.selectedStores()).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
    return ids.length ? ids : undefined;
  }
}
