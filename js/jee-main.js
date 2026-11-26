/* EdisonOS — JEE Main landing page interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ---------------- Scroll: progress bar, nav hide/show, sticky CTA, steps ---------------- */
  var progressBar = $('.scroll-progress_bar');
  var nav = $('[data-nav]');
  var menu = $('#navbar-menu');
  var stickyCta = $('[data-sticky-cta]');
  var hero = $('.section_jee-hero');
  var steps = $('[data-steps]');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (nav && menu) nav.classList.toggle('is-hidden', !menu.classList.contains('is-open') && y > lastY && y > 400);
    if (stickyCta && hero) stickyCta.classList.toggle('is-visible', y > hero.offsetHeight - 100);
    if (steps) {
      var r = steps.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      steps.style.setProperty('--steps-progress', p.toFixed(3));
      $$('.jee-steps_item', steps).forEach(function (item) {
        item.classList.toggle('is-reached', item.getBoundingClientRect().top < window.innerHeight * 0.6);
      });
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------------- Mobile nav ---------------- */
  var toggle = $('[data-nav-toggle]');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 4) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------- Hero: count-up on the report score ---------------- */
  $$('[data-count-to]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10);
    if (reduceMotion || !target) return;
    var startTime = null;
    var step = function (t) {
      if (!startTime) startTime = t;
      var p = Math.min(1, (t - startTime) / 1400);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(function () { el.textContent = target; }, 1700);
  });

  /* ---------------- Mini mock ---------------- */
  var QUESTIONS = [
    {
      subject: 'Physics', chapter: 'Kinematics', type: 'mcq', difficulty: 'Easy',
      text: 'A ball is projected at 30° to the horizontal with a speed of 20 m/s. Taking g = 10 m/s², what is the maximum height it reaches?',
      options: ['5 m', '10 m', '15 m', '20 m'], answer: 0,
      solution: 'H = u² sin²θ / 2g = (400 × ¼) / 20 = 5 m'
    },
    {
      subject: 'Chemistry', chapter: 'Chemical Bonding', type: 'mcq', difficulty: 'Easy',
      text: 'What is the hybridisation of each carbon atom in ethyne (C₂H₂)?',
      options: ['sp', 'sp²', 'sp³', 'dsp²'], answer: 0,
      solution: 'Each carbon has two σ bonds (one to C, one to H) and two π bonds, so it is sp hybridised.'
    },
    {
      subject: 'Mathematics', chapter: 'Quadratic Equations', type: 'numeric', difficulty: 'Medium',
      text: 'If α and β are the roots of x² − 5x + 6 = 0, find the value of α² + β².',
      answer: 13,
      solution: 'α + β = 5 and αβ = 6, so α² + β² = (α + β)² − 2αβ = 25 − 12 = 13'
    }
  ];
  /* Same buckets as the "Performance by time" section of the EdisonOS report */
  var TIME_BUCKETS = [
    { name: 'Blind guess', range: '0–10s', max: 10 },
    { name: 'Rushed', range: '11–40s', max: 40 },
    { name: 'Ideal', range: '41–90s', max: 90 },
    { name: 'Deep dive', range: '91–150s', max: 150 },
    { name: 'Time sink', range: '150s+', max: Infinity }
  ];
  var TOTAL_TIME = 90;
  var mock = $('[data-mock]');
  if (mock) {
    var el = {
      screens: $$('[data-mock-screen]', mock),
      subject: $('[data-mock-subject]', mock), count: $('[data-mock-count]', mock),
      timer: $('[data-mock-timer]', mock), timebar: $('[data-mock-timebar]', mock),
      type: $('[data-mock-type]', mock), question: $('[data-mock-question]', mock),
      options: $('[data-mock-options]', mock), numeric: $('[data-mock-numeric]', mock), input: $('[data-mock-input]', mock),
      next: $('[data-mock-next]', mock), skip: $('[data-mock-skip]', mock)
    };
    var state;

    var show = function (name) {
      el.screens.forEach(function (s) { s.classList.toggle('is-active', s.getAttribute('data-mock-screen') === name); });
    };

    var renderTimer = function () {
      var left = Math.max(0, state.timeLeft);
      el.timer.textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
      el.timer.classList.toggle('is-warning', left <= 20);
      el.timebar.style.transform = 'scaleX(' + (left / TOTAL_TIME) + ')';
    };

    var renderQuestion = function () {
      var q = QUESTIONS[state.index];
      state.qStart = Date.now();
      state.choice = null;
      el.subject.textContent = q.subject;
      el.count.textContent = 'Question ' + (state.index + 1) + ' of ' + QUESTIONS.length;
      el.type.textContent = q.type === 'mcq' ? 'Section A · Multiple choice' : 'Section B · Numerical value';
      el.question.textContent = q.text;
      el.next.disabled = true;
      el.next.textContent = state.index === QUESTIONS.length - 1 ? 'Submit' : 'Save & next';
      el.options.innerHTML = '';
      if (q.type === 'mcq') {
        el.options.classList.remove('hide');
        el.numeric.classList.add('hide');
        q.options.forEach(function (opt, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'jee-mock_option';
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', 'false');
          b.innerHTML = '<span class="jee-mock_option-key">' + 'ABCD'[i] + '</span><span></span>';
          b.lastChild.textContent = opt;
          b.addEventListener('click', function () {
            state.choice = i;
            $$('.jee-mock_option', el.options).forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
            el.next.disabled = false;
          });
          el.options.appendChild(b);
        });
      } else {
        el.options.classList.add('hide');
        el.numeric.classList.remove('hide');
        el.input.value = '';
        setTimeout(function () { el.input.focus({ preventScroll: true }); }, 50);
      }
    };

    var record = function (skipped) {
      var q = QUESTIONS[state.index];
      var given = skipped ? null : state.choice;
      var result = given === null ? 'skipped' : (given === q.answer ? 'correct' : 'wrong');
      state.answers.push({ q: q, result: result, time: Math.round((Date.now() - state.qStart) / 1000) });
    };

    var formatTime = function (secs) { return secs >= 60 ? Math.floor(secs / 60) + 'm ' + pad(secs % 60) + 's' : secs + 's'; };

    var finish = function () {
      clearInterval(state.interval);
      /* Questions never reached before the timer ran out are "unvisited", as in the real report */
      if (state.answers.length < QUESTIONS.length && state.index < QUESTIONS.length) {
        state.answers.push({ q: QUESTIONS[state.index], result: 'skipped', time: Math.round((Date.now() - state.qStart) / 1000) });
      }
      while (state.answers.length < QUESTIONS.length) {
        state.answers.push({ q: QUESTIONS[state.answers.length], result: 'unvisited', time: 0 });
      }
      var counts = { correct: 0, wrong: 0, skipped: 0, unvisited: 0 }, time = 0;
      state.answers.forEach(function (a) { counts[a.result]++; time += a.time; });
      var attempted = counts.correct + counts.wrong;
      var visited = QUESTIONS.length - counts.unvisited;
      $('[data-mock-score]', mock).textContent = counts.correct * 4 - counts.wrong;
      $('[data-mock-correct]', mock).textContent = counts.correct;
      $('[data-mock-wrong]', mock).textContent = counts.wrong;
      $('[data-mock-skipped]', mock).textContent = counts.skipped;
      $('[data-mock-unvisited]', mock).textContent = counts.unvisited;
      $('[data-mock-accuracy]', mock).textContent = attempted ? Math.round(counts.correct / attempted * 100) + '%' : '—';
      $('[data-mock-accuracy-sub]', mock).textContent = counts.correct + ' / ' + attempted;
      $('[data-mock-time]', mock).textContent = formatTime(time);
      $('[data-mock-time-sub]', mock).textContent = '~' + (visited ? Math.round(time / visited) : 0) + 's / Qn';

      var bar = $('[data-mock-bar]', mock);
      bar.innerHTML = '';
      state.answers.forEach(function (a, i) {
        var seg = document.createElement('i');
        seg.className = 'is-' + a.result;
        seg.style.animationDelay = (i * 120) + 'ms';
        bar.appendChild(seg);
      });

      var buckets = $('[data-mock-buckets]', mock);
      buckets.innerHTML = '';
      TIME_BUCKETS.forEach(function (bucket, bi) {
        var min = bi === 0 ? -1 : TIME_BUCKETS[bi - 1].max;
        var n = state.answers.filter(function (a) { return a.result !== 'unvisited' && a.time > min && a.time <= bucket.max; }).length;
        var d = document.createElement('div');
        d.className = 'jee-mock_time-bucket' + (n ? ' is-filled' : '');
        d.innerHTML = '<b></b><span></span><em>' + n + '</em>';
        d.querySelector('b').textContent = bucket.name;
        d.querySelector('span').textContent = bucket.range;
        buckets.appendChild(d);
      });

      var review = $('[data-mock-review]', mock);
      review.innerHTML = '';
      var labels = { correct: '+4 Correct', wrong: '−1 Incorrect', skipped: '0 Skipped', unvisited: '0 Unvisited' };
      state.answers.forEach(function (a, i) {
        var li = document.createElement('li');
        li.className = 'jee-mock_review-item';
        li.innerHTML = '<span class="jee-mock_review-badge is-' + (a.result === 'unvisited' ? 'skipped' : a.result) + '">#' + (i + 1) + '</span>' +
          '<div><b></b><div class="jee-mock_review-tags"></div><div class="jee-mock_review-solution"></div></div>' +
          '<span class="jee-mock_review-time">' + a.time + 's</span>';
        li.querySelector('b').textContent = labels[a.result];
        var tags = li.querySelector('.jee-mock_review-tags');
        [a.q.subject, a.q.chapter, a.q.type === 'mcq' ? 'Multiple choice' : 'Numerical value', a.q.difficulty].forEach(function (t) {
          var sp = document.createElement('span'); sp.textContent = t; tags.appendChild(sp);
        });
        li.querySelector('.jee-mock_review-solution').textContent = 'Solution: ' + a.q.solution;
        review.appendChild(li);
      });
      show('report');
    };

    var advance = function (skipped) {
      record(skipped);
      state.index++;
      if (state.index >= QUESTIONS.length) finish(); else renderQuestion();
    };

    var start = function () {
      state = { index: 0, answers: [], timeLeft: TOTAL_TIME, choice: null };
      show('question');
      renderQuestion();
      renderTimer();
      state.interval = setInterval(function () {
        state.timeLeft--;
        renderTimer();
        if (state.timeLeft <= 0) finish();
      }, 1000);
    };

    el.input.addEventListener('input', function () {
      var v = el.input.value.trim();
      var valid = /^-?\d+$/.test(v);
      state.choice = valid ? parseInt(v, 10) : null;
      el.next.disabled = !valid;
    });
    el.input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !el.next.disabled) advance(false); });
    $('[data-mock-start]', mock).addEventListener('click', start);
    $('[data-mock-restart]', mock).addEventListener('click', start);
    el.next.addEventListener('click', function () { advance(false); });
    el.skip.addEventListener('click', function () { advance(true); });
  }

  /* ---------------- Analysis: report section tabs ---------------- */
  var analysis = $('[data-analysis]');
  if (analysis) {
    var tabs = $$('.jee-analysis_tab', analysis);
    var panels = $$('[data-panel-body]', analysis);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-panel');
        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        panels.forEach(function (p) {
          var on = p.getAttribute('data-panel-body') === name;
          p.hidden = !on;
          p.classList.toggle('is-active', on);
        });
      });
    });
  }

  /* ---------------- Hero: mouse parallax on the layered screens ---------------- */
  var parallax = $('[data-parallax]');
  if (parallax && hero && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    var layers = $$('[data-depth]', parallax);
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach(function (layer) {
        var d = parseFloat(layer.getAttribute('data-depth'));
        layer.style.transform = 'translate3d(' + (x * d * -14).toFixed(1) + 'px,' + (y * d * -10).toFixed(1) + 'px,0)';
      });
    });
    hero.addEventListener('mouseleave', function () {
      layers.forEach(function (layer) { layer.style.transform = ''; });
    });
  }

  /* ---------------- Week story: drag to scroll on desktop ---------------- */
  var week = $('[data-week]');
  if (week) {
    var down = false, startX = 0, startLeft = 0, moved = false;
    week.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = week.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; week.classList.add('is-dragging'); }
      week.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false; week.classList.remove('is-dragging');
    });
    week.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* ---------------- White-label: institute name → logo + subdomain ---------------- */
  var preview = $('[data-brand-preview]');
  var brandInput = $('[data-brand-input]');
  if (preview && brandInput) {
    var nameEl = $('[data-brand-name]', preview);
    var initialEl = $('[data-brand-initial]', preview);
    var urlEl = $('[data-brand-url]', preview);
    var updateName = function () {
      var name = brandInput.value.trim() || 'Your Institute';
      nameEl.textContent = name;
      initialEl.textContent = name.charAt(0).toUpperCase();
      urlEl.textContent = (name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'yourinstitute') + '.edisonos.com';
    };
    brandInput.addEventListener('input', updateName);
    updateName();
  }
})();
