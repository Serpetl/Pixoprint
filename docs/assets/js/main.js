window.addEventListener('load', () => {
  let searchTimeout

  // 🔢 Анимация счётчиков
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count
    const fps = 30
    const dur = 3000
    let n = 0
    const step = end / (dur / (1000 / fps))

    const tick = () => {
      n += step
      if (n < end) {
        el.textContent = Math.round(n)
        requestAnimationFrame(tick)
      } else {
        el.textContent = end
      }
    }

    tick()
  })

  // 🎯 Прокрутка карусели (включая свайпы)
  document.querySelectorAll('.product-image-carousel').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track')
    const btnLeft = carousel.querySelector('.carousel-arrow.left')
    const btnRight = carousel.querySelector('.carousel-arrow.right')

    if (track && btnLeft && btnRight) {
      btnLeft.addEventListener('click', (e) => {
        e.stopPropagation()
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' })
      })

      btnRight.addEventListener('click', (e) => {
        e.stopPropagation()
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' })
      })
    }

    let startX = 0

    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX
    })

    track.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX
      const diffX = endX - startX

      if (diffX > 50) {
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' })
      } else if (diffX < -50) {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' })
      }
    })
  })

  // 🍔 Бургер-меню
  const burger = document.getElementById('burger')
  const mobileNav = document.getElementById('mobileNav')
  const backdrop = document.getElementById('backdrop')

  if (burger && mobileNav && backdrop) {
    const toggleMenu = () => {
      burger.classList.toggle('active')
      mobileNav.classList.toggle('active')
      backdrop.classList.toggle('active')
    }

    const closeMenu = () => {
      burger.classList.remove('active')
      mobileNav.classList.remove('active')
      backdrop.classList.remove('active')
    }

    burger.addEventListener('click', toggleMenu)

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu)
    })

    backdrop.addEventListener('click', closeMenu)

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav?.classList.contains('active')) {
        closeMenu()
      }
    })
  }

  // 🔗 Кликабельные карточки
  document.querySelectorAll('.product-card').forEach((card) => {
    const link = card.querySelector('a.product-link')
    if (link) {
      card.style.cursor = 'pointer'
      card.addEventListener('click', (e) => {
        // Проверяем, был ли клик на .meta-tag
        if (e.target.closest('.meta-tag')) {
          e.preventDefault() // Блокируем переход
          return // Не продолжаем выполнение
        }

        // Если клик не был на .meta-tag — переходим по ссылке
        window.location.href = link.href
      })
    }
  })

  // 🔍 Поиск + фильтры
  const searchInput = document.getElementById('product-search')
  const cards = document.querySelectorAll('.product-card')
  const resetBtn = document.getElementById('reset-filters')
  const filterContainer = document.querySelector('.active-filters')

  let activeTags = new Set()

  function updateCardTagHighlighting() {
    cards.forEach((card) => {
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
  function applyFilters() {
    cards.forEach((card) => {
      const tags = [...card.querySelectorAll('.meta-tag')].map((el) =>
        el.textContent.trim().toLowerCase()
      )
      const cardText = card.textContent.toLowerCase()
      const query = searchInput?.value.toLowerCase() || ''

      const matchesSearch = cardText.includes(query)
      const matchesTags = [...activeTags].every((tag) => tags.includes(tag))

      card.style.display =
        (query === '' || matchesSearch) && (activeTags.size === 0 || matchesTags) ? 'flex' : 'none'
    })

    updateCardTagHighlighting() // 👈 добавь сюда
  }

  function updateActiveTagsDisplay() {
    filterContainer.innerHTML = ''
    activeTags.forEach((tag) => {
      const el = document.createElement('span')
      el.className = 'meta-tag active-filter'
      el.textContent = tag
      el.title = 'Click to remove filter'
      el.addEventListener('click', () => {
        activeTags.delete(tag)
        updateActiveTagsDisplay()
        applyFilters()
      })
      filterContainer.appendChild(el)
    })

    updateCardTagHighlighting() // 👈 добавь сюда тоже
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(applyFilters, 300) // Задержка 300ms
    })

    const event = new Event('input', { bubbles: true })
    searchInput.dispatchEvent(event)
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      searchInput.value = ''
      activeTags.clear()
      updateActiveTagsDisplay()
      applyFilters()
    })
  }

  const productsGrid = document.querySelector('.products-grid')
  if (productsGrid) {
    productsGrid.addEventListener('click', (e) => {
      // Игнорируем клики на .meta-tag внутри .active-filters
      if (e.target.closest('.active-filters')) {
        return
      }

      const tag = e.target.closest('.meta-tag')
      if (tag) {
        e.preventDefault() // ← Отменяем стандартное поведение
        e.stopPropagation() // ← Останавливаем всплытие события

        const tagText = tag.textContent.trim().toLowerCase()

        if (activeTags.has(tagText)) {
          activeTags.delete(tagText)
        } else {
          activeTags.add(tagText)
        }

        updateActiveTagsDisplay()
        applyFilters()
      }
    })
  }

  // Инициализация
  updateActiveTagsDisplay()
  applyFilters()
})
