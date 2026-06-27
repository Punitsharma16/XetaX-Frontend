import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../../../../../acore/base/base.service';
import { UrlConstants } from '../../../../../acore/util/url';
import { DiningResource, BackendResourceType } from '../models/resource.models';

@Injectable({ providedIn: 'root' })
export class ResourceService {

  constructor(private base: BaseService) {}

  getResources(resourceType: BackendResourceType): Observable<DiningResource[]> {
    return this.base.getDataFromAPI(UrlConstants.GET_RESOURCES + `?resourceType=${resourceType}`, 'json', true);
  }

  getByDisplayId(displayId: string): Observable<DiningResource> {
    return this.base.getDataFromAPI(UrlConstants.GET_RESOURCE_BY_DISPLAY_ID + displayId, 'json', true);
  }

  create(resource: Partial<DiningResource>): Observable<DiningResource> {
    return this.base.postDataFromAPI(UrlConstants.CREATE_RESOURCE, resource, 'json', true);
  }
}
