import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { KnowledgeBase } from './knowledge-base';
import { BaseService } from '../../../../../../acore/base/base.service';

describe('KnowledgeBase', () => {
  let component: KnowledgeBase;
  let fixture: ComponentFixture<KnowledgeBase>;
  let mockBaseService: jasmine.SpyObj<BaseService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockBaseService = jasmine.createSpyObj('BaseService', ['showLoader', 'hideLoader', 'getDataFromAPI', 'postDataFromAPI']);
    mockBaseService.loader = of(false);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockBaseService.getDataFromAPI.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [KnowledgeBase],
      providers: [
        provideHttpClient(),
        { provide: BaseService, useValue: mockBaseService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of({ get: () => null }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeBase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set training type', () => {
    component.setKbTrainingType('website');
    expect(component.kbTrainingType()).toBe('website');
  });

  it('should clear error and success when setting training type', () => {
    component.kbError.set('some error');
    component.kbSuccess.set('some success');
    component.setKbTrainingType('pdf');
    expect(component.kbError()).toBe('');
    expect(component.kbSuccess()).toBe('');
  });

  it('should add files on file selection', () => {
    const file = new File([''], 'test.pdf');
    const event = { target: { files: [file] } };
    component.onKbFilesSelected(event);
    expect(component.kbUploadedFiles().length).toBe(1);
    expect(component.kbUploadedFiles()[0].name).toBe('test.pdf');
  });

  it('should clear error on file selection', () => {
    component.kbError.set('some error');
    component.onKbFilesSelected({ target: { files: [new File([''], 'a.pdf')] } });
    expect(component.kbError()).toBe('');
  });

  it('should remove file by index', () => {
    component.kbUploadedFiles.set([new File([''], 'a.pdf'), new File([''], 'b.pdf')]);
    component.removeKbFile(0);
    expect(component.kbUploadedFiles().length).toBe(1);
    expect(component.kbUploadedFiles()[0].name).toBe('b.pdf');
  });

  it('should not submit knowledge without botId', () => {
    component.submitKnowledge();
    expect(mockBaseService.postDataFromAPI).not.toHaveBeenCalled();
  });

  it('should show error when submitting pdf with no files', () => {
    component.botId = '123';
    component.kbTrainingType.set('pdf');
    component.submitKnowledge();
    expect(component.kbError()).toBe('Please select at least one file to upload');
  });

  it('should show error when submitting website with no url', () => {
    component.botId = '123';
    component.kbTrainingType.set('website');
    component.submitKnowledge();
    expect(component.kbError()).toBe('Please enter a website URL');
  });

  it('should show error when submitting content with no text', () => {
    component.botId = '123';
    component.kbTrainingType.set('content');
    component.submitKnowledge();
    expect(component.kbError()).toBe('Please enter some content');
  });

  it('should navigate back on backToList', () => {
    component.backToList();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/pages/bot']);
  });
});
