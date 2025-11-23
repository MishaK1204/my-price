import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, signal, input } from '@angular/core';

@Component({
  selector: 'my-price-carousel',
  standalone: true,
  imports: [],
  templateUrl: './carousel.html',
  styleUrl: './carousel.scss',
})
export class Carousel implements AfterViewInit, OnDestroy {
  @ViewChild('track') private trackRef?: ElementRef<HTMLDivElement>;

  // Auto-scroll configuration
  autoScroll = input<boolean>(false);
  autoScrollInterval = input<number>(3500); // Default 3.5 seconds

  protected canScrollPrev = signal(false);
  protected canScrollNext = signal(false);

  private readonly scrollAmount = 320;
  private mutationObserver?: MutationObserver;
  private autoScrollTimer?: ReturnType<typeof setInterval>;
  private resumeTimer?: ReturnType<typeof setTimeout>;
  private isPaused = false;
  private isHovered = false;
  private isAutoScrolling = false;
  private lastScrollLeft = 0;
  private userScrollTimeout?: ReturnType<typeof setTimeout>;
  private readonly SCROLL_ANIMATION_DURATION = 600; // Match CSS smooth scroll duration

  ngAfterViewInit(): void {
    queueMicrotask(() => this.updateScrollState());
    this.observeMutations();
    
    if (this.autoScroll()) {
      // Start auto-scroll after a short delay to ensure DOM is ready
      setTimeout(() => this.startAutoScroll(), 500);
    }
  }

  ngOnDestroy(): void {
    this.mutationObserver?.disconnect();
    this.stopAutoScroll();
    this.clearResumeTimer();
    this.clearUserScrollTimeout();
  }

  protected scroll(direction: 'left' | 'right'): void {
    const track = this.trackRef?.nativeElement;
    if (!track) {
      return;
    }

    // User clicked arrow, pause auto-scroll
    if (this.autoScroll()) {
      this.pauseAutoScroll();
    }

    const amount = direction === 'left' ? -this.scrollAmount : this.scrollAmount;
    track.scrollBy({ left: amount, behavior: 'smooth' });
    this.lastScrollLeft = track.scrollLeft;

    setTimeout(() => {
      this.updateScrollState();
      this.lastScrollLeft = track.scrollLeft;
    }, this.SCROLL_ANIMATION_DURATION);
  }

  protected onTrackScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) {
      return;
    }

    const currentScroll = track.scrollLeft;
    const scrollDiff = Math.abs(currentScroll - this.lastScrollLeft);
    
    // Only check for user interaction if we're not in an auto-scroll animation
    // and the scroll change is significant (to avoid false positives)
    if (this.autoScroll() && !this.isPaused && !this.isHovered && !this.isAutoScrolling && scrollDiff > 10) {
      // This appears to be user interaction - debounce to confirm
      this.clearUserScrollTimeout();
      this.userScrollTimeout = setTimeout(() => {
        // If still not auto-scrolling after debounce, it's definitely user interaction
        if (!this.isAutoScrolling && !this.isPaused && !this.isHovered) {
          this.pauseAutoScroll();
        }
      }, 150);
    }

    this.lastScrollLeft = currentScroll;
    this.updateScrollState();
  }
  
  @HostListener('mouseenter')
  protected onMouseEnter(): void {
    if (this.autoScroll()) {
      this.isHovered = true;
      this.pauseAutoScroll();
    }
  }
  
  @HostListener('mouseleave')
  protected onMouseLeave(): void {
    if (this.autoScroll()) {
      this.isHovered = false;
      // Resume after a delay when mouse leaves
      this.resumeAutoScroll();
    }
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.updateScrollState();
  }

  private observeMutations(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) {
      return;
    }

    this.mutationObserver = new MutationObserver(() => {
      this.updateScrollState();
    });

    this.mutationObserver.observe(track, {
      childList: true,
      subtree: true,
    });
  }

  private updateScrollState(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) {
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const currentScroll = track.scrollLeft;

    this.canScrollPrev.set(currentScroll > 8);
    this.canScrollNext.set(maxScrollLeft - currentScroll > 8);
  }

  private startAutoScroll(): void {
    if (!this.autoScroll() || this.isPaused || this.isHovered) {
      return;
    }

    this.stopAutoScroll();
    this.isPaused = false;
    
    this.autoScrollTimer = setInterval(() => {
      if (!this.isPaused && !this.isHovered) {
        this.autoScrollNext();
      }
    }, this.autoScrollInterval());
  }

  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearInterval(this.autoScrollTimer);
      this.autoScrollTimer = undefined;
    }
  }

  private pauseAutoScroll(): void {
    if (this.isPaused) {
      return;
    }
    
    this.isPaused = true;
    this.stopAutoScroll();
    this.clearResumeTimer();
  }

  private resumeAutoScroll(): void {
    this.clearResumeTimer();
    
    // Wait a bit before resuming to avoid immediate scroll
    this.resumeTimer = setTimeout(() => {
      if (this.autoScroll() && !this.isHovered) {
        this.isPaused = false;
        this.startAutoScroll();
      }
    }, 1000);
  }

  private clearResumeTimer(): void {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = undefined;
    }
  }

  private clearUserScrollTimeout(): void {
    if (this.userScrollTimeout) {
      clearTimeout(this.userScrollTimeout);
      this.userScrollTimeout = undefined;
    }
  }

  private autoScrollNext(): void {
    const track = this.trackRef?.nativeElement;
    if (!track || this.isPaused || this.isHovered) {
      return;
    }

    // Mark that we're starting an auto-scroll animation
    this.isAutoScrolling = true;
    this.clearUserScrollTimeout(); // Clear any pending user scroll detection

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const currentScroll = track.scrollLeft;

    // Check if we're at the end (with a small threshold for rounding)
    if (maxScrollLeft - currentScroll <= 10) {
      // Loop back to the beginning
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Scroll right by one item
      const firstChild = track.firstElementChild as HTMLElement;
      let scrollAmount: number;
      
      if (firstChild) {
        const itemWidth = firstChild.offsetWidth;
        const gap = parseFloat(getComputedStyle(track).gap) || 16;
        scrollAmount = itemWidth + gap;
      } else {
        // Fallback to default scroll amount
        scrollAmount = this.scrollAmount;
      }
      
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Clear the auto-scrolling flag after animation completes
    setTimeout(() => {
      this.isAutoScrolling = false;
      this.updateScrollState();
      this.lastScrollLeft = track.scrollLeft;
    }, this.SCROLL_ANIMATION_DURATION);
  }
}
