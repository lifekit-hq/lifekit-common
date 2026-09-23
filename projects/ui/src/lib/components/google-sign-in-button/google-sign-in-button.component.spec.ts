import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  GoogleSignInButtonComponent,
  type GoogleSignInButtonConfiguration,
} from './google-sign-in-button.component';

interface GoogleIdStub {
  initialize: ReturnType<typeof vi.fn>;
  renderButton: ReturnType<typeof vi.fn>;
  prompt: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
}

declare const globalThis: Record<string, unknown>;

describe('GoogleSignInButtonComponent', () => {
  let fixture: ComponentFixture<GoogleSignInButtonComponent>;
  let previous: unknown;

  // One stub for the whole file: `ngOnDestroy` calls `google.accounts.id.cancel()`
  // during TestBed's own teardown, which runs after this file's hooks — tearing
  // the global down per test would blow up in cleanup.
  const id: GoogleIdStub = {
    initialize: vi.fn(),
    renderButton: vi.fn(),
    prompt: vi.fn(),
    cancel: vi.fn(),
  };

  beforeAll(() => {
    previous = globalThis['google'];
    globalThis['google'] = {accounts: {id}};
  });

  afterAll(() => {
    globalThis['google'] = previous;
  });

  beforeEach(async () => {
    for (const fn of Object.values(id)) {
      fn.mockClear();
    }

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GoogleSignInButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GoogleSignInButtonComponent);
    fixture.componentRef.setInput('clientId', 'client-123');
  });

  it('initializes the Google client with the supplied client id', () => {
    fixture.detectChanges();
    expect(id.initialize).toHaveBeenCalledTimes(1);
    expect(id.initialize.mock.calls[0][0].client_id).toBe('client-123');
  });

  it('renders into its own host element and prompts once', () => {
    fixture.detectChanges();
    const target = id.renderButton.mock.calls[0][0] as HTMLElement;
    expect(target).toBe((fixture.nativeElement as HTMLElement).querySelector('div'));
    expect(id.prompt).toHaveBeenCalledTimes(1);
  });

  it('renders with the default button configuration', () => {
    fixture.detectChanges();
    const config = id.renderButton.mock.calls[0][1] as GoogleSignInButtonConfiguration;
    expect(config.type).toBe('standard');
    expect(config.theme).toBe('outline');
    expect(config.text).toBe('continue_with');
  });

  it('passes a caller-supplied configuration straight through', () => {
    const custom: GoogleSignInButtonConfiguration = {
      type: 'icon',
      shape: 'circle',
      theme: 'filled_black',
    };
    fixture.componentRef.setInput('buttonConfiguration', custom);
    fixture.detectChanges();
    expect(id.renderButton.mock.calls[0][1]).toEqual(custom);
  });

  it('emits the credential the Google callback hands back', () => {
    const emitted: string[] = [];
    fixture.componentInstance.credential.subscribe(c => emitted.push(c));
    fixture.detectChanges();

    const callback = id.initialize.mock.calls[0][0].callback as (r: {credential: string}) => void;
    callback({credential: 'jwt-token'});
    expect(emitted).toEqual(['jwt-token']);
  });

  it('cancels the Google prompt on destroy', () => {
    fixture.detectChanges();
    fixture.destroy();
    expect(id.cancel).toHaveBeenCalledTimes(1);
  });
});
