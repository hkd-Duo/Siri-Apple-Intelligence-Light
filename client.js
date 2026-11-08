window.__ModuleLoader__.load({
  id: '@local/apple-glow-shockwave',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ---------------------------------------------------------------------------
    // Trigger detection: identify clicks on the composer submit action (or an
    // Enter-key send) inside the same composer card region as our overlay anchor,
    // without reading any other plugin's DOM or guessing host class names.
    // ---------------------------------------------------------------------------
    const SEND_LABEL_RE = /(send|submit|发送|提交|stop|停止|interrupt|中断)/i;

    let anchor = null; // the currently mounted overlay anchor element
    let activeRoot = null; // the active effect layer
    let activeTimer = 0;

    function sharedAncestor(a, b, maxHops) {
      if (!a || !b || !a.isConnected || !b.isConnected) return null;
      const chain = [];
      let n = b;
      for (let i = 0; n && i <= maxHops; i++) { chain.push(n); n = n.parentElement; }
      n = a;
      for (let i = 0; n && i <= maxHops; i++) {
        if (chain.indexOf(n) !== -1) return n;
        n = n.parentElement;
      }
      return null;
    }

    // The composer card is the first ancestor of the shared region that looks
    // card-sized: full composer width and taller than one tool row.
    function composerCardFor(el) {
      let region = el;
      for (let i = 0; region && region !== document.body && i < 8; i++) {
        if (region.clientWidth >= 320 && region.clientHeight >= 88 && region.clientHeight < 480) {
          return region;
        }
        region = region.parentElement;
      }
      return null;
    }

    function looksLikeSend(btn) {
      if (!btn || btn.disabled || !anchor || !anchor.isConnected) return false;
      const region = sharedAncestor(btn, anchor, 16);
      if (!region) return false;
      const label = (
        btn.getAttribute('aria-label')
        || btn.getAttribute('title')
        || btn.getAttribute('data-tooltip')
        || ''
      ).trim();
      if (label && label.length <= 60 && SEND_LABEL_RE.test(label)) return true;
      // Fallback: rightmost icon-only button of the composer region (submit is
      // rendered after every other composer control).
      const buttons = region.querySelectorAll('button');
      if (buttons.length && buttons[buttons.length - 1] === btn) {
        const r1 = btn.getBoundingClientRect();
        const r2 = region.getBoundingClientRect();
        const iconOnly = !!btn.querySelector('svg') && !((btn.textContent || '').trim());
        if (iconOnly && r1.right >= r2.right - 28) return true;
      }
      return false;
    }

    function onCaptureClick(e) {
      const target = e.target;
      if (!target || !target.closest) return;
      const btn = target.closest('button');
      if (btn && looksLikeSend(btn)) fire(btn);
    }

    function onCaptureKeydown(e) {
      if (e.key !== 'Enter' || e.shiftKey || !anchor || !anchor.isConnected) return;
      const t = e.target;
      if (!t || !t.closest || !t.closest('textarea, input, [contenteditable="true"]')) return;
      if (!sharedAncestor(t, anchor, 16)) return;
      fire(null);
    }

    // ---------------------------------------------------------------------------
    // Mode switch: 'composer' | 'fullscreen' | 'off', persisted locally. The
    // Client half has no config service, so the toggle lives next to the submit
    // action and persists through localStorage.
    // ---------------------------------------------------------------------------
    const MODE_KEY = 'aigw:mode';
    const MODES = ['composer', 'fullscreen', 'off'];

    function getMode() {
      try {
        const m = window.localStorage.getItem(MODE_KEY);
        return MODES.indexOf(m) !== -1 ? m : 'composer';
      } catch (e) { return 'composer'; }
    }

    function setMode(m) {
      try { window.localStorage.setItem(MODE_KEY, m); } catch (e) { /* ignore */ }
    }

    function modeTitle(m) {
      if (m === 'fullscreen') return '发光特效:全屏扩散 / Glow: fullscreen';
      if (m === 'off') return '发光特效:关闭 / Glow: off';
      return '发光特效:输入框流光 / Glow: composer';
    }

    // ---------------------------------------------------------------------------
    // The Siri-style glow shockwave. A fixed, pointer-events:none layer is
    // appended to document.body (fixed layers inside the docked composer must
    // portal there). Composer mode aligns it to the composer card rect; full
    // screen mode spans the viewport and ripples out from the composer.
    // Layers (Siri / Apple-Intelligence look):
    //   halo   - soft aurora glow igniting at the bottom, spreading outward,
    //            with a slow hue drift
    //   ripple - three staggered blurred wavefronts rolling out from the bottom
    //   ring   - the leading shockwave
    //   flow   - a large, heavily blurred conic color wheel slowly rotating
    //            behind the card edge (the liquid Siri edge light)
    //   beam   - the sharp light comet sweeping around the border once
    //   pulse  - a brief pulse ring on the submit button itself
    // ---------------------------------------------------------------------------
    const CSS_TEXT = `
@property --aigw-angle { syntax: '<angle>'; inherits: false; initial-value: 180deg; }
.aigw-root { position: fixed; pointer-events: none; z-index: 2147483000; overflow: hidden; }

.aigw-halo { position: absolute; left: 50%; bottom: -20%; width: 190%; height: 200%;
  transform: translateX(-50%); opacity: 0; filter: blur(14px) saturate(1.35);
  background: radial-gradient(50% 55% at 50% 92%,
    rgba(255,255,255,.28) 0%, rgba(100,210,255,.48) 18%, rgba(10,132,255,.36) 36%,
    rgba(191,90,242,.30) 55%, rgba(255,55,95,.14) 72%, rgba(255,159,10,.08) 82%, transparent 90%);
  animation: aigw-halo 1.55s cubic-bezier(.22,.61,.36,1) forwards; }
@keyframes aigw-halo { 0% { opacity: 0; transform: translateX(-50%) scale(.4); }
  20% { opacity: 1; } 68% { opacity: .5; }
  100% { opacity: 0; transform: translateX(-50%) scale(1.6); } }

.aigw-ripple { position: absolute; left: 50%; bottom: -10%; width: 64%; height: 44%;
  border-radius: 50%; border: 2.5px solid rgba(255,255,255,.5);
  box-shadow: 0 0 44px rgba(100,210,255,.5), inset 0 0 44px rgba(191,90,242,.32);
  filter: blur(3px); opacity: 0; transform: translateX(-50%) scale(.2);
  animation: aigw-ripple 1.5s cubic-bezier(.17,.67,.4,1) forwards; }
.aigw-ripple.d2 { animation-delay: .22s; }
.aigw-ripple.d3 { animation-delay: .45s; }
@keyframes aigw-ripple { 0% { opacity: .9; transform: translateX(-50%) scale(.2); }
  100% { opacity: 0; transform: translateX(-50%) scale(2.7); } }

.aigw-ring { position: absolute; left: 50%; bottom: -8%; width: 70%; height: 46%;
  border-radius: 50%; border: 2px solid rgba(255,255,255,.55);
  box-shadow: 0 0 30px rgba(100,210,255,.55), inset 0 0 30px rgba(100,210,255,.35);
  filter: blur(1px); opacity: 0; transform: translateX(-50%) scale(.25);
  animation: aigw-ring 1.05s cubic-bezier(.17,.67,.4,1) .06s forwards; }
@keyframes aigw-ring { 0% { opacity: .95; transform: translateX(-50%) scale(.25); }
  100% { opacity: 0; transform: translateX(-50%) scale(2.5); } }

.aigw-flow { position: absolute; left: 50%; top: 55%;
  width: var(--aigw-flow-size, 640px); height: var(--aigw-flow-size, 640px);
  border-radius: 50%; opacity: 0; mix-blend-mode: screen; filter: blur(26px) saturate(1.5);
  background: conic-gradient(from 0deg,
    #64d2ff 0deg, #0a84ff 60deg, #bf5af2 130deg, #ff375f 200deg,
    #ff9f0a 265deg, #64d2ff 360deg);
  animation: aigw-flow-spin 2.2s cubic-bezier(.3,.1,.25,1) forwards,
    aigw-flow-fade 1.8s ease-out forwards; }
@keyframes aigw-flow-spin { from { transform: translate(-50%,-50%) rotate(0deg) scale(.85); }
  to { transform: translate(-50%,-50%) rotate(210deg) scale(1.15); } }
@keyframes aigw-flow-fade { 0% { opacity: 0; } 16% { opacity: .9; }
  72% { opacity: .55; } 100% { opacity: 0; } }

.aigw-beam { position: absolute; inset: 0; border-radius: var(--aigw-radius, 16px);
  padding: 2px; opacity: 0;
  background: conic-gradient(from var(--aigw-angle) at 50% 50%,
    transparent 0deg, rgba(255,255,255,0) 40deg, #ffffff 96deg,
    rgba(100,210,255,.9) 130deg, #0a84ff 160deg, #bf5af2 210deg,
    #ff375f 250deg, rgba(255,159,10,.8) 280deg, transparent 330deg, transparent 360deg);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: aigw-sweep 1.5s cubic-bezier(.45,.05,.35,1) .1s forwards,
    aigw-fade 1.6s ease-out .05s forwards; }
@keyframes aigw-sweep { from { --aigw-angle: 180deg; } to { --aigw-angle: 900deg; } }
@keyframes aigw-fade { 0% { opacity: 0; } 12% { opacity: 1; } 68% { opacity: .85; }
  100% { opacity: 0; } }

.aigw-pulse { position: absolute; border-radius: 999px; opacity: 0;
  box-shadow: 0 0 0 2px rgba(255,255,255,.35), 0 0 18px 4px rgba(100,210,255,.5);
  animation: aigw-pulse .9s ease-out forwards; }
@keyframes aigw-pulse { 0% { opacity: .9; transform: scale(.6); }
  100% { opacity: 0; transform: scale(1.6); } }

/* Fullscreen variants: the whole DSH window breathes with the send. */
.aigw-fs-halo { position: absolute; left: 50%; bottom: -30%; width: 160%; height: 150%;
  transform: translateX(-50%); opacity: 0; filter: blur(34px) saturate(1.4);
  background: radial-gradient(50% 55% at 50% 94%,
    rgba(255,255,255,.22) 0%, rgba(100,210,255,.44) 16%, rgba(10,132,255,.34) 34%,
    rgba(191,90,242,.30) 52%, rgba(255,55,95,.16) 70%, rgba(255,159,10,.10) 80%, transparent 90%);
  animation: aigw-fs-halo 2.3s cubic-bezier(.22,.61,.36,1) forwards; }
@keyframes aigw-fs-halo { 0% { opacity: 0; transform: translateX(-50%) scale(.5); }
  18% { opacity: 1; } 66% { opacity: .55; }
  100% { opacity: 0; transform: translateX(-50%) scale(1.45); } }

.aigw-fs-ripple { position: absolute; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,.35);
  box-shadow: 0 0 32px rgba(100,210,255,.32), inset 0 0 32px rgba(191,90,242,.22);
  filter: blur(3px); opacity: 0; transform: translate(-50%,-50%) scale(.2);
  animation: aigw-fs-ripple 1.9s cubic-bezier(.17,.67,.4,1) forwards; }
.aigw-fs-ripple.d2 { animation-delay: .25s; }
.aigw-fs-ripple.d3 { animation-delay: .5s; }
@keyframes aigw-fs-ripple { 0% { opacity: .55; transform: translate(-50%,-50%) scale(.2); }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(4); } }

.aigw-fs-border { position: absolute; inset: 0; border-radius: 22px; padding: 3px; opacity: 0;
  background: conic-gradient(from var(--aigw-angle) at 50% 50%,
    transparent 0deg, rgba(255,255,255,0) 40deg, #ffffff 96deg,
    rgba(100,210,255,.9) 130deg, #0a84ff 160deg, #bf5af2 210deg,
    #ff375f 250deg, rgba(255,159,10,.8) 280deg, transparent 330deg, transparent 360deg);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: aigw-sweep 2s cubic-bezier(.45,.05,.35,1) .1s forwards,
    aigw-fade 2.1s ease-out .05s forwards; }

.aigw-fs-flow { position: absolute; left: 50%; top: 60%;
  width: var(--aigw-flow-size, 200vmax); height: var(--aigw-flow-size, 200vmax);
  border-radius: 50%; opacity: 0; mix-blend-mode: screen; filter: blur(60px) saturate(1.5);
  background: conic-gradient(from 0deg,
    #64d2ff 0deg, #0a84ff 60deg, #bf5af2 130deg, #ff375f 200deg,
    #ff9f0a 265deg, #64d2ff 360deg);
  animation: aigw-flow-spin 2.6s cubic-bezier(.3,.1,.25,1) forwards,
    aigw-flow-fade 2.3s ease-out forwards; }

/* Mode toggle */
.aigw-mode-btn { appearance: none; border: 1px solid rgba(128,128,128,.4);
  background: transparent; border-radius: 999px; width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: .6; padding: 0; color: inherit; flex: none; }
.aigw-mode-btn:hover { opacity: 1; }
.aigw-mode-btn svg { display: block; }

@media (prefers-reduced-motion: reduce) { .aigw-root { display: none; } }
`;

    function mk(cls) { const d = document.createElement('div'); d.className = cls; return d; }

    function dismiss() {
      if (activeTimer) { window.clearTimeout(activeTimer); activeTimer = 0; }
      if (activeRoot && activeRoot.parentNode) activeRoot.parentNode.removeChild(activeRoot);
      activeRoot = null;
    }

    function addPulse(root, btn, r) {
      if (!btn) return;
      const b = btn.getBoundingClientRect();
      if (!(b.width > 4)) return;
      const p = mk('aigw-pulse');
      const size = Math.max(b.width, b.height) * 1.6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (b.left - r.left + b.width / 2 - size / 2) + 'px';
      p.style.top = (b.top - r.top + b.height / 2 - size / 2) + 'px';
      root.appendChild(p);
    }

    function fire(btn) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const mode = getMode();
      if (mode === 'off') return;
      const host = anchor;
      if (!host || !host.isConnected) return;
      const region = btn ? sharedAncestor(btn, host, 16) : host.parentElement;
      const card = composerCardFor(region || host.parentElement);

      // Origin: composer card bottom center when the card is found, otherwise
      // the bottom center of the window.
      let ox, oy, r;
      if (card) {
        r = card.getBoundingClientRect();
        if (!r || r.width < 80 || r.height < 60) return;
        ox = r.left + r.width / 2;
        oy = r.bottom;
      } else {
        r = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        ox = window.innerWidth / 2;
        oy = window.innerHeight - 120;
      }

      dismiss();
      const root = mk(mode === 'fullscreen' ? 'aigw-root' : 'aigw-root');
      const fs = mode === 'fullscreen';
      if (fs) {
        root.style.left = '0px';
        root.style.top = '0px';
        root.style.width = window.innerWidth + 'px';
        root.style.height = window.innerHeight + 'px';
      } else {
        root.style.left = r.left + 'px';
        root.style.top = r.top + 'px';
        root.style.width = r.width + 'px';
        root.style.height = r.height + 'px';
        const cs = window.getComputedStyle(card);
        const radius = Math.min(parseFloat(cs.borderTopLeftRadius) || 16, 28);
        root.style.setProperty('--aigw-radius', radius + 'px');
        root.style.borderRadius = radius + 'px';
        const flow = Math.max(r.width, r.height) * 1.35;
        root.style.setProperty('--aigw-flow-size', flow + 'px');
      }

      if (fs) {
        root.appendChild(mk('aigw-fs-halo'));
        root.appendChild(mk('aigw-fs-flow'));
        root.appendChild(mk('aigw-fs-border'));
        for (const delayCls of ['', ' d2', ' d3']) {
          const rp = mk('aigw-fs-ripple' + delayCls);
          const base = Math.max(r ? Math.min(r.width, 320) : 320, 200);
          rp.style.width = base + 'px';
          rp.style.height = base + 'px';
          rp.style.left = ox + 'px';
          rp.style.top = oy + 'px';
          root.appendChild(rp);
        }
      } else {
        root.appendChild(mk('aigw-halo'));
        root.appendChild(mk('aigw-flow'));
        root.appendChild(mk('aigw-ring'));
        for (const delayCls of ['', ' d2', ' d3']) root.appendChild(mk('aigw-ripple' + delayCls));
        root.appendChild(mk('aigw-beam'));
      }
      addPulse(root, btn, r);
      document.body.appendChild(root);
      activeRoot = root;
      activeTimer = window.setTimeout(dismiss, fs ? 2400 : 1900);
    }

    // ---------------------------------------------------------------------------
    // Slot registration. The overlay anchor stays invisible; it exists so the
    // click/keydown handlers can scope detection to the composer card our entry
    // is mounted in, and so its <style> rides the component lifecycle. The mode
    // toggle registers into conversation.input.right, beside the submit action.
    // ---------------------------------------------------------------------------
    function GlowHost() {
      const ref = React.useRef(null);
      React.useEffect(() => {
        anchor = ref.current;
        document.addEventListener('click', onCaptureClick, true);
        document.addEventListener('keydown', onCaptureKeydown, true);
        return () => {
          if (anchor === ref.current) anchor = null;
          document.removeEventListener('click', onCaptureClick, true);
          document.removeEventListener('keydown', onCaptureKeydown, true);
          dismiss();
        };
      }, []);
      return h(React.Fragment, null,
        h('style', { key: 'aigw-style', dangerouslySetInnerHTML: { __html: CSS_TEXT } }),
        h('span', {
          ref,
          'aria-hidden': true,
          className: 'aigw-anchor',
          style: { position: 'absolute', width: 0, height: 0, pointerEvents: 'none' },
        }));
    }

    const ICONS = {
      composer: h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }),
        h('path', { d: 'M7 16c1.2-1.6 2.7-2.4 5-2.4s3.8.8 5 2.4' })),
      fullscreen: h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('rect', { x: 2.5, y: 4, width: 19, height: 16, rx: 3 }),
        h('path', { d: 'M8 4v16M16 4v16' })),
      off: h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M5.5 5.5l13 13' })),
    };

    function ModeToggle() {
      const [mode, setModeState] = React.useState(getMode);
      const cycle = React.useCallback(() => {
        setModeState(prev => {
          const next = MODES[(MODES.indexOf(prev) + 1) % MODES.length];
          setMode(next);
          return next;
        });
      }, []);
      return h('button', {
        className: 'aigw-mode-btn',
        title: modeTitle(mode),
        'aria-label': modeTitle(mode),
        onClick: cycle,
        onMouseDown: e => e.stopPropagation(),
      }, ICONS[mode] || ICONS.composer);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
          name: 'conversation.input.overlay',
          id: 'apple-glow-shockwave',
          order: 90,
        }, GlowHost));
        ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
          name: 'conversation.input.right',
          id: 'apple-glow-shockwave-mode',
          order: 95,
        }, ModeToggle));
      },
    };
  },
});
