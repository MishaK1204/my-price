import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { SearchProductsResponse } from "../interfaces/search-products.interface";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);

  searchProducts(
    query: string,
    options?: {
      minPrice?: number;
      maxPrice?: number;
      storeTypes?: number[];
      sort?: 1 | 2 | 3 | 4;
    }
  ): Observable<SearchProductsResponse> {
    let params = new HttpParams().set('query', query);

    if (options?.minPrice != null) {
      params = params.set('minPrice', String(options.minPrice));
    }
    if (options?.maxPrice != null) {
      params = params.set('maxPrice', String(options.maxPrice));
    }
    if (options?.storeTypes?.length) {
      options.storeTypes.forEach((storeType) => {
        params = params.append('storeTypes', String(storeType));
      });
    }
    if (options?.sort != null) {
      params = params.set('sort', String(options.sort));
    }

    return this.http.get<SearchProductsResponse>(`${environment.apiUrl}product/search`, { params });
  }
}