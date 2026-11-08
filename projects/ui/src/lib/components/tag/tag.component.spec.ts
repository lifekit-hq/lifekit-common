import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {TagComponent, type TagSize, type TagVariant} from './tag.component';

describe('TagComponent', () => {
  let fixture: ComponentFixture<TagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TagComponent);
    fixture.componentRef.setInput('variant', 'neutral' as TagVariant);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should apply success classes for success variant', () => {
    fixture.componentRef.setInput('variant', 'success' as TagVariant);
    fixture.detectChanges();
    const span: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('text-status-success');
  });

  it('should apply error classes for error variant', () => {
    fixture.componentRef.setInput('variant', 'error' as TagVariant);
    fixture.detectChanges();
    const span: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('text-status-error');
  });

  it('should apply neutral classes by default', () => {
    const span: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('text-text-secondary');
  });

  it.each<[TagVariant, string, string]>([
    ['success', 'bg-status-success-subtle', 'text-status-success'],
    ['error', 'bg-status-error-subtle', 'text-status-error'],
    ['warning', 'bg-status-warning-subtle', 'text-status-warning'],
    ['info', 'bg-status-info-subtle', 'text-status-info'],
    ['neutral', 'bg-surface-raised', 'text-text-secondary'],
  ])('maps "%s" onto its status hue tint', (variant, fill, text) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    const span: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain(fill);
    expect(span.className).toContain(text);
  });

  it.each<[TagSize, string]>([
    ['md', 'min-h-cmn-size-xs'],
    ['lg', 'min-h-cmn-size-sm'],
  ])('draws the "%s" tag at Carbon\'s layout size', (size, expected) => {
    fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    const span: HTMLSpanElement = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain(expected);
    expect(span.className).toContain('text-cmn-xs');
  });
});
