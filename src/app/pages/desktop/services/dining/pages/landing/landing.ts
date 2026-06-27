import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { ResourceService } from '../../services/resource.service';
import { CustomerService } from '../../services/customer.service';
import { ResourceType, DiningResource } from '../../models/resource.models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class Landing implements OnInit {
  resourceType: ResourceType = 'table';
  resourceId = '';
  isRestaurant = true;
  isHotel = false;
  isLoading = true;

  resource: DiningResource | null = null;

  restaurantInfo = {
    name: 'The Grand Kitchen',
    description: 'Experience finest dining with our curated menu',
    rating: 4.5,
    address: '123 Main Street, City Center',
    openTime: '08:00 AM',
    closeTime: '11:00 PM',
    isOpen: true,
  };

  tableInfo = {
    number: '',
    capacity: 4,
  };

  roomInfo = {
    number: '',
    type: 'Deluxe',
    floor: 2,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resourceService: ResourceService,
    private customerService: CustomerService,
    private service: BaseService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const url = this.router.url;
      if (url.includes('/room/')) {
        this.resourceType = 'room';
        this.isRestaurant = false;
        this.isHotel = true;
      }
      this.resourceId = params['id'];

      this.service.showLoader();
      this.resourceService.getByDisplayId(this.resourceId).pipe(
        catchError(() => of(null))
      ).subscribe(res => {
        this.service.hideLoader();
        this.resource = res;
        if (res) {
          this.tableInfo.number = res.number;
          this.tableInfo.capacity = res.capacity;
          this.roomInfo.number = res.number;
          this.roomInfo.type = res.roomType || 'Deluxe';
          this.roomInfo.floor = res.floor || 2;
        } else {
          this.tableInfo.number = this.resourceId.replace('TBL', '');
          this.roomInfo.number = this.resourceId.replace('RM', '');
        }
        this.isLoading = false;

        this.customerService.setSession({
          customerId: '',
          customerName: '',
          customerMobile: '',
          resourceType: this.resourceType,
          resourceId: this.resourceId,
          resourceName: this.isRestaurant ? `Table ${this.tableInfo.number}` : `Room ${this.roomInfo.number}`,
        });
      });
    });
  }

  viewMenu(): void {
    const base = this.isRestaurant ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/menu`);
  }

  startOrder(): void {
    this.viewMenu();
  }

  goToDashboard(): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/dashboard`);
  }

  goToBill(): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/bill`);
  }

  goBack(): void {
    this.router.navigateByUrl('/pages/qr-ordering');
  }
}
