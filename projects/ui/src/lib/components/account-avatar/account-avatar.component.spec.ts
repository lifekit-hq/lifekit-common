import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountAvatarComponent} from './account-avatar.component';

describe('AccountAvatarComponent', () => {
  let fixture: ComponentFixture<AccountAvatarComponent>;

  const disc = (): HTMLElement => fixture.nativeElement.querySelector('span') as HTMLElement;
  const picture = (): HTMLImageElement | null => fixture.nativeElement.querySelector('img');

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AccountAvatarComponent]}).compileComponents();
    fixture = TestBed.createComponent(AccountAvatarComponent);
    fixture.componentRef.setInput('label', 'Ada Lovelace');
    fixture.detectChanges();
  });

  it('should show the initials of the label without a picture', () => {
    expect(disc().textContent?.trim()).toBe('AL');
    expect(picture()).toBeNull();
  });

  it('should be decorative, since the name it stands for is printed beside it', () => {
    expect(disc().getAttribute('aria-hidden')).toBe('true');
  });

  it('should size the disc by size', () => {
    expect(disc().classList).toContain('h-10');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(disc().classList).toContain('h-8');
    expect(disc().classList).toContain('w-8');
  });

  it('should show the picture, with no referrer and no alt text', () => {
    fixture.componentRef.setInput('pictureUrl', 'https://example.com/ada.png');
    fixture.detectChanges();

    expect(picture()?.getAttribute('src')).toContain('https://example.com/ada.png');
    expect(picture()?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(picture()?.getAttribute('alt')).toBe('');
  });

  it('should show a data: picture without throwing', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    fixture.componentRef.setInput('pictureUrl', dataUrl);
    fixture.detectChanges();

    expect(picture()?.getAttribute('src')).toBe(dataUrl);
  });

  it('should fall back to the initials when the picture fails to load', () => {
    fixture.componentRef.setInput('pictureUrl', 'https://example.com/ada.png');
    fixture.detectChanges();

    picture()?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(picture()).toBeNull();
    expect(disc().textContent?.trim()).toBe('AL');
  });

  it('should try a different picture after one failed', () => {
    fixture.componentRef.setInput('pictureUrl', 'https://example.com/ada.png');
    fixture.detectChanges();
    picture()?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    fixture.componentRef.setInput('pictureUrl', 'https://example.com/ada-2.png');
    fixture.detectChanges();

    expect(picture()?.getAttribute('src')).toContain('ada-2.png');
  });
});
