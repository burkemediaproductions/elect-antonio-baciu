(() => {
  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-nav]');
  const navClose = document.querySelector('[data-nav-close]');
  const navBackdrop = document.querySelector('[data-nav-backdrop]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const revealItems = document.querySelectorAll('.reveal');
  const backToTop = document.querySelector('[data-back-to-top]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const normalizePath = (path) => {
    if (!path) return '/';
    const normalized = path.replace(/index\.html$/, '').replace(/\/+$/, '');
    return normalized === '' ? '/' : normalized;
  };

  const currentPath = normalizePath(window.location.pathname);
  const isCurrentOrParentPath = (linkPath) => {
    if (linkPath === '/') return currentPath === '/';
    return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
  };

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;

    const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
    if (isCurrentOrParentPath(linkPath)) {
      link.setAttribute('aria-current', 'page');
    }
  });

  const responsiveVideos = document.querySelectorAll('[data-responsive-video]');
  const heroVideoQuery = window.matchMedia('(max-width: 760px)');

  const setResponsiveVideoSource = (video) => {
    if (!video) return;

    const useMobile = heroVideoQuery.matches;
    const nextSrc = useMobile ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    const nextPoster = useMobile ? video.dataset.mobilePoster : video.dataset.desktopPoster;

    if (!nextSrc) return;

    if (nextPoster && video.getAttribute('poster') !== nextPoster) {
      video.setAttribute('poster', nextPoster);
    }

    if (video.dataset.currentSrc === nextSrc) return;

    video.dataset.currentSrc = nextSrc;
    video.pause();
    video.innerHTML = `<source src="${nextSrc}" type="video/mp4">`;
    video.load();

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        video.controls = true;
      });
    }
  };

  responsiveVideos.forEach(setResponsiveVideoSource);

  const handleResponsiveVideoChange = () => {
    responsiveVideos.forEach(setResponsiveVideoSource);
  };

  if (typeof heroVideoQuery.addEventListener === 'function') {
    heroVideoQuery.addEventListener('change', handleResponsiveVideoChange);
  } else if (typeof heroVideoQuery.addListener === 'function') {
    heroVideoQuery.addListener(handleResponsiveVideoChange);
  }

  const firstMainSection = document.querySelector('main > section:first-child');
  const hasCoverHero = Boolean(
    firstMainSection &&
    (
      firstMainSection.classList.contains('hero') ||
      firstMainSection.classList.contains('hero--video') ||
      firstMainSection.classList.contains('page-hero--cover') ||
      firstMainSection.hasAttribute('data-cover-hero')
    )
  );

  const updateHeader = () => {
    if (!header) return;
    const isScrolled = window.scrollY > 24;
    header.classList.toggle('is-scrolled', isScrolled);
    header.classList.toggle('header--solid', !hasCoverHero);
    header.classList.toggle('header--over-cover', hasCoverHero && !isScrolled);
    if (backToTop) backToTop.classList.toggle('is-visible', window.scrollY > 700);
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const getFocusable = (container) => Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, details, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

  if (menuButton && nav && navClose && navBackdrop) {
    const openMenu = () => {
      nav.classList.add('open');
      navBackdrop.classList.add('open');
      nav.setAttribute('aria-hidden', 'false');
      menuButton.setAttribute('aria-expanded', 'true');
      body.classList.add('nav-open');
      navClose.focus();
    };

    const closeMenu = (returnFocus = true) => {
      nav.classList.remove('open');
      navBackdrop.classList.remove('open');
      nav.setAttribute('aria-hidden', 'true');
      menuButton.setAttribute('aria-expanded', 'false');
      body.classList.remove('nav-open');
      if (returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    });

    navClose.addEventListener('click', () => closeMenu());
    navBackdrop.addEventListener('click', () => closeMenu());

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMenu(false));
    });

    document.addEventListener('keydown', (event) => {
      if (!nav.classList.contains('open')) return;
      if (event.key === 'Escape') closeMenu();

      if (event.key === 'Tab') {
        const focusable = getFocusable(nav);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  if (reducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const parallaxItems = document.querySelectorAll('[data-parallax-speed]');
  const updateParallax = () => {
    if (reducedMotion || !parallaxItems.length) return;
    parallaxItems.forEach((item) => {
      const speed = Number(item.getAttribute('data-parallax-speed')) || 0.1;
      const rect = item.getBoundingClientRect();
      const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * speed;
      item.style.transform = `translateY(${Math.max(Math.min(offset, 28), -28)}px)`;
    });
  };

  updateParallax();
  window.addEventListener('scroll', updateParallax, { passive: true });
  window.addEventListener('resize', updateParallax);

  document.querySelectorAll('[data-accordion] details').forEach((details) => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const group = details.closest('[data-accordion]');
      if (!group) return;
      group.querySelectorAll('details').forEach((sibling) => {
        if (sibling !== details) sibling.removeAttribute('open');
      });
    });
  });

  document.querySelectorAll('video[autoplay]').forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        video.controls = true;
      });
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  }
})();


(function () {
  var form = document.getElementById('support-form');
  if (!form) return;

  var optionInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="support-options"]'));
  var panels = {
    'donate-panel': document.getElementById('donate-panel'),
    'endorse-panel': document.getElementById('endorse-panel'),
    'volunteer-panel': document.getElementById('volunteer-panel')
  };
  var selectionSummary = document.getElementById('support-selection-summary');
  var donationChoiceInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="donation-choice"]'));
  var customAmountWrap = document.getElementById('custom-amount-wrap');
  var customAmountInput = document.getElementById('donate-amount-other');
  var donationAmountFinal = document.getElementById('donation-amount-final');
  var thankYouBase = '/support/thank-you/';
  var finalSupportFields = document.getElementById('final-support-fields');
  var volunteerOtherToggle = document.getElementById('volunteer-help-other-toggle');
  var volunteerOtherWrap = document.getElementById('volunteer-help-other-wrap');
  var volunteerOtherInput = document.getElementById('volunteer-help-other');
  var endorserTypeInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="endorser-type"]'));
  var volunteerHelpInputs = Array.prototype.slice.call(form.querySelectorAll('input[name="volunteer-help-areas"]'));
  var endorsementMessageWrap = document.getElementById('endorsement-message-wrap');
  var endorsementNameWraps = {
    'Individual': document.getElementById('endorser-individual-wrap'),
    'Group': document.getElementById('endorser-group-wrap'),
    'Business/Organization': document.getElementById('endorser-business-wrap')
  };
  var endorsementNameInputs = {
    'Individual': document.getElementById('endorse-individual-name'),
    'Group': document.getElementById('endorse-group-name'),
    'Business/Organization': document.getElementById('endorse-business-name')
  };

  function setPanelRequired(panelId, isActive) {
    var fields = form.querySelectorAll('[data-required-for="' + panelId + '"]');
    Array.prototype.forEach.call(fields, function (field) {
      if (field.name === 'donation-choice') {
        field.required = isActive && field === donationChoiceInputs[0];
      } else if (field.name === 'endorser-type') {
        field.required = isActive && field === endorserTypeInputs[0];
      } else if (field.name === 'volunteer-help-areas') {
        field.required = isActive && field === volunteerHelpInputs[0];
      } else {
        field.required = isActive;
      }
    });
  }

  function updateSelectionSummary() {
    var selected = optionInputs
      .filter(function (input) { return input.checked; })
      .map(function (input) { return input.value; });

    if (selectionSummary) selectionSummary.value = selected.join(', ');
    return selected;
  }

  function enforceSingleCheckbox(inputs, changedInput) {
    if (!changedInput.checked) return;
    inputs.forEach(function (input) {
      if (input !== changedInput) input.checked = false;
    });
  }

  function updateVolunteerOther() {
    var isOther = volunteerOtherToggle && volunteerOtherToggle.checked;
    if (volunteerOtherWrap) volunteerOtherWrap.hidden = !isOther;
    if (volunteerOtherInput) volunteerOtherInput.required = !!isOther;
  }

  function updateEndorserFields() {
    var selectedType = endorserTypeInputs.find(function (input) { return input.checked; });
    var selectedValue = selectedType ? selectedType.value : '';

    Object.keys(endorsementNameWraps).forEach(function (key) {
      if (endorsementNameWraps[key]) {
        endorsementNameWraps[key].hidden = key !== selectedValue;
      }
      if (endorsementNameInputs[key]) {
        endorsementNameInputs[key].required = key === selectedValue;
      }
    });

    if (endorsementMessageWrap) {
      endorsementMessageWrap.hidden = !selectedValue;
    }
  }

  function updateDonationAmount() {
    var selectedDonation = donationChoiceInputs.find(function (input) { return input.checked; });
    var donateSelected = isDonateSelected();
    var isOther = donateSelected && selectedDonation && selectedDonation.value === 'other';

    if (customAmountWrap) customAmountWrap.hidden = !isOther;
    if (customAmountInput) customAmountInput.required = !!isOther;

    if (!donateSelected || !selectedDonation) {
      if (donationAmountFinal) donationAmountFinal.value = '';
      if (customAmountInput) customAmountInput.required = false;
      return;
    }

    if (donationAmountFinal) {
      donationAmountFinal.value = selectedDonation.value === 'other'
        ? (customAmountInput ? customAmountInput.value.trim() : '')
        : selectedDonation.value;
    }
  }


  function isDonateSelected() {
    return optionInputs.some(function (input) {
      return input.checked && input.getAttribute('data-toggle') === 'donate-panel';
    });
  }

  function ensureDefaultDonationAmount() {
    if (!isDonateSelected()) return;
    var selectedDonation = donationChoiceInputs.find(function (input) { return input.checked; });
    if (!selectedDonation && donationChoiceInputs.length) {
      donationChoiceInputs[0].checked = true;
    }
  }

  function saveSupportThankYouFallback(selected, formData, donationAmount) {
    try {
      localStorage.setItem('antonioSupportThankYou', JSON.stringify({
        submitted: '1',
        options: selected.join('|'),
        amount: donationAmount || '',
        email: formData.get('email') || '',
        firstName: formData.get('first-name') || '',
        lastName: formData.get('last-name') || '',
        savedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Unable to save support thank-you fallback:', error);
    }
  }

  function togglePanels() {
    var selected = updateSelectionSummary();

    optionInputs.forEach(function (input) {
      var panelId = input.getAttribute('data-toggle');
      var panel = panels[panelId];
      if (!panel) return;
      panel.hidden = !input.checked;
      setPanelRequired(panelId, input.checked);
    });

    if (finalSupportFields) {
      finalSupportFields.hidden = selected.length === 0;
    }

    updateVolunteerOther();
    ensureDefaultDonationAmount();
    updateDonationAmount();
    updateEndorserFields();
  }

  optionInputs.forEach(function (input) {
    input.addEventListener('change', togglePanels);
  });

  endorserTypeInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      enforceSingleCheckbox(endorserTypeInputs, input);
      updateEndorserFields();
    });
  });

  donationChoiceInputs.forEach(function (input) {
    input.addEventListener('change', updateDonationAmount);
  });

  volunteerHelpInputs.forEach(function (input) {
    input.addEventListener('change', updateVolunteerOther);
  });

  if (customAmountInput) {
    customAmountInput.addEventListener('input', updateDonationAmount);
  }

  form.addEventListener('submit', async function (event) {
    var selected = updateSelectionSummary();

    if (!selected.length) {
      event.preventDefault();
      window.alert('Please choose at least one way you would like to support Antonio.');
      return;
    }

    updateVolunteerOther();
    ensureDefaultDonationAmount();
    updateDonationAmount();
    updateEndorserFields();

    if (!form.checkValidity()) {
      return;
    }

    event.preventDefault();

    var donateSelected = isDonateSelected();

    var formData = new FormData(form);
    var donationAmount = donationAmountFinal ? donationAmountFinal.value || '' : '';
    var email = formData.get('email') || '';
    var firstName = formData.get('first-name') || '';
    var lastName = formData.get('last-name') || '';
    var phone = formData.get('phone') || '';
    var employer = formData.get('donation-employer') || '';
    var occupation = formData.get('donation-occupation') || '';
    var address1 = formData.get('donation-address-line-1') || '';
    var address2 = formData.get('donation-address-line-2') || '';
    var city = formData.get('donation-city') || '';
    var state = formData.get('donation-state-region') || '';
    var zip = formData.get('donation-zip-postal') || '';
    var country = formData.get('donation-country') || '';

    var query = new URLSearchParams();
    query.set('submitted', '1');
    query.set('options', selected.join('|'));
    if (donationAmount) query.set('amount', donationAmount);
    if (email) query.set('email', email);
    if (firstName) query.set('firstName', firstName);
    if (lastName) query.set('lastName', lastName);

    saveSupportThankYouFallback(selected, formData, donationAmount);

    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });

      var payload = Object.fromEntries(formData.entries());
      payload.supportOptions = selected.join(', ');
      payload.donationAmount = donationAmount;
      payload.firstName = firstName;
      payload.lastName = lastName;
      payload.phone = phone;
      payload.email = email;
      payload.employer = employer;
      payload.occupation = occupation;
      payload.address1 = address1;
      payload.address2 = address2;
      payload.city = city;
      payload.state = state;
      payload.zip = zip;
      payload.country = country;
      payload.message = formData.get('message') || '';
      payload.volunteerHelpAreas = formData.getAll('volunteer-help-areas').join(', ');
      payload.volunteerAvailability = formData.getAll('volunteer-availability').join(', ');
      payload.endorserType = formData.getAll('endorser-type').join(', ');

      var emailResponse = await fetch('/.netlify/functions/send-support-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      var emailData = await emailResponse.json().catch(function () { return {}; });

      if (!emailResponse.ok) {
        throw new Error(emailData.error || 'Unable to send support form email.');
      }

      if (donateSelected) {
        var stripeResponse = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donationAmount: donationAmount,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            email: email,
            employer: employer,
            occupation: occupation,
            address1: address1,
            address2: address2,
            city: city,
            state: state,
            zip: zip,
            country: country,
            supportOptions: selected.join(', ')
          })
        });

        var stripeData = await stripeResponse.json();

        if (!stripeResponse.ok || !stripeData.url) {
          throw new Error(stripeData.error || 'Unable to start Stripe checkout.');
        }

        window.location.href = stripeData.url;
        return;
      }

      window.location.href = thankYouBase + '?' + query.toString();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Something went wrong. Please try again.');
    }
  });

  togglePanels();
}());


(function () {
  var contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  var contactThankYouBase = '/contact/thank-you/';

  function saveContactThankYouFallback(formData) {
    try {
      localStorage.setItem('antonioContactThankYou', JSON.stringify({
        submitted: '1',
        firstName: formData.get('first-name') || '',
        lastName: formData.get('last-name') || '',
        email: formData.get('email') || '',
        topic: formData.get('topic') || '',
        savedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Unable to save contact thank-you fallback:', error);
    }
  }

  contactForm.addEventListener('submit', async function (event) {
    if (!contactForm.checkValidity()) return;

    event.preventDefault();

    var formData = new FormData(contactForm);
    var submitButton = contactForm.querySelector('button[type="submit"]');
    var originalText = submitButton ? submitButton.textContent : '';

    var query = new URLSearchParams();
    query.set('submitted', '1');

    var firstName = formData.get('first-name') || '';
    var lastName = formData.get('last-name') || '';
    var email = formData.get('email') || '';
    var topic = formData.get('topic') || '';

    if (firstName) query.set('firstName', firstName);
    if (lastName) query.set('lastName', lastName);
    if (email) query.set('email', email);
    if (topic) query.set('topic', topic);

    saveContactThankYouFallback(formData);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });

      window.location.href = contactThankYouBase + '?' + query.toString();
    } catch (error) {
      console.error(error);
      alert('Something went wrong while sending your message. Please try again.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText || 'Send Message';
      }
    }
  });
}());


(function () {
  var lightboxLinks = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (!lightboxLinks.length) return;

  var modal = document.createElement('div');
  modal.className = 'lightbox-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Image preview');
  modal.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image preview">×</button><img alt="">';
  document.body.appendChild(modal);

  var image = modal.querySelector('img');
  var close = modal.querySelector('button');
  var lastFocus = null;

  function closeLightbox() {
    modal.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    if (lastFocus) lastFocus.focus();
  }

  lightboxLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      lastFocus = link;
      image.src = link.getAttribute('href');
      var thumb = link.querySelector('img');
      image.alt = thumb ? thumb.alt : 'Campaign image';
      modal.classList.add('is-open');
      document.body.classList.add('nav-open');
      close.focus();
    });
  });

  close.addEventListener('click', closeLightbox);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeLightbox();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeLightbox();
  });
}());