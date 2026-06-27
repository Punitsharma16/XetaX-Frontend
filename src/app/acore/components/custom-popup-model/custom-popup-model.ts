import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import { PopUpModel } from './popup.model';
import { CommonModule } from '@angular/common';
import { CustomModalPopUpService } from './custom-popup.service';

@Component({
  selector: 'app-custom-popup-model',
  imports: [CommonModule],
  templateUrl: './custom-popup-model.html',
  styleUrl: './custom-popup-model.css',
})
export class CustomPopupModel implements OnInit {

  @Input()
  basicSetting: PopUpModel = {
    id: '',
    title: '',
  };

  @Input() template!: TemplateRef<any>;



  constructor(private modalService: CustomModalPopUpService) { }

  ngOnInit(): void {
  }

  closeModal() {
    this.modalService.showHideMe(false, this.basicSetting.id);
  }

}
