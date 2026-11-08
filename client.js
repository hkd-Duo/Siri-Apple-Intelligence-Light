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
    // The Siri-style composer marquee: when a message is sent, a Siri-style
    // chase light loops around the composer card's border. A fixed,
    // pointer-events:none layer is appended to document.body (fixed layers
    // inside the docked composer must portal there), aligned to the card rect.
    // The edge carries the moving glow; the interior stays clear.
    // Layers:
    //   edge-glow  - soft colorful band hugging the border (the Siri edge light)
    //   edge-comet - the sharp white comet leading the chase
    //   pulse      - a brief pulse ring on the submit button itself
    // ---------------------------------------------------------------------------
    const CSS_TEXT = `
@property --aigw-angle { syntax: '<angle>'; inherits: false; initial-value: 180deg; }
.aigw-root { position: fixed; pointer-events: none; z-index: 2147483000; overflow: hidden; }

.aigw-pulse { position: absolute; border-radius: 999px; opacity: 0;
  box-shadow: 0 0 0 2px rgba(255,255,255,.35), 0 0 18px 4px rgba(100,210,255,.5);
  animation: aigw-pulse .9s ease-out forwards; }
@keyframes aigw-pulse { 0% { opacity: .9; transform: scale(.6); }
  100% { opacity: 0; transform: scale(1.6); } }

/* Composer marquee: chase light looping around the composer card border. */
.aigw-edge-glow { position: absolute; inset: 0; border-radius: var(--aigw-radius, 18px);
  padding: 8px; opacity: 0; mix-blend-mode: screen; filter: blur(7px) saturate(1.35);
  background: conic-gradient(from var(--aigw-angle) at 50% 50%,
    #64d2ff 0deg, #0a84ff 60deg, #bf5af2 130deg, #ff375f 200deg,
    #ff9f0a 265deg, #64d2ff 360deg);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: aigw-sweep 2.2s cubic-bezier(.45,.05,.35,1) .05s forwards,
    aigw-edge-fade 2.3s ease-out .05s forwards; }
.aigw-edge-comet { position: absolute; inset: 0; border-radius: var(--aigw-radius, 18px);
  padding: 2.5px; opacity: 0;
  background: conic-gradient(from var(--aigw-angle) at 50% 50%,
    transparent 0deg, rgba(255,255,255,0) 40deg, #ffffff 96deg,
    rgba(100,210,255,.9) 130deg, #0a84ff 160deg, #bf5af2 210deg,
    #ff375f 250deg, rgba(255,159,10,.8) 280deg, transparent 330deg, transparent 360deg);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: aigw-sweep 2.2s cubic-bezier(.45,.05,.35,1) .05s forwards,
    aigw-edge-fade 2.3s ease-out .05s forwards; }
@keyframes aigw-sweep { from { --aigw-angle: 180deg; } to { --aigw-angle: 900deg; } }
@keyframes aigw-edge-fade { 0% { opacity: 0; } 10% { opacity: .95; } 78% { opacity: .8; }
  100% { opacity: 0; } }

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
      const host = anchor;
      if (!host || !host.isConnected) return;
      const region = btn ? sharedAncestor(btn, host, 16) : host.parentElement;
      const card = composerCardFor(region || host.parentElement);

      // The marquee traces the composer card's border; when no card-shaped
      // ancestor is found, fall back to a card-sized band near the bottom.
      let er, radius = 18;
      if (card) {
        er = card.getBoundingClientRect();
        if (!er || er.width < 80 || er.height < 40) return;
        const cs = window.getComputedStyle(card);
        radius = Math.min(parseFloat(cs.borderTopLeftRadius) || 16, 28);
      } else {
        const w = Math.min(560, window.innerWidth - 48);
        er = { left: (window.innerWidth - w) / 2, top: window.innerHeight - 190, width: w, height: 132 };
      }

      dismiss();
      const root = mk('aigw-root');
      root.style.left = er.left + 'px';
      root.style.top = er.top + 'px';
      root.style.width = er.width + 'px';
      root.style.height = er.height + 'px';
      root.style.setProperty('--aigw-radius', radius + 'px');
      root.style.borderRadius = radius + 'px';
      root.appendChild(mk('aigw-edge-glow'));
      root.appendChild(mk('aigw-edge-comet'));
      addPulse(root, btn, er);
      document.body.appendChild(root);
      activeRoot = root;
      activeTimer = window.setTimeout(dismiss, 2400);
    }

    // ---------------------------------------------------------------------------
    // Slot registration. The overlay anchor stays invisible; it exists so the
    // click/keydown handlers can scope detection to the composer card our entry
    // is mounted in, and so its <style> rides the component lifecycle.
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

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
          name: 'conversation.input.overlay',
          id: 'apple-glow-shockwave',
          order: 90,
        }, GlowHost));
      },
    };
  },
});
