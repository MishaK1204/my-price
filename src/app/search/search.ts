import { Component, DestroyRef, OnInit, inject, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Carousel } from '../components/carousel/carousel';
import { CategoryItem, CategoryItemData } from '../components/category-item/category-item';
import { StoreItem } from '../components/store-item/store-item';
import { ProductItem } from '../components/product-item/product-item';
import { SettingsService } from '../services/settings.service';
import { SettingsResponse } from '../interfaces/settings.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductsService } from '../services/products.service';
import { Product, StoreData } from '../interfaces/home-products.interface';
import { SearchService } from '../services/search.service';
import { Pagination } from '../components/pagination/pagination';
import { SearchProductsResponse } from '../interfaces/search-products.interface';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'my-price-search',
  standalone: true,
  imports: [CommonModule, FormsModule, Carousel, CategoryItem, StoreItem, ProductItem, Pagination],
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
  protected selectedCategoryCount = computed(() => {
    return this.selectedKey() ? 1 : 0;
  });
  protected categorizedStores = signal<Record<string, Record<string, { title: string; imageUrl?: string }>>>({});
  protected visibleStores = computed(() => {
    const selected = this.selectedKey();
    const query = this.currentQuery();
    const counts = this.storeCounts();
    const hasSearchResults = query && Object.keys(counts).length > 0;

    let stores: Array<{ key: string; title: string; imageUrl?: string; productCount?: number }> = [];

    if (!selected) {
      stores = this.allStores().map(store => ({ ...store }));
    } else {
      const catMap = this.categorizedStores()[selected] || {};
      stores = Object.entries(catMap).map(([key, store]) => ({
        key,
        title: store.title,
        imageUrl: store.imageUrl,
      }));
    }

    // When using search endpoint, filter to only show stores that have products
    // and add product count to each store
    if (hasSearchResults) {
      return stores
        .filter(store => counts[store.key] !== undefined && counts[store.key] > 0)
        .map(store => ({
          ...store,
          productCount: counts[store.key]
        }));
    }

    return stores;
  });

  // Products
  protected productsLoading = signal<boolean>(false);
  protected products = signal<Product[]>([]);
  protected selectedStores = signal<Set<string>>(new Set<string>());
  protected storeCounts = signal<Record<string, number>>({});

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

  // Scroll to top
  protected showScrollToTop = signal<boolean>(false);

  // Filters
  protected minPrice = signal<number | null>(null);
  protected maxPrice = signal<number | null>(null);
  protected sort = signal<1 | 2 | 3 | 4 | null>(null);
  
  // Debounce subjects for price filters
  private minPriceSubject = new Subject<number | null>();
  private maxPriceSubject = new Subject<number | null>();

  ngOnInit(): void {
    this.loadCategories();

    // Setup debounced price filters
    this.minPriceSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef$)
      )
      .subscribe(() => {
        this.onFilterChange();
      });

    this.maxPriceSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef$)
      )
      .subscribe(() => {
        this.onFilterChange();
      });

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
        this.loadSearchResults();
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
    this.products.set([]);
    this.currentPage.set(1);
    this.storeCounts.set({});

    this.productsService.categoryChanged.set(true);

    if (this.selectedKey() === key) {
      this.selectedKey.set(null);
      this.categoryId.set(null);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: null },
        replaceUrl: true,
      });
    } else {
      this.selectedKey.set(key);
      this.categoryId.set(key);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { category: key },
        replaceUrl: true,
      });
    }
  }

  private loadProductsForCategory(): void {
    this.productsLoading.set(true);
    this.currentPage.set(1);
    this.products.set([]);
    this.storeCounts.set({}); // Clear store counts when loading category products

    const filterOptions = {
      storeTypes: this.getSelectedStoreTypeIds(),
      minPrice: this.minPrice() || undefined,
      maxPrice: this.maxPrice() || undefined,
      sort: this.sort() || undefined,
    };

    this.productsService
      .getProductsStream(this.categoryId() || undefined, filterOptions)
      .pipe(takeUntilDestroyed(this.destroyRef$))
      .subscribe({
        next: (storeData: StoreData) => {
          this.products.set([...this.products(), ...storeData.products]);
        },
        error: () => {
          this.productsLoading.set(false);
        },
        complete: () => {
          this.productsLoading.set(false);
        },
      });
  }

  private loadSearchResults(): void {
    this.productsLoading.set(true);
    this.currentPage.set(1);
    this.products.set([]);

    const query = this.currentQuery();
    if (!query) {
      this.productsLoading.set(false);
      this.storeCounts.set({});
      return;
    }

    this.searchService.searchProducts(query, {
      storeTypes: this.getSelectedStoreTypeIds(),
      categoryId: Number(this.categoryId()) || undefined,
      minPrice: this.minPrice() || undefined,
      maxPrice: this.maxPrice() || undefined,
      sort: this.sort() || undefined,
    }).subscribe({
      next: (response: SearchProductsResponse) => {
        this.products.set(response.products);
        this.storeCounts.set(response.storeCounts || {});
        this.productsLoading.set(false);
      },
      error: (err) => {
        this.productsLoading.set(false);
        this.storeCounts.set({});
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
    this.products.set([]);
    this.currentPage.set(1);

    if (this.selectedStores().has(key)) {
      this.selectedStores().delete(key);
    } else {
      this.selectedStores().add(key);
    }

    this.applyFilters();
  }

  protected onFilterChange(): void {
    this.products.set([]);
    this.currentPage.set(1);
    this.applyFilters();
  }

  private applyFilters(): void {
    const query = this.currentQuery();
    if (query) {
      this.loadSearchResults();
    } else {
      this.loadProductsForCategory();
    }
  }

  private getSelectedStoreTypeIds(): number[] | undefined {
    const ids = Array.from(this.selectedStores()).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
    return ids.length ? ids : undefined;
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

  protected onMinPriceChange(value: string | null): void {
    const numValue = value ? Number(value) : null;
    this.minPrice.set(numValue);
    this.minPriceSubject.next(numValue);
  }

  protected onMaxPriceChange(value: string | null): void {
    const numValue = value ? Number(value) : null;
    this.maxPrice.set(numValue);
    this.maxPriceSubject.next(numValue);
  }

  protected onSortChange(value: string | null): void {
    if (value && ['1', '2', '3', '4'].includes(value)) {
      this.sort.set(Number(value) as 1 | 2 | 3 | 4);
    } else {
      this.sort.set(null);
    }
    this.onFilterChange();
  }
}
