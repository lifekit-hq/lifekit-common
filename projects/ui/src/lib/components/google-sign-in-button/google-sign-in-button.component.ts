import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

/**
 * Structural mirror of `google.accounts.id.GsiButtonConfiguration`, declared
 * locally so the published type rollup never references the ambient `google`
 * namespace — consumers are not required to install `@types/google.accounts`
 * (issue #15). `renderButton()` below keeps it assignable to the ambient type.
 */
export interface GoogleSignInButtonConfiguration {
  type: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  /** Minimum button width in pixels (max 400). */
  width?: number;
  locale?: string;
  click_listener?: () => void;
}

@Component({
  selector: 'cmn-google-sign-in-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #btn></div>',
})
export class GoogleSignInButtonComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly btnRef = viewChild.required<ElementRef<HTMLElement>>('btn');

  public readonly clientId = input.required<string>();
  public readonly buttonConfiguration = input<GoogleSignInButtonConfiguration>({
    type: 'standard',
    shape: 'rectangular',
    theme: 'outline',
    text: 'continue_with',
    size: 'large',
    width: 368,
  });

  /** BCP-47 tag (e.g. `uk`); overrides `buttonConfiguration.locale` and the browser default. */
  public readonly locale = input<string | undefined>(undefined);

  public readonly credential = output<string>();

  public ngAfterViewInit(): void {
    google.accounts.id.initialize({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_id: this.clientId(),
      callback: (r: google.accounts.id.CredentialResponse) =>
        this.zone.run(() => this.credential.emit(r.credential)),
    });
    const locale = this.locale();
    const config = this.buttonConfiguration();
    google.accounts.id.renderButton(
      this.btnRef().nativeElement,
      locale ? {...config, locale} : config
    );
    google.accounts.id.prompt();
  }

  public ngOnDestroy(): void {
    google.accounts.id.cancel();
  }
}
