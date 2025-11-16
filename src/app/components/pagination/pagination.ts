import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'my-price-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  private _totalItems = signal<number>(0);
  private _pageSize = signal<number>(24);
  private _currentPage = signal<number>(1);

  @Input('totalItems')
  set totalItemsInput(value: number | null | undefined) {
    this._totalItems.set(Math.max(0, value ?? 0));
    this.clampCurrentPage();
  }
  totalItems = this._totalItems.asReadonly();

  @Input('pageSize')
  set pageSizeInput(value: number | null | undefined) {
    this._pageSize.set(Math.max(1, value ?? 24));
    this.clampCurrentPage();
  }
  pageSize = this._pageSize.asReadonly();

  @Input('currentPage')
  set currentPageInput(value: number | null | undefined) {
    this._currentPage.set(Math.max(1, value ?? 1));
    this.clampCurrentPage();
  }
  currentPage = this._currentPage.asReadonly();

  @Output() pageChange = new EventEmitter<number>();

  totalPages = computed(() => {
    const size = this._pageSize();
    const total = this._totalItems();
    return size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const cur = this._currentPage();
    const maxButtons = 7;
    const pages: number[] = [];

    if (total <= maxButtons) {
      for (let p = 1; p <= total; p++) pages.push(p);
      return pages;
    }

    pages.push(1);
    const range = 2;
    let start = Math.max(2, cur - range);
    let end = Math.min(total - 1, cur + range);

    if (start > 2) {
      pages.push(2);
    }
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (end < total - 1) {
      pages.push(total - 1);
    }
    pages.push(total);

    // Deduplicate and sort
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  });

  goToPage(p: number): void {
    const clamped = Math.min(Math.max(1, p), this.totalPages());
    if (clamped !== this._currentPage()) {
      this._currentPage.set(clamped);
      this.pageChange.emit(clamped);
    }
  }

  trackByPage = (_: number, p: number) => p;

  private clampCurrentPage(): void {
    const clamped = Math.min(Math.max(1, this._currentPage()), this.totalPages());
    if (clamped !== this._currentPage()) {
      this._currentPage.set(clamped);
      this.pageChange.emit(clamped);
    }
  }
}


