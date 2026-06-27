import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, throwError, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HttpService {

  constructor(private http: HttpClient) { }

  extractPostData(
    url: string,
    body: any,
    tokenId: string | null,
    responseType: string = 'json',
    isjsonheader: boolean = false
  ): Observable<any> {
    const options = isjsonheader
      ? this.getHTTPOptionjsonHeader(tokenId)
      : this.getHTTPOption(tokenId);

    options['responseType'] = responseType;
    return this.http.post(url, body, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  extractGetData(
    url: string,
    tokenId: string | null,
    responseType: string = 'json',
    isjsonheader: boolean = false
  ): Observable<any> {
    const options = isjsonheader
      ? this.getHTTPOptionjsonHeader(tokenId)
      : this.getHTTPOption(tokenId);

    options['responseType'] = responseType;
    return this.http.get(url, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  extractPutData(
    url: string,
    body: any,
    tokenId: string | null,
    responseType: string = 'json',
    isjsonheader: boolean = false
  ): Observable<any> {
    const options = isjsonheader
      ? this.getHTTPOptionjsonHeader(tokenId)
      : this.getHTTPOption(tokenId);

    options['responseType'] = responseType;
    return this.http.put(url, body, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  extractPatchData(
    url: string,
    body: any,
    tokenId: string | null,
    responseType: string = 'json',
    isjsonheader: boolean = false
  ): Observable<any> {
    const options = isjsonheader
      ? this.getHTTPOptionjsonHeader(tokenId)
      : this.getHTTPOption(tokenId);

    options['responseType'] = responseType;
    return this.http.patch(url, body, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  deleteData(
    url: string,
    tokenId: string | null,
    responseType: string = 'json',
    isjsonheader: boolean = false
  ): Observable<any> {
    const options = isjsonheader
      ? this.getHTTPOptionjsonHeader(tokenId)
      : this.getHTTPOption(tokenId);

    options['responseType'] = responseType;
    return this.http.delete(url, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  extractPostFormData(
    url: string,
    formData: FormData,
    tokenId: string | null,
    responseType: string = 'json'
  ): Observable<any> {
    const options: any = { responseType };
    if (tokenId) {
      options.headers = new HttpHeaders({
        'Authorization': 'Bearer ' + tokenId,
      });
    }
    return this.http.post(url, formData, options).pipe(
      tap((res) => res),
      catchError(this.onCatch)
    );
  }

  private onCatch(error: any): Observable<any> {
    console.error('API error:', error);
    return throwError(() => error);
  }

  private getHTTPOptionjsonHeader(tokenId: string | null): any {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
    if (tokenId) {
      httpOptions.headers = httpOptions.headers.set(
        'Authorization',
        'Bearer ' + tokenId
      );
    }
    return httpOptions;
  }

  private getHTTPOption(tokenId: string | null): any {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
    };
    if (tokenId) {
      httpOptions.headers = httpOptions.headers.set(
        'Authorization',
        'Bearer ' + tokenId
      );
    }
    return httpOptions;
  }


}
