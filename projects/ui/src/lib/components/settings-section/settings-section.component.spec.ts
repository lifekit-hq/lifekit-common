import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {SettingsSectionComponent} from './settings-section.component';

@Component({
  selector: 'cmn-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SettingsSectionComponent],
  template: `
    <cmn-settings-section heading="Profile" description="Your name and email">
      <p data-testid="content">Projected body</p>
    </cmn-settings-section>
    <cmn-settings-section heading="Notifications" />
  `,
})
class HostComponent {}

describe('SettingsSectionComponent', () => {
  let fixture: ComponentFixture<SettingsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsSectionComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsSectionComponent);
    fixture.componentRef.setInput('heading', 'Preferences');
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function saveButton(): HTMLButtonElement | null {
    return el().querySelector<HTMLButtonElement>('cmn-button button');
  }

  it('renders the heading as an h2 and names the section by it', () => {
    fixture.detectChanges();
    const heading = el().querySelector('h2');
    const section = el().querySelector('section');
    expect(heading?.textContent?.trim()).toBe('Preferences');
    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('omits the description and caption until they are set', () => {
    fixture.detectChanges();
    expect(el().querySelectorAll('p')).toHaveLength(0);

    fixture.componentRef.setInput('description', 'Display and regional settings');
    fixture.componentRef.setInput('caption', 'On this device');
    fixture.detectChanges();
    const texts = Array.from(el().querySelectorAll('p')).map(p => p.textContent?.trim());
    expect(texts).toEqual(['Display and regional settings', 'On this device']);
  });

  it('projects its content next to the heading column', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const content = (host.nativeElement as HTMLElement).querySelector('[data-testid="content"]');
    expect(content?.textContent).toBe('Projected body');
  });

  it('gives each section its own heading id', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const ids = Array.from((host.nativeElement as HTMLElement).querySelectorAll('h2')).map(
      h => h.id
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('has no Save button for an immediate-apply section', () => {
    fixture.detectChanges();
    expect(saveButton()).toBeNull();
  });

  it('shows the Save button once saveLabel is set and emits save on click', () => {
    fixture.componentRef.setInput('saveLabel', 'Save profile');
    fixture.detectChanges();
    let saves = 0;
    fixture.componentInstance.save.subscribe(() => saves++);

    expect(saveButton()?.textContent?.trim()).toBe('Save profile');
    saveButton()?.click();
    expect(saves).toBe(1);
  });

  it('disables Save when saveDisabled is set', () => {
    fixture.componentRef.setInput('saveLabel', 'Save');
    fixture.componentRef.setInput('saveDisabled', true);
    fixture.detectChanges();
    expect(saveButton()?.disabled).toBe(true);
  });

  it('marks Save busy and blocks clicks while saving', () => {
    fixture.componentRef.setInput('saveLabel', 'Save');
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(saveButton()?.disabled).toBe(true);
    expect(saveButton()?.getAttribute('aria-busy')).toBe('true');
  });
});
