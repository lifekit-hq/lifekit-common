/** The two sizes every route is checked and captured at: an iPhone (390x844) and a 1280 laptop. */
export const SCREEN_VIEWPORTS = Object.freeze({
  phone: Object.freeze({
    viewport: Object.freeze({width: 390, height: 844}),
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  }),
  desktop: Object.freeze({viewport: Object.freeze({width: 1280, height: 800})}),
});
