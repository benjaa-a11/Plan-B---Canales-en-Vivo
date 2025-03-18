document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const themeToggle = document.getElementById("themeToggle")
  const moonIcon = document.getElementById("moonIcon")
  const sunIcon = document.getElementById("sunIcon")
  const searchInput = document.getElementById("searchInput")
  const searchToggle = document.getElementById("searchToggle")
  const searchContainer = document.getElementById("searchContainer")
  const filterButton = document.getElementById("filterButton")
  const filtersPanel = document.getElementById("filtersPanel")
  const categoriesFilter = document.getElementById("categoriesFilter")
  const channelsGrid = document.getElementById("channelsGrid")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const noResults = document.getElementById("noResults")
  const favoritesToggle = document.getElementById("favoritesToggle")
  const scrollIndicator = document.getElementById("scrollIndicator")

  // State
  let channels = []
  let filteredChannels = []
  let categories = ["Todos"]
  let selectedCategory = "Todos"
  let searchQuery = ""
  let isFiltersPanelOpen = false
  let showOnlyFavorites = false
  let viewHistory = []
  let isGridView = window.innerWidth >= 768 // Grid view only for desktop

  // Check for dark mode preference
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
  const savedTheme = localStorage.getItem("theme")

  if (savedTheme === "dark" || (!savedTheme && prefersDarkMode)) {
    document.body.classList.add("dark")
    moonIcon.style.display = "none"
    sunIcon.style.display = "block"
  }

  // Load view history from localStorage
  loadViewHistory()

  // Event Listeners
  themeToggle.addEventListener("click", toggleDarkMode)
  searchInput.addEventListener("input", handleSearch)
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch(e)
    }
  })

  // Search toggle for mobile
  if (searchToggle) {
    searchToggle.addEventListener("click", () => {
      searchContainer.classList.toggle("active")
      searchToggle.classList.toggle("active")
      if (searchContainer.classList.contains("active")) {
        searchInput.focus()
      }
    })
  }

  if (filterButton) {
    filterButton.addEventListener("click", toggleFiltersPanel)
  }

  if (favoritesToggle) {
    favoritesToggle.addEventListener("click", toggleFavoritesFilter)
  }

  // Add view toggle button only for desktop
  if (window.innerWidth >= 768) {
    const viewToggleButton = document.createElement("button")
    viewToggleButton.className = "filter-button"
    viewToggleButton.setAttribute("aria-label", "Cambiar vista")
    viewToggleButton.innerHTML = '<i class="fas fa-th-list"></i>'
    viewToggleButton.addEventListener("click", toggleView)

    if (document.querySelector(".header-right")) {
      document.querySelector(".header-right").insertBefore(viewToggleButton, themeToggle)
    }
  }

  // Close panels when clicking outside
  document.addEventListener("click", (e) => {
    // Close filters panel when clicking outside
    if (
      filtersPanel &&
      filterButton &&
      !filterButton.contains(e.target) &&
      !filtersPanel.contains(e.target) &&
      filtersPanel.classList.contains("open")
    ) {
      toggleFiltersPanel()
    }

    // Close search on mobile when clicking outside
    if (
      searchContainer &&
      searchToggle &&
      !searchToggle.contains(e.target) &&
      !searchContainer.contains(e.target) &&
      searchContainer.classList.contains("active")
    ) {
      searchContainer.classList.remove("active")
      searchToggle.classList.remove("active")
    }
  })

  // Check for search query in URL
  const urlParams = new URLSearchParams(window.location.search)
  const urlSearchQuery = urlParams.get("search")
  if (urlSearchQuery) {
    searchQuery = urlSearchQuery
    searchInput.value = urlSearchQuery
  }

  // Initialize
  fetchChannels()
  addSwipeSupport()
  setupPullToRefresh()

  // Functions
  function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark")

    if (isDark) {
      moonIcon.style.display = "none"
      sunIcon.style.display = "block"
      localStorage.setItem("theme", "dark")
    } else {
      moonIcon.style.display = "block"
      sunIcon.style.display = "none"
      localStorage.setItem("theme", "light")
    }
  }

  function toggleFiltersPanel() {
    isFiltersPanelOpen = !isFiltersPanelOpen
    filtersPanel.classList.toggle("open", isFiltersPanelOpen)
    filterButton.classList.toggle("active", isFiltersPanelOpen)
  }

  function handleSearch(e) {
    searchQuery = e.target.value.trim()
    filterChannels()
  }

  function selectCategory(category) {
    selectedCategory = category

    // Update active category button
    const categoryButtons = document.querySelectorAll(".category-button")
    categoryButtons.forEach((button) => {
      if (button.textContent === category) {
        button.classList.add("active")
      } else {
        button.classList.remove("active")
      }
    })

    filterChannels()

    // Close filters panel on mobile after selection
    if (window.innerWidth < 768 && filtersPanel.classList.contains("open")) {
      toggleFiltersPanel()
    }
  }

  function toggleFavoritesFilter() {
    showOnlyFavorites = !showOnlyFavorites
    favoritesToggle.classList.toggle("active", showOnlyFavorites)

    if (showOnlyFavorites) {
      favoritesToggle.innerHTML = '<i class="fas fa-heart"></i> Mostrando favoritos'
    } else {
      favoritesToggle.innerHTML = '<i class="far fa-heart"></i> Mostrar favoritos'
    }

    filterChannels()
  }

  function toggleView() {
    // Only allow toggle view on desktop
    if (window.innerWidth >= 768) {
      isGridView = !isGridView

      // Update button icon
      const viewToggleButton = document.querySelector(".filter-button[aria-label='Cambiar vista']")
      if (viewToggleButton) {
        viewToggleButton.innerHTML = isGridView ? '<i class="fas fa-th-list"></i>' : '<i class="fas fa-th"></i>'
      }

      // Update grid class
      if (channelsGrid) {
        channelsGrid.className = isGridView ? "channels-grid" : "channels-list"
      }

      // Re-render channels to apply new view
      renderChannels()
    }
  }

  async function fetchChannels() {
    try {
      // Show loading animation
      loadingSpinner.style.display = "flex"

      // Fetch channels data
      const response = await fetch("data/canales-en-vivo.json")
      channels = await response.json()

      // Load favorites from localStorage
      loadFavoritesFromLocalStorage()

      // Add a small delay to make the loading animation visible
      return new Promise((resolve) => {
        setTimeout(() => {
          // Extract unique categories
          const uniqueCategories = [...new Set(channels.map((channel) => channel.category))]
          categories = ["Todos", ...uniqueCategories]

          // Render categories
          renderCategories()

          // Apply any initial filters from URL
          filterChannels()

          // Hide loading spinner
          loadingSpinner.style.display = "none"

          resolve()
        }, 500)
      })
    } catch (error) {
      console.error("Error fetching channels:", error)
      loadingSpinner.style.display = "none"
      noResults.style.display = "block"
      noResults.innerHTML = `
        <p>Error al cargar los canales. Por favor, intenta nuevamente.</p>
        <button class="primary-button" onclick="location.reload()">Reintentar</button>
      `
      return Promise.resolve()
    }
  }

  function renderCategories() {
    if (!categoriesFilter) return

    categoriesFilter.innerHTML = ""

    categories.forEach((category) => {
      const button = document.createElement("button")
      button.className = `category-button ${category === selectedCategory ? "active" : ""}`
      button.textContent = category
      button.addEventListener("click", () => selectCategory(category))
      categoriesFilter.appendChild(button)
    })
  }

  function filterChannels() {
    let result = [...channels]

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (channel) =>
          channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (channel.description && channel.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Filter by category
    if (selectedCategory !== "Todos") {
      result = result.filter((channel) => channel.category === selectedCategory)
    }

    // Filter by favorites
    if (showOnlyFavorites) {
      result = result.filter((channel) => channel.favorite)
    }

    filteredChannels = result
    renderChannels()
  }

  function renderChannels() {
    if (!channelsGrid) return

    // Clear current grid with fade-out effect
    channelsGrid.style.opacity = "0"

    setTimeout(() => {
      channelsGrid.innerHTML = ""

      if (filteredChannels.length === 0) {
        noResults.style.display = "block"
        channelsGrid.style.opacity = "1"
        return
      }

      noResults.style.display = "none"

      // Set appropriate class based on device width
      channelsGrid.className = window.innerWidth >= 768 && isGridView ? "channels-grid" : "channels-list"

      // Add channels with staggered animation
      filteredChannels.forEach((channel, index) => {
        const channelCard =
          window.innerWidth >= 768 && isGridView ? createChannelCard(channel) : createChannelListItem(channel)

        // Add staggered animation delay
        channelCard.style.animationDelay = `${index * 0.05}s`
        channelsGrid.appendChild(channelCard)
      })

      // Fade in the grid
      channelsGrid.style.opacity = "1"
    }, 200)
  }

  function createChannelCard(channel) {
    const card = document.createElement("div")
    card.className = "channel-card slide-in-up"
    card.addEventListener("click", () => navigateToPlayer(channel.id))

    // Check if channel is favorite
    const isFavorite = channel.favorite || false

    card.innerHTML = `
    <div class="channel-thumbnail">
      <img src="${channel.logo || "placeholder.svg"}" alt="${channel.name}" class="channel-logo" loading="lazy">
      <div class="channel-overlay">
        <div class="play-button">
          <i class="fas fa-play"></i>
        </div>
      </div>
      <button class="favorite-button ${isFavorite ? "active" : ""}" data-id="${channel.id}" aria-label="${isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}">
        <i class="${isFavorite ? "fas" : "far"} fa-heart"></i>
      </button>
    </div>
    <div class="channel-info">
      <h3 class="channel-name">${channel.name}</h3>
      <div class="channel-meta">
        <span class="channel-category">${channel.category}</span>
        <span class="channel-status">En vivo</span>
      </div>
    </div>
  `

    // Add event listener to favorite button
    const favoriteButton = card.querySelector(".favorite-button")
    favoriteButton.addEventListener("click", (e) => {
      e.stopPropagation() // Prevent card click
      toggleFavorite(channel.id)
    })

    return card
  }

  function createChannelListItem(channel) {
    const listItem = document.createElement("div")
    listItem.className = "channel-list-item slide-in-up"
    listItem.addEventListener("click", () => navigateToPlayer(channel.id))

    // Check if channel is favorite
    const isFavorite = channel.favorite || false

    listItem.innerHTML = `
    <div class="list-item-logo">
      <img src="${channel.logo || "placeholder.svg"}" alt="${channel.name}" class="channel-logo-small" loading="lazy">
    </div>
    <div class="list-item-info">
      <h3 class="channel-name">${channel.name}</h3>
      <div class="channel-meta">
        <span class="channel-category">${channel.category}</span>
        <span class="channel-status">En vivo</span>
      </div>
    </div>
    <div class="list-item-actions">
      <button class="favorite-button ${isFavorite ? "active" : ""}" data-id="${channel.id}" aria-label="${isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}">
        <i class="${isFavorite ? "fas" : "far"} fa-heart"></i>
      </button>
      <button class="play-button-small">
        <i class="fas fa-play"></i>
      </button>
    </div>
  `

    // Add event listener to favorite button
    const favoriteButton = listItem.querySelector(".favorite-button")
    favoriteButton.addEventListener("click", (e) => {
      e.stopPropagation() // Prevent item click
      toggleFavorite(channel.id)
    })

    return listItem
  }

  function toggleFavorite(channelId) {
    // Find the channel
    const channelIndex = channels.findIndex((ch) => ch.id === channelId)

    if (channelIndex !== -1) {
      // Toggle favorite status
      channels[channelIndex].favorite = !channels[channelIndex].favorite

      // Update UI
      const favoriteButton = document.querySelector(`.favorite-button[data-id="${channelId}"]`)
      if (favoriteButton) {
        favoriteButton.classList.toggle("active")
        const icon = favoriteButton.querySelector("i")
        if (channels[channelIndex].favorite) {
          icon.className = "fas fa-heart"
          favoriteButton.setAttribute("aria-label", "Quitar de favoritos")
          showNotification(`${channels[channelIndex].name} añadido a favoritos`, "success")
        } else {
          icon.className = "far fa-heart"
          favoriteButton.setAttribute("aria-label", "Añadir a favoritos")
          showNotification(`${channels[channelIndex].name} eliminado de favoritos`, "info")
        }
      }

      // Save to localStorage
      saveChannelsToLocalStorage()

      // If we're in favorites mode and removing a favorite, we need to refilter
      if (showOnlyFavorites && !channels[channelIndex].favorite) {
        filterChannels()
      }
    }
  }

  function saveChannelsToLocalStorage() {
    // Only save the id and favorite status to keep localStorage small
    const favoritesData = channels.map((channel) => ({
      id: channel.id,
      favorite: channel.favorite || false,
    }))

    localStorage.setItem("channelFavorites", JSON.stringify(favoritesData))
  }

  function loadFavoritesFromLocalStorage() {
    const savedFavorites = localStorage.getItem("channelFavorites")

    if (savedFavorites) {
      try {
        const favoritesData = JSON.parse(savedFavorites)

        // Update channels with saved favorite status
        channels.forEach((channel) => {
          const savedChannel = favoritesData.find((ch) => ch.id === channel.id)
          if (savedChannel) {
            channel.favorite = savedChannel.favorite
          }
        })
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error)
      }
    }
  }

  function navigateToPlayer(channelId) {
    // Add to view history
    addToViewHistory(channelId)

    // Navigate to player page
    window.location.href = `canales-reproductor.html?id=${channelId}`
  }

  function addToViewHistory(channelId) {
    const channel = channels.find((ch) => ch.id === channelId)

    if (!channel) return

    // Create history entry
    const historyEntry = {
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      timestamp: new Date().toISOString(),
    }

    // Remove if already exists
    viewHistory = viewHistory.filter((item) => item.id !== channelId)

    // Add to beginning of array
    viewHistory.unshift(historyEntry)

    // Limit to 10 items
    if (viewHistory.length > 10) {
      viewHistory = viewHistory.slice(0, 10)
    }

    // Save to localStorage
    localStorage.setItem("channelViewHistory", JSON.stringify(viewHistory))
  }

  function loadViewHistory() {
    const savedHistory = localStorage.getItem("channelViewHistory")

    if (savedHistory) {
      try {
        viewHistory = JSON.parse(savedHistory)
      } catch (error) {
        console.error("Error loading view history from localStorage:", error)
        viewHistory = []
      }
    }
  }

  function addScrollIndicator() {
    // Only add for mobile view
    if (window.innerWidth >= 768 || !isGridView) return

    // Remove existing indicator if any
    if (scrollIndicator) {
      scrollIndicator.innerHTML = ""

      // Calculate number of pages (approx)
      const channelsPerView = window.innerWidth < 480 ? 1 : 2
      const totalPages = Math.ceil(filteredChannels.length / channelsPerView)

      // Create dots
      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement("div")
        dot.className = "scroll-dot"
        if (i === 0) dot.classList.add("active")
        scrollIndicator.appendChild(dot)
      }

      // Add scroll event listener to update active dot
      channelsGrid.addEventListener("scroll", updateScrollIndicator)
    }
  }

  function updateScrollIndicator() {
    if (window.innerWidth >= 768 || !isGridView || !scrollIndicator) return

    const dots = scrollIndicator.querySelectorAll(".scroll-dot")
    if (!dots.length) return

    // Calculate which dot should be active
    const scrollPosition = channelsGrid.scrollLeft
    const maxScroll = channelsGrid.scrollWidth - channelsGrid.clientWidth
    const scrollRatio = scrollPosition / maxScroll
    const activeDotIndex = Math.min(Math.floor(scrollRatio * dots.length), dots.length - 1)

    // Update active dot
    dots.forEach((dot, index) => {
      if (index === activeDotIndex) {
        dot.classList.add("active")
      } else {
        dot.classList.remove("active")
      }
    })
  }

  // Add touch swipe support for mobile
  function addSwipeSupport() {
    if (!channelsGrid) return

    let startX, startY
    let distX, distY
    const threshold = 100 // Minimum distance for swipe

    channelsGrid.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
      },
      false,
    )

    channelsGrid.addEventListener(
      "touchmove",
      (e) => {
        if (!startX || !startY) return

        distX = e.touches[0].clientX - startX
        distY = e.touches[0].clientY - startY

        // If horizontal swipe is more significant than vertical
        if (Math.abs(distX) > Math.abs(distY)) {
          e.preventDefault() // Prevent page scroll
        }
      },
      { passive: false },
    )

    channelsGrid.addEventListener(
      "touchend",
      (e) => {
        if (!startX || !startY) return

        distX = e.changedTouches[0].clientX - startX
        distY = e.changedTouches[0].clientY - startY

        // If horizontal swipe is more significant than vertical and exceeds threshold
        if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > threshold) {
          // Swipe left
          if (distX < 0) {
            channelsGrid.scrollBy({ left: channelsGrid.clientWidth * 0.8, behavior: "smooth" })
          }
          // Swipe right
          else {
            channelsGrid.scrollBy({ left: -channelsGrid.clientWidth * 0.8, behavior: "smooth" })
          }
        }

        startX = null
        startY = null
      },
      false,
    )
  }

  // Add pull-to-refresh functionality
  function setupPullToRefresh() {
    if (!channelsGrid) return

    // Create pull-to-refresh element
    const pullToRefresh = document.createElement("div")
    pullToRefresh.className = "pull-to-refresh"
    pullToRefresh.innerHTML = '<div class="refresh-spinner"></div>'

    // Insert before channels grid
    document.querySelector(".main-content").insertBefore(pullToRefresh, channelsGrid)

    let touchStartY = 0
    let touchEndY = 0
    let isRefreshing = false

    document.addEventListener(
      "touchstart",
      (e) => {
        touchStartY = e.touches[0].clientY
      },
      { passive: true },
    )

    document.addEventListener(
      "touchmove",
      (e) => {
        if (isRefreshing) return

        touchEndY = e.touches[0].clientY
        const distance = touchEndY - touchStartY

        // Only activate if we're at the top of the page and pulling down
        if (window.scrollY === 0 && distance > 0 && distance < 100) {
          pullToRefresh.classList.add("visible")
          pullToRefresh.style.transform = `translateY(${Math.min(distance, 60)}px)`
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchend",
      () => {
        if (isRefreshing) return

        const distance = touchEndY - touchStartY

        if (window.scrollY === 0 && distance > 50) {
          // Trigger refresh
          isRefreshing = true
          pullToRefresh.classList.add("refreshing")

          // Refresh data
          fetchChannels().then(() => {
            // Reset after refresh
            setTimeout(() => {
              pullToRefresh.classList.remove("visible", "refreshing")
              pullToRefresh.style.transform = ""
              isRefreshing = false
            }, 1000)
          })
        } else {
          // Reset without refreshing
          pullToRefresh.classList.remove("visible")
          pullToRefresh.style.transform = ""
        }
      },
      { passive: true },
    )
  }

  // Notification system
  function showNotification(message, type = "info") {
    // Remove any existing notification
    const existingNotification = document.querySelector(".notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    // Create notification element
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message

    // Add to body
    document.body.appendChild(notification)

    // Show with animation
    setTimeout(() => {
      notification.classList.add("show")
    }, 10)

    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        notification.remove()
      }, 300)
    }, 3000)
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    // Close filters panel on larger screens if window is resized
    if (window.innerWidth >= 768 && filtersPanel && filtersPanel.classList.contains("open")) {
      filtersPanel.classList.remove("open")
      filterButton.classList.remove("active")
      isFiltersPanelOpen = false
    }

    // Close search on mobile
    if (window.innerWidth >= 768 && searchContainer && searchContainer.classList.contains("active")) {
      searchContainer.classList.remove("active")
      if (searchToggle) searchToggle.classList.remove("active")
    }

    // Update view mode based on screen size
    isGridView = window.innerWidth >= 768 && isGridView

    // Re-render channels if needed
    if (filteredChannels.length > 0) {
      renderChannels()
    }

    // Add or remove view toggle button based on screen size
    const existingToggleButton = document.querySelector(".filter-button[aria-label='Cambiar vista']")

    if (window.innerWidth >= 768 && !existingToggleButton) {
      const viewToggleButton = document.createElement("button")
      viewToggleButton.className = "filter-button"
      viewToggleButton.setAttribute("aria-label", "Cambiar vista")
      viewToggleButton.innerHTML = '<i class="fas fa-th-list"></i>'
      viewToggleButton.addEventListener("click", toggleView)

      if (document.querySelector(".header-right")) {
        document.querySelector(".header-right").insertBefore(viewToggleButton, themeToggle)
      }
    } else if (window.innerWidth < 768 && existingToggleButton) {
      existingToggleButton.remove()
    }
  })
})

