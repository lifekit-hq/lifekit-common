import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {beforeEach, describe, expect, it} from 'vitest';

import {ChatMessageComponent} from './chat-message.component';

describe('ChatMessageComponent', () => {
  let fixture: ComponentFixture<ChatMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatMessageComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the message text', () => {
    fixture.componentRef.setInput('text', 'Your net worth is $1.8M.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your net worth is $1.8M.');
  });

  it('should align user messages to the end', () => {
    fixture.componentRef.setInput('role', 'user');
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('div');
    expect(row.className).toContain('justify-end');
  });

  it('should align assistant messages to the start', () => {
    fixture.componentRef.setInput('role', 'assistant');
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('div');
    expect(row.className).toContain('justify-start');
  });

  it('should render tool-progress chips', () => {
    fixture.componentRef.setInput('tools', [
      {name: 'get_portfolio_snapshot', running: true},
      {name: 'get_ips', running: false},
    ]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('get_portfolio_snapshot');
    expect(text).toContain('get_ips');
  });

  it('should show a thinking indicator while streaming with no text yet', () => {
    fixture.componentRef.setInput('streaming', true);
    fixture.detectChanges();
    const pulse = fixture.nativeElement.querySelector('[aria-label="Thinking"]');
    expect(pulse).not.toBeNull();
  });

  describe('links', () => {
    const anchors = (): HTMLAnchorElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('a'));

    const render = (text: string, role: 'user' | 'assistant' = 'assistant'): void => {
      fixture.componentRef.setInput('text', text);
      fixture.componentRef.setInput('role', role);
      fixture.detectChanges();
    };

    it('should render an https URL as a new-tab link with noopener noreferrer', () => {
      render('Filing: https://example.com/f.');
      const [link] = anchors();
      expect(link.getAttribute('href')).toBe('https://example.com/f');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.textContent).toBe('https://example.com/f');
    });

    it('should show the target host after a labelled external link', () => {
      render('[the filing](https://example.com/f)');
      const [link] = anchors();
      expect(link.getAttribute('href')).toBe('https://example.com/f');
      expect(link.textContent).toBe('the filing (example.com)');
    });

    it('should render an in-app markdown link through the router without a new tab', () => {
      render('Open [AAPL](/holdings/AAPL?tab=lots)');
      const [link] = anchors();
      expect(link.getAttribute('href')).toBe('/holdings/AAPL?tab=lots');
      expect(link.textContent).toBe('AAPL');
      expect(link.hasAttribute('target')).toBe(false);
    });

    it('should keep an in-app link with parens as plain text', () => {
      render('See [Foo](/holdings/Foo_(bar)) here');
      expect(anchors()).toHaveLength(0);
      expect(fixture.nativeElement.textContent).toContain('See [Foo](/holdings/Foo_(bar)) here');
    });

    it('should render an external link with parens in its target', () => {
      render('[Foo](https://en.wikipedia.org/wiki/Foo_(bar))');
      const [link] = anchors();
      expect(link.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Foo_(bar)');
      expect(link.textContent).toBe('Foo (en.wikipedia.org)');
    });

    it('should not render anchors for rejected targets', () => {
      render('[a](javascript:alert(1)) [b](http://x.com) [c](//evil.com) [d](data:text/html,x)');
      expect(anchors()).toHaveLength(0);
      expect(fixture.nativeElement.textContent).toContain('[a](javascript:alert(1))');
    });

    it('should never inject markup from the message text', () => {
      render('<img src=x onerror=alert(1)> <b>bold</b>');
      expect(fixture.nativeElement.querySelector('img')).toBeNull();
      expect(fixture.nativeElement.querySelector('b')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('should preserve surrounding text exactly around a link', () => {
      render('before [AAPL](/holdings/AAPL) after');
      expect(fixture.nativeElement.querySelector('span').textContent).toBe('before AAPL after');
    });

    it('should leave a message without links untouched', () => {
      render('Plain answer, no links.');
      expect(anchors()).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('span').textContent).toBe(
        'Plain answer, no links.'
      );
    });

    it('should style links for contrast on a user bubble', () => {
      render('https://example.com', 'user');
      expect(anchors()[0].className).toContain('text-text-inverse');
    });

    it('should style links as accent on an assistant bubble', () => {
      render('https://example.com');
      expect(anchors()[0].className).toContain('text-accent-default');
    });
  });
});
