import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BaseService } from '../../base/base.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.html',
  styleUrls: ['./loader.css'],
})
export class Loader implements OnInit {

  isShowing = false;  // controlled by service
  loaderSize: string = '4.5em';

  constructor(private loaderService: BaseService) { }

  ngOnInit(): void {
    this.loaderService.loader.subscribe(state => {
      console.log("LoaderComponent state =", state);
      this.isShowing = state;
    });
  }
}
