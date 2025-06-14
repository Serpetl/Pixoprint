/* ----------------------------------------------------------------------
   assets/js/main.js – full client-side catalogue logic
---------------------------------------------------------------------- */
window.addEventListener('load', () => {
  /* === 1. Counters =================================================== */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count
    const step = end / (3000 / (1000 / 30)) // 3 s, 30 fps
    let value = 0
    ;(function tick() {
      value += step
      el.textContent = value < end ? Math.round(value) : end
      if (value < end) requestAnimationFrame(tick)
    })()
  })

  /* === 2. Burger menu =============================================== */
  ;(() => {
    const burger = document.getElementById('burger')
    const nav = document.getElementById('mobileNav')
    const backdrop = document.getElementById('backdrop')
    if (!burger || !nav || !backdrop) return

    const toggle = () => {
      burger.classList.toggle('active')
      nav.classList.toggle('active')
      backdrop.classList.toggle('active')
    }
    const close = () => {
      burger.classList.remove('active')
      nav.classList.remove('active')
      backdrop.classList.remove('active')
    }
    burger.addEventListener('click', toggle)
    backdrop.addEventListener('click', close)
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close))
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close())
  })()

  /* === 3. Abort on pages without catalogue ========================== */
  const container = document.querySelector('.products-grid-section .container')
  if (!container) return

  /* === 4. State & DOM refs ========================================== */
  const baseurl = container.dataset.baseurl || ''
  const locale = container.dataset.locale || 'en'
  const PER_PAGE = 9

  let allProducts = []
  let currentPage = 1
  const activeTags = new Set()

  const grid = document.getElementById('products-grid')
  const pagination = document.querySelector('.pagination')
  const filtersBox = document.querySelector('.active-filters')
  const searchInput = document.getElementById('product-search')
  const resetBtn = document.getElementById('reset-filters')

  /* === 5. Rendering ================================================== */
  function renderProducts(list) {
    grid.innerHTML = ''
    const start = (currentPage - 1) * PER_PAGE
    const page = list.slice(start, start + PER_PAGE)

    page.forEach((p, idx) => {
      const imgDir = `${baseurl}/assets/img/products/${p.material}/${p.type}/${p.id}`
      const card = document.createElement('div')
      card.className = 'product-card'
      card.setAttribute('data-aos', 'fade-up')
      card.setAttribute('data-aos-delay', `${idx * 50}`)

      card.innerHTML = `
      <div class="product-image-carousel">
        <button class="carousel-arrow left"  type="button" aria-label="Prev">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" d="M15 18 9 12 15 6"/></svg>
        </button>

        <div class="carousel-track">
          ${(p.images || [])
            .map(
              (img) => `
            <picture class="carousel-item">
              <img src="${imgDir}/${img}-640.jpg"
                   alt="${p.title[locale]}" loading="lazy" decoding="async">
            </picture>`
            )
            .join('')}
        </div>

        <button class="carousel-arrow right" type="button" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" d="M9 6 15 12 9 18"/></svg>
        </button>
      </div>

      <a href="${baseurl}/${locale}/products/${p.id}/" class="product-link">
        <div class="product-info">
          <h3 class="product-title">${p.title[locale]}</h3>
          <p class="product-description">${p.excerpt[locale]}</p>
          <ul class="product-meta">
            <li class="product-tags-with-price">
              <div class="tags">
                ${(p.tags?.[locale] || [])
                  .map((t) => `<span class="meta-tag">${t}</span>`)
                  .join('')}
              </div>
              ${p.price ? `<div class="price">${p.price} €</div>` : ''}
            </li>
          </ul>
        </div>
      </a>`

      grid.appendChild(card)
    })

    initCarousel(grid)
    initCardClicks(grid)

    if (window.AOS?.refresh) window.AOS.refresh() // ⬅️ use standard refresh
  }

  function drawPagination(total) {
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

  /* === 6. Filtering =================================================== */
  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase()

    const filtered = allProducts.filter((p) => {
      const textFields = [p.title?.[locale], p.excerpt?.[locale], p.type, p.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const tags = (p.tags?.[locale] || []).map((t) => t.toLowerCase())

      const matchText = !q || textFields.includes(q) || tags.some((t) => t.includes(q))

      const matchTags = [...activeTags].every((t) => tags.includes(t))

      return matchText && matchTags
    })

    const maxPage = Math.ceil(filtered.length / PER_PAGE)
    if (currentPage > maxPage) currentPage = 1

    renderProducts(filtered)
    drawPagination(filtered.length)
    drawActiveTags()
    highlightCardTags()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* === 7. Carousel helpers =========================================== */
  function initCarousel(scope) {
    scope.querySelectorAll('.product-image-carousel').forEach((c) => {
      const track = c.querySelector('.carousel-track')
      const left = c.querySelector('.carousel-arrow.left')
      const right = c.querySelector('.carousel-arrow.right')
      const scroll = (dir) => track.scrollBy({ left: dir * track.clientWidth, behavior: 'smooth' })

      left.onclick = (e) => {
        e.stopPropagation()
        scroll(-1)
      }
      right.onclick = (e) => {
        e.stopPropagation()
        scroll(1)
      }

      /* swipe */
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

  /* === 8. Card click (safe) ========================================== */
  function initCardClicks(scope) {
    scope.querySelectorAll('.product-card').forEach((card) => {
      const link = card.querySelector('.product-link')
      card.onclick = (e) => {
        if (e.target.closest('.meta-tag') || e.target.closest('.carousel-arrow')) return
        window.location.href = link.href
      }
    })
  }

  /* === 9. Tag Filter Clicks + Search Input ============================ */

  // — обработка нажатий по тегам —
  grid.addEventListener('click', (e) => {
    const tagEl = e.target.closest('.meta-tag')
    if (!tagEl) return

    e.preventDefault() // блокируем переход по ссылке
    e.stopPropagation() // блокируем клик по карточке

    const tag = tagEl.textContent.trim().toLowerCase()
    activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag)
    currentPage = 1
    applyFilters()
  })

  // — обработка поиска и кнопки Reset —
  ;(() => {
    let timer
    searchInput.oninput = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        currentPage = 1
        applyFilters()
      }, 250)
    }

    resetBtn.onclick = () => {
      searchInput.value = ''
      activeTags.clear()
      currentPage = 1
      applyFilters()
    }
  })()
  // === Highlight active tags inside product cards ===
  function highlightCardTags() {
    grid.querySelectorAll('.product-card').forEach((card) => {
      card.querySelectorAll('.meta-tag').forEach((tagEl) => {
        const tagText = tagEl.textContent.trim().toLowerCase()
        if (activeTags.has(tagText)) {
          tagEl.classList.add('active-filter')
        } else {
          tagEl.classList.remove('active-filter')
        }
      })
    })
  }

  /* === 10. Initial JSON load ========================================= */
  fetch(`${baseurl}/assets/data/products.json`)
    .then((r) => r.json())
    .then((data) => {
      allProducts = data
      applyFilters()
    })
    .catch(console.error)
})
