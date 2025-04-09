document.addEventListener("DOMContentLoaded", () => {
  // Elementos del menú lateral
  const menuToggle = document.getElementById("menuToggle")
  const sideMenu = document.getElementById("sideMenu")
  const sideMenuOverlay = document.getElementById("sideMenuOverlay")
  const closeMenu = document.getElementById("closeMenu")
  const shareLink = document.getElementById("shareLink")
  const favoriteLink = document.getElementById("favoriteLink")

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
  const relatedChannelsContainer = document.getElementById("relatedChannelsContainer")
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
  const playerInstructions = document.getElementById("playerInstructions")
  const prevStreamButton = document.getElementById("prevStreamButton")
  const nextStreamButton = document.getElementById("nextStreamButton")

  // State
  // Variables de estado
  let channel = null
  let currentStreamIndex = 0
  let viewHistory = []
  let channels = []
  // Estado de conexión
  let isOffline = false
  let connectionCheckInterval = null
  let channelsCache = null
  let lastFetchTime = 0
  const controlsTimeout = null
  let touchStartX = 0
  let touchStartY = 0
  let lastTapTime = 0
  let isVideoPlaying = false
  let videoLoadingTimeout = null
  let shareUrl = ""
  let historyUpdateTimeout = null
  let streamChangeInProgress = false
  let streamErrorCount = 0
  let autoSwitchTimer = null
  const isFullscreen = false
  const streamQuality = "SD"

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

  // Event listeners para el menú lateral
  if (menuToggle) {
    menuToggle.addEventListener("click", toggleMobileMenu)
  }

  if (closeMenu) {
    closeMenu.addEventListener("click", closeMobileMenu)
  }

  if (sideMenuOverlay) {
    sideMenuOverlay.addEventListener("click", closeMobileMenu)
  }

  if (shareLink) {
    shareLink.addEventListener("click", (e) => {
      e.preventDefault()
      openShareModal()
      closeMobileMenu()
    })
  }

  if (favoriteLink) {
    favoriteLink.addEventListener("click", (e) => {
      e.preventDefault()
      toggleFavorite()
      closeMobileMenu()
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

  // Eventos para enlaces del footer
  const footerFavorites = document.getElementById("footer-favorites")
  const footerRecent = document.getElementById("footer-recent")

  if (footerFavorites) {
    footerFavorites.addEventListener("click", (e) => {
      e.preventDefault()
      window.location.href = "index.html?favorites=true"
    })
  }

  if (footerRecent) {
    footerRecent.addEventListener("click", (e) => {
      e.preventDefault()
      window.location.href = "index.html"
    })
  }

  // Añadir categorías al footer
  renderFooterCategories()

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

    // Mostrar el indicador de swipe
    setTimeout(showSwipeIndicator, 2000)
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

  // Modificar la función loadStream para eliminar la referencia al indicador de calidad
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

    // Update active button with smooth transition
    const buttons = document.querySelectorAll(".stream-option-btn")
    buttons.forEach((btn) => {
      btn.classList.remove("active")
      btn.setAttribute("aria-pressed", "false")
    })

    // Pequeño delay para la animación
    setTimeout(() => {
      const activeButton = document.querySelector(`.stream-option-btn[data-index="${index}"]`)
      if (activeButton) {
        activeButton.classList.add("active")
        activeButton.setAttribute("aria-pressed", "true")

        // Hacer scroll hasta el botón activo si está fuera de vista
        if (activeButton.scrollIntoView) {
          activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
        }
      }
    }, 50)

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

    // Actualizar la URL con el índice de stream para permitir compartir
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("stream", index.toString())
      window.history.replaceState(null, "", url.toString())
      // Actualizar también el enlace para compartir
      shareUrl = url.toString()
      if (shareUrlInput) {
        shareUrlInput.value = shareUrl
      }
    } catch (e) {
      console.error("Error updating URL:", e)
    }

    loadExternalStream(streamOption.url)

    // Actualizar el título de la página para incluir la opción de stream
    document.title = `${channel.name} - ${streamOption.name} - Plan B`

    // Restablecer el estado de cambio de stream después de un tiempo
    setTimeout(() => {
      streamChangeInProgress = false
    }, 1500)

    // Actualizar controles móviles
    updateMobileControlsState()
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
    // Siempre usar iframe para streams externos
    videoElement.style.display = "none"
    videoIframe.style.display = "block"

    // Mostrar indicador de carga
    showIframeLoading()

    // Limpiar cualquier timeout existente
    if (videoLoadingTimeout) {
      clearTimeout(videoLoadingTimeout)
    }

    // Guardar la URL actual para poder recargar si es necesario
    videoIframe.setAttribute("data-current-url", url)

    // Crear un timestamp para evitar la caché
    const timestamp = new Date().getTime()
    const urlWithTimestamp = url.includes("?") ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`

    // Establecer origen del iframe
    videoIframe.src = urlWithTimestamp

    // Manejar evento de carga del iframe
    videoIframe.onload = () => {
      hideIframeLoading()
      isVideoPlaying = true

      // Reiniciar contador de errores al cargar correctamente
      streamErrorCount = 0

      // Ocultar mensaje de error si estaba visible
      if (errorMessage.style.display === "block") {
        errorMessage.style.display = "none"

        // Eliminar botón de cancelar si existe
        const cancelButton = errorMessage.querySelector("button")
        if (cancelButton) {
          cancelButton.remove()
        }
      }

      // Mostrar una notificación de éxito
      showNotification("Stream cargado correctamente", "success")
    }

    // Manejar error del iframe
    videoIframe.onerror = () => {
      handleStreamError()
    }

    // Establecer un timeout para detectar si el stream no carga correctamente
    videoLoadingTimeout = setTimeout(() => {
      if (document.getElementById("iframeLoading")) {
        handleStreamError()
      }
    }, 12000) // 12 segundos de timeout

    // Añadir botón de recarga al indicador de carga
    const loadingDiv = document.getElementById("iframeLoading")
    if (loadingDiv) {
      // Eliminar botón anterior si existe
      const existingButton = loadingDiv.querySelector("button")
      if (existingButton) {
        existingButton.remove()
      }

      const reloadButton = document.createElement("button")
      reloadButton.className = "secondary-button"
      reloadButton.style.marginTop = "1rem"
      reloadButton.innerHTML = '<i class="fas fa-sync-alt"></i> Reintentar'
      reloadButton.addEventListener("click", () => {
        // Recargar el stream actual
        const currentUrl = videoIframe.getAttribute("data-current-url")
        if (currentUrl) {
          loadExternalStream(currentUrl)
        }
      })

      loadingDiv.appendChild(reloadButton)
    }

    // Añadir controles táctiles mejorados para dispositivos móviles
    enhanceMobileTouchControls()
  }

  function handleStreamError() {
    streamErrorCount++
    hideIframeLoading()
    isVideoPlaying = false

    // Mostrar mensaje de error
    errorMessage.style.display = "block"

    // Marcar esta opción como no funcionante en la interfaz
    const currentStreamButton = document.querySelector(`.stream-option-btn[data-index="${currentStreamIndex}"]`)
    if (currentStreamButton) {
      currentStreamButton.classList.remove("working")
      currentStreamButton.classList.add("not-working")
    }

    // Si es el primer error para este stream, intentar cambiar automáticamente
    if (streamErrorCount === 1 && channel.streamOptions.length > 1) {
      // Buscar la siguiente opción que esté marcada como funcionante
      let nextWorkingIndex = -1

      // Empezar a buscar desde el índice actual + 1
      for (let i = 1; i < channel.streamOptions.length; i++) {
        const nextIndex = (currentStreamIndex + i) % channel.streamOptions.length
        if (channel.streamOptions[nextIndex].isWorking) {
          nextWorkingIndex = nextIndex
          break
        }
      }

      // Si encontramos una opción funcionante, cambiar automáticamente después de un retraso
      if (nextWorkingIndex !== -1) {
        showNotification(
          `Cambiando automáticamente a ${channel.streamOptions[nextWorkingIndex].name} en 5 segundos...`,
          "warning",
        )

        autoSwitchTimer = setTimeout(() => {
          loadStream(nextWorkingIndex)
        }, 5000)

        // Añadir botón para cancelar el cambio automático
        const cancelButton = document.createElement("button")
        cancelButton.className = "secondary-button"
        cancelButton.style.marginTop = "0.5rem"
        cancelButton.innerHTML = "Cancelar cambio automático"
        cancelButton.addEventListener("click", () => {
          if (autoSwitchTimer) {
            clearTimeout(autoSwitchTimer)
            autoSwitchTimer = null
            cancelButton.remove()
            showNotification("Cambio automático cancelado", "info")
          }
        })

        // Añadir el botón al mensaje de error
        errorMessage.appendChild(cancelButton)
      } else {
        showNotification("No se encontraron opciones alternativas que funcionen", "error")
      }
    } else if (streamErrorCount > 1) {
      showNotification("Esta transmisión no está funcionando correctamente. Intenta con otra opción.", "error")
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
    if (viewHistory.length > 6) {
      viewHistory = viewHistory.slice(0, 6)
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

  // Modificar la función renderViewHistory para mostrar la sección al final
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
    filteredHistory.slice(0, 10).forEach((item, index) => {
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

  // Función para abrir/cerrar el menú lateral
  function toggleMobileMenu() {
    menuToggle.classList.toggle("active")
    sideMenu.classList.toggle("active")
    sideMenuOverlay.classList.toggle("active")

    // Prevenir scroll cuando el menú está abierto
    if (sideMenu.classList.contains("active")) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }

  // Función para cerrar el menú lateral
  function closeMobileMenu() {
    menuToggle.classList.remove("active")
    sideMenu.classList.remove("active")
    sideMenuOverlay.classList.remove("active")
    document.body.style.overflow = ""
  }

  // Eliminar togglePictureInPicture
  // Eliminar toggleFullscreen
  // Eliminar updateFullscreenButton
  // Eliminar showControls

  // Eliminar referencias a los eventos de teclado para controles eliminados
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
    // Verificar si el navegador soporta la API Web Share
    if (navigator.share && (platform === "native" || platform === "auto")) {
      try {
        navigator
          .share({
            title: `${channel.name} - Plan B`,
            text: `Mira ${channel.name} en vivo en Plan B`,
            url: shareUrl,
          })
          .then(() => {
            showNotification("¡Contenido compartido con éxito!", "success")
            closeShareModalFunc()
          })
          .catch((error) => {
            console.log("Error al compartir:", error)
            // Si falla, usar el método tradicional
            shareViaTraditional(platform === "auto" ? detectBestPlatform() : "whatsapp")
          })
        return
      } catch (err) {
        console.error("Error con Web Share API:", err)
      }
    }

    // Método tradicional si Web Share API no está disponible
    shareViaTraditional(platform)
  }

  function shareViaTraditional(platform) {
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
      default:
        // Si no se especifica plataforma, intentar detectar la mejor opción
        return shareViaTraditional(detectBestPlatform())
    }

    if (shareLink) {
      window.open(shareLink, "_blank")
    }

    // Cerrar modal después de compartir
    closeShareModalFunc()
  }

  function detectBestPlatform() {
    // Detectar la plataforma más probable basada en el agente de usuario
    const userAgent = navigator.userAgent.toLowerCase()

    if (/whatsapp/.test(userAgent)) return "whatsapp"
    if (/telegram/.test(userAgent)) return "telegram"
    if (/facebook|fb|fbav/.test(userAgent)) return "facebook"
    if (/twitter/.test(userAgent)) return "twitter"

    // Por defecto, WhatsApp es la opción más popular
    return "whatsapp"
  }

  // Función para verificar la conexión a internet de forma activa
  function checkInternetConnection() {
    return new Promise((resolve) => {
      // Usar un timeout para evitar esperas largas
      const timeoutId = setTimeout(() => {
        isOffline = true
        updateConnectionStatus(false)
        resolve(false)
      }, 5000)

      // Intentar cargar un recurso pequeño de Google
      fetch("https://www.google.com/favicon.ico", {
        mode: "no-cors",
        cache: "no-store",
        method: "HEAD",
      })
        .then(() => {
          clearTimeout(timeoutId)
          if (isOffline) {
            isOffline = false
            updateConnectionStatus(true)
          }
          resolve(true)
        })
        .catch(() => {
          clearTimeout(timeoutId)
          isOffline = true
          updateConnectionStatus(false)
          resolve(false)
        })
    })
  }

  function updateConnectionStatus(isOnline) {
    if (isOnline) {
      if (offlineNotification) {
        offlineNotification.classList.remove("visible")
      }

      if (connectionStatus) {
        connectionStatus.classList.remove("offline")
        connectionStatus.title = "Conectado a internet"
        const wifiIcon = connectionStatus.querySelector(".fa-wifi")
        const wifiSlashIcon = connectionStatus.querySelector(".fa-wifi-slash")
        if (wifiIcon) wifiIcon.style.display = "block"
        if (wifiSlashIcon) wifiSlashIcon.style.display = "none"
      }

      // Solo mostrar notificación si cambiamos de estado
      if (document.body.getAttribute("data-was-offline") === "true") {
        showNotification("Conexión restablecida", "success")
        document.body.setAttribute("data-was-offline", "false")

        // Recargar el stream actual si estábamos offline
        if (channel && channel.streamOptions && channel.streamOptions[currentStreamIndex]) {
          loadStream(currentStreamIndex)
        }
      }
    } else {
      if (offlineNotification) {
        offlineNotification.classList.add("visible")
      }

      if (connectionStatus) {
        connectionStatus.classList.add("offline")
        connectionStatus.title = "Sin conexión a internet"
        const wifiIcon = connectionStatus.querySelector(".fa-wifi")
        const wifiSlashIcon = connectionStatus.querySelector(".fa-wifi-slash")
        if (wifiIcon) wifiIcon.style.display = "none"
        if (wifiSlashIcon) wifiSlashIcon.style.display = "block"
      }

      // Solo mostrar notificación si cambiamos de estado
      if (document.body.getAttribute("data-was-offline") !== "true") {
        showNotification("Sin conexión a internet. La transmisión puede no funcionar correctamente.", "warning")
        document.body.setAttribute("data-was-offline", "true")
      }
    }
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

      // Detect double tap
      const currentTime = new Date().getTime()
      const tapLength = currentTime - lastTapTime

      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
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

    // Cerrar menú móvil al cambiar el tamaño de la ventana
    closeMobileMenu()
  })

  // Limpiar intervalos cuando se abandona la página
  window.addEventListener("beforeunload", () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }

    // Guardar historial antes de salir
    saveViewHistory()
  })

  // Mejorar la experiencia táctil en dispositivos móviles
  function enhanceMobileExperience() {
    // Detectar si es un dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (isMobile) {
      // Añadir clase al body para estilos específicos de móvil
      document.body.classList.add("is-mobile-device")

      // Mejorar la interacción táctil con el reproductor
      if (videoContainer) {
        // Prevenir zoom en doble toque en iOS
        videoContainer.style.touchAction = "manipulation"

        // Añadir evento para mostrar controles al tocar
        videoContainer.addEventListener("touchstart", () => {}, { passive: true })

        // Mejorar la detección de doble toque
        let lastTap = 0
        videoContainer.addEventListener("touchend", (e) => {
          const currentTime = new Date().getTime()
          const tapLength = currentTime - lastTap

          if (tapLength < 300 && tapLength > 0) {
            // Prevenir comportamiento por defecto
            e.preventDefault()

            // Ejecutar acción de doble toque (pantalla completa)
          }

          lastTap = currentTime
        })
      }

      // Optimizar para pantallas pequeñas
      adjustLayoutForMobile()
    }
  }

  function adjustLayoutForMobile() {
    // Ajustar layout para pantallas pequeñas
    if (window.innerWidth < 768) {
      // Mover el historial debajo de las opciones de stream en móvil
      const historySection = document.getElementById("historySection")
      const streamOptions = document.getElementById("streamOptions")

      if (historySection && streamOptions && historySection.parentNode) {
        // Mover el historial después de las opciones de stream
        streamOptions.parentNode.insertBefore(historySection, streamOptions.nextSibling)
      }

      // Ajustar tamaño de fuente para mejor legibilidad
      document.documentElement.style.fontSize = "14px"
    }
  }

  // Llamar a la función al final del evento DOMContentLoaded
  enhanceMobileExperience()

  function enhanceMobileTouchControls() {
    // Verificar si ya existen los controles
    if (document.querySelector(".mobile-controls")) {
      return
    }

    if (isMobileDevice()) {
      // Crear contenedor de controles
      const controlsContainer = document.createElement("div")
      controlsContainer.className = "mobile-controls"

      // Crear botón anterior
      const prevButton = document.createElement("button")
      prevButton.className = "mobile-control-button"
      prevButton.innerHTML = '<i class="fas fa-step-backward"></i>'
      prevButton.setAttribute("aria-label", "Stream anterior")
      prevButton.addEventListener("click", loadPreviousStream)

      // Crear botón siguiente
      const nextButton = document.createElement("button")
      nextButton.className = "mobile-control-button"
      nextButton.innerHTML = '<i class="fas fa-step-forward"></i>'
      nextButton.setAttribute("aria-label", "Stream siguiente")
      nextButton.addEventListener("click", loadNextStream)

      // Añadir botones al contenedor
      controlsContainer.appendChild(prevButton)
      controlsContainer.appendChild(nextButton)

      // Añadir contenedor al reproductor
      videoContainer.appendChild(controlsContainer)

      // Actualizar estado de botones
      if (channel.streamOptions.length <= 1) {
        prevButton.classList.add("disabled")
        nextButton.classList.add("disabled")
      }
    }
  }

  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    )
  }

  function showSwipeIndicator() {
    // Comprobar si ya existe un indicador
    if (document.querySelector(".swipe-indicator")) return

    // Solo mostrar en dispositivos móviles
    if (!isMobileDevice()) return

    // Crear el indicador
    const indicator = document.createElement("div")
    indicator.className = "swipe-indicator"
    indicator.innerHTML = `
    <div class="swipe-content">
      <i class="fas fa-arrows-alt-h"></i>
      <span>Desliza para cambiar de transmisión</span>
    </div>
  `

    // Añadir al reproductor
    videoContainer.appendChild(indicator)

    // Mostrar con animación
    setTimeout(() => {
      indicator.classList.add("visible")

      // Ocultar después de unos segundos
      setTimeout(() => {
        indicator.classList.remove("visible")
        setTimeout(() => {
          indicator.remove()
        }, 500)
      }, 3000)
    }, 1000)
  }
})

// Función para renderizar categorías en el footer
function renderFooterCategories() {
  const footerCategories = document.getElementById("footerCategories")
  if (!footerCategories || !channels || channels.length === 0) return

  footerCategories.innerHTML = ""

  // Extraer categorías únicas
  const allCategories = [...new Set(channels.map((ch) => ch.category))]

  // Mostrar solo las 6 primeras
  allCategories.slice(0, 6).forEach((category) => {
    const link = document.createElement("a")
    link.href = `index.html?category=${encodeURIComponent(category)}`
    link.textContent = category
    footerCategories.appendChild(link)
  })
}
