document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const menuButton = document.getElementById("menuButton")
  const mobileMenu = document.getElementById("mobileMenu")
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
  const relatedChannelsContainer = document.getElementById("relatedChannelsContainer")
  const playerControlsOverlay = document.getElementById("playerControlsOverlay")

  // State
  let channel = null
  let currentStreamIndex = 0
  let viewHistory = []
  let channels = []
  let isFullscreen = false
  let streamErrorCount = 0
  let autoSwitchTimer = null

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
  menuButton.addEventListener("click", toggleMobileMenu)
  themeToggle.addEventListener("click", toggleDarkMode)
  backButton.addEventListener("click", goBack)
  notFoundBackButton.addEventListener("click", goBack)

  if (pipButton) {
    pipButton.addEventListener("click", togglePictureInPicture)
  }

  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", toggleFullscreen)
  }

  // Initialize
  const urlParams = new URLSearchParams(window.location.search)
  const channelId = urlParams.get("id")

  if (channelId) {
    fetchChannel(channelId)
  } else {
    showChannelNotFound()
  }

  // Functions
  function toggleMobileMenu() {
    mobileMenu.classList.toggle("open")
  }

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

      // Fetch channels data
      const response = await fetch("data/canales-en-vivo.json")
      channels = await response.json()

      // Load favorites from localStorage
      loadFavoritesFromLocalStorage()

      // Find the requested channel
      channel = channels.find((ch) => ch.id === id)

      if (channel) {
        // Add to view history
        addToViewHistory(channel.id)

        renderChannel()
        renderViewHistory()
      } else {
        showChannelNotFound()
      }
    } catch (error) {
      console.error("Error fetching channel:", error)
      showChannelNotFound()
    } finally {
      loadingSpinner.style.display = "none"
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
        <span class="channel-status">En vivo</span>
      </div>
      <p class="channel-description">${channel.description || "Disfruta de la transmisión en vivo de este canal."}</p>
    `

    // Show player content
    playerContent.style.display = "block"
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
      button.addEventListener("click", () => loadStream(index))
      mainOptionsContainer.appendChild(button)
    })

    mainOptionsSection.appendChild(mainOptionsContainer)
    streamOptions.appendChild(mainOptionsSection)
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
        loadExternalStream(relatedChannel.url)
        showNotification(`Cambiando a ${relatedChannel.name}`, "info")
      })
      relatedContainer.appendChild(button)
    })

    relatedChannelsContainer.appendChild(relatedContainer)
  }

  function loadStream(index) {
    if (!channel.streamOptions || !channel.streamOptions[index]) {
      return
    }

    // Clear any existing auto-switch timer
    if (autoSwitchTimer) {
      clearTimeout(autoSwitchTimer)
      autoSwitchTimer = null
    }

    currentStreamIndex = index

    // Update active button
    const buttons = document.querySelectorAll(".stream-option-btn")
    buttons.forEach((btn, i) => {
      if (i === index) {
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

    loadExternalStream(streamOption.url)
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

    // Set iframe source
    videoIframe.src = url

    // Handle iframe load event
    videoIframe.onload = () => {
      hideIframeLoading()
    }

    // Handle iframe error
    videoIframe.onerror = () => {
      handleStreamError()
    }

    // Set a timeout to detect if stream doesn't load properly
    setTimeout(() => {
      if (document.getElementById("iframeLoading")) {
        handleStreamError()
      }
    }, 15000) // 15 seconds timeout
  }

  function handleStreamError() {
    streamErrorCount++
    hideIframeLoading()

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
      }
    }
  }

  function showIframeLoading() {
    const existingLoader = document.getElementById("iframeLoading")
    if (!existingLoader) {
      const loadingDiv = document.createElement("div")
      loadingDiv.className = "iframe-loading"
      loadingDiv.id = "iframeLoading"
      loadingDiv.innerHTML = '<div class="spinner"></div>'
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

  function addToViewHistory(channelId) {
    const channelToAdd = channels.find((ch) => ch.id === channelId)

    if (!channelToAdd) return

    // Create history entry
    const historyEntry = {
      id: channelToAdd.id,
      name: channelToAdd.name,
      logo: channelToAdd.logo,
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

  function renderViewHistory() {
    if (!historySection || !historyList || viewHistory.length <= 1) {
      if (historySection) {
        historySection.style.display = "none"
      }
      return
    }

    // Filter out current channel from history
    const filteredHistory = viewHistory.filter((item) => item.id !== channel.id)

    if (filteredHistory.length === 0) {
      historySection.style.display = "none"
      return
    }

    historySection.style.display = "block"
    historyList.innerHTML = ""

    // Show only the first 5 items
    filteredHistory.slice(0, 5).forEach((item) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      historyItem.addEventListener("click", () => {
        window.location.href = `reproductor.html?id=${item.id}`
      })

      historyItem.innerHTML = `
        <img src="${item.logo || "placeholder.svg"}" alt="${item.name}" class="history-item-logo" loading="lazy">
        <span class="history-item-name">${item.name}</span>
      `

      historyList.appendChild(historyItem)
    })
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
      fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>'
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
      fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>'
      showNotification("Saliendo de pantalla completa", "info")
    }
  }

  // Listen for fullscreen change
  document.addEventListener("fullscreenchange", updateFullscreenButton)
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton)
  document.addEventListener("mozfullscreenchange", updateFullscreenButton)
  document.addEventListener("MSFullscreenChange", updateFullscreenButton)

  function updateFullscreenButton() {
    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullscreenElement ||
      document.msFullscreenElement
    ) {
      fullscreenButton.innerHTML = '<i class="fas fa-compress"></i>'
    } else {
      fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>'
    }
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

  // Handle keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Fullscreen with F key
    if (e.key === "f" || e.key === "F") {
      toggleFullscreen()
    }

    // Picture-in-Picture with P key
    if (e.key === "p" || e.key === "P") {
      togglePictureInPicture()
    }

    // Escape to go back
    if (e.key === "Escape" && !document.fullscreenElement) {
      goBack()
    }

    // Number keys 1-9 to switch stream options
    if (
      !isNaN(Number.parseInt(e.key)) &&
      Number.parseInt(e.key) > 0 &&
      Number.parseInt(e.key) <= channel?.streamOptions?.length
    ) {
      loadStream(Number.parseInt(e.key) - 1)
      showNotification(`Cambiando a opción ${e.key}`, "info")
    }
  })

  // Add swipe gestures for mobile
  let touchStartX = 0
  let touchEndX = 0

  videoContainer.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX
    },
    false,
  )

  videoContainer.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX
      handleSwipe()
    },
    false,
  )

  function handleSwipe() {
    const swipeThreshold = 100

    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe left - next stream
      const nextIndex = (currentStreamIndex + 1) % channel.streamOptions.length
      loadStream(nextIndex)
      showNotification("Siguiente opción", "info")
    }

    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe right - previous stream
      const prevIndex = (currentStreamIndex - 1 + channel.streamOptions.length) % channel.streamOptions.length
      loadStream(prevIndex)
      showNotification("Opción anterior", "info")
    }
  }

  // Show controls on touch for mobile
  videoContainer.addEventListener("touchstart", () => {
    if (playerControlsOverlay) {
      playerControlsOverlay.style.opacity = "1"

      // Hide controls after 3 seconds
      setTimeout(() => {
        playerControlsOverlay.style.opacity = ""
      }, 3000)
    }
  })
})

