import {Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {ListSectionComponent} from './list-section.component';

@Component({
  imports: [ListSectionComponent],
  template: `
    <cmn-list-section [card]="card()" heading="Today">
      <span class="total" cmnListSectionAside>-€42.10</span>
      <div class="row">Coffee</div>
      <div class="row">Groceries</div>
    </cmn-list-section>
    <cmn-list-section heading="Yesterday"><div class="row">Rent</div></cmn-list-section>
  `,
})
class HostComponent {
  public readonly card = signal(true);
}

describe('ListSectionComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function first(): HTMLElement {
    return el.querySelector('cmn-list-section') as HTMLElement;
  }

  it('labels each section by its own heading', () => {
    const sections = Array.from(el.querySelectorAll('section'));
    const names = sections.map(section => {
      const id = section.getAttribute('aria-labelledby') ?? '';
      return document.getElementById(id)?.textContent?.trim();
    });
    expect(names).toEqual(['Today', 'Yesterday']);
    expect(sections[0].getAttribute('aria-labelledby')).not.toBe(
      sections[1].getAttribute('aria-labelledby')
    );
  });

  it('renders the heading as an h2 with the aside at its end', () => {
    const heading = first().querySelector('h2') as HTMLElement;
    expect(heading.firstElementChild?.textContent).toBe('Today');
    expect(heading.lastElementChild?.classList).toContain('total');
  });

  it('wraps the rows in an unpadded card', () => {
    const card = first().querySelector('cmn-card');
    expect(card).not.toBeNull();
    expect(card?.querySelectorAll('.row').length).toBe(2);
  });

  it('leaves the rows bare without the card', () => {
    fixture.componentInstance.card.set(false);
    fixture.detectChanges();
    expect(first().querySelector('cmn-card')).toBeNull();
    expect(first().querySelectorAll('section > .row').length).toBe(2);
  });

  it('makes the heading sticky on a phone only, under the pinned notices', () => {
    const classes = (first().querySelector('h2') as HTMLElement).className;
    expect(classes).toContain('max-md:sticky');
    expect(classes).toContain('max-md:top-[var(--cmn-sticky-top,0px)]');
    expect(classes).not.toMatch(/(^|\s)sticky(\s|$)/);
  });
});
