import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegisterModel } from './model';
import { BaseService } from '../../../acore/base/base.service';
import { UrlConstants } from '../../../acore/util/url';
import { Router } from '@angular/router';
import { CustomModalPopUpService } from '../../../acore/components/custom-popup-model/custom-popup.service';
import { ShowAlert } from '../../../acore/components/show-alert/show-alert';
import { Loader } from '../../../acore/components/loader/loader';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, Loader, ShowAlert],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  registerModel: RegisterModel = {
    email: '',
    password: '',
    name: '',
    provider: 'LOCAL',
    isEnable: true,
    isAdmin: false,
  };
  basicAlertSetting = {
    id: 'lead-alert',
    button1: 'Hello',
    button2: 'Hello',
    message: '',
    image: '',
    type: ''
  }
  isLogin = true;

  constructor(private service: BaseService, private router: Router, private alertService: CustomModalPopUpService) {

  }
  toggle() {
    this.isLogin = !this.isLogin;
  }

  onSubmit() {
    this.service.showLoader();
    const url = this.isLogin ? UrlConstants.LoginUrl : UrlConstants.RegisterUrl;
    this.service.postDataFromAPI(url, this.registerModel, "json", true).subscribe({
      next: (response) => {
        console.log("Registration successful:", response);
        this.service.hideLoader();
        localStorage.setItem("access_token", response.accessToken);
        localStorage.setItem("user_info", JSON.stringify(response.userDto));
        this.router.navigate(['/pages']);
      },
      error: (error) => {
        console.log("Registration failed:", error);
        this.service.hideLoader();
        this.showAlert('Error', error.error?.message || 'Something went wrong');
      }
    })
    console.log("The form value is ", this.registerModel);
  }


  showAlert(type: 'Success' | 'Error', message: string): void {
    this.basicAlertSetting.message = message;
    this.basicAlertSetting.type = type;
    this.basicAlertSetting.image = type === 'Success' ? '../../../../../assets/images/success.png' : '../../../../../assets/images/warning.png';
    this.alertService.showHideAlert(true, this.basicAlertSetting.id)
  }

}
