import { inject, Injectable, ViewChild } from "@angular/core";
import { BehaviorSubject, catchError, map, Observable, throwError } from "rxjs";
import { Router } from "@angular/router";
import { HttpService } from "./http.service";

@Injectable({
    providedIn: 'root'
})

export abstract class BaseService {

    private loading = new BehaviorSubject<boolean>(false);
    loader = this.loading.asObservable(); // LoaderComponent will subscribe to this


    router = inject(Router);

    constructor(protected http: HttpService) {
    }

    postDataFromAPI(strUrl: string, body: any, responseType?: string, isheaderjson?: boolean): Observable<any> {
        console.log("Hiting this method ---> ", localStorage.getItem('access_token'));

        let tokenId = localStorage.getItem('access_token');
        if (tokenId == null) {
            localStorage.clear()
            this.router.navigate(['']);
        }

        return this.http?.extractPostData(strUrl, body, tokenId, responseType, isheaderjson)
            .pipe(
                map((res) => this.extractData(res)),
                catchError(this.handleError)
            )!;
    }

    getDataFromAPI(strUrl: string, responseType?: string, isheaderjson?: boolean): Observable<any> {
        let tokenId = localStorage.getItem('access_token');
        console.log("Checking for the token ", tokenId);

        if (tokenId == null) {
            localStorage.clear()
            this.router.navigate([""]);
        }
        return this.http?.extractGetData(strUrl, tokenId, responseType, isheaderjson)
            .pipe(
                map((res) => this.extractData(res)),
                catchError(this.handleError)
            )!;
    }

    patchDataFromAPI(strUrl: string, body: any, responseType?: string, isheaderjson?: boolean): Observable<any> {
        console.log("Hiting this method ---> ", localStorage.getItem('access_token'));

        let tokenId = localStorage.getItem('access_token');
        if (tokenId == null) {
            localStorage.clear()
            this.router.navigate(['']);
        }

        return this.http?.extractPatchData(strUrl, body, tokenId, responseType, isheaderjson)
            .pipe(
                map((res) => this.extractData(res)),
                catchError(this.handleError)
            )!;
    }


    putDataFromApi(strUrl: string, body: any, responseType?: string, isheaderjson?: boolean): Observable<any> {
        console.log("Hiting this method ---> ", localStorage.getItem('access_token'));

        let tokenId = localStorage.getItem('access_token');
        if (tokenId == null) {
            localStorage.clear()
            this.router.navigate(['']);
        }

        return this.http?.extractPutData(strUrl, body, tokenId, responseType, isheaderjson)
            .pipe(
                map((res) => this.extractData(res)),
                catchError(this.handleError)
            )!;
    }


    postFormDataToAPI(strUrl: string, formData: FormData, responseType?: string): Observable<any> {
      let tokenId = localStorage.getItem('access_token');
      if (tokenId == null) {
          localStorage.clear()
          this.router.navigate(['']);
      }
      return this.http?.extractPostFormData(strUrl, formData, tokenId, responseType)
          .pipe(
              map((res) => this.extractData(res)),
              catchError(this.handleError)
          )!;
    }

    deleteDataFromAPI(strUrl: string, responseType?: string, isheaderjson?: boolean): Observable<any> {
        let tokenId = localStorage.getItem('access_token');
        console.log("Checking for the token ", tokenId);

        if (tokenId == null) {
            localStorage.clear()
            this.router.navigate([""]);
        }
        return this.http?.deleteData(strUrl, tokenId, responseType, isheaderjson)
            .pipe(
                map((res) => this.extractData(res)),
                catchError(this.handleError)
            )!;
    }

    getResponseType(): string {
        return '';
    }


    protected extractData(res: any) {

        console.log(res);
        const body = res; // .json();
        return body || [];
    }

    protected handleError(error: any) {
        const errMsg = (error.message) ? error.message :
            error.status ? `${error.status} - ${error.statusText}` : 'Server error';
        //    this.globalPupUp.navigateTo(['']);
        console.error(errMsg);
        return throwError(() => errMsg);
    }


    showLoader() {
        this.loading.next(true);
    }

    hideLoader() {
        this.loading.next(false);
    }

}
