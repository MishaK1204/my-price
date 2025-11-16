import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Carousel } from '../components/carousel/carousel';
import { CategoryItem, CategoryItemData } from '../components/category-item/category-item';
import { StoreItem } from '../components/store-item/store-item';
import { SettingsService } from '../services/settings.service';
import { SettingsResponse } from '../interfaces/settings.interface';
import { computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'my-price-search',
  standalone: true,
  imports: [CommonModule, Carousel, CategoryItem, StoreItem],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  private settingsService = inject(SettingsService);
  private route = inject(ActivatedRoute);
  private destroyRef$ = inject(DestroyRef);
  
  protected categories = signal<CategoryItemData[]>([]);
  protected selectedKey = signal<string | null>(null);
  protected loading = signal<boolean>(true);
  protected error = signal<string | null>(null);
  protected allStores = signal<Array<{ key: string; title: string; imageUrl?: string }>>([]);
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

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef$)).subscribe((params) => {
      const qpCategory = params.get('category');
      if (qpCategory) {
        this.selectedKey.set(qpCategory);
      } else {
        this.selectedKey.set(null);
      }
    });

    this.loadCategories();
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settingsService.getSettings().subscribe({
      next: (settings: SettingsResponse) => {
        // Build stores collections
        const stores: Array<{ key: string; title: string; imageUrl?: string }> = [];
        if (settings.storeSetting) {
          Object.entries(settings.storeSetting).forEach(([key, store]) => {
            stores.push({ key, title: store.title, imageUrl: store.imageUrl });
          });
        }
        this.allStores.set(stores);
        // Save categorized stores map (only fields we need)
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
      error: (err) => {
        console.error('Error loading categories:', err);
        this.error.set('კატეგორიების ჩატვირთვა ვერ მოხერხდა.');
        this.loading.set(false);
      },
    });
  }

  protected onSelectCategory(key: string): void {
    this.selectedKey.set(key);
  }
}
