import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { MenuService } from '../../services/menu.service';
import { MenuCategory, MenuItem, MenuCategoryDto, MenuItemDto } from '../../models/menu.models';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './menu-management.html',
  styleUrls: ['./menu-management.css'],
})
export class MenuManagement implements OnInit {
  categories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  activeCategory: number | 'all' = 'all';
  searchTerm = '';
  isLoading = false;

  showItemForm = false;
  showCategoryForm = false;
  editMode = false;
  selectedItem: MenuItem | null = null;

  itemForm: MenuItemDto = {
    name: '',
    description: '',
    price: 0,
    categoryId: 0,
    isVeg: true,
    isAvailable: true,
    preparationTime: 10,
    image: '',
    rating: 4.0,
  };

  categoryForm: MenuCategoryDto = {
    name: '',
    icon: 'bi-basket',
  };

  editCategoryMode = false;
  selectedCategory: MenuCategory | null = null;

  constructor(
    private menuService: MenuService,
    private service: BaseService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.service.showLoader();
    combineLatest([
      this.menuService.getCategories(),
      this.menuService.getMenuItems()
    ]).subscribe(([cats, items]) => {
      this.categories = cats;
      this.menuItems = items;
      this.isLoading = false;
      this.service.hideLoader();
      this.filterByCategory(this.activeCategory);
    });
  }

  filterByCategory(categoryId: number | 'all'): void {
    this.activeCategory = categoryId;
    let items = this.menuItems;
    if (categoryId !== 'all') {
      items = items.filter(i => i.categoryId === categoryId);
    }
    const q = this.searchTerm.toLowerCase();
    if (q) {
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    this.filteredItems = items;
  }

  onSearch(): void {
    this.filterByCategory(this.activeCategory);
  }

  getCategoryIcon(categoryId: number): string {
    return this.categories.find(c => c.id === categoryId)?.icon || 'bi-basket';
  }

  openNewItem(): void {
    this.editMode = false;
    this.selectedItem = null;
    this.itemForm = {
      name: '',
      description: '',
      price: 0,
      categoryId: this.categories[0]?.id || 0,
      isVeg: true,
      isAvailable: true,
      preparationTime: 10,
      image: '',
      rating: 4.0,
    };
    this.showItemForm = true;
  }

  openEditItem(item: MenuItem): void {
    this.editMode = true;
    this.selectedItem = item;
    this.itemForm = {
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime,
      image: item.image,
      rating: item.rating,
    };
    this.showItemForm = true;
  }

  saveItem(): void {
    if (!this.itemForm.name || !this.itemForm.categoryId) return;
    if (this.editMode && this.selectedItem) {
      this.menuService.updateMenuItem(this.selectedItem.id, this.itemForm).subscribe(() => {
        this.loadData();
        this.showItemForm = false;
      });
    } else {
      this.menuService.createMenuItem(this.itemForm).subscribe(() => {
        this.loadData();
        this.showItemForm = false;
      });
    }
  }

  deleteItem(item: MenuItem): void {
    this.menuService.deleteMenuItem(item.id).subscribe(() => {
      this.loadData();
    });
  }

  openNewCategory(): void {
    this.editCategoryMode = false;
    this.selectedCategory = null;
    this.categoryForm = { name: '', icon: 'bi-basket' };
    this.showCategoryForm = true;
  }

  openEditCategory(cat: MenuCategory): void {
    this.editCategoryMode = true;
    this.selectedCategory = cat;
    this.categoryForm = { name: cat.name, icon: cat.icon };
    this.showCategoryForm = true;
  }

  saveCategory(): void {
    if (!this.categoryForm.name) return;
    if (this.editCategoryMode && this.selectedCategory) {
      this.menuService.updateCategory(this.selectedCategory.id, this.categoryForm).subscribe(() => {
        this.loadData();
        this.showCategoryForm = false;
      });
    } else {
      this.menuService.createCategory(this.categoryForm).subscribe(() => {
        this.loadData();
        this.showCategoryForm = false;
      });
    }
  }

  deleteCategory(cat: MenuCategory): void {
    this.menuService.deleteCategory(cat.id).subscribe(() => {
      this.loadData();
    });
  }

  cancelItem(): void {
    this.showItemForm = false;
  }

  cancelCategory(): void {
    this.showCategoryForm = false;
  }

  trackById(index: number, item: MenuItem | MenuCategory): number {
    return item.id;
  }
}
