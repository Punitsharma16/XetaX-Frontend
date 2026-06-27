import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../../acore/base/base.service';
import { UrlConstants } from '../../../../../acore/util/url';
import { MenuCategory, MenuItem, MenuCategoryDto, MenuItemDto } from '../models/menu.models';

@Injectable({ providedIn: 'root' })
export class MenuService {

  constructor(private base: BaseService) {}

  getCategories(): Observable<MenuCategory[]> {
    return this.base.getDataFromAPI(UrlConstants.GET_MENU_CATEGORIES, 'json', true);
  }

  getMenuItems(): Observable<MenuItem[]> {
    return this.base.getDataFromAPI(UrlConstants.GET_MENU_ITEMS, 'json', true);
  }

  getMenuItemsByCategory(categoryId: number): Observable<MenuItem[]> {
    return this.base.getDataFromAPI(UrlConstants.GET_MENU_ITEMS_BY_CATEGORY + categoryId, 'json', true);
  }

  getAvailableMenuItems(): Observable<MenuItem[]> {
    return this.base.getDataFromAPI(UrlConstants.GET_AVAILABLE_MENU_ITEMS, 'json', true);
  }

  createMenuItem(dto: MenuItemDto): Observable<MenuItem> {
    return this.base.postDataFromAPI(UrlConstants.CREATE_MENU_ITEM, dto, 'json', true);
  }

  updateMenuItem(id: number, dto: MenuItemDto): Observable<MenuItem> {
    return this.base.putDataFromApi(UrlConstants.UPDATE_MENU_ITEM + id, dto, 'json', true);
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.base.deleteDataFromAPI(UrlConstants.DELETE_MENU_ITEM + id, 'json', true);
  }

  createCategory(dto: MenuCategoryDto): Observable<MenuCategory> {
    return this.base.postDataFromAPI(UrlConstants.CREATE_MENU_CATEGORY, dto, 'json', true);
  }

  updateCategory(id: number, dto: MenuCategoryDto): Observable<MenuCategory> {
    return this.base.putDataFromApi(UrlConstants.UPDATE_MENU_CATEGORY + id, dto, 'json', true);
  }

  deleteCategory(id: number): Observable<void> {
    return this.base.deleteDataFromAPI(UrlConstants.DELETE_MENU_CATEGORY + id, 'json', true);
  }
}
