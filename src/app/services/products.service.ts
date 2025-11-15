import { inject, Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { StoreData, Product } from "../interfaces/home-products.interface";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private abortController?: AbortController;

  getProductsStream(): Observable<StoreData> {
    const subject = new Subject<StoreData>();

    // Cancel existing request if any
    this.abortController?.abort();

    // Create new AbortController for this request
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const streamUrl = 'https://chemifasi.runasp.net/stream';

    // Use fetch API for better control and CORS handling
    fetch(streamUrl, {
      signal,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent: string | null = null;
        let currentData: string | null = null;

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining event before completing
            if (currentEvent && currentData !== null) {
              this.processEvent(currentEvent, currentData, subject);
            }
            subject.complete();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              // Empty line indicates end of event, process it
              if (currentEvent && currentData !== null) {
                this.processEvent(currentEvent, currentData, subject);
                currentEvent = null;
                currentData = null;
              }
              continue;
            }

            // Parse SSE format
            if (trimmedLine.startsWith('event: ')) {
              currentEvent = trimmedLine.substring(7).trim();
            } else if (trimmedLine.startsWith('data: ')) {
              currentData = trimmedLine.substring(6).trim();
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Stream error:', error);
          subject.error(error);
        }
      });

    return new Observable(observer => {
      const subscription = subject.subscribe(observer);
      return () => {
        subscription.unsubscribe();
        this.abortController?.abort();
        this.abortController = undefined;
      };
      });
  }

  private processEvent(eventType: string, dataString: string, subject: Subject<StoreData>): void {
    try {
      if (eventType === 'store') {
        const data: StoreData = JSON.parse(dataString);
        subject.next(data);
      } else if (eventType === 'done') {
        // Stream is complete
        subject.complete();
      }
    } catch (error) {
      console.error('Error parsing event data:', error, dataString.substring(0, 100));
    }
  }

  getAllProducts(): Observable<Product[]> {
    const allProducts: Product[] = [];
    
    return new Observable(observer => {
      const streamSubscription = this.getProductsStream().subscribe({
        next: (storeData: StoreData) => {
          if (storeData?.products) {
            allProducts.push(...storeData.products);
            // Emit accumulated products so far
            observer.next([...allProducts]);
          }
        },
        error: (error) => {
          observer.error(error);
        },
        complete: () => {
          observer.complete();
        }
      });

      return () => {
        streamSubscription.unsubscribe();
      };
    });
  }

  closeStream(): void {
    this.abortController?.abort();
    this.abortController = undefined;
  }
}