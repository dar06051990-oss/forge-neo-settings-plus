/* Forge Neo Settings++ v0.2.6. Extra Networks views + original live icon size. */
(() => {
    'use strict';

    const ICON_SETTING_ID = 'setting_fns_card_icon_size';
    const STORAGE_PREFIX = 'forge-neo-settings-plus:mode:v1:';
    const MODES = [
        { id: 'cards', label: 'Cards', glyph: '▦' },
        { id: 'hidden', label: 'No Preview', glyph: '▤' },
        { id: 'list', label: 'List', glyph: '☰' },
    ];
    const MODE_CLASSES = MODES.map(m => 'fns-view-' + m.id);
    const LABEL_CLASSES = ['fns-label-overlay', 'fns-label-below', 'fns-label-hover'];
    const RATIO_CLASSES = ['fns-ratio-native', 'fns-ratio-square', 'fns-ratio-portrait', 'fns-ratio-landscape'];
    let observer = null;
    let widthObserver = null;
    const widthObserved = new WeakSet();
    const knownWidths = new WeakMap();
    let scheduled = false;
    let iconPreviewHooked = false;
    const pausedByUs = new WeakSet();
    const autoplayStates = new WeakMap();

    function root() {
        return (typeof gradioApp === 'function' && gradioApp()) || document;
    }

    function option(key, fallback) {
        const o = typeof opts !== 'undefined' ? opts : null;
        return o && o[key] !== undefined && o[key] !== null ? o[key] : fallback;
    }

    function safeStorageGet(key) {
        try { return window.localStorage.getItem(key); } catch (_) { return null; }
    }
    function safeStorageSet(key, value) {
        try { window.localStorage.setItem(key, value); } catch (_) { /* private browsing */ }
    }
    function modeValid(mode) {
        return MODES.some(m => m.id === mode);
    }

    function slugForPrefix(prefix) {
        return prefix.replace(/^(txt2img|img2img)_/, '');
    }

    function savedMode(prefix) {
        const raw = safeStorageGet(STORAGE_PREFIX + slugForPrefix(prefix));
        return modeValid(raw) ? raw : 'cards';
    }

    function applyIconSize(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return;
        document.documentElement.style.setProperty('--forge-neo-settings-plus-icon-size',
            Math.min(32, Math.max(10, Math.round(n))) + 'px');
    }

    function syncSettings() {
        applyIconSize(option('fns_card_icon_size', 16));
    }

    function handleIconPreview(event) {
        const target = event.target;
        if (!target || !target.matches || !target.matches('input[type="range"], input[type="number"]')) return;
        if (!target.closest || !target.closest('#' + ICON_SETTING_ID)) return;
        applyIconSize(target.value);
    }

    function ensureIconPreview() {
        if (iconPreviewHooked) return;
        const r = root();
        if (!r || typeof r.addEventListener !== 'function') return;
        r.addEventListener('input', handleIconPreview, true);
        r.addEventListener('change', handleIconPreview, true);
        iconPreviewHooked = true;
    }

    function pausePreviews(pane, shouldPause) {
        const videos = pane.querySelectorAll('.extra-network-cards .card video.preview');
        videos.forEach(video => {
            if (shouldPause) {
                if (!autoplayStates.has(video)) autoplayStates.set(video, video.autoplay);
                // Prevent autoplay starting later if native Forge added this video
                // just before the MutationObserver applied the hidden mode.
                video.autoplay = false;
                pausedByUs.add(video);
                try { video.pause(); } catch (_) { /* transient detached video */ }
            } else if (pausedByUs.has(video)) {
                pausedByUs.delete(video);
                const originallyAutoplay = autoplayStates.get(video);
                autoplayStates.delete(video);
                video.autoplay = Boolean(originallyAutoplay);
                if (originallyAutoplay && video.isConnected && typeof video.play === 'function') {
                    try {
                        const promise = video.play();
                        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
                    } catch (_) { /* autoplay may be disallowed */ }
                }
            }
        });
    }

    function applyPane(prefix) {
        const pane = root().getElementById(prefix + '_pane');
        if (!pane || !pane.classList.contains('extra-network-pane')) return;

        const mode = savedMode(prefix);
        const prev = pane.dataset.fnsView;
        pane.dataset.fnsView = mode;
        MODE_CLASSES.forEach(c => pane.classList.remove(c));
        pane.classList.add('fns-view-' + mode);

        const label = String(option('fns_extra_label_position', 'overlay'));
        LABEL_CLASSES.forEach(c => pane.classList.remove(c));
        pane.classList.add('fns-label-' + (['overlay', 'below', 'hover'].includes(label) ? label : 'overlay'));

        const lines = String(option('fns_extra_name_lines', '2'));
        pane.classList.toggle('fns-lines-full', lines === 'full');
        pane.style.setProperty('--fns-lines', lines === '1' ? '1' : '2');

        const gap = Number(option('fns_extra_card_gap', 8));
        pane.style.setProperty('--fns-card-gap', Math.max(0, Math.min(24, Number.isFinite(gap) ? gap : 8)) + 'px');

        const columns = Number(option('fns_extra_columns', '0'));
        const fixedColumns = Number.isInteger(columns) && columns >= 2 && columns <= 6;
        pane.classList.toggle('fns-fixed-columns', fixedColumns);
        pane.style.setProperty('--fns-columns', fixedColumns ? String(columns) : '2');

        // The native preview can be 100x100, 200x300 or any custom size.
        // Read the dimensions Forge actually put on a card, since CSS grid
        // must expand WIDTH and HEIGHT together when a column count is set.
        // This keeps aspect ratios sensible for BOTH checkpoints and LoRA.
        const sampleCard = pane.querySelector('.extra-network-cards > .card');
        const nativeWidth = sampleCard && Number.parseFloat(sampleCard.style.width);
        const nativeHeight = sampleCard && Number.parseFloat(sampleCard.style.height);
        const configuredWidth = Number(option('extra_networks_card_width', 0));
        const configuredHeight = Number(option('extra_networks_card_height', 0));
        const width = (Number.isFinite(nativeWidth) && nativeWidth > 0) ? nativeWidth
            : (configuredWidth > 0 ? configuredWidth : 256);
        const height = (Number.isFinite(nativeHeight) && nativeHeight > 0) ? nativeHeight
            : (configuredHeight > 0 ? configuredHeight : 384);
        pane.style.setProperty('--fns-native-card-ratio', `${width} / ${height}`);

        const ratio = String(option('fns_extra_aspect_ratio', 'native'));

        const cardsContainer = pane.querySelector('.extra-network-cards');
        if (cardsContainer && widthObserver && !widthObserved.has(cardsContainer)) {
            widthObserved.add(cardsContainer);
            widthObserver.observe(cardsContainer);
        }
        if (cardsContainer && fixedColumns && mode === 'cards') {
            // Column count is only a layout limit; never enlarge preview cards.
            // Forge adds its saved width/height inline to every card. Respect
            // those dimensions rather than dividing the entire pane into N huge
            // columns. On narrow panes reduce both width and height proportionally.
            const available = cardsContainer.clientWidth;
            const gapPx = Math.max(0, Math.min(24, Number.isFinite(gap) ? gap : 8));
            const customRatio = {square: 1, portrait: 3 / 4, landscape: 16 / 9}[ratio];
            const targetRatio = customRatio || width / Math.max(1, height);
            if (available > 0 && Number.isFinite(targetRatio) && targetRatio > 0) {
                const maxWidthPerColumn = Math.max(1, (available - (columns - 1) * gapPx - 2) / columns);
                const cardWidth = Math.min(width, maxWidthPerColumn);
                const cardHeight = cardWidth / targetRatio;
                pane.style.setProperty('--fns-fixed-card-width', `${cardWidth.toFixed(2)}px`);
                pane.style.setProperty('--fns-fixed-card-height', `${cardHeight.toFixed(2)}px`);
            }
        } else {
            pane.style.removeProperty('--fns-fixed-card-width');
            pane.style.removeProperty('--fns-fixed-card-height');
        }

        RATIO_CLASSES.forEach(c => pane.classList.remove(c));
        pane.classList.add('fns-ratio-' + (['native','square','portrait','landscape'].includes(ratio) ? ratio : 'native'));
        pane.classList.toggle('fns-fit-contain', option('fns_extra_preview_fit', 'cover') === 'contain');
        pane.classList.toggle('fns-hoverzoom', Boolean(option('fns_extra_hover_zoom', false)));

        // Pause animated previews when hidden. Gradio's native HTML may still download
        // the media; this feature hides it visually, it is not a network privacy blocker.
        if (mode !== 'cards') pausePreviews(pane, true);
        else if (prev !== mode) pausePreviews(pane, false);

        const toolbar = root().getElementById(prefix + '_controls');
        if (toolbar) {
            toolbar.querySelectorAll('.fns-view-switch button[data-mode]').forEach(button => {
                const selected = button.dataset.mode === mode;
                button.classList.toggle('fns-selected', selected);
                button.setAttribute('aria-pressed', String(selected));
            });
        }
    }

    function makeButton(spec, prefix) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fns-view-btn';
        button.dataset.mode = spec.id;
        button.title = spec.label + ' — Extra Networks';
        button.setAttribute('aria-label', spec.label);
        button.textContent = spec.glyph;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            safeStorageSet(STORAGE_PREFIX + slugForPrefix(prefix), spec.id);
            syncAll();
        });
        return button;
    }

    function ensureSwitch(controls) {
        if (!controls.id || !controls.id.endsWith('_controls')) return;
        const prefix = controls.id.slice(0, -'_controls'.length);
        if (!root().getElementById(prefix + '_pane')) return;
        if (controls.querySelector('.fns-view-switch')) return;

        const wrap = document.createElement('span');
        wrap.className = 'fns-view-switch';
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', 'Extra Networks display');
        MODES.forEach(spec => wrap.appendChild(makeButton(spec, prefix)));

        const nativeRefresh = controls.querySelector('.extra-network-control--refresh');
        controls.insertBefore(wrap, nativeRefresh || null);
    }

    function syncAll() {
        const r = root();
        if (!r || !r.querySelectorAll) return;
        syncSettings();
        r.querySelectorAll('.extra-network-control[id$="_controls"]').forEach(controls => {
            ensureSwitch(controls);
            applyPane(controls.id.slice(0, -'_controls'.length));
        });
    }

    function scheduleSync() {
        if (scheduled) return;
        scheduled = true;
        window.setTimeout(() => {
            scheduled = false;
            syncAll();
        }, 80);
    }

    function init() {
        ensureIconPreview();
        if (typeof ResizeObserver !== 'undefined') {
            if (widthObserver) widthObserver.disconnect();
            widthObserver = new ResizeObserver(entries => {
                let widthChanged = false;
                for (const entry of entries) {
                    const current = entry.contentRect.width;
                    const previous = knownWidths.get(entry.target);
                    knownWidths.set(entry.target, current);
                    if (previous === undefined || Math.abs(previous - current) > 0.5) widthChanged = true;
                }
                if (widthChanged) scheduleSync();
            });
        }
        syncAll();
        window.addEventListener('resize', scheduleSync);
        if (observer) observer.disconnect();
        const r = root();
        if (!r) return;
        observer = new MutationObserver(scheduleSync);
        observer.observe(r, { subtree: true, childList: true });
    }

    if (typeof onOptionsAvailable === 'function') onOptionsAvailable(() => { syncSettings(); scheduleSync(); });
    if (typeof onOptionsChanged === 'function') onOptionsChanged(() => { syncSettings(); scheduleSync(); });
    if (typeof onUiLoaded === 'function') onUiLoaded(init);
    else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
