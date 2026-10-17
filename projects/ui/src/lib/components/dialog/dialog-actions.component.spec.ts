import {signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {type DialogActionsAlign, DialogActionsComponent} from './dialog-actions.component';
import {CMN_DIALOG_PRESENTATION, type CmnDialogPresentation} from './dialog-config';

describe('DialogActionsComponent', () => {
  let fixture: ComponentFixture<DialogActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogActionsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogActionsComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('applies justify-end by default', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.className).toContain('justify-end');
  });

  it('applies justify-between when align="between"', () => {
    fixture.componentRef.setInput('align', 'between' as DialogActionsAlign);
    fixture.detectChanges();
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.className).toContain('justify-between');
  });

  it('applies edge-to-edge negative margins to break out of dialog body padding', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.className).toContain('-mx-cmn-6');
    expect(div.className).toContain('-mb-cmn-6');
  });

  it('applies top border separator', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.className).toContain('border-t');
  });

  describe.each<[CmnDialogPresentation, string[], string[]]>([
    ['dialog', ['border-t'], ['sticky', 'flex-col']],
    ['sheet', ['sticky', '-bottom-cmn-6', 'bg-surface-card'], ['flex-col']],
    ['full-screen', ['sticky', '-bottom-cmn-6'], ['flex-col']],
    ['action-sheet', ['flex-col', 'items-stretch'], ['sticky']],
  ])('in a "%s" presentation', (presentation, present, absent) => {
    it('lays the actions out for it', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [DialogActionsComponent],
        providers: [{provide: CMN_DIALOG_PRESENTATION, useValue: signal(presentation)}],
      });
      const f = TestBed.createComponent(DialogActionsComponent);
      f.detectChanges();
      const classes = (f.nativeElement.querySelector('div') as HTMLDivElement).classList;
      present.forEach(c => expect(classes.contains(c)).toBe(true));
      absent.forEach(c => expect(classes.contains(c)).toBe(false));
    });
  });
});
