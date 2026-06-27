import { Component, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import { CustomModalPopUpService } from '../custom-popup-model/custom-popup.service';
import { ShowAlertModel } from './show-alert.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-show-alert',
  imports: [CommonModule],
  templateUrl: './show-alert.html',
  styleUrl: './show-alert.css',
})
export class ShowAlert implements OnInit {

  @Input()
  basicSetting: ShowAlertModel = {
    id: '',
    button1: '',
    button2: '',
    message: '',
    image: '',
    type: ''
  };

  @Output() alertAfterViewInIt = new EventEmitter();

  private isShowing: boolean = false;

  @Input() get show(): boolean {
    return this.isShowing;
  }



  @Output() Ok = new EventEmitter();
  @Output() close = new EventEmitter();

  set show(val: boolean) {
    this.cmpus.showHideAlert(val, this.basicSetting.id);
    this.isShowing = val;
  }



  constructor(private cmpus: CustomModalPopUpService) { }

  ngOnInit(): void {
    // this.cmpus._registerAlertModal(this.basicSetting); 
  }

  // ngAfterViewInit() {
  //   this.cmpus.showHideAlert(this.isShowing, this.basicSetting.id);

  //    this.alertAfterViewInIt.emit();
  // }

  onButton1Clicked() {
    this.show = false;
    this.Ok.emit();

  }

  onButton2Clicked() {
    this.show = false;
    this.close.emit();
  }

}
