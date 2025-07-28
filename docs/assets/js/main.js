/* ----------------------------------------------------------------------
   assets/js/main.js – Client-side catalogue logic with mobile folding
---------------------------------------------------------------------- */
window.addEventListener('load', () => {
  /* ── Folding configuration & logger ───────────────────────────────── */
  const FOLD_CFG = {
    MOBILE_BREAKPOINT: 768,
    MEASURE_DELAY: 100, // мс перед первоначальным сворачиванием
    TOP_TOLERANCE: 10, // px: порог для «вернулись наверх»
    BOTTOM_GAP: 25, // px: отступ снизу

    DIAGNOSTIC: false
  }
  const clog = (...args) => FOLD_CFG.DIAGNOSTIC && console.log('[CardLogic]', ...args)
  // 1. Sticky Header
  let lastScrollTop = 0
  const header = document.querySelector('.site-header')
  if (header) {
    window.addEventListener(
      'scroll',
      function () {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop
        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight) {
          header.classList.add('is-hidden')
        } else {
          header.classList.remove('is-hidden')
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop
      },
      false
    )
  }

  /* ── 1. Counters ====================================================== */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count
    const step = end / (3000 / (1000 / 30))
    let val = 0
    ;(function tick() {
      val += step
      el.textContent = val < end ? Math.round(val) : end
      if (val < end) requestAnimationFrame(tick)
    })()
  })

  /* ── 2. Burger menu ================================================== */
  ;(() => {
    const burger = document.getElementById('burger')
    const nav = document.getElementById('mobileNav')
    const back = document.getElementById('backdrop')
    if (!burger || !nav || !back) return

    const openMenu = () => {
      burger.classList.add('active')
      nav.classList.add('active')
      back.classList.add('active')
      document.body.style.overflow = 'hidden'
    }

    const closeMenu = () => {
      burger.classList.remove('active')
      nav.classList.remove('active')
      back.classList.remove('active')
      document.body.style.overflow = ''
    }

    burger.addEventListener('click', () => {
      if (nav.classList.contains('active')) {
        closeMenu()
      } else {
        openMenu()
      }
    })

    back.addEventListener('click', closeMenu)
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu))
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu())
  })()

  /* ── 3. Abort if no catalogue on page ================================ */
  const container = document.querySelector('.products-grid-section .container')
  // No return here, as we need to run FAQ/file input logic even without products grid
  // if (!container) return; // Keep this line if this main.js is ONLY for products page, otherwise remove.

  /* ── 4. State & DOM references ======================================= */
  // Moved these declarations inside the block where they are used to prevent errors if .products-grid-section .container is not found
  let baseurl = ''
  let locale = 'en'
  let grid = null
  let pagination = null
  let filtersBox = null
  let searchInput = null
  let resetBtn = null
  const PER_PAGE = 9

  let allProducts = []
  let currentPage = 1
  const activeTags = new Set()

  // Initialize products related elements only if container exists
  if (container) {
    baseurl = container.dataset.baseurl || ''
    locale = container.dataset.locale || 'en'
    grid = document.getElementById('products-grid')
    pagination = document.querySelector('.pagination')
    filtersBox = document.querySelector('.active-filters')
    searchInput = document.getElementById('product-search')
    resetBtn = document.getElementById('reset-filters')
  }

  /* ── Folding Helpers ================================================ */
  function applyFoldStyle(card) {
    const wrap = card.querySelector('.product-image-carousel')
    const infoBlock = card.querySelector('.product-info')
    if (!wrap || !infoBlock) return

    const vH = window.innerHeight
    const headerH = 290 // высота фиксированной шапки
    const safeTop = Math.max(card.getBoundingClientRect().top, 0)
    const avail = vH - safeTop - FOLD_CFG.BOTTOM_GAP - headerH

    // Адаптивные проценты: от 25–45% (min) и 60–80% (max)
    const lerp = (x, a, b, u, v) => u + ((x - a) * (v - u)) / (b - a)
    const minPct = lerp(vH, 667, 896, 25, 45)
    const maxPct = lerp(vH, 667, 896, 60, 80)
    const minPx = (minPct / 100) * vH
    const maxPx = (maxPct / 100) * vH

    let h = avail - infoBlock.offsetHeight
    h = Math.max(minPx, Math.min(h, maxPx))

    wrap.style.maxHeight = `${h}px`
    card.dataset.folded = 'true'
    clog('collapse →', Math.round(h), 'px')
  }

  function unfoldCard(card) {
    const wrap = card.querySelector('.product-image-carousel')
    if (wrap) wrap.style.maxHeight = ''
    card.dataset.folded = 'false'
    clog('expand')
  }

  function foldCardOnLoad(card) {
    const rect = card.getBoundingClientRect()
    if (rect.bottom > window.innerHeight + FOLD_CFG.TOP_TOLERANCE) {
      applyFoldStyle(card)
    } else {
      unfoldCard(card)
    }
  }

  /* ── 5. Rendering & Catalogue ======================================== */
  function initCarousel(scope) {
    scope.querySelectorAll('.product-image-carousel').forEach((c) => {
      const track = c.querySelector('.carousel-track')
      const left = c.querySelector('.carousel-arrow.left')
      const right = c.querySelector('.carousel-arrow.right')
      const scroll = (dir) => track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' })
      left.onclick = (e) => (e.stopPropagation(), scroll(-1))
      right.onclick = (e) => (e.stopPropagation(), scroll(1))
      let x0 = 0
      track.ontouchstart = (e) => {
        x0 = e.touches[0].clientX
      }
      track.ontouchend = (e) => {
        const dx = e.changedTouches[0].clientX - x0
        if (dx > 50) scroll(-1)
        if (dx < -50) scroll(1)
      }
    })
  }

  function initCardClicks(scope) {
    scope.querySelectorAll('.product-card').forEach((card) => {
      const link = card.querySelector('.product-link')
      card.onclick = (e) => {
        if (e.target.closest('.meta-tag') || e.target.closest('.carousel-arrow')) return
        window.location.href = link.href
      }
    })
  }

  function renderProducts(list) {
    if (!grid) return // Ensure grid exists
    grid.innerHTML = ''
    const start = (currentPage - 1) * PER_PAGE
    const page = list.slice(start, start + PER_PAGE)
    if (!page.length) return

    page.forEach((p, idx) => {
      const imgDir = `${baseurl}/assets/img/products/${p.material}/${p.type}/${p.id}`
      const card = document.createElement('div')
      card.className = 'product-card'
      card.dataset.aos = 'fade-up'
      card.dataset.aosDelay = idx * 50
      card.innerHTML = `
        <div class="product-image-carousel">
          <button class="carousel-arrow left"  aria-label="Prev"><svg width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18 9 12 15 6"/></svg></button>
          <div class="carousel-track">
            ${(p.images || [])
              .map(
                (img) => `
              <picture class="carousel-item">
                <img src="${imgDir}/${img}-640.jpg" alt="${p.title[locale]}" loading="lazy" decoding="async">
              </picture>`
              )
              .join('')}
          </div>
          <button class="carousel-arrow right" aria-label="Next"><svg width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 6 15 12 9 18"/></svg></button>
        </div>
        <a href="${baseurl}/${locale}/products/${p.id}/" class="product-link">
          <div class="product-info">
            <h3 class="product-title">${p.title[locale]}</h3>
            <p class="product-description">${p.excerpt[locale]}</p>
            <ul class="product-meta">
              <li class="product-tags-with-price">
                <div class="tags">${(p.tags?.[locale] || []).map((t) => `<span class="meta-tag">${t}</span>`).join('')}</div>
                ${p.price ? `<div class="price">${p.price} €</div>` : ''}
              </li>
            </ul>
          </div>
        </a>`
      grid.appendChild(card)
    })

    initCarousel(grid)
    initCardClicks(grid)
    if (window.AOS?.refresh) window.AOS.refresh()

    /* ── Mobile folding for first card only ─────────────────────────── */
    const firstCard = grid.querySelector('.product-card')
    const isMobile = window.matchMedia(`(max-width:${FOLD_CFG.MOBILE_BREAKPOINT}px)`).matches
    if (!firstCard || !isMobile) return

    const img = firstCard.querySelector('img')
    const initFold = () => {
      setTimeout(() => {
        foldCardOnLoad(firstCard)

        /* 1) instant expand on first real scroll down */
        let lastY = window.scrollY
        const expandOnScroll = () => {
          const dy = window.scrollY - lastY
          lastY = window.scrollY
          if (dy > 10 && firstCard.dataset.folded === 'true') {
            unfoldCard(firstCard)
            window.removeEventListener('scroll', expandOnScroll)
          }
        }
        window.addEventListener('scroll', expandOnScroll, { passive: true })

        /* 2) collapse again when back to very top */
        const collapseAtTop = () => {
          if (window.scrollY <= FOLD_CFG.TOP_TOLERANCE && firstCard.dataset.folded === 'false') {
            applyFoldStyle(firstCard)
            lastY = window.scrollY
            window.addEventListener('scroll', expandOnScroll, { passive: true })
          }
        }
        window.addEventListener('scroll', collapseAtTop, { passive: true })
      }, FOLD_CFG.MEASURE_DELAY)
    }

    if (img && img.complete) {
      initFold()
    } else if (img) {
      img.addEventListener('load', initFold, { once: true })
    }
  }

  /* ── 6. Filters & Pagination (unchanged) ============================= */
  function drawPagination(total) {
    if (!pagination) return // Ensure pagination exists
    pagination.innerHTML = ''
    const pages = Math.ceil(total / PER_PAGE)
    for (let i = 1; i <= pages; i++) {
      const a = document.createElement('a')
      a.textContent = i
      a.href = '#'
      if (i === currentPage) a.classList.add('active')
      a.onclick = (e) => {
        e.preventDefault()
        currentPage = i
        applyFilters()
      }
      pagination.appendChild(a)
    }
  }

  function drawActiveTags() {
    if (!filtersBox) return // Ensure filtersBox exists
    filtersBox.innerHTML = ''
    activeTags.forEach((t) => {
      const b = document.createElement('span')
      b.className = 'meta-tag active-filter'
      b.textContent = t
      b.title = 'Remove filter'
      b.onclick = () => {
        activeTags.delete(t)
        currentPage = 1
        applyFilters()
      }
      filtersBox.appendChild(b)
    })
  }

  function highlightCardTags() {
    if (!grid) return // Ensure grid exists
    grid.querySelectorAll('.product-card').forEach((card) => {
      card.querySelectorAll('.meta-tag').forEach((tagEl) => {
        const txt = tagEl.textContent.trim().toLowerCase()
        tagEl.classList.toggle('active-filter', activeTags.has(txt))
      })
    })
  }

  function applyFilters() {
    if (!searchInput) return // Ensure searchInput exists
    const q = searchInput.value.trim().toLowerCase()
    const filtered = allProducts.filter((p) => {
      const txt = [p.title?.[locale], p.excerpt?.[locale], p.type, p.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const tags = (p.tags?.[locale] || []).map((t) => t.toLowerCase())
      const matchText = !q || txt.includes(q) || tags.some((t) => t.includes(q))
      const matchTags = [...activeTags].every((t) => tags.includes(t))
      return matchText && matchTags
    })
    const maxPage = Math.ceil(filtered.length / PER_PAGE) || 1
    if (currentPage > maxPage) currentPage = 1
    renderProducts(filtered)
    drawPagination(filtered.length)
    drawActiveTags()
    highlightCardTags()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (grid) {
    // Only add event listener if grid exists
    grid.addEventListener('click', (e) => {
      const tagEl = e.target.closest('.meta-tag')
      if (!tagEl) return
      e.preventDefault()
      e.stopPropagation()
      const t = tagEl.textContent.trim().toLowerCase()
      activeTags.has(t) ? activeTags.delete(t) : activeTags.add(t)
      currentPage = 1
      applyFilters()
    })
  }

  let debounce
  if (searchInput) {
    // Only add event listener if searchInput exists
    searchInput.oninput = () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        currentPage = 1
        applyFilters()
      }, 250)
    }
  }

  if (resetBtn) {
    // Only add event listener if resetBtn exists
    resetBtn.onclick = () => {
      searchInput.value = ''
      activeTags.clear()
      currentPage = 1
      applyFilters()
    }
  }

  /* ── 7. Data fetch & initial render ================================= */
  if (container) {
    // Only fetch data if products container exists
    fetch(`${baseurl}/assets/data/products.json`)
      .then((r) => r.json())
      .then((data) => {
        allProducts = data
        applyFilters()
      })
      .catch(console.error)
  }
  /* === Enable carousel manually on product pages === */
  if (
    !document.querySelector('.products-grid-section') &&
    document.querySelector('.product-image-carousel')
  ) {
    initCarousel(document)
  }

  /* === Laser Cutting Page Specific JS === */
  // Simple JavaScript for FAQ accordion
  const faqQuestions = document.querySelectorAll('.faq-question')
  if (faqQuestions.length > 0) {
    // Check if elements exist on page
    faqQuestions.forEach((question) => {
      question.addEventListener('click', () => {
        const answer = question.nextElementSibling
        const icon = question.querySelector('i')

        // Toggle 'active' class on the question
        question.classList.toggle('active')

        // Toggle visibility of the answer
        if (answer.style.maxHeight) {
          answer.style.maxHeight = null
          icon.classList.replace('fa-chevron-up', 'fa-chevron-down')
        } else {
          // Collapse other open answers
          document.querySelectorAll('.faq-question.active').forEach((openQuestion) => {
            if (openQuestion !== question) {
              openQuestion.classList.remove('active')
              openQuestion.nextElementSibling.style.maxHeight = null
              openQuestion.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down')
            }
          })
          answer.style.maxHeight = answer.scrollHeight + 'px'
          icon.classList.replace('fa-chevron-down', 'fa-chevron-up')
        }
      })
    })
  }

  // Custom file input logic
  const fileInput = document.getElementById('file-upload')
  const fileChosen = document.getElementById('file-chosen')

  if (fileInput && fileChosen) {
    // Check if elements exist on page
    fileInput.addEventListener('change', function () {
      if (this.files.length > 0) {
        if (this.files.length === 1) {
          fileChosen.textContent = this.files[0].name
        } else {
          fileChosen.textContent = `${this.files.length} files chosen`
        }
      } else {
        fileChosen.textContent = 'No file chosen'
      }
    })
  }
})
