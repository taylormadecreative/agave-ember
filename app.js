/* Agave & Ember · site behavior */
(function () {
  'use strict';

  var CONFIG = {
    // Preview mode: the form never sends anything. Turn off only once the owners choose where requests go.
    preview: true,
    // Paste a Web3Forms access key (web3forms.com, free) to deliver requests straight to the inbox.
    // Left empty, the form opens the guest's email app with the request addressed to the managers.
    web3formsKey: '',
    email: 'Managers@agave-ember.com',
    tz: 'America/Chicago',
    address: '960 W Exchange Pkwy, Suite 150, Allen, TX 75013'
  };

  // Hours in minutes after midnight. Day index: 0 = Sunday.
  var HOURS = {
    0: { open: 540, close: 1260 },
    1: { open: 660, close: 1260 },
    2: { open: 660, close: 1260 },
    3: { open: 660, close: 1260 },
    4: { open: 660, close: 1260 },
    5: { open: 660, close: 1380, kitchen: 1320 },
    6: { open: 540, close: 1440, kitchen: 1320 }
  };
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ---------- Time helpers (always Allen, Texas time) ---------- */
  function nowInAllen() {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.tz, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var y = +parts.year, m = +parts.month, d = +parts.day;
    return { y: y, m: m, d: d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), mins: (+parts.hour % 24) * 60 + (+parts.minute) };
  }
  function fmtTime(mins) {
    if (mins >= 1440) return 'midnight';
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap;
  }
  function dayFromOffset(base, offset) {
    var dt = new Date(Date.UTC(base.y, base.m - 1, base.d + offset, 12));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: dt.getUTCDay(), date: dt };
  }
  function isoDate(day) { return day.y + '-' + String(day.m).padStart(2, '0') + '-' + String(day.d).padStart(2, '0'); }
  function longDate(day) {
    return day.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  }

  /* ---------- Open now, drawn as type ---------- */
  function statusText() {
    var n = nowInAllen(), h = HOURS[n.dow];
    if (n.mins >= h.open && n.mins < h.close) {
      var t = 'Open now until ' + fmtTime(h.close);
      if (h.kitchen && n.mins >= h.kitchen) t += '. The kitchen has closed for the night';
      return { open: true, text: t };
    }
    if (n.mins < h.open) return { open: false, text: 'Opens today at ' + fmtTime(h.open) };
    var next = HOURS[(n.dow + 1) % 7];
    return { open: false, text: 'Closed now. Opens tomorrow at ' + fmtTime(next.open) };
  }
  function paintStatus() {
    var s = statusText();
    $$('[data-open-line], [data-open-big]').forEach(function (el) {
      el.textContent = s.text;
      el.classList.toggle('is-open', s.open);
    });
    var today = nowInAllen().dow;
    $$('.hours-table tr').forEach(function (tr) { tr.classList.toggle('today', +tr.dataset.day === today); });
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* ---------- Embers ---------- */
  function embers(canvas, opts) {
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], running = false, visible = true, raf = 0;
    function size() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(initial) {
      return {
        x: opts.originX ? w * (0.5 + (Math.random() - 0.5) * opts.originX) : Math.random() * w,
        y: initial ? Math.random() * h : h + 10,
        vy: -(0.25 + Math.random() * opts.speed),
        vx: (Math.random() - 0.5) * 0.3,
        r: 0.6 + Math.random() * opts.size,
        life: 0, max: 260 + Math.random() * 420,
        phase: Math.random() * Math.PI * 2
      };
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.life++; p.phase += 0.03;
        p.x += p.vx + Math.sin(p.phase) * 0.35; p.y += p.vy;
        var t = p.life / p.max;
        if (t >= 1 || p.y < -20) { parts[i] = spawn(false); continue; }
        var a = Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.sin(p.phase * 3)) * opts.alpha;
        var hue = 42 - t * 20; // gold to ember as it cools
        ctx.fillStyle = 'hsla(' + hue + ', 95%, 58%, ' + (a * 0.18).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'hsla(' + (hue + 8) + ', 100%, 70%, ' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running && visible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    size();
    for (var i = 0; i < opts.count; i++) parts.push(spawn(true));
    window.addEventListener('resize', function () { size(); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(canvas);
    }
    start();
    return { stop: stop };
  }

  var introEmbers = null;
  if (!root.classList.contains('no-intro')) {
    introEmbers = embers($('.intro-embers'), { count: 90, speed: 1.6, size: 2.2, alpha: 1, originX: 0.9 });
    var endIntro = function () { root.classList.add('intro-done'); };
    $('.intro').addEventListener('click', endIntro);
    document.addEventListener('keydown', endIntro, { once: true });
    setTimeout(function () { if (introEmbers) introEmbers.stop(); }, 3800);
  }
  embers($('.hero-embers'), { count: window.innerWidth < 700 ? 18 : 34, speed: 0.7, size: 1.5, alpha: 0.7 });

  /* ---------- Header state + current section ---------- */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    var navLinks = $$('.nav a');
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { sectionObs.observe(s); });
  }

  /* ---------- Text reveals (never photos) ---------- */
  var rv = $$('.rv');
  function revealAll() { root.classList.add('reveal-all'); }
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { io.observe(el); });
    // If the tab was in the background, show everything the moment it comes forward.
    document.addEventListener('visibilitychange', function () { if (!document.hidden) revealAll(); });
    setTimeout(revealAll, 6000);
  }

  /* ---------- Menu tabs ---------- */
  var tabs = $$('.tabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) { panel.classList.remove('fade-in'); void panel.offsetWidth; panel.classList.add('fade-in'); }
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, j = null;
      if (k === 'ArrowRight') j = (i + 1) % tabs.length;
      if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') j = 0;
      if (k === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  $$('[data-open-tab]').forEach(function (a) {
    a.addEventListener('click', function () { selectTab(document.getElementById(a.dataset.openTab)); });
  });

  /* ---------- Reservations ---------- */
  var form = $('#booking');
  var state = { party: 2, day: null, time: null };
  var today = nowInAllen();
  var partyEl = $('[data-party]'), datesEl = $('[data-dates]'), timesEl = $('[data-times]');
  var dateInput = $('[data-date-input]'), summaryEl = $('[data-summary]'), errorEl = $('[data-error]');

  function chip(label, pressed, extraClass) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (extraClass ? ' ' + extraClass : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', pressed ? 'true' : 'false');
    if (typeof label === 'string') b.textContent = label; else b.appendChild(label);
    return b;
  }
  function setChecked(container, btn) {
    $$('.chip', container).forEach(function (c) { c.setAttribute('aria-checked', c === btn ? 'true' : 'false'); });
  }
  function radioKeys(container) {
    container.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      var list = $$('.chip:not(:disabled)', container), i = list.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = list[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
      n.focus(); n.click();
    });
  }

  // Guests 1 to 8, then 9+
  for (var p = 1; p <= 9; p++) (function (n) {
    var b = chip(n === 9 ? '9+' : String(n), n === state.party);
    b.setAttribute('aria-label', n === 9 ? '9 or more guests' : n + (n === 1 ? ' guest' : ' guests'));
    b.addEventListener('click', function () {
      setChecked(partyEl, b);
      state.party = n;
      $('[data-party-hint]').hidden = n !== 9;
      $('[data-submit]').disabled = n === 9;
      updateSummary();
    });
    partyEl.appendChild(b);
  })(p);
  radioKeys(partyEl);

  // Last seating: one hour before the kitchen (or the room) closes.
  function slotsFor(day) {
    var h = HOURS[day.dow], last = (h.kitchen || h.close) - 60, out = [];
    var isToday = isoDate(day) === isoDate(today);
    var cutoff = isToday ? nowInAllen().mins + 30 : -1;
    for (var t = h.open; t <= last; t += 30) out.push({ mins: t, past: t < cutoff });
    return out;
  }

  function renderTimes() {
    timesEl.innerHTML = '';
    var note = $('[data-time-note]');
    if (!state.day) { note.textContent = ''; return; }
    var slots = slotsFor(state.day), open = slots.filter(function (s) { return !s.past; });
    note.textContent = state.day.dow === 0 || state.day.dow === 6 ? 'Brunch from 9 AM' : '';
    if (!open.length) {
      var p = document.createElement('p');
      p.className = 'times-empty';
      p.textContent = 'Online requests for today have closed. Please pick another day.';
      timesEl.appendChild(p);
      state.time = null; updateSummary();
      return;
    }
    if (state.time !== null && !open.some(function (s) { return s.mins === state.time; })) state.time = null;
    slots.forEach(function (s) {
      if (s.past) return;
      var b = chip(fmtTime(s.mins), s.mins === state.time);
      b.addEventListener('click', function () { setChecked(timesEl, b); state.time = s.mins; updateSummary(); clearError(); });
      timesEl.appendChild(b);
    });
    updateSummary();
  }

  function pickDay(day, btn) {
    state.day = day;
    if (btn) { setChecked(datesEl, btn); dateInput.value = ''; }
    else { setChecked(datesEl, null); }
    renderTimes();
  }

  // Next 14 days as chips
  for (var i = 0; i < 14; i++) (function (off) {
    var day = dayFromOffset(today, off);
    var wrap = document.createElement('span');
    var dw = document.createElement('span'); dw.className = 'dw';
    dw.textContent = off === 0 ? 'Today' : DAY_NAMES[day.dow].slice(0, 3);
    var dd = document.createElement('span'); dd.className = 'dd'; dd.textContent = day.d;
    wrap.style.display = 'contents'; wrap.appendChild(dw); wrap.appendChild(dd);
    var b = chip(wrap, false, 'date-chip');
    b.setAttribute('aria-label', longDate(day));
    b.dataset.iso = isoDate(day);
    b.addEventListener('click', function () { pickDay(day, b); clearError(); });
    datesEl.appendChild(b);
  })(i);
  radioKeys(datesEl);

  dateInput.min = isoDate(today);
  dateInput.max = isoDate(dayFromOffset(today, 90));
  dateInput.addEventListener('change', function () {
    if (!dateInput.value) return;
    var v = dateInput.value.split('-').map(Number);
    var day = dayFromOffset({ y: v[0], m: v[1], d: v[2] }, 0);
    var match = $('.date-chip[data-iso="' + isoDate(day) + '"]', datesEl);
    if (match) { match.click(); match.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
    pickDay(day, null);
  });

  // Start on today, or tomorrow if today has no seats left.
  (function () {
    var first = $$('.date-chip', datesEl)[0];
    var todaySlots = slotsFor(today).filter(function (s) { return !s.past; });
    if (!todaySlots.length) first = $$('.date-chip', datesEl)[1];
    first.click();
  })();

  // "Book brunch" jumps to the next Saturday
  var weekendLink = $('[data-reserve-weekend]');
  if (weekendLink) weekendLink.addEventListener('click', function () {
    var chips = $$('.date-chip', datesEl);
    for (var k = 0; k < chips.length; k++) {
      var v = chips[k].dataset.iso.split('-').map(Number);
      var dow = new Date(Date.UTC(v[0], v[1] - 1, v[2])).getUTCDay();
      if (dow === 6 || dow === 0) {
        var usable = slotsFor(dayFromOffset({ y: v[0], m: v[1], d: v[2] }, 0)).some(function (s) { return !s.past; });
        if (usable) { chips[k].click(); break; }
      }
    }
  });

  function describe() {
    if (!state.day) return '';
    var who = state.party === 9 ? '9 or more guests' : state.party + (state.party === 1 ? ' guest' : ' guests');
    return who + ' · ' + longDate(state.day) + (state.time !== null ? ' at ' + fmtTime(state.time) : '');
  }
  function updateSummary() {
    var ready = state.day && state.time !== null;
    summaryEl.textContent = ready ? describe() : state.day ? describe() + ' · choose a time' : 'Choose a date and time';
    summaryEl.classList.toggle('empty', !ready);
  }

  function clearError() { errorEl.hidden = true; errorEl.textContent = ''; }
  function showError(msg, field) {
    errorEl.textContent = msg; errorEl.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  $$('input, select, textarea', form).forEach(function (f) {
    f.addEventListener('input', function () { f.removeAttribute('aria-invalid'); });
  });

  function mailtoHref(data) {
    var body = [
      'Reservation request',
      '',
      'Party: ' + data.party,
      'Date: ' + data.date,
      'Time: ' + data.time,
      'Name: ' + data.name,
      'Phone: ' + data.phone,
      'Email: ' + data.email,
      data.occasion ? 'Occasion: ' + data.occasion : '',
      data.notes ? 'Requests: ' + data.notes : ''
    ].filter(function (l, i) { return l !== '' || i === 1; }).join('\n');
    return 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Reservation request: ' + data.party + ', ' + data.date + ' at ' + data.time) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    if (form.elements['botcheck'].checked) return;
    if (state.party === 9) return showError('For 9 or more, please email us and we’ll set up the room.');
    if (!state.day) return showError('Choose a date.');
    if (state.time === null) return showError('Choose a time.', $('.chip', timesEl));
    var els = form.elements, name = els['name'], phone = els['phone'], email = els['email'];
    if (!name.value.trim()) return showError('Add the name for the reservation.', name);
    if (phone.value.replace(/\D/g, '').length < 10) return showError('Add a phone number we can reach you at.', phone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return showError('Add an email so we can confirm your table.', email);

    var data = {
      party: state.party + (state.party === 1 ? ' guest' : ' guests'),
      date: longDate(state.day),
      time: fmtTime(state.time),
      name: name.value.trim(), phone: phone.value.trim(), email: email.value.trim(),
      occasion: els['occasion'].value, notes: els['notes'].value.trim()
    };
    var btn = $('[data-submit]');

    if (CONFIG.preview) {
      done('Request received', 'This is a preview of the booking flow, so nothing was sent. When reservations go live, a request for ' + describe() + ' will go straight to the restaurant for confirmation.');
    } else if (CONFIG.web3formsKey) {
      btn.disabled = true; btn.textContent = 'Sending...';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.assign({
          access_key: CONFIG.web3formsKey,
          subject: 'Reservation request: ' + data.party + ', ' + data.date + ' at ' + data.time,
          from_name: 'Agave & Ember website',
          replyto: data.email
        }, data))
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res.success) throw new Error(res.message || 'failed');
        done('Request sent', 'Thank you, ' + data.name.split(' ')[0] + '. We’ve received your request for ' + describe() + '. We’ll email ' + data.email + ' to confirm your table.');
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Send my request';
        showError('That didn’t go through. Try again, or email ' + CONFIG.email + '.');
      });
    } else {
      var href = mailtoHref(data);
      window.location.href = href;
      done('One more step', 'Your email app opened with your request for ' + describe() + ', addressed to our managers. Press send and we’ll reply to confirm your table.', href);
    }
  });

  function done(title, body, mailto) {
    $('[data-done-title]').textContent = title;
    var p = $('[data-done-body]');
    p.textContent = body;
    if (mailto) {
      p.appendChild(document.createTextNode(' Didn’t open? '));
      var a = document.createElement('a'); a.href = mailto; a.textContent = 'Email ' + CONFIG.email.toLowerCase();
      p.appendChild(a);
    }
    form.classList.add('is-done');
    var d = $('[data-done]'); d.hidden = false; d.focus();
  }

  $('[data-again]').addEventListener('click', function () {
    form.classList.remove('is-done'); $('[data-done]').hidden = true;
    var btn = $('[data-submit]'); btn.disabled = false; btn.textContent = 'Send my request';
    form.elements['notes'].value = ''; form.elements['occasion'].value = '';
    $('#reserve').scrollIntoView();
  });

  // Calendar file for the requested table
  $('[data-ics]').addEventListener('click', function () {
    if (!state.day || state.time === null) return;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var start = state.day.y + pad(state.day.m) + pad(state.day.d) + 'T' + pad(Math.floor(state.time / 60)) + pad(state.time % 60) + '00';
    var endM = state.time + 90;
    var endDay = endM >= 1440 ? dayFromOffset(state.day, 1) : state.day;
    endM = endM % 1440;
    var end = endDay.y + pad(endDay.m) + pad(endDay.d) + 'T' + pad(Math.floor(endM / 60)) + pad(endM % 60) + '00';
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agave & Ember//Reservations//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@agave-ember.com',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      'DTSTART;TZID=America/Chicago:' + start, 'DTEND;TZID=America/Chicago:' + end,
      'SUMMARY:Dinner at Agave & Ember (requested)',
      'LOCATION:' + CONFIG.address.replace(/,/g, '\\,'),
      'DESCRIPTION:Table for ' + state.party + '. Watch your email for confirmation.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'agave-and-ember.ics';
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---------- Land shared #links correctly once fonts settle ---------- */
  if (location.hash && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 60);
    });
  }
})();
