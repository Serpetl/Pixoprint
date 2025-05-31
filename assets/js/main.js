// main.js

document.addEventListener('DOMContentLoaded', () => {
  // Counters
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

  //Burger
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
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
        closeMenu()
      }
    })
  }
})
