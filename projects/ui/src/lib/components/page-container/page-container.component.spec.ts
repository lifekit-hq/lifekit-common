import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {PageContainerComponent} from './page-container.component';

describe('PageContainerComponent', () => {
  let fixture: ComponentFixture<PageContainerComponent>;

  const host = (): HTMLElement => fixture.nativeElement;
  // The Vitest runner mounts the fixture on a <div> host, so a bare 'div' selector is ambiguous;
  // the box is the one carrying the padding class.
  const box = (): HTMLElement => host().querySelector('.p-cmn-4') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageContainerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PageContainerComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be a block host by default', () => {
    expect(host().classList).toContain('block');
    expect(host().classList).not.toContain('flex');
  });

  it('should render one centred box carrying padding and the default 1200px max-width', () => {
    expect(box().classList).toContain('p-cmn-4');
    expect(box().classList).toContain('md:p-cmn-8');
    expect(box().classList).toContain('mx-auto');
    expect(box().classList).toContain('w-full');
    expect(box().classList).toContain('max-w-[1200px]');
    expect(box().querySelector('.p-cmn-4')).toBeNull();
  });

  it('should apply a custom maxWidth class to the box', () => {
    fixture.componentRef.setInput('maxWidth', 'max-w-[900px]');
    fixture.detectChanges();
    expect(box().classList).toContain('max-w-[900px]');
    expect(box().classList).not.toContain('max-w-[1200px]');
  });

  it('should stack children with md spacing by default', () => {
    expect(box().classList).toContain('space-y-cmn-5');
  });

  it('should apply lg spacing class when spacing is "lg"', () => {
    fixture.componentRef.setInput('spacing', 'lg');
    fixture.detectChanges();
    expect(box().classList).toContain('space-y-cmn-10');
    expect(box().classList).not.toContain('space-y-cmn-5');
  });

  it('should add no spacing class when spacing is "none"', () => {
    fixture.componentRef.setInput('spacing', 'none');
    fixture.detectChanges();
    expect(box().className).not.toMatch(/space-y/);
  });

  it('should not be a flex column unless fill is set', () => {
    expect(host().classList).not.toContain('md:h-full');
    expect(box().classList).not.toContain('flex-1');
  });

  it('should make the host a full-height flex column when fill is set', () => {
    fixture.componentRef.setInput('fill', true);
    fixture.detectChanges();
    for (const cls of ['flex', 'min-h-full', 'flex-col', 'md:h-full']) {
      expect(host().classList).toContain(cls);
    }
    expect(host().classList).not.toContain('block');
  });

  it('should let the box grow into the remaining height when fill is set', () => {
    fixture.componentRef.setInput('fill', true);
    fixture.detectChanges();
    for (const cls of ['flex', 'flex-col', 'flex-1', 'min-h-0', 'w-full', 'max-w-[1200px]']) {
      expect(box().classList).toContain(cls);
    }
  });

  it('should combine fill with spacing "none"', () => {
    fixture.componentRef.setInput('fill', true);
    fixture.componentRef.setInput('spacing', 'none');
    fixture.detectChanges();
    expect(box().classList).toContain('flex-1');
    expect(box().className).not.toMatch(/space-y/);
  });
});
