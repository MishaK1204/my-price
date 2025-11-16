import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StoreItemData {
  key: string;
  title: string;
  imageUrl?: string;
  meta?: string;
}

@Component({
  selector: 'my-price-store-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-item.html',
  styleUrl: './store-item.scss',
})
export class StoreItem {
  data = input.required<StoreItemData>();
  selected = input<boolean>(false);
}


