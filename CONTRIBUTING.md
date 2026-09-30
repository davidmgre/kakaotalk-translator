# Contributing

Use Node.js 18 or newer; Node 22 and 24 are used by the proposed CI workflow. No npm dependencies or build step are required.

```sh
npm test
npm run check
npm run demo
```

Keep changes read-only with respect to KakaoTalk. Use fictional fixtures and demo screenshots. Never commit live conversation samples, personal preferences, credentials, or provider login state.

The interface uses English labels, a Swiss editorial grid, Light/Dark/System themes, system fonts, keyboard-visible focus states, and a responsive single-column layout on small screens. Avoid external fonts or analytics.

Live DB compatibility has been verified on one macOS machine, not every KakaoTalk release. Include a sanitized environment summary when reporting compatibility issues.
