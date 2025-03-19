document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const themeToggle = document.getElementById("themeToggle")
  const moonIcon = document.getElementById("moonIcon")
  const sunIcon = document.getElementById("sunIcon")
  const searchInput = document.getElementById("searchInput")
  const searchToggle = document.getElementById("searchToggle")
  const searchContainer = document.getElementById("searchContainer")
  const searchClear = document.getElementById("searchClear")
  const filterButton = document.getElementById("filterButton")
  const filtersPanel = document.getElementById("filtersPanel")
  const closeFilters = document.getElementById("closeFilters")
  const categoriesFilter = document.getElementById("categoriesFilter")
  const channelsGrid = document.getElementById("channelsGrid")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const noResults = document.getElementById("noResults")
  const clearFiltersButton = document.getElementById("clearFiltersButton")
  const favoritesToggle = document.getElementById("favoritesToggle")
  const scrollIndicator = document.getElementById("scrollIndicator")
  const scrollToTop = document.getElementById("scrollToTop")
  const offlineNotification = document.getElementById("offlineNotification")
  const gridViewButton = document.getElementById("gridViewButton")
  const listViewButton = document.getElementById("listViewButton")
  const sortSelect = document.getElementById("sortSelect")
  const resetFilters = document.getElementById("resetFilters")
  const pagination = document.getElementById("pagination")
  const recentlyViewed = document.getElementById("recentlyViewed")
  const recentlyViewedList = document.getElementById("recentlyViewedList")
  const showFavoritesLink = document.getElementById("showFavoritesLink")
  const showRecentLink = document.getElementById("showRecentLink")
  const footerCategories = document.getElementById("footerCategories")
  const connectionStatus = document.getElementById("connectionStatus")

  // State
  let channels = []
  let filteredChannels = []
  let categories = ["Todos"]
  let selectedCategory = "Todos"
  let searchQuery = ""
  let isFiltersPanelOpen = false
  let showOnlyFavorites = false
  let viewHistory = []
  let isGridView = true
  let currentSort = "name"
  let currentPage = 1
  let itemsPerPage = 20
  // Estado de conexión
  let isOffline = false
  let connectionCheckInterval = null

  // Función para verificar la conexión a internet de forma activa
  function checkInternetConnection() {
    return fetch("https://www.google.com/favicon.ico", {
      mode: "no-cors",
      cache: "no-store",
      method: "HEAD",
      timeout: 2000,
    })
      .then(() => {
        if (isOffline) {
          isOffline = false
          offlineNotification.classList.remove("visible")
          showNotification("Conexión restablecida", "success")

          // Actualizar indicador de conexión
          if (connectionStatus) {
            connectionStatus.classList.remove("offline")
            connectionStatus.title = "Conectado a internet"
            connectionStatus.querySelector(".fa-wifi").style.display = "block"
            connectionStatus.querySelector(".fa-wifi-slash").style.display = "none"
          }

          // Refrescar datos si es necesario
          const now = Date.now()
          if (now - lastFetchTime > 300000) {
            fetchChannels()
          }
        }
        return true
      })
      .catch(() => {
        if (!isOffline) {
          isOffline = true
          offlineNotification.classList.add("visible")
          showNotification("Sin conexión a internet", "warning")

          // Actualizar indicador de conexión
          if (connectionStatus) {
            connectionStatus.classList.add("offline")
            connectionStatus.title = "Sin conexión a internet"
            connectionStatus.querySelector(".fa-wifi").style.display = "none"
            connectionStatus.querySelector(".fa-wifi-slash").style.display = "block"
          }
        }
        return false
      })
  }
  let channelsCache = null
  let lastFetchTime = 0
  let touchStartX = 0
  let touchStartY = 0

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

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = ""
      searchQuery = ""
      filterChannels()
      searchInput.focus()
    })
  }

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

  if (closeFilters) {
    closeFilters.addEventListener("click", toggleFiltersPanel)
  }

  if (favoritesToggle) {
    favoritesToggle.addEventListener("click", toggleFavoritesFilter)
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", resetAllFilters)
  }

  if (resetFilters) {
    resetFilters.addEventListener("click", resetAllFilters)
  }

  if (gridViewButton) {
    gridViewButton.addEventListener("click", () => setViewMode(true))
  }

  if (listViewButton) {
    listViewButton.addEventListener("click", () => setViewMode(false))
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", handleSortChange)
  }

  if (scrollToTop) {
    scrollToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })
  }

  if (showFavoritesLink) {
    showFavoritesLink.addEventListener("click", (e) => {
      e.preventDefault()
      showOnlyFavorites = true
      favoritesToggle.classList.add("active")
      favoritesToggle.innerHTML = '<i class="fas fa-heart"></i> Mostrando favoritos'
      filterChannels()
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  if (showRecentLink) {
    showRecentLink.addEventListener("click", (e) => {
      e.preventDefault()
      if (viewHistory.length > 0) {
        window.scrollTo({
          top: recentlyViewed.offsetTop - 100,
          behavior: "smooth",
        })
      } else {
        showNotification("No tienes canales vistos recientemente", "info")
      }
    })
  }

  // Close panels when clicking outside
  document.addEventListener("click", (e) => {
    // Close filters panel when clicking outside
    if (
      filtersPanel &&
      filterButton &&
      !filterButton.contains(e.target) &&
      !filtersPanel.contains(e.target) &&
      filtersPanel.classList.contains("open") &&
      !e.target.closest(".filters-panel")
    ) {
      toggleFiltersPanel()
    }

    // Close search on mobile when clicking outside
    if (
      searchContainer &&
      searchToggle &&
      !searchToggle.contains(e.target) &&
      !searchContainer.contains(e.target) &&
      searchContainer.classList.contains("active") &&
      !e.target.closest(".search-container")
    ) {
      searchContainer.classList.remove("active")
      searchToggle.classList.remove("active")
    }
  })

  // Check for search query in URL
  const urlParams = new URLSearchParams(window.location.search)
  const urlSearchQuery = urlParams.get("search")
  const urlCategory = urlParams.get("category")
  const urlFavorites = urlParams.get("favorites")

  if (urlSearchQuery) {
    searchQuery = urlSearchQuery
    searchInput.value = urlSearchQuery
  }

  if (urlCategory) {
    selectedCategory = urlCategory
  }

  if (urlFavorites === "true") {
    showOnlyFavorites = true
    favoritesToggle.classList.add("active")
    favoritesToggle.innerHTML = '<i class="fas fa-heart"></i> Mostrando favoritos'
  }

  // Initialize
  fetchChannels()
  addSwipeSupport()
  setupPullToRefresh()
  setupScrollListener()
  // Setup network status listeners
  function setupNetworkStatusListeners() {
    // Verificar estado inicial de conexión
    checkInternetConnection()

    // Configurar intervalo para verificar la conexión periódicamente
    connectionCheckInterval = setInterval(checkInternetConnection, 30000)

    // Listeners para eventos de conexión del navegador
    window.addEventListener("online", () => {
      // Verificar si realmente hay conexión (los eventos pueden ser poco confiables)
      checkInternetConnection()
    })

    window.addEventListener("offline", () => {
      isOffline = true
      offlineNotification.classList.add("visible")
      showNotification("Sin conexión a internet", "warning")
    })

    // Agregar botón para cerrar la notificación
    const closeOfflineBtn = document.createElement("button")
    closeOfflineBtn.className = "close-offline-notification"
    closeOfflineBtn.innerHTML = '<i class="fas fa-times"></i>'
    closeOfflineBtn.setAttribute("aria-label", "Cerrar notificación")
    closeOfflineBtn.addEventListener("click", (e) => {
      e.preventDefault()
      offlineNotification.classList.remove("visible")
    })

    offlineNotification.appendChild(closeOfflineBtn)
  }
  loadViewMode()
  renderRecentlyViewed()

  // Check if we need to restore scroll position
  const savedScrollPosition = sessionStorage.getItem("scrollPosition")
  if (savedScrollPosition) {
    setTimeout(() => {
      window.scrollTo(0, Number.parseInt(savedScrollPosition))
      sessionStorage.removeItem("scrollPosition")
    }, 500)
  }

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

    // Add overlay when filters panel is open
    if (isFiltersPanelOpen) {
      const overlay = document.createElement("div")
      overlay.className = "filters-overlay"
      overlay.id = "filtersOverlay"
      overlay.addEventListener("click", toggleFiltersPanel)
      document.body.appendChild(overlay)

      // Prevent body scrolling
      document.body.style.overflow = "hidden"
    } else {
      const overlay = document.getElementById("filtersOverlay")
      if (overlay) {
        overlay.remove()
      }

      // Restore body scrolling
      document.body.style.overflow = ""
    }
  }

  function handleSearch(e) {
    searchQuery = e.target.value.trim()

    // Show/hide clear button based on input
    if (searchClear) {
      searchClear.style.display = searchQuery ? "flex" : "none"
    }

    // Reset to first page when searching
    currentPage = 1

    filterChannels()

    // Update URL with search query
    updateURL()
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

    // Reset to first page when changing category
    currentPage = 1

    filterChannels()

    // Update URL with category
    updateURL()

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

    // Reset to first page when toggling favorites
    currentPage = 1

    filterChannels()

    // Update URL with favorites status
    updateURL()
  }

  function resetAllFilters() {
    searchQuery = ""
    selectedCategory = "Todos"
    showOnlyFavorites = false
    currentPage = 1

    // Reset search input
    if (searchInput) {
      searchInput.value = ""
    }

    // Reset category buttons
    const categoryButtons = document.querySelectorAll(".category-button")
    categoryButtons.forEach((button) => {
      button.classList.toggle("active", button.textContent === "Todos")
    })

    // Reset favorites toggle
    if (favoritesToggle) {
      favoritesToggle.classList.remove("active")
      favoritesToggle.innerHTML = '<i class="far fa-heart"></i> Mostrar favoritos'
    }

    // Reset sort select
    if (sortSelect) {
      sortSelect.value = "name"
      currentSort = "name"
    }

    filterChannels()

    // Update URL to remove all parameters
    history.replaceState(null, null, window.location.pathname)

    showNotification("Filtros restablecidos", "info")
  }

  // Modificar la función para que en móviles siempre se use la vista de lista

  // Actualizar la función loadViewMode para forzar vista de lista en móviles
  function loadViewMode() {
    const savedViewMode = localStorage.getItem("viewMode")

    // En móviles, siempre usar vista de lista
    if (window.innerWidth < 768) {
      isGridView = false
    } else if (savedViewMode) {
      isGridView = savedViewMode === "grid"
    }

    // Update buttons
    if (gridViewButton && listViewButton) {
      gridViewButton.classList.toggle("active", isGridView)
      listViewButton.classList.toggle("active", !isGridView)
    }
  }

  // Actualizar la función setViewMode para respetar la restricción en móviles
  function setViewMode(isGrid) {
    // En móviles, siempre forzar vista de lista
    if (window.innerWidth < 768) {
      isGridView = false
    } else {
      isGridView = isGrid
    }

    // Update buttons
    if (gridViewButton && listViewButton) {
      gridViewButton.classList.toggle("active", isGridView)
      listViewButton.classList.toggle("active", !isGridView)
    }

    // Save preference (solo en desktop)
    if (window.innerWidth >= 768) {
      localStorage.setItem("viewMode", isGridView ? "grid" : "list")
    }

    // Re-render channels
    renderChannels()
  }

  function handleSortChange() {
    currentSort = sortSelect.value
    filterChannels()
  }

  function updateURL() {
    const url = new URL(window.location)

    // Update or remove search parameter
    if (searchQuery) {
      url.searchParams.set("search", searchQuery)
    } else {
      url.searchParams.delete("search")
    }

    // Update or remove category parameter
    if (selectedCategory && selectedCategory !== "Todos") {
      url.searchParams.set("category", selectedCategory)
    } else {
      url.searchParams.delete("category")
    }

    // Update or remove favorites parameter
    if (showOnlyFavorites) {
      url.searchParams.set("favorites", "true")
    } else {
      url.searchParams.delete("favorites")
    }

    // Update URL without reloading the page
    history.replaceState(null, null, url)
  }

  async function fetchChannels() {
    try {
      // Show loading animation
      loadingSpinner.style.display = "flex"

      // Check if we have cached data and it's less than 5 minutes old
      const now = Date.now()
      if (channelsCache && now - lastFetchTime < 300000 && !isOffline) {
        channels = channelsCache
        processChannels()
        return
      }

      // Try to get from cache if offline
      if (isOffline && channelsCache) {
        channels = channelsCache
        processChannels()
        showNotification("Usando datos almacenados en caché", "warning")
        return
      }

      // Fetch channels data with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch("data/canales-en-vivo.json", {
          signal: controller.signal,
          cache: "no-cache",
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        channels = await response.json()

        // Cache the data
        channelsCache = [...channels]
        lastFetchTime = now

        // Save to localStorage for offline use
        localStorage.setItem("channelsCache", JSON.stringify(channels))
        localStorage.setItem("lastFetchTime", now.toString())

        processChannels()
      } catch (fetchError) {
        // If fetch fails, try to load from localStorage
        const cachedData = localStorage.getItem("channelsCache")
        if (cachedData) {
          channels = JSON.parse(cachedData)
          processChannels()
          showNotification("Error al actualizar datos. Usando caché.", "warning")
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("Error fetching channels:", error)
      loadingSpinner.style.display = "none"
      noResults.style.display = "block"
      noResults.innerHTML = `
      <p>Error al cargar los canales. Por favor, intenta nuevamente.</p>
      <button class="primary-button" onclick="location.reload()">Reintentar</button>
    `
    }
  }

  function processChannels() {
    // Load favorites from localStorage
    loadFavoritesFromLocalStorage()

    // Extract unique categories
    const uniqueCategories = [...new Set(channels.map((channel) => channel.category))].sort()
    categories = ["Todos", ...uniqueCategories]

    // Render categories
    renderCategories()
    renderFooterCategories()

    // Apply any initial filters from URL
    filterChannels()

    // Hide loading spinner
    loadingSpinner.style.display = "none"
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

  function renderFooterCategories() {
    if (!footerCategories) return

    footerCategories.innerHTML = ""

    // Only show top 6 categories excluding "Todos"
    const topCategories = categories.filter((cat) => cat !== "Todos").slice(0, 6)

    topCategories.forEach((category) => {
      const link = document.createElement("a")
      link.href = `?category=${encodeURIComponent(category)}`
      link.textContent = category
      link.addEventListener("click", (e) => {
        e.preventDefault()
        selectCategory(category)
      })
      footerCategories.appendChild(link)
    })
  }

  function filterChannels() {
    let result = [...channels]

    // Filter by search query
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(" ")
      result = result.filter((channel) => {
        return searchTerms.every(
          (term) =>
            channel.name.toLowerCase().includes(term) ||
            channel.category.toLowerCase().includes(term) ||
            (channel.description && channel.description.toLowerCase().includes(term)),
        )
      })
    }

    // Filter by category
    if (selectedCategory !== "Todos") {
      result = result.filter((channel) => channel.category === selectedCategory)
    }

    // Filter by favorites
    if (showOnlyFavorites) {
      result = result.filter((channel) => channel.favorite)
    }

    // Sort channels
    sortChannels(result)

    filteredChannels = result

    // Render pagination
    renderPagination()

    // Render channels
    renderChannels()
  }

  function sortChannels(channels) {
    switch (currentSort) {
      case "name":
        channels.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "category":
        channels.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        break
      case "recent":
        // Sort by recently viewed first, then alphabetically
        channels.sort((a, b) => {
          const aIndex = viewHistory.findIndex((item) => item.id === a.id)
          const bIndex = viewHistory.findIndex((item) => item.id === b.id)

          // If both are in history, sort by most recent
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }

          // If only one is in history, it comes first
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1

          // If neither is in history, sort alphabetically
          return a.name.localeCompare(b.name)
        })
        break
    }
  }

  function renderPagination() {
    if (!pagination) return

    pagination.innerHTML = ""

    // Calculate total pages
    const totalPages = Math.ceil(filteredChannels.length / itemsPerPage)

    // Don't show pagination if only one page
    if (totalPages <= 1) {
      pagination.style.display = "none"
      return
    }

    pagination.style.display = "flex"

    // Previous button
    const prevButton = document.createElement("button")
    prevButton.className = `pagination-button ${currentPage === 1 ? "disabled" : ""}`
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>'
    prevButton.disabled = currentPage === 1
    prevButton.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--
        renderChannels()
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    })
    pagination.appendChild(prevButton)

    // Page buttons
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // First page button if not visible
    if (startPage > 1) {
      const firstPageButton = document.createElement("button")
      firstPageButton.className = "pagination-button"
      firstPageButton.textContent = "1"
      firstPageButton.addEventListener("click", () => {
        currentPage = 1
        renderChannels()
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
      pagination.appendChild(firstPageButton)

      // Ellipsis if needed
      if (startPage > 2) {
        const ellipsis = document.createElement("span")
        ellipsis.className = "pagination-ellipsis"
        ellipsis.textContent = "..."
        pagination.appendChild(ellipsis)
      }
    }

    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement("button")
      pageButton.className = `pagination-button ${i === currentPage ? "active" : ""}`
      pageButton.textContent = i.toString()
      pageButton.addEventListener("click", () => {
        currentPage = i
        renderChannels()
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
      pagination.appendChild(pageButton)
    }

    // Ellipsis and last page if not visible
    if (endPage < totalPages) {
      // Ellipsis if needed
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span")
        ellipsis.className = "pagination-ellipsis"
        ellipsis.textContent = "..."
        pagination.appendChild(ellipsis)
      }

      // Last page button
      const lastPageButton = document.createElement("button")
      lastPageButton.className = "pagination-button"
      lastPageButton.textContent = totalPages.toString()
      lastPageButton.addEventListener("click", () => {
        currentPage = totalPages
        renderChannels()
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
      pagination.appendChild(lastPageButton)
    }

    // Next button
    const nextButton = document.createElement("button")
    nextButton.className = `pagination-button ${currentPage === totalPages ? "disabled" : ""}`
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>'
    nextButton.disabled = currentPage === totalPages
    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++
        renderChannels()
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    })
    pagination.appendChild(nextButton)
  }

  // Modificar la función renderChannels para que en móviles siempre use la vista de lista

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

      // En móviles, siempre usar vista de lista
      const useGridView = window.innerWidth >= 768 && isGridView

      // Set appropriate class based on view mode
      channelsGrid.className = useGridView ? "channels-grid" : "channels-list"

      // Get current page of channels
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = Math.min(startIndex + itemsPerPage, filteredChannels.length)
      const currentPageChannels = filteredChannels.slice(startIndex, endIndex)

      // Add channels with staggered animation
      currentPageChannels.forEach((channel, index) => {
        const channelCard = useGridView ? createChannelCard(channel) : createChannelListItem(channel)

        // Add staggered animation delay
        channelCard.style.animationDelay = `${index * 0.05}s`
        channelsGrid.appendChild(channelCard)
      })

      // Fade in the grid
      channelsGrid.style.opacity = "1"

      // Add scroll indicator for mobile grid view (no aplicable ahora)
      if (useGridView) {
        addScrollIndicator()
      }
    }, 200)
  }

  function createChannelCard(channel) {
    const card = document.createElement("div")
    card.className = "channel-card slide-in-up"
    card.setAttribute("data-id", channel.id)
    card.addEventListener("click", () => navigateToPlayer(channel.id))

    // Check if channel is favorite
    const isFavorite = channel.favorite || false

    // Check if channel is in view history
    const isViewed = viewHistory.some((item) => item.id === channel.id)

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
      ${isViewed ? '<div class="viewed-badge"><i class="fas fa-eye"></i></div>' : ""}
    </div>
    <div class="channel-info">
      <h3 class="channel-name">${channel.name}</h3>
      <div class="channel-meta">
        <span class="channel-category">${channel.category}</span>
        <span class="channel-status">En vivo</span>
      </div>
      ${channel.description ? `<p class="channel-description">${truncateText(channel.description, 80)}</p>` : ""}
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
    listItem.setAttribute("data-id", channel.id)
    listItem.addEventListener("click", () => navigateToPlayer(channel.id))

    // Check if channel is favorite
    const isFavorite = channel.favorite || false

    // Check if channel is in view history
    const isViewed = viewHistory.some((item) => item.id === channel.id)

    listItem.innerHTML = `
    <div class="list-item-logo">
      <img src="${channel.logo || "placeholder.svg"}" alt="${channel.name}" class="channel-logo-small" loading="lazy">
      ${isViewed ? '<div class="viewed-badge-small"><i class="fas fa-eye"></i></div>' : ""}
    </div>
    <div class="list-item-info">
      <h3 class="channel-name">${channel.name}</h3>
      <div class="channel-meta">
        <span class="channel-category">${channel.category}</span>
        <span class="channel-status">En vivo</span>
      </div>
      ${channel.description ? `<p class="channel-description-small">${truncateText(channel.description, 120)}</p>` : ""}
    </div>
    <div class="list-item-actions">
      <button class="favorite-button ${isFavorite ? "active" : ""}" data-id="${channel.id}" aria-label="${isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}">
        <i class="${isFavorite ? "fas" : "far"} fa-heart"></i>
      </button>
      <button class="play-button-small" aria-label="Reproducir ${channel.name}">
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

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  function toggleFavorite(channelId) {
    // Find the channel
    const channelIndex = channels.findIndex((ch) => ch.id === channelId)

    if (channelIndex !== -1) {
      // Toggle favorite status
      channels[channelIndex].favorite = !channels[channelIndex].favorite

      // Update UI
      const favoriteButtons = document.querySelectorAll(`.favorite-button[data-id="${channelId}"]`)
      favoriteButtons.forEach((favoriteButton) => {
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
      })

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

    try {
      localStorage.setItem("channelFavorites", JSON.stringify(favoritesData))
    } catch (e) {
      console.error("Error saving to localStorage:", e)
      showNotification("Error al guardar favoritos", "error")
    }
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
    // Save current scroll position
    sessionStorage.setItem("scrollPosition", window.pageYOffset.toString())

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
      category: channel.category,
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
    saveViewHistory()

    // Update recently viewed section
    renderRecentlyViewed()
  }

  function saveViewHistory() {
    try {
      localStorage.setItem("channelViewHistory", JSON.stringify(viewHistory))
    } catch (e) {
      console.error("Error saving view history to localStorage:", e)
    }
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

  function renderRecentlyViewed() {
    if (!recentlyViewed || !recentlyViewedList) return

    // Hide section if no history
    if (viewHistory.length === 0) {
      recentlyViewed.style.display = "none"
      return
    }

    recentlyViewed.style.display = "block"
    recentlyViewedList.innerHTML = ""

    // Show only the first 6 items
    viewHistory.slice(0, 6).forEach((item) => {
      const historyItem = document.createElement("div")
      historyItem.className = "recently-viewed-item"
      historyItem.addEventListener("click", () => {
        navigateToPlayer(item.id)
      })

      // Format time ago
      const timeAgo = getTimeAgo(new Date(item.timestamp))

      historyItem.innerHTML = `
      <div class="recently-viewed-thumbnail">
        <img src="${item.logo || "placeholder.svg"}" alt="${item.name}" loading="lazy">
        <div class="recently-viewed-overlay">
          <div class="play-icon">
            <i class="fas fa-play"></i>
          </div>
        </div>
      </div>
      <div class="recently-viewed-info">
        <h4>${item.name}</h4>
        <div class="recently-viewed-meta">
          <span class="recently-viewed-category">${item.category}</span>
          <span class="recently-viewed-time">${timeAgo}</span>
        </div>
      </div>
    `

      recentlyViewedList.appendChild(historyItem)
    })
  }

  // Helper function to format time ago
  function getTimeAgo(date) {
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 0) {
      return diffDay === 1 ? "Ayer" : `Hace ${diffDay} días`
    }
    if (diffHour > 0) {
      return `Hace ${diffHour} h`
    }
    if (diffMin > 0) {
      return `Hace ${diffMin} min`
    }
    return "Justo ahora"
  }

  function addScrollIndicator() {
    // Only add for mobile view
    if (window.innerWidth >= 768 || !isGridView || !scrollIndicator) return

    // Remove existing indicator if any
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

    channelsGrid.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
      },
      { passive: true },
    )

    channelsGrid.addEventListener(
      "touchmove",
      (e) => {
        if (!touchStartX || !touchStartY) return

        const touchX = e.touches[0].clientX
        const touchY = e.touches[0].clientY
        const diffX = touchStartX - touchX
        const diffY = touchStartY - touchY

        // If horizontal swipe is more significant than vertical
        if (Math.abs(diffX) > Math.abs(diffY)) {
          e.preventDefault() // Prevent page scroll
        }
      },
      { passive: true },
    )

    channelsGrid.addEventListener(
      "touchend",
      (e) => {
        if (!touchStartX || !touchStartY) return

        const touchEndX = e.changedTouches[0].clientX
        const touchEndY = e.changedTouches[0].clientY
        const diffX = touchStartX - touchEndX
        const diffY = touchStartY - touchEndY
        const threshold = 100 // Minimum distance for swipe

        // If horizontal swipe is more significant than vertical and exceeds threshold
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
          // Swipe left
          if (diffX > 0) {
            channelsGrid.scrollBy({ left: channelsGrid.clientWidth * 0.8, behavior: "smooth" })
          }
          // Swipe right
          else {
            channelsGrid.scrollBy({ left: -channelsGrid.clientWidth * 0.8, behavior: "smooth" })
          }
        }

        touchStartX = null
        touchStartY = null
      },
      { passive: true },
    )
  }

  // Add pull-to-refresh functionality
  function setupPullToRefresh() {
    let touchStartY = 0
    let touchEndY = 0
    let isRefreshing = false
    let pullStarted = false
    const pullThreshold = 80

    // Create pull-to-refresh element
    const pullToRefresh = document.createElement("div")
    pullToRefresh.className = "pull-to-refresh"
    pullToRefresh.innerHTML = `
    <div class="refresh-spinner"></div>
    <span class="refresh-text">Suelta para actualizar</span>
  `

    // Insert at the top of the page
    document.body.insertBefore(pullToRefresh, document.body.firstChild)

    document.addEventListener(
      "touchstart",
      (e) => {
        // Only activate if we're at the top of the page
        if (window.scrollY === 0) {
          touchStartY = e.touches[0].clientY
          pullStarted = true
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchmove",
      (e) => {
        if (!pullStarted || isRefreshing) return

        touchEndY = e.touches[0].clientY
        const distance = touchEndY - touchStartY

        // Only activate if pulling down
        if (distance > 0 && distance < pullThreshold * 1.5) {
          pullToRefresh.classList.add("visible")
          pullToRefresh.style.transform = `translateY(${Math.min(distance, pullThreshold)}px)`

          // Update text based on pull distance
          const refreshText = pullToRefresh.querySelector(".refresh-text")
          if (refreshText) {
            refreshText.textContent = distance > pullThreshold ? "Suelta para actualizar" : "Desliza para actualizar"
          }
        }
      },
      { passive: true },
    )

    document.addEventListener(
      "touchend",
      () => {
        if (!pullStarted || isRefreshing) return

        const distance = touchEndY - touchStartY

        if (distance > pullThreshold) {
          // Trigger refresh
          isRefreshing = true
          pullToRefresh.classList.add("refreshing")

          // Update text
          const refreshText = pullToRefresh.querySelector(".refresh-text")
          if (refreshText) {
            refreshText.textContent = "Actualizando..."
          }

          // Refresh data
          fetchChannels().then(() => {
            // Reset after refresh
            setTimeout(() => {
              pullToRefresh.classList.remove("visible", "refreshing")
              pullToRefresh.style.transform = ""
              isRefreshing = false
              pullStarted = false
            }, 1000)
          })
        } else {
          // Reset without refreshing
          pullToRefresh.classList.remove("visible")
          pullToRefresh.style.transform = ""
          pullStarted = false
        }
      },
      { passive: true },
    )
  }

  // Setup scroll listener for scroll-to-top button
  function setupScrollListener() {
    if (!scrollToTop) return

    window.addEventListener("scroll", () => {
      // Show button when scrolled down 300px
      if (window.scrollY > 300) {
        scrollToTop.classList.add("visible")
      } else {
        scrollToTop.classList.remove("visible")
      }
    })
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

    // Add icon based on type
    let icon = "info-circle"
    if (type === "success") icon = "check-circle"
    if (type === "warning") icon = "exclamation-triangle"
    if (type === "error") icon = "times-circle"

    notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `

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

  // Actualizar el event listener de resize para mantener la vista de lista en móviles
  window.addEventListener("resize", () => {
    // Close filters panel on larger screens if window is resized
    if (window.innerWidth >= 768 && filtersPanel && filtersPanel.classList.contains("open")) {
      toggleFiltersPanel()
    }

    // Close search on mobile
    if (window.innerWidth >= 768 && searchContainer && searchContainer.classList.contains("active")) {
      searchContainer.classList.remove("active")
      if (searchToggle) searchToggle.classList.remove("active")
    }

    // Update view mode based on screen size - forzar lista en móviles
    if (window.innerWidth < 768) {
      isGridView = false
    }

    // Re-render channels if needed
    if (filteredChannels.length > 0) {
      renderChannels()
    }

    // Mostrar u ocultar controles de vista según el tamaño de pantalla
    if (document.getElementById("viewControls")) {
      document.getElementById("viewControls").style.display = window.innerWidth < 768 ? "none" : "flex"
    }

    // Update items per page based on screen size
    if (window.innerWidth < 768) {
      itemsPerPage = 10
    } else if (window.innerWidth < 1024) {
      itemsPerPage = 15
    } else {
      itemsPerPage = 20
    }

    // Re-render pagination and channels if needed
    if (filteredChannels.length > 0) {
      renderPagination()
      renderChannels()
    }
  })

  // Limpiar intervalos cuando se abandona la página
  window.addEventListener("beforeunload", () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }
  })
})

