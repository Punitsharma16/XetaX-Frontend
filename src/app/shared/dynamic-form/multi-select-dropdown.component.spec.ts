import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiSelectDropdownComponent } from './multi-select-dropdown.component';

/**
 * The control is deliberately stateless: it never holds the selection, it
 * emits what the new selection should be and the form writes it back. Every
 * test here checks that contract, because a control that quietly keeps its own
 * copy is how a form ends up saving something the user never picked.
 */
describe('MultiSelectDropdownComponent', () => {

  let fixture: ComponentFixture<MultiSelectDropdownComponent>;
  let component: MultiSelectDropdownComponent;
  let emitted: string[][];

  const set = (options: string[], value: string[] = []) => {
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MultiSelectDropdownComponent] }).compileComponents();
    fixture = TestBed.createComponent(MultiSelectDropdownComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.valueChange.subscribe((value) => emitted.push(value));
  });

  describe('picking', () => {

    it('adds an option that was not chosen', () => {
      set(['Red', 'Green', 'Blue'], ['Red']);
      component.pick('Blue');
      expect(emitted).toEqual([['Red', 'Blue']]);
    });

    it('removes an option that was already chosen', () => {
      set(['Red', 'Green', 'Blue'], ['Red', 'Blue']);
      component.pick('Red');
      expect(emitted).toEqual([['Blue']]);
    });

    it('never changes the selection it was given', () => {
      const value = ['Red'];
      set(['Red', 'Green'], value);
      component.pick('Green');
      expect(value).toEqual(['Red']);
    });

    it('drops one from its chip', () => {
      set(['Red', 'Green'], ['Red', 'Green']);
      component.remove('Red', new MouseEvent('click'));
      expect(emitted).toEqual([['Green']]);
    });

    it('does not let a chip click open the list underneath it', () => {
      set(['Red'], ['Red']);
      const event = new MouseEvent('click');
      const stop = spyOn(event, 'stopPropagation');
      component.remove('Red', event);
      expect(stop).toHaveBeenCalled();
    });

    it('clears everything', () => {
      set(['Red', 'Green'], ['Red', 'Green']);
      component.clear();
      expect(emitted).toEqual([[]]);
    });
  });

  describe('searching', () => {

    it('shows every option until something is typed', () => {
      set(['Red', 'Green', 'Blue']);
      expect(component.filtered()).toEqual(['Red', 'Green', 'Blue']);
    });

    it('matches anywhere in the option, ignoring case', () => {
      set(['Red', 'Green', 'Blue']);
      component.query.set('re');
      expect(component.filtered()).toEqual(['Red', 'Green']);
    });

    it('can match nothing', () => {
      set(['Red', 'Green']);
      component.query.set('zzz');
      expect(component.filtered()).toEqual([]);
    });
  });

  describe('opening and closing', () => {

    it('opens and closes on the button', () => {
      set(['Red']);
      component.toggle();
      expect(component.open()).toBeTrue();
      component.toggle();
      expect(component.open()).toBeFalse();
    });

    it('forgets the search when it closes', () => {
      set(['Red', 'Green']);
      component.toggle();
      component.query.set('re');
      component.close();
      expect(component.query()).toBe('');
    });

    it('tells the form it was touched, but only when it was really open', () => {
      set(['Red']);
      let closes = 0;
      component.closed.subscribe(() => closes++);
      component.close();
      expect(closes).toBe(0);
      component.toggle();
      component.close();
      expect(closes).toBe(1);
    });

    it('closes when the click lands outside it', () => {
      set(['Red']);
      component.toggle();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      component.onDocumentClick({ target: document.body } as unknown as MouseEvent);
      expect(component.open()).toBeFalse();
    });

    it('stays open for a click inside it', () => {
      set(['Red']);
      component.toggle();
      const inside = fixture.nativeElement as HTMLElement;
      component.onDocumentClick({ target: inside } as unknown as MouseEvent);
      expect(component.open()).toBeTrue();
    });
  });
});
