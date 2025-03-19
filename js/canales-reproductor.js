document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const themeToggle = document.getElementById("themeToggle")
  const moonIcon = document.getElementById("moonIcon")
  const sunIcon = document.getElementById("sunIcon")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const playerContent = document.getElementById("playerContent")
  const channelNotFound = document.getElementById("channelNotFound")
  const backButton = document.getElementById("backButton")
  const notFoundBackButton = document.getElementById("notFoundBackButton")
  const videoContainer = document.getElementById("videoContainer")
  const videoElement = document.getElementById("videoElement")
  const videoIframe = document.getElementById("videoIframe")
  const videoSource = document.getElementById("videoSource")
  const streamOptions = document.getElementById("streamOptions")
  const channelInfoCard = document.getElementById("channelInfoCard")
  const favoriteButton = document.getElementById("favoriteButton")
  const errorMessage = document.getElementById("errorMessage")
  const historySection = document.getElementById("historySection")
  const historyList = document.getElementById("historyList")
  const pipButton = document.getElementById("pipButton")
  const fullscreenButton = document.getElementById("fullscreenButton")
  const mobilePipButton = document.getElementById("mobilePipButton")
  const mobileFullscreenButton = document.getElementById("mobileFullscreenButton")
  const prevStreamButton = document.getElementById("prevStreamButton")
  const nextStreamButton = document.getElementById("nextStreamButton")
  const relatedChannelsContainer = document.getElementById("relatedChannelsContainer")
  const playerControlsOverlay = document.getElementById("playerControlsOverlay")
  const mobilePlayerControls = document.getElementById("mobilePlayerControls")
  const streamQualityIndicator = document.getElementById("streamQualityIndicator")
  const playerInstructions = document.getElementById("playerInstructions")
  const shareButton = document.getElementById("shareButton")
  const shareModal = document.getElementById("shareModal")
  const closeShareModal = document.getElementById("closeShareModal")
  const shareUrlInput = document.getElementById("shareUrlInput")
  const copyShareUrl = document.getElementById("copyShareUrl")
  const shareWhatsapp = document.getElementById("shareWhatsapp")
  const shareTelegram = document.getElementById("shareTelegram")
  const shareFacebook = document.getElementById("shareFacebook")
  const shareTwitter = document.getElementById("shareTwitter")
  const scrollToTop = document.getElementById("scrollToTop")
  const offlineNotification = document.getElementById("offlineNotification")
  const connectionStatus = document.getElementById("connectionStatus")

  // State
  let channel = null
  let currentStreamIndex = 0
  let viewHistory = []
  let channels = []
  let isFullscreen = false
  let streamErrorCount = 0
  let autoSwitchTimer = null
  // Estado de conexión
  let isOffline = false
  let connectionCheckInterval = null
  let channelsCache = null
  let lastFetchTime = 0
  let controlsTimeout = null
  let touchStartX = 0
  let touchStartY = 0
  let lastTapTime = 0
  let isVideoPlaying = false
  let videoLoadingTimeout = null
  let streamQuality = "SD"
  let shareUrl = ""
  let historyUpdateTimeout = null
  let streamChangeInProgress = false

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
  backButton.addEventListener("click", goBack)
  notFoundBackButton.addEventListener("click", goBack)

  if (pipButton) {
    pipButton.addEventListener("click", togglePictureInPicture)
  }

  if (mobilePipButton) {
    mobilePipButton.addEventListener("click", togglePictureInPicture)
  }

  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", toggleFullscreen)
  }

  if (mobileFullscreenButton) {
    mobileFullscreenButton.addEventListener("click", toggleFullscreen)
  }

  if (prevStreamButton) {
    prevStreamButton.addEventListener("click", loadPreviousStream)
  }

  if (nextStreamButton) {
    nextStreamButton.addEventListener("click", loadNextStream)
  }

  if (shareButton) {
    shareButton.addEventListener("click", openShareModal)
  }

  if (closeShareModal) {
    closeShareModal.addEventListener("click", closeShareModalFunc)
  }

  if (copyShareUrl) {
    copyShareUrl.addEventListener("click", copyShareUrlToClipboard)
  }

  if (shareWhatsapp) {
    shareWhatsapp.addEventListener("click", () => shareVia("whatsapp"))
  }

  if (shareTelegram) {
    shareTelegram.addEventListener("click", () => shareVia("telegram"))
  }

  if (shareFacebook) {
    shareFacebook.addEventListener("click", () => shareVia("facebook"))
  }

  if (shareTwitter) {
    shareTwitter.addEventListener("click", () => shareVia("twitter"))
  }

  if (scrollToTop) {
    scrollToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })
  }

  // Close share modal when clicking outside
  window.addEventListener("click", (e) => {
    if (
      shareModal &&
      shareModal.style.display === "flex" &&
      !e.target.closest(".share-modal-content") &&
      !e.target.closest(".share-button")
    ) {
      closeShareModalFunc()
    }
  })

  // Setup keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)

  // Initialize
  const urlParams = new URLSearchParams(window.location.search)
  const channelId = urlParams.get("id")

  if (channelId) {
    fetchChannel(channelId)

    // Set share URL
    shareUrl = window.location.href
    if (shareUrlInput) {
      shareUrlInput.value = shareUrl
    }
  } else {
    showChannelNotFound()
  }

  // Setup network status listeners
  setupNetworkStatusListeners()
  setupScrollListener()

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

  function goBack() {
    window.location.href = "index.html"
  }

  async function fetchChannel(id) {
    try {
      // Show loading spinner
      loadingSpinner.style.display = "flex"

      // Check if we have cached data and it's less than 5 minutes old
      const now = Date.now()
      if (channelsCache && now - lastFetchTime < 300000 && !isOffline) {
        channels = channelsCache
        processChannel(id)
        return
      }

      // Try to get from cache if offline
      if (isOffline) {
        const cachedData = localStorage.getItem("channelsCache")
        if (cachedData) {
          channels = JSON.parse(cachedData)
          processChannel(id)
          showNotification("Usando datos almacenados en caché", "warning")
          return
        }
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

        processChannel(id)
      } catch (fetchError) {
        // If fetch fails, try to load from localStorage
        const cachedData = localStorage.getItem("channelsCache")
        if (cachedData) {
          channels = JSON.parse(cachedData)
          processChannel(id)
          showNotification("Error al actualizar datos. Usando caché.", "warning")
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error("Error fetching channel:", error)
      showChannelNotFound()
    }
  }

  function processChannel(id) {
    // Load favorites from localStorage
    loadFavoritesFromLocalStorage()

    // Find the requested channel
    channel = channels.find((ch) => ch.id === id)

    if (channel) {
      // Add to view history
      addToViewHistory(channel.id)

      renderChannel()
      renderViewHistory()

      // Hide loading spinner
      loadingSpinner.style.display = "none"
    } else {
      showChannelNotFound()
    }
  }

  function renderChannel() {
    // Set page title
    document.title = `${channel.name} - Plan B`

    // Update favorite button
    updateFavoriteButton()

    // Render stream options
    renderStreamOptions()

    // Render related channels if available
    renderRelatedChannels()

    // Load the first stream option by default
    if (channel.streamOptions && channel.streamOptions.length > 0) {
      // Find first working stream if available
      const workingStreamIndex = channel.streamOptions.findIndex((option) => option.isWorking)
      if (workingStreamIndex !== -1) {
        loadStream(workingStreamIndex)
      } else {
        loadStream(0)
      }
    }

    // Set channel info card
    channelInfoCard.innerHTML = `
    <h1>${channel.name}</h1>
    <div class="channel-tags">
      <span class="channel-category">${channel.category}</span>
      <span class="channel-status">
        <i class="fas fa-circle"></i>
        En vivo
      </span>
    </div>
    <p class="channel-description">${channel.description || "Disfruta de la transmisión en vivo de este canal."}</p>
    <div class="channel-meta-info">
  `

    // Show player content
    playerContent.style.display = "block"

    // Add keyboard shortcuts info
    if (playerInstructions) {
      playerInstructions.style.display = "block"

      // Hide instructions after 10 seconds
      setTimeout(() => {
        playerInstructions.classList.add("fade-out")
        setTimeout(() => {
          playerInstructions.style.display = "none"
          playerInstructions.classList.remove("fade-out")
        }, 500)
      }, 10000)
    }
  }

  function formatLastUpdated(dateString) {
    if (!dateString) return "Desconocido"

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return "Desconocido"
    }
  }

  function renderStreamOptions() {
    streamOptions.innerHTML = ""

    if (!channel.streamOptions || channel.streamOptions.length === 0) {
      return
    }

    // Create main options section
    const mainOptionsSection = document.createElement("div")
    mainOptionsSection.innerHTML = "<h3>Opciones de Transmisión:</h3>"

    const mainOptionsContainer = document.createElement("div")
    mainOptionsContainer.className = "options-container"

    channel.streamOptions.forEach((option, index) => {
      const button = document.createElement("button")
      button.className = `stream-option-btn ${index === currentStreamIndex ? "active" : ""} ${option.isWorking ? "working" : "not-working"}`
      button.textContent = option.name
      button.setAttribute(
        "aria-label",
        `${option.name} ${option.isWorking ? "(Funcionando)" : "(Puede tener problemas)"}`,
      )
      button.setAttribute("data-index", index.toString())

      // Add response time indicator if available
      if (option.responseTime) {
        const responseQuality = getResponseQuality(option.responseTime)
        const responseIcon = document.createElement("span")
        responseIcon.className = `response-indicator ${responseQuality}`
        responseIcon.innerHTML = `<i class="fas fa-circle"></i>`
        responseIcon.title = `Tiempo de respuesta: ${Math.round(option.responseTime)}ms`
        button.appendChild(responseIcon)
      }

      button.addEventListener("click", () => {
        if (streamChangeInProgress) return
        loadStream(index)
      })
      mainOptionsContainer.appendChild(button)
    })

    mainOptionsSection.appendChild(mainOptionsContainer)
    streamOptions.appendChild(mainOptionsSection)
  }

  function getResponseQuality(responseTime) {
    if (responseTime < 700) return "excellent"
    if (responseTime < 1000) return "good"
    if (responseTime < 1500) return "average"
    return "poor"
  }

  function renderRelatedChannels() {
    if (!channel.relatedChannels || channel.relatedChannels.length === 0) {
      relatedChannelsContainer.style.display = "none"
      return
    }

    relatedChannelsContainer.style.display = "block"
    relatedChannelsContainer.innerHTML = "<h3>Canales Relacionados:</h3>"

    const relatedContainer = document.createElement("div")
    relatedContainer.className = "options-container"

    channel.relatedChannels.forEach((relatedChannel) => {
      const button = document.createElement("button")
      button.className = "stream-option-btn"
      button.textContent = relatedChannel.name
      button.addEventListener("click", () => {
        if (streamChangeInProgress) return
        loadExternalStream(relatedChannel.url)
        showNotification(`Cambiando a ${relatedChannel.name}`, "info")
      })
      relatedContainer.appendChild(button)
    })

    relatedChannelsContainer.appendChild(relatedContainer)
  }

  function loadStream(index) {
    if (!channel.streamOptions || !channel.streamOptions[index] || streamChangeInProgress) {
      return
    }

    // Establecer que hay un cambio de stream en progreso
    streamChangeInProgress = true

    // Clear any existing auto-switch timer
    if (autoSwitchTimer) {
      clearTimeout(autoSwitchTimer)
      autoSwitchTimer = null
    }

    currentStreamIndex = index

    // Update active button
    const buttons = document.querySelectorAll(".stream-option-btn")
    buttons.forEach((btn) => {
      const btnIndex = Number.parseInt(btn.getAttribute("data-index") || "-1")
      if (btnIndex === index) {
        btn.classList.add("active")
      } else {
        btn.classList.remove("active")
      }
    })

    const streamOption = channel.streamOptions[index]

    // Hide error message by default
    errorMessage.style.display = "none"

    // Show warning for options marked as not working
    if (!streamOption.isWorking) {
      errorMessage.style.display = "block"

      // Reset error count for new stream
      streamErrorCount = 0
    }

    // Show channel switching animation
    showChannelSwitchAnimation()

    // Set stream quality based on name (if it contains HD)
    streamQuality = streamOption.name.toLowerCase().includes("hd") ? "HD" : "SD"
    updateStreamQualityIndicator()

    loadExternalStream(streamOption.url)

    // Update mobile controls state
    updateMobileControlsState()

    // Restablecer el estado de cambio de stream después de un tiempo
    setTimeout(() => {
      streamChangeInProgress = false
    }, 1500)
  }

  function loadPreviousStream() {
    if (!channel.streamOptions || channel.streamOptions.length <= 1 || streamChangeInProgress) return

    const prevIndex = (currentStreamIndex - 1 + channel.streamOptions.length) % channel.streamOptions.length
    loadStream(prevIndex)
    showNotification("Opción anterior", "info")
  }

  function loadNextStream() {
    if (!channel.streamOptions || channel.streamOptions.length <= 1 || streamChangeInProgress) return

    const nextIndex = (currentStreamIndex + 1) % channel.streamOptions.length
    loadStream(nextIndex)
    showNotification("Siguiente opción", "info")
  }

  function updateMobileControlsState() {
    if (!prevStreamButton || !nextStreamButton) return

    // Disable buttons if only one stream option
    if (channel.streamOptions.length <= 1) {
      prevStreamButton.disabled = true
      nextStreamButton.disabled = true
      prevStreamButton.classList.add("disabled")
      nextStreamButton.classList.add("disabled")
    } else {
      prevStreamButton.disabled = false
      nextStreamButton.disabled = false
      prevStreamButton.classList.remove("disabled")
      nextStreamButton.classList.remove("disabled")
    }
  }

  function updateStreamQualityIndicator() {
    // Update quality badge
    if (streamQualityIndicator) {
      const qualityBadge = streamQualityIndicator.querySelector(".quality-badge")
      if (qualityBadge) {
        qualityBadge.textContent = streamQuality
        qualityBadge.className = `quality-badge ${streamQuality.toLowerCase()}`
      }
    }

    // Update quality in channel info
    const qualityIndicator = document.getElementById("qualityIndicator")
    if (qualityIndicator) {
      qualityIndicator.textContent = streamQuality
      qualityIndicator.className = streamQuality.toLowerCase()
    }
  }

  function showChannelSwitchAnimation() {
    // Remove any existing animation
    const existingAnimation = document.querySelector(".channel-switch-animation")
    if (existingAnimation) {
      existingAnimation.remove()
    }

    // Create animation element
    const animationElement = document.createElement("div")
    animationElement.className = "channel-switch-animation"

    // Add channel logo if available
    if (channel.logo) {
      const logoImg = document.createElement("img")
      logoImg.src = channel.logo
      logoImg.alt = channel.name
      logoImg.className = "channel-logo"
      animationElement.appendChild(logoImg)
    }

    // Add channel name
    const channelName = document.createElement("h3")
    channelName.textContent = channel.name
    animationElement.appendChild(channelName)

    // Add stream option name
    if (channel.streamOptions && channel.streamOptions[currentStreamIndex]) {
      const optionName = document.createElement("p")
      optionName.textContent = channel.streamOptions[currentStreamIndex].name
      animationElement.appendChild(optionName)
    }

    // Add to video container
    videoContainer.appendChild(animationElement)

    // Remove after animation completes
    setTimeout(() => {
      if (animationElement.parentNode) {
        animationElement.remove()
      }
    }, 1500)
  }

  function loadExternalStream(url) {
    // Always use iframe for external streams
    videoElement.style.display = "none"
    videoIframe.style.display = "block"

    // Show loading indicator
    showIframeLoading()

    // Clear any existing timeout
    if (videoLoadingTimeout) {
      clearTimeout(videoLoadingTimeout)
    }

    // Set iframe source
    videoIframe.src = url

    // Handle iframe load event
    videoIframe.onload = () => {
      hideIframeLoading()
      isVideoPlaying = true
    }

    // Handle iframe error
    videoIframe.onerror = () => {
      handleStreamError()
    }

    // Set a timeout to detect if stream doesn't load properly
    videoLoadingTimeout = setTimeout(() => {
      if (document.getElementById("iframeLoading")) {
        handleStreamError()
      }
    }, 15000) // 15 seconds timeout
  }

  function handleStreamError() {
    streamErrorCount++
    hideIframeLoading()
    isVideoPlaying = false

    // Show error message
    errorMessage.style.display = "block"

    // If this is the first error for this stream, try to auto-switch to next working stream
    if (streamErrorCount === 1 && channel.streamOptions.length > 1) {
      // Find next working stream
      let nextWorkingIndex = -1

      // Start searching from current index + 1
      for (let i = 1; i < channel.streamOptions.length; i++) {
        const nextIndex = (currentStreamIndex + i) % channel.streamOptions.length
        if (channel.streamOptions[nextIndex].isWorking) {
          nextWorkingIndex = nextIndex
          break
        }
      }

      // If found a working stream, switch to it automatically after a delay
      if (nextWorkingIndex !== -1) {
        showNotification("Cambiando automáticamente a otra opción en 5 segundos...", "warning")

        autoSwitchTimer = setTimeout(() => {
          loadStream(nextWorkingIndex)
        }, 5000)
      } else {
        showNotification("No se encontraron opciones alternativas que funcionen", "error")
      }
    } else if (streamErrorCount > 1) {
      showNotification("Esta transmisión no está funcionando correctamente", "error")
    }
  }

  function showIframeLoading() {
    const existingLoader = document.getElementById("iframeLoading")
    if (!existingLoader) {
      const loadingDiv = document.createElement("div")
      loadingDiv.className = "iframe-loading"
      loadingDiv.id = "iframeLoading"
      loadingDiv.innerHTML = `
      <div class="spinner"></div>
      <p>Cargando transmisión...</p>
    `
      videoContainer.appendChild(loadingDiv)
    }
  }

  function hideIframeLoading() {
    const loadingDiv = document.getElementById("iframeLoading")
    if (loadingDiv) {
      loadingDiv.remove()
    }
  }

  function showChannelNotFound() {
    channelNotFound.style.display = "block"
    loadingSpinner.style.display = "none"
  }

  function updateFavoriteButton() {
    if (!favoriteButton) return

    const isFavorite = channel.favorite || false

    if (isFavorite) {
      favoriteButton.innerHTML = '<i class="fas fa-heart"></i> Quitar de favoritos'
      favoriteButton.classList.add("active")
    } else {
      favoriteButton.innerHTML = '<i class="far fa-heart"></i> Añadir a favoritos'
      favoriteButton.classList.remove("active")
    }

    favoriteButton.addEventListener("click", toggleFavorite)
  }

  function toggleFavorite() {
    // Toggle favorite status
    channel.favorite = !channel.favorite

    // Update UI
    updateFavoriteButton()

    // Update in channels array
    const channelIndex = channels.findIndex((ch) => ch.id === channel.id)
    if (channelIndex !== -1) {
      channels[channelIndex].favorite = channel.favorite
    }

    // Save to localStorage
    saveChannelsToLocalStorage()

    // Show notification
    if (channel.favorite) {
      showNotification(`${channel.name} añadido a favoritos`, "success")
    } else {
      showNotification(`${channel.name} eliminado de favoritos`, "info")
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

  function addToViewHistory(channelId) {
    // Cancelar cualquier actualización pendiente
    if (historyUpdateTimeout) {
      clearTimeout(historyUpdateTimeout)
    }

    const channelToAdd = channels.find((ch) => ch.id === channelId)

    if (!channelToAdd) return

    // Create history entry
    const historyEntry = {
      id: channelToAdd.id,
      name: channelToAdd.name,
      logo: channelToAdd.logo,
      category: channelToAdd.category,
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

    // Retrasar la actualización para evitar múltiples escrituras
    historyUpdateTimeout = setTimeout(() => {
      // Save to localStorage
      saveViewHistory()
    }, 1000)
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

        // Validar la estructura de los datos
        viewHistory = viewHistory.filter(
          (item) => item && typeof item === "object" && item.id && item.name && item.timestamp,
        )
      } catch (error) {
        console.error("Error loading view history from localStorage:", error)
        viewHistory = []
      }
    }
  }

  function renderViewHistory() {
    if (!historySection || !historyList) {
      return
    }

    // Filtrar el historial para eliminar el canal actual
    const filteredHistory = viewHistory.filter((item) => item.id !== channel.id)

    // Ocultar la sección si no hay historial o solo hay un elemento (el actual)
    if (filteredHistory.length === 0) {
      historySection.style.display = "none"
      return
    }

    // Mostrar la sección y limpiar la lista
    historySection.style.display = "block"
    historyList.innerHTML = ""

    // Mostrar solo los primeros 5 elementos con animación escalonada
    filteredHistory.slice(0, 5).forEach((item, index) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      historyItem.style.animationDelay = `${index * 0.1}s`

      // Añadir atributos para accesibilidad
      historyItem.setAttribute("role", "button")
      historyItem.setAttribute("aria-label", `Ver canal ${item.name}`)
      historyItem.setAttribute("tabindex", "0")

      // Añadir eventos para mouse y teclado
      historyItem.addEventListener("click", () => navigateToChannel(item.id))
      historyItem.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          navigateToChannel(item.id)
        }
      })

      // Formatear tiempo transcurrido
      const timeAgo = getTimeAgo(new Date(item.timestamp))

      // Crear contenido del elemento
      historyItem.innerHTML = `
        <img src="${item.logo || "placeholder.svg"}" alt="${item.name}" class="history-item-logo" loading="lazy">
        <div class="history-item-info">
          <span class="history-item-name">${item.name}</span>
          <span class="history-item-time">${timeAgo}</span>
        </div>
      `

      historyList.appendChild(historyItem)
    })
  }

  // Función para navegar a otro canal
  function navigateToChannel(channelId) {
    // Guardar el estado actual antes de navegar
    addToViewHistory(channel.id)
    saveViewHistory()

    // Navegar al nuevo canal
    window.location.href = `canales-reproductor.html?id=${channelId}`
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

  // Picture-in-Picture functionality
  async function togglePictureInPicture() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        showNotification("Saliendo de Picture-in-Picture", "info")
      } else if (videoElement && videoElement.style.display !== "none") {
        // Only works with video element, not iframe
        await videoElement.requestPictureInPicture()
        showNotification("Picture-in-Picture activado", "success")
      } else {
        // Show notification that PiP is not available for iframes
        showNotification("Picture-in-Picture no está disponible para este tipo de reproductor", "warning")
      }
    } catch (error) {
      console.error("Error toggling picture-in-picture:", error)
      showNotification("No se pudo activar Picture-in-Picture", "error")
    }
  }

  // Fullscreen functionality
  function toggleFullscreen() {
    const container = videoContainer

    if (
      !document.fullscreenElement &&
      !document.mozFullScreenElement &&
      !document.webkitFullscreenElement &&
      !document.msFullscreenElement
    ) {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen()
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen()
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen()
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      }
      isFullscreen = true
      updateFullscreenButton(true)
      showNotification("Pantalla completa activada", "info")
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
      isFullscreen = false
      updateFullscreenButton(false)
      showNotification("Saliendo de pantalla completa", "info")
    }
  }

  // Listen for fullscreen change
  document.addEventListener("fullscreenchange", () => updateFullscreenButton(!!document.fullscreenElement))
  document.addEventListener("webkitfullscreenchange", () => updateFullscreenButton(!!document.webkitFullscreenElement))
  document.addEventListener("mozfullscreenchange", () => updateFullscreenButton(!!document.mozFullScreenElement))
  document.addEventListener("MSFullscreenChange", () => updateFullscreenButton(!!document.msFullscreenElement))

  function updateFullscreenButton(isFullscreen) {
    if (fullscreenButton) {
      fullscreenButton.innerHTML = isFullscreen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>'
    }

    if (mobileFullscreenButton) {
      mobileFullscreenButton.innerHTML = isFullscreen
        ? '<i class="fas fa-compress"></i>'
        : '<i class="fas fa-expand"></i>'
    }
  }

  // Handle keyboard shortcuts
  function handleKeyboardShortcuts(e) {
    // Only handle shortcuts if channel is loaded
    if (!channel) return

    switch (e.key.toLowerCase()) {
      case "arrowleft":
        // Previous stream option
        loadPreviousStream()
        break
      case "arrowright":
        // Next stream option
        loadNextStream()
        break
      case "f":
        // Toggle fullscreen
        toggleFullscreen()
        break
      case "p":
        // Toggle picture-in-picture
        togglePictureInPicture()
        break
      case "m":
        // Toggle mute (only works with video element)
        if (videoElement && videoElement.style.display !== "none") {
          videoElement.muted = !videoElement.muted
          showNotification(videoElement.muted ? "Sonido silenciado" : "Sonido activado", "info")
        }
        break
      case "escape":
        // Close share modal if open
        if (shareModal && shareModal.style.display === "flex") {
          closeShareModalFunc()
        }
        break
    }
  }

  // Share functionality
  function openShareModal() {
    if (!shareModal) return

    shareModal.style.display = "flex"

    // Set share URL
    if (shareUrlInput) {
      shareUrlInput.value = shareUrl
      shareUrlInput.select()
    }
  }

  function closeShareModalFunc() {
    if (!shareModal) return

    shareModal.style.display = "none"
  }

  function copyShareUrlToClipboard() {
    if (!shareUrlInput) return

    shareUrlInput.select()
    document.execCommand("copy")

    showNotification("Enlace copiado al portapapeles", "success")
  }

  function shareVia(platform) {
    let shareLink = ""
    const text = `Mira ${channel.name} en vivo en Plan B`

    switch (platform) {
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`
        break
      case "telegram":
        shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
        break
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
        break
    }

    if (shareLink) {
      window.open(shareLink, "_blank")
    }

    // Close modal after sharing
    closeShareModalFunc()
  }

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
        }
        return true
      })
      .catch(() => {
        if (!isOffline) {
          isOffline = true
          offlineNotification.classList.add("visible")
          showNotification("Sin conexión a internet. La transmisión puede no funcionar correctamente.", "warning")

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
      showNotification("Sin conexión a internet. La transmisión puede no funcionar correctamente.", "warning")
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

    if (offlineNotification && !offlineNotification.querySelector(".close-offline-notification")) {
      offlineNotification.appendChild(closeOfflineBtn)
    }
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

  // Add swipe gestures for mobile
  videoContainer.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY

      // Show controls
      showControls()

      // Detect double tap
      const currentTime = new Date().getTime()
      const tapLength = currentTime - lastTapTime

      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        toggleFullscreen()
        e.preventDefault()
      }

      lastTapTime = currentTime
    },
    { passive: false },
  )

  videoContainer.addEventListener(
    "touchend",
    (e) => {
      const touchEndX = e.changedTouches[0].screenX
      const touchEndY = e.changedTouches[0].screenY
      handleSwipe(touchEndX, touchEndY)
    },
    { passive: true },
  )

  function handleSwipe(touchEndX, touchEndY) {
    if (!touchStartX || !touchStartY || streamChangeInProgress) return

    const swipeThreshold = 100
    const diffX = touchEndX - touchStartX
    const diffY = touchEndY - touchStartY

    // Only handle horizontal swipes if they're more significant than vertical movement
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
      if (diffX < 0) {
        // Swipe left - next stream
        loadNextStream()
      } else {
        // Swipe right - previous stream
        loadPreviousStream()
      }
    }

    touchStartX = null
    touchStartY = null
  }

  // Show controls on touch for mobile
  function showControls() {
    if (playerControlsOverlay) {
      playerControlsOverlay.style.opacity = "1"
    }

    if (mobilePlayerControls) {
      mobilePlayerControls.style.opacity = "1"
    }

    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }

    // Hide controls after 3 seconds
    controlsTimeout = setTimeout(() => {
      if (playerControlsOverlay) {
        playerControlsOverlay.style.opacity = ""
      }

      if (mobilePlayerControls) {
        mobilePlayerControls.style.opacity = ""
      }
    }, 3000)
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

  // Handle window resize
  window.addEventListener("resize", () => {
    // Re-show controls on resize
    showControls()
  })

  // Limpiar intervalos cuando se abandona la página
  window.addEventListener("beforeunload", () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }

    // Guardar historial antes de salir
    saveViewHistory()
  })
})

