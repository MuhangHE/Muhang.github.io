/* Minimal dependency-free lightbox.
 *
 * Handles two things:
 *  1. `a[data-lightbox]` anchors (the `photos`/`photo` shortcodes): anchors
 *     sharing a data-lightbox value form a group with prev/next navigation
 *     and captions from data-caption.
 *  2. `img[data-zoomable]` (the theme's markdown image renderer emits this
 *     attribute but this module version ships no JS for it): click to view
 *     the image full-size, caption read from the sibling figcaption.
 *
 * Injected site-wide via layouts/partials/hooks/body-end/lightbox.html.
 */
(function () {
  'use strict';

  var overlay = null;
  var items = []; // { src, caption }
  var index = 0;

  function largestSrc(img) {
    // Prefer the largest srcset candidate so the lightbox shows the
    // highest-resolution rendition the page generated.
    var best = img.currentSrc || img.src;
    var bestW = 0;
    (img.srcset || '').split(',').forEach(function (entry) {
      var parts = entry.trim().split(/\s+/);
      var w = parseInt(parts[1], 10) || 0;
      if (parts[0] && w > bestW) {
        bestW = w;
        best = parts[0];
      }
    });
    return best;
  }

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'hb-lb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<button class="hb-lb-close" aria-label="Close">&#10005;</button>' +
      '<button class="hb-lb-prev" aria-label="Previous">&#8249;</button>' +
      '<button class="hb-lb-next" aria-label="Next">&#8250;</button>' +
      '<figure class="hb-lb-figure"><img alt="" /><figcaption></figcaption></figure>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      // Close on backdrop click, not on image/caption/nav clicks.
      if (e.target === overlay || e.target.classList.contains('hb-lb-figure')) close();
    });
    overlay.querySelector('.hb-lb-close').addEventListener('click', close);
    overlay.querySelector('.hb-lb-prev').addEventListener('click', function () { step(-1); });
    overlay.querySelector('.hb-lb-next').addEventListener('click', function () { step(1); });
  }

  function render() {
    var item = items[index];
    var img = overlay.querySelector('img');
    var cap = overlay.querySelector('figcaption');
    img.src = item.src;
    img.alt = item.caption || '';
    cap.textContent = item.caption || '';
    cap.style.display = item.caption ? '' : 'none';
    var multi = items.length > 1;
    overlay.querySelector('.hb-lb-prev').style.display = multi ? '' : 'none';
    overlay.querySelector('.hb-lb-next').style.display = multi ? '' : 'none';
  }

  function open(group, at) {
    build();
    items = group;
    index = at;
    render();
    overlay.classList.add('is-open');
    document.documentElement.classList.add('hb-lb-lock');
    document.addEventListener('keydown', onKey);
  }

  function close() {
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('hb-lb-lock');
    document.removeEventListener('keydown', onKey);
  }

  function step(dir) {
    index = (index + dir + items.length) % items.length;
    render();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  function init() {
    // Grouped galleries from the photos/photo shortcodes.
    var groups = {};
    document.querySelectorAll('a[data-lightbox]').forEach(function (a) {
      var name = a.getAttribute('data-lightbox');
      (groups[name] = groups[name] || []).push(a);
    });
    Object.keys(groups).forEach(function (name) {
      var anchors = groups[name];
      var group = anchors.map(function (a) {
        return { src: a.href, caption: a.getAttribute('data-caption') || '' };
      });
      anchors.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          open(group, i);
        });
      });
    });

    // Single markdown images (theme emits data-zoomable with no JS backing).
    document.querySelectorAll('img[data-zoomable]').forEach(function (img) {
      if (img.closest('a')) return; // already a link — don't hijack it
      img.classList.add('hb-zoomable');
      img.addEventListener('click', function () {
        var fig = img.closest('figure');
        var cap = fig && fig.querySelector('figcaption');
        open([{ src: largestSrc(img), caption: cap ? cap.textContent.trim() : '' }], 0);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
