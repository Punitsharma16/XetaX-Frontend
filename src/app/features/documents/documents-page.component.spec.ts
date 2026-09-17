import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { DocumentFile } from './document.service';
import { DocumentsPageComponent } from './documents-page.component';

/**
 * Downloading used to open the API address in a new tab. That request carries
 * no sign-in token — the API only reads it from the Authorization header — so
 * every download came back 401. The file must be fetched by HttpClient, which
 * the auth interceptor signs, and then saved under its own name.
 */
describe('DocumentsPageComponent — downloading', () => {

  let fixture: ComponentFixture<DocumentsPageComponent>;
  let component: DocumentsPageComponent;
  let http: HttpTestingController;
  let savedAs: string[];
  let toastError: jasmine.Spy;

  const quotation: DocumentFile = {
    id: 7, name: 'Quotation', originalFilename: 'quotation-2026.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1200, supportsVariables: true, createdAt: '2026-09-17T10:00:00',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    toastError = spyOn(TestBed.inject(ToastService), 'error');

    savedAs = [];
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      savedAs.push(this.download);
    });

    fixture = TestBed.createComponent(DocumentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${environment.crmBaseUrl}/api/documents`).flush({ data: [quotation] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('fetches the file through HttpClient, not a bare link', () => {
    const open = spyOn(window, 'open');
    component.download(quotation);

    const request = http.expectOne(`${environment.crmBaseUrl}/api/documents/7/download`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['docx']));

    expect(open).not.toHaveBeenCalled();
  });

  it('saves it under the name it was uploaded with', () => {
    component.download(quotation);
    http.expectOne(`${environment.crmBaseUrl}/api/documents/7/download`).flush(new Blob(['docx']));

    expect(savedAs).toEqual(['quotation-2026.docx']);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(component.downloading()).toBeNull();
  });

  it('shows a spinner while the file is on its way', () => {
    component.download(quotation);
    fixture.detectChanges();
    expect(component.downloading()).toBe(7);
    expect((fixture.nativeElement as HTMLElement).querySelector('.spinner-border')).not.toBeNull();
    http.expectOne(`${environment.crmBaseUrl}/api/documents/7/download`).flush(new Blob(['docx']));
  });

  it('ignores a second click while one download is running', () => {
    component.download(quotation);
    component.download(quotation);
    http.expectOne(`${environment.crmBaseUrl}/api/documents/7/download`).flush(new Blob(['docx']));
    expect(savedAs.length).toBe(1);
  });

  it('says so when the file cannot be fetched', () => {
    component.download(quotation);
    http.expectOne(`${environment.crmBaseUrl}/api/documents/7/download`)
      .flush(new Blob(['missing']), { status: 404, statusText: 'Not Found' });

    expect(savedAs).toEqual([]);
    expect(toastError).toHaveBeenCalled();
    expect(component.downloading()).toBeNull();
  });
});
