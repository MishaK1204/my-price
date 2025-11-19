import { inject, Injectable, signal } from "@angular/core";
import { Interaction } from "../interfaces/interaction.interface";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: 'root',
})
export class InteractionService {
    private http = inject(HttpClient);
  
    trackInteraction(interaction: Interaction) {
        return this.http.post(`${environment.apiUrl}product/interact`, interaction);
    }
}   