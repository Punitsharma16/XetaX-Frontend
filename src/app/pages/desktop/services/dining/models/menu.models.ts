export interface MenuCategory {
  id: number;
  name: string;
  icon: string;
  itemCount: number;
}

export interface MenuItem {
  id: number;
  itemCode: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: number;
  categoryName: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
  preparationTime: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions: string;
}

export interface MenuCategoryDto {
  name: string;
  icon: string;
}

export interface MenuItemDto {
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: number;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
  preparationTime: number;
}
