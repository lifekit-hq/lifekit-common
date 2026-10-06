import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {StepperDialogComponent} from './stepper-dialog.component';
import {CmnStepDirective} from './stepper-step.directive';

@Component({
  selector: 'cmn-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepperDialogComponent, CmnStepDirective],
  template: `
    <cmn-stepper-dialog
      [busy]="busy()"
      [(step)]="step"
      (finished)="finishedCount.set(finishedCount() + 1)"
      (cancelled)="cancelledCount.set(cancelledCount() + 1)"
    >
      <ng-template cmnStep label="One"><p id="body-one">First body</p></ng-template>
      <ng-template [valid]="twoValid()" cmnStep label="Two"
        ><p id="body-two">Second body</p></ng-template
      >
      <ng-template cmnStep label="Three"><p id="body-three">Third body</p></ng-template>
    </cmn-stepper-dialog>
  `,
})
class HostComponent {
  public readonly step = signal(0);
  public readonly busy = signal(false);
  public readonly twoValid = signal(true);
  public readonly finishedCount = signal(0);
  public readonly cancelledCount = signal(0);
}

describe('StepperDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  const buttons = (): HTMLButtonElement[] => Array.from(el.querySelectorAll('button'));
  const backBtn = (): HTMLButtonElement => buttons()[0];
  const nextBtn = (): HTMLButtonElement => buttons()[1];
  const click = (b: HTMLButtonElement): void => {
    b.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('renders only the current step body', () => {
    expect(el.querySelector('#body-one')).toBeTruthy();
    expect(el.querySelector('#body-two')).toBeNull();
  });

  it('marks the current step with aria-current and announces position', () => {
    const items = el.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].getAttribute('aria-current')).toBe('step');
    expect(items[1].getAttribute('aria-current')).toBeNull();
    expect(el.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('Step 1 of 3');
  });

  it('shows Cancel on the first step and emits cancelled', () => {
    expect(backBtn().textContent?.trim()).toBe('Cancel');
    click(backBtn());
    expect(host.cancelledCount()).toBe(1);
    expect(host.step()).toBe(0);
  });

  it('advances and goes back through steps', () => {
    click(nextBtn());
    expect(host.step()).toBe(1);
    expect(el.querySelector('#body-two')).toBeTruthy();
    expect(backBtn().textContent?.trim()).toBe('Back');
    click(backBtn());
    expect(host.step()).toBe(0);
  });

  it('shows Finish on the last step and emits finished', () => {
    host.step.set(2);
    fixture.detectChanges();
    expect(nextBtn().textContent?.trim()).toBe('Finish');
    click(nextBtn());
    expect(host.finishedCount()).toBe(1);
    expect(host.step()).toBe(2);
  });

  it('disables Next while the step is invalid', () => {
    host.twoValid.set(false);
    host.step.set(1);
    fixture.detectChanges();
    expect(nextBtn().disabled).toBe(true);
    click(nextBtn());
    expect(host.step()).toBe(1);
  });

  it('disables both buttons while busy', () => {
    host.busy.set(true);
    fixture.detectChanges();
    expect(backBtn().disabled).toBe(true);
    expect(nextBtn().disabled).toBe(true);
  });

  it('does not move focus to the heading on initial render', () => {
    expect(document.activeElement).not.toBe(el.querySelector('h3'));
  });

  it('moves focus to the step heading after the step changes', () => {
    click(nextBtn());
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('h3'));
  });
});
