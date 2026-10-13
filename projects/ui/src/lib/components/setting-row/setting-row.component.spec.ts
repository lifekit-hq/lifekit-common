import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {ToggleComponent} from '../toggle/toggle.component';
import {SettingRowComponent} from './setting-row.component';

@Component({
  selector: 'cmn-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SettingRowComponent, ToggleComponent],
  template: `
    <cmn-setting-row label="Email alerts" description="Weekly digest">
      <cmn-toggle [checked]="true" label="Email alerts" />
    </cmn-setting-row>
    <cmn-setting-row label="Push notifications" />
  `,
})
class HostComponent {}

describe('SettingRowComponent', () => {
  let fixture: ComponentFixture<SettingRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingRowComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingRowComponent);
    fixture.componentRef.setInput('label', 'Base currency');
  });

  function group(root: HTMLElement = fixture.nativeElement as HTMLElement): HTMLElement {
    return root.querySelector('[role="group"]') as HTMLElement;
  }

  it('names the group by the label', () => {
    fixture.detectChanges();
    const labelId = group().getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(group().querySelector(`#${labelId}`)?.textContent?.trim()).toBe('Base currency');
  });

  it('describes the group only when there is a description', () => {
    fixture.detectChanges();
    expect(group().getAttribute('aria-describedby')).toBeNull();

    fixture.componentRef.setInput('description', 'Used for totals');
    fixture.detectChanges();
    const descriptionId = group().getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(group().querySelector(`#${descriptionId}`)?.textContent?.trim()).toBe('Used for totals');
  });

  it('projects the control into the trailing slot', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const first = (host.nativeElement as HTMLElement).querySelector('cmn-setting-row');
    const toggle = first?.querySelector('cmn-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle?.parentElement?.className).toContain('shrink-0');
  });

  it('gives each row its own ids', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    const labelIds = Array.from(
      (host.nativeElement as HTMLElement).querySelectorAll('[role="group"]')
    ).map(g => g.getAttribute('aria-labelledby'));
    expect(new Set(labelIds).size).toBe(2);
  });
});
