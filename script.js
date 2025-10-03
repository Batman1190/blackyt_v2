// Import configuration
import { YOUTUBE_CONFIG } from './config.js';

// DOM Elements
const videoContainer = document.getElementById('video-container');
const videoPlayerContainer = document.getElementById('video-player-container');
const closePlayerBtn = document.getElementById('close-player');
const searchInput = document.querySelector('.search-box input');
const searchButton = document.querySelector('.search-box button');
const loadingSpinner = document.getElementById('loading');

// App State
const appState = {
    currentVideo: null,
    searchQuery: '',
    isLoading: false,
    watchHistory: [],
    autoplayEnabled: JSON.parse(localStorage.getItem('autoplayEnabled') || 'true'),
    userInteracted: false,
    // Current list of video IDs displayed on the page (for next/previous navigation)
    currentList: [],
    // Index of the currently playing video within currentList
    currentIndex: -1
};

// Load watch history from storage
function loadWatchHistory() {
    const history = localStorage.getItem('watchHistory');
    return history ? JSON.parse(history) : [];
}

// Save watch history to storage
function saveWatchHistory() {
    localStorage.setItem('watchHistory', JSON.stringify(appState.watchHistory));
}

function saveAutoplaySetting() {
    localStorage.setItem('autoplayEnabled', JSON.stringify(appState.autoplayEnabled));
}

// Add video to watch history
function addToHistory(videoId, videoData) {
    const timestamp = new Date().toISOString();
    const historyEntry = {
        videoId,
        title: videoData.title,
        thumbnail: videoData.thumbnails?.medium?.url,
        channelTitle: videoData.channelTitle,
        watchedAt: timestamp
    };
    
    // Remove if already exists and add to beginning
    appState.watchHistory = appState.watchHistory.filter(v => v.videoId !== videoId);
    appState.watchHistory.unshift(historyEntry);
    
    // Keep only last 50 videos
    if (appState.watchHistory.length > 50) {
        appState.watchHistory.pop();
    }
    
    saveWatchHistory();
}

// Utility Functions
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// YouTube API Functions
async function fetchTrendingVideos(region = 'US') {
    try {
        const videoContainer = document.getElementById('video-container');
        if (!videoContainer) return;

        // Show loading state
        videoContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;

        let attempts = 0;
        const maxAttempts = YOUTUBE_CONFIG.getKeyCount();
        let lastError = null;

        while (attempts < maxAttempts) {
            try {
                const apiKey = await YOUTUBE_CONFIG.getAPIKey();
                console.log(`Attempt ${attempts + 1}/${maxAttempts} with API key index: ${YOUTUBE_CONFIG.getCurrentKeyIndex()}`);

                const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&chart=mostPopular&regionCode=${region}&maxResults=24&key=${apiKey}`);
                
                if (response.status === 403) {
                    console.log('API key quota exceeded, trying next key...');
                    lastError = 'API key quota exceeded';
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    displayVideos(data.items);
                    return; // Success, exit the function
                }
            } catch (error) {
                console.error('Error with current API key:', error);
                lastError = error.message;
                attempts++;
            }
        }

        // If we get here, all attempts failed
        throw new Error(`Failed to fetch videos after ${maxAttempts} attempts. Last error: ${lastError}`);
    } catch (error) {
        console.error('Error fetching trending videos:', error);
        const videoContainer = document.getElementById('video-container');
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load videos. Please try again later.</p>
                    <button onclick="fetchTrendingVideos('${region}')" class="retry-button">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

function createVideoCard(video) {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.setAttribute('itemscope', '');
    videoCard.setAttribute('itemtype', 'http://schema.org/VideoObject');
    
    videoCard.innerHTML = `
        <div class="thumbnail" onclick="playVideo('${video.id}')">
            <img src="${video.snippet.thumbnails.medium.url}" 
                 alt="${escapeHtml(video.snippet.title)}"
                 itemprop="thumbnailUrl">
            <div class="play-button">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="video-info">
            <div class="channel-icon">
                <img alt="${escapeHtml(video.snippet.channelTitle)}" itemprop="author">
            </div>
            <div class="details">
                <h3 itemprop="name">${escapeHtml(video.snippet.title)}</h3>
                <meta itemprop="uploadDate" content="${video.snippet.publishedAt}">
                <span class="channel-name" itemprop="author">${escapeHtml(video.snippet.channelTitle)}</span>
                <div class="video-meta">
                    <span class="views" itemprop="interactionCount">Loading views...</span>
                    <span class="separator">•</span>
                    <span class="time">${formatTimeAgo(video.snippet.publishedAt)}</span>
                </div>
                <meta itemprop="description" content="${escapeHtml(video.snippet.description || '')}">
            </div>
        </div>
    `;
    
    // Fetch additional video data
    fetchVideoStatistics(video.id, videoCard);
    fetchChannelIcon(video.snippet.channelId, videoCard);
    
    return videoCard;
}

// Add styles for error message and retry button
const style = document.createElement('style');
style.textContent = `
    .error-message {
        text-align: center;
        padding: 20px;
        color: var(--primary-color);
    }
    
    .retry-button {
        margin-top: 15px;
        padding: 8px 16px;
        background: var(--hover-color);
        border: none;
        border-radius: 20px;
        color: var(--primary-color);
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .retry-button:hover {
        background: var(--border-color);
    }
`;
document.head.appendChild(style);

async function fetchRecommendedVideos() {
    return fetchTrendingVideos('US');
}

async function searchVideos(query) {
    try {
        const videoContainer = document.getElementById('video-container');
        if (!videoContainer) return;

        showLoading();
        videoContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;

        let attempts = 0;
        const maxAttempts = YOUTUBE_CONFIG.getKeyCount();
        let lastError = null;

        while (attempts < maxAttempts) {
            try {
                const apiKey = await YOUTUBE_CONFIG.getAPIKey();
                console.log(`Search attempt ${attempts + 1}/${maxAttempts} with API key index: ${YOUTUBE_CONFIG.getCurrentKeyIndex()}`);

                const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`);
                
                if (response.status === 403) {
                    console.log('API key quota exceeded, trying next key...');
                    lastError = 'API key quota exceeded';
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Clear loading state
                videoContainer.innerHTML = '';
                
                // Create video grid
                const videoGrid = document.createElement('div');
                videoGrid.className = 'video-grid';
                
                // Process and display search results
                if (data.items && data.items.length > 0) {
                    data.items.forEach(item => {
                        // Convert search result format to video format
                        const video = {
                            id: item.id.videoId,
                            snippet: item.snippet
                        };
                        const videoCard = createVideoCard(video);
                        videoGrid.appendChild(videoCard);
                    });
                    videoContainer.appendChild(videoGrid);
                } else {
                    videoContainer.innerHTML = '<div class="no-results">No videos found</div>';
                }
                
                hideLoading();
                return; // Success, exit the function
            } catch (error) {
                console.error('Error with current API key:', error);
                lastError = error.message;
                attempts++;
            }
        }

        // If we get here, all attempts failed
        throw new Error(`Failed to search videos after ${maxAttempts} attempts. Last error: ${lastError}`);

    } catch (error) {
        console.error('Search error:', error);
        hideLoading();
        const errorMessage = error.message === 'All API keys exhausted'
            ? 'Unable to perform search. Please try again later.'
            : 'Failed to search videos. Please try again.';
        
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="error-message">
                    <p>${errorMessage}</p>
                    <button onclick="searchVideos('${encodeURIComponent(query)}')" class="retry-button">
                        Retry Search
                    </button>
                </div>
            `;
        }
    }
}

// Add event listeners for search
document.addEventListener('DOMContentLoaded', function() {
    // Existing search listeners
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    // Add region selector listener
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => {
            const selectedRegion = e.target.value;
            console.log('Region changed to:', selectedRegion);
            // Close video player if open
            closeVideoPlayer();
            // Fetch videos for selected region
            fetchTrendingVideos(selectedRegion);
        });
    }

    // Add logo click handler
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Close video player if open
            closeVideoPlayer();
            // Load trending videos
            fetchTrendingVideos('US');
        });
    }

    // Add back button listener
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', () => {
            closeVideoPlayer();
            // Optionally refresh the video list
            fetchTrendingVideos('US');
        });
    }

    // Close player button listener
    const closePlayerBtn = document.getElementById('close-player');
    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', () => {
            closeVideoPlayer();
        });
    }

    // Existing search listeners
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchVideos(query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchVideos(query);
                }
            }
        });
    }
});

// Make functions globally available
window.searchVideos = searchVideos;
window.fetchTrendingVideos = fetchTrendingVideos;
window.playVideo = playVideo;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

async function fetchVideoStatistics(videoId, videoCard) {
    try {
        const apiKey = await YOUTUBE_CONFIG.getAPIKey();
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch video statistics');
        }
        
        const data = await response.json();
        if (data.items && data.items[0]) {
            const stats = data.items[0].statistics;
            const viewCount = parseInt(stats.viewCount).toLocaleString();
            videoCard.querySelector('.views').textContent = `${viewCount} views`;
        }
    } catch (error) {
        console.error('Error fetching video statistics:', error);
        videoCard.querySelector('.views').textContent = 'Views unavailable';
    }
}

async function fetchChannelIcon(channelId, videoCard) {
    if (!channelId || !videoCard) {
        console.error('Missing channelId or videoCard element');
        return;
    }

    const channelIcon = videoCard.querySelector('.channel-icon img');
    if (!channelIcon) {
        console.error('Channel icon element not found');
        return;
    }

    // Set initial loading state
    channelIcon.classList.add('loading');
    channelIcon.src = 'images/default-channel.svg';

    try {
        const apiKey = await YOUTUBE_CONFIG.getAPIKey();
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.items?.[0]?.snippet?.thumbnails?.default?.url) {
            const iconUrl = data.items[0].snippet.thumbnails.default.url;
            
            // Create a new image to preload
            const tempImg = new Image();
            tempImg.onload = () => {
                channelIcon.src = iconUrl;
                channelIcon.classList.remove('loading');
                channelIcon.classList.add('loaded');
            };
            tempImg.onerror = () => {
                console.error('Failed to load channel icon:', iconUrl);
                channelIcon.src = 'images/default-channel.svg';
                channelIcon.classList.remove('loading');
            };
            tempImg.src = iconUrl;
        } else {
            throw new Error('No channel data found');
        }
    } catch (error) {
        console.error(`Error fetching channel icon for ${channelId}:`, error);
        channelIcon.src = 'images/default-channel.svg';
        channelIcon.classList.remove('loading');
    }
}

// Display Videos
function displayVideos(videos) {
    console.log(`Displaying ${videos?.length || 0} videos`);
    
    // Track the current list of videos (store only IDs for navigation)
    appState.currentList = (videos || []).map(v => v.id?.videoId || v.id);
    appState.currentIndex = -1; // reset current index when a new list is shown

    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) {
        console.error('Video container not found');
        return;
    }

    if (!videos || videos.length === 0) {
        videoContainer.innerHTML = '<div class="no-results">No videos available</div>';
        return;
    }

    // Clear existing content
    videoContainer.innerHTML = '';
    
    // Create video grid
    const videoGrid = document.createElement('div');
    videoGrid.className = 'video-grid';
    videoContainer.appendChild(videoGrid);

    videos.forEach((video, index) => {
        try {
            const videoData = video.snippet;
            const videoId = video.id?.videoId || video.id;
            if (!videoData || !videoId) {
                console.error(`Invalid video data at index ${index}:`, video);
                return;
            }

            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.dataset.videoId = videoId;
            videoCard.dataset.videoIndex = String(index);

            const thumbnailUrl = videoData.thumbnails?.medium?.url || videoData.thumbnails?.default?.url || 'images/placeholder.jpg';
            
            videoCard.innerHTML = `
                <div class="thumbnail">
                    <img src="${thumbnailUrl}" 
                         alt="${escapeHtml(videoData.title)}"
                         onerror="this.onerror=null; this.src='images/placeholder.jpg';">
                    <div class="duration"></div>
                    <div class="play-button">
                        <i class="material-icons">play_circle_filled</i>
                    </div>
                </div>
                <div class="video-info">
                    <div class="channel-icon">
                        <img src="images/default-channel.svg" alt="${escapeHtml(videoData.channelTitle)}" class="loading">
                    </div>
                    <div class="details">
                        <h3 title="${escapeHtml(videoData.title)}">${escapeHtml(videoData.title)}</h3>
                        <p class="channel-name">${escapeHtml(videoData.channelTitle)}</p>
                        <p class="views-time">
                            <span class="views">Loading...</span> • 
                            <span class="time">${formatDate(videoData.publishedAt)}</span>
                        </p>
                    </div>
                </div>
            `;
            
            // Add click handler
            videoCard.addEventListener('click', function() {
                const id = this.dataset.videoId;
                const idx = parseInt(this.dataset.videoIndex, 10);
                console.log('Video clicked:', id, 'index:', idx);
                if (typeof idx === 'number' && !isNaN(idx)) {
                    appState.currentIndex = idx;
                }
                if (id) {
                    playVideo(id);
                }
            });
            
            videoGrid.appendChild(videoCard);
            
            // Fetch additional data
            fetchVideoStatistics(videoId, videoCard);
            fetchChannelIcon(videoData.channelId, videoCard);
            
            console.log(`Video card created for: ${videoData.title}`);
        } catch (error) {
            console.error(`Error creating video card at index ${index}:`, error);
        }
    });
}
 

// Video Player
let player = null;
let playerReady = false;
const videoQueue = [];

// Video Player Controls
let isPlaying = false;
let currentVolume = 1;

function initializePlayerControls() {
    const playPauseBtn = document.querySelector('.play-pause');
    const backwardBtn = document.querySelector('.backward');
    const forwardBtn = document.querySelector('.forward');
    const volumeToggle = document.querySelector('.volume-toggle');
    const autoplayToggle = document.querySelector('.autoplay-toggle');
    const progressBar = document.querySelector('.progress-bar');
    const fullscreenBtn = document.querySelector('.fullscreen');
    const currentTimeDisplay = document.querySelector('.current-time');
    const totalTimeDisplay = document.querySelector('.total-time');
    const playerWrapper = document.querySelector('.player-wrapper');

    if (!playPauseBtn || !backwardBtn || !forwardBtn || !volumeToggle || !progressBar || !fullscreenBtn) {
        console.error('Player control elements not found');
        return;
    }
    
        // Prev/Next track buttons for playlist navigation
        const prevTrackBtn = document.querySelector('.prev-track');
        const nextTrackBtn = document.querySelector('.next-track');
    
        if (prevTrackBtn) {
            prevTrackBtn.addEventListener('click', () => {
                if (Array.isArray(appState.currentList) && appState.currentList.length > 0) {
                    let idx = typeof appState.currentIndex === 'number' ? appState.currentIndex : -1;
                    if (idx <= 0) return; // no previous
                    idx = idx - 1;
                    const prevId = appState.currentList[idx];
                    if (prevId) {
                        appState.currentIndex = idx;
                        playVideo(prevId);
                    }
                }
            });
        }
    
        if (nextTrackBtn) {
            nextTrackBtn.addEventListener('click', () => {
                if (Array.isArray(appState.currentList) && appState.currentList.length > 0) {
                    let idx = typeof appState.currentIndex === 'number' ? appState.currentIndex : -1;
                    const nextIdx = idx + 1;
                    if (nextIdx >= appState.currentList.length) return; // no next
                    const nextId = appState.currentList[nextIdx];
                    if (nextId) {
                        appState.currentIndex = nextIdx;
                        playVideo(nextId);
                    }
                }
            });
        }

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        appState.userInteracted = true;
        if (player && player.unMute) {
            player.unMute();
            player.setVolume(100);
            currentVolume = 1;
            volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        if (isPlaying) {
            player.pauseVideo();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            player.playVideo();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    });

    // Forward/Backward (10 seconds)
    backwardBtn.addEventListener('click', () => {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime - 10, true);
    });

    forwardBtn.addEventListener('click', () => {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime + 10, true);
    });

    // Volume Control
    volumeToggle.addEventListener('click', () => {
        appState.userInteracted = true;
        if (currentVolume > 0) {
            player.setVolume(0);
            currentVolume = 0;
            volumeToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            if (player && player.unMute) player.unMute();
            player.setVolume(100);
            currentVolume = 1;
            volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    });

    // Progress Bar
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        player.seekTo(pos * player.getDuration(), true);
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        const playerWrapper = document.querySelector('.player-wrapper');
        if (!document.fullscreenElement) {
            playerWrapper.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Clicking anywhere in the player area counts as interaction and unmutes
    if (playerWrapper) {
        playerWrapper.addEventListener('click', () => {
            appState.userInteracted = true;
            try {
                if (player && player.unMute) {
                    player.unMute();
                    player.setVolume(100);
                    currentVolume = 1;
                    if (volumeToggle) {
                        volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
                    }
                }
            } catch (_) {}
        }, { capture: true });
    }

    // Autoplay toggle
    if (autoplayToggle) {
        const icon = autoplayToggle.querySelector('i');
        const setIcon = () => {
            if (appState.autoplayEnabled) {
                icon.classList.remove('fa-toggle-off');
                icon.classList.add('fa-toggle-on');
            } else {
                icon.classList.remove('fa-toggle-on');
                icon.classList.add('fa-toggle-off');
            }
        };
        setIcon();
        autoplayToggle.addEventListener('click', () => {
            appState.autoplayEnabled = !appState.autoplayEnabled;
            saveAutoplaySetting();
            setIcon();
        });
    }

    // Update time display
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            currentTimeDisplay.textContent = formatTime(currentTime);
            totalTimeDisplay.textContent = formatTime(duration);
            
            // Update progress bar
            const progress = (currentTime / duration) * 100;
            document.querySelector('.progress-bar-fill').style.width = `${progress}%`;
        }
    }, 1000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Initialize YouTube Player
function initYouTubePlayer() {
    if (typeof YT === 'undefined' || !YT.Player) {
        console.log('YouTube IFrame API not ready, waiting...');
        setTimeout(initYouTubePlayer, 100);
        return;
    }

    if (player) {
        console.log('Player already initialized');
        return;
    }

    const playerDiv = document.getElementById('player');
    if (!playerDiv) {
        console.error('Player element not found');
        return;
    }

    console.log('Initializing YouTube player...');
    try {
        // Build playerVars and only set origin when served over http/https (not file://)
        const playerVars = {
            'playsinline': 1,
            'autoplay': 1,
            'enablejsapi': 1,
            'rel': 0,
            'modestbranding': 1,
            'showinfo': 0,
            'controls': 0
        };
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            playerVars.origin = window.location.origin;
            playerVars.widget_referrer = window.location.origin;
        }

        player = new YT.Player('player', {
            width: '100%',
            height: '100%',
            playerVars,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });

        // Initialize player controls
        const playerControls = document.querySelector('.player-controls');
        if (!playerControls) {
            console.log('Creating player controls...');
            const controls = document.createElement('div');
            controls.className = 'player-controls hidden';
            controls.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-bar-fill"></div>
                </div>
                <div class="controls-row">
                    <button class="control-btn backward" title="Backward 10 seconds">
                        <i class="fas fa-backward"></i>
                    </button>
                    <button class="control-btn play-pause" title="Play/Pause">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="control-btn forward" title="Forward 10 seconds">
                        <i class="fas fa-forward"></i>
                    </button>
                    <button class="control-btn volume-toggle" title="Toggle Volume">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="time-display">
                        <span class="current-time">0:00</span>
                        <span>/</span>
                        <span class="total-time">0:00</span>
                    </div>
                    <button class="control-btn fullscreen" title="Toggle Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            `;
            playerDiv.parentElement.appendChild(controls);
        }
    } catch (error) {
        console.error('Error initializing player:', error);
        setTimeout(initYouTubePlayer, 1000);
    }
}

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
    initYouTubePlayer();
}

function showPlayerControls() {
    const controls = document.querySelector('.player-controls');
    if (controls) {
        controls.classList.remove('hidden');
    }
}

function hidePlayerControls() {
    const controls = document.querySelector('.player-controls');
    if (controls) {
        controls.classList.add('hidden');
    }
}

function onPlayerReady(event) {
    console.log('Player Ready Event:', event);
    playerReady = true;
    hideLoading();
    
    if (videoQueue.length > 0) {
        const nextVideo = videoQueue.shift();
        console.log('Playing queued video:', nextVideo);
        playVideo(nextVideo);
    }

    player = event.target;
    initializePlayerControls();
    showPlayerControls();

    // Start muted to allow autoplay, unmute after user interaction
    if (player && player.mute) {
        player.mute();
        currentVolume = 0;
        const volumeToggle = document.querySelector('.volume-toggle');
        if (volumeToggle) {
            volumeToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
        const resumeAudioOnFirstInteraction = () => {
            if (!appState.userInteracted) return;
            try {
                if (player && player.unMute) {
                    player.unMute();
                    player.setVolume(100);
                    currentVolume = 1;
                    if (volumeToggle) {
                        volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
                    }
                }
            } catch (_) {}
            document.removeEventListener('click', interactionHandler, true);
            document.removeEventListener('keydown', interactionHandler, true);
        };
        const interactionHandler = () => {
            appState.userInteracted = true;
            resumeAudioOnFirstInteraction();
        };
        document.addEventListener('click', interactionHandler, true);
        document.addEventListener('keydown', interactionHandler, true);
    }
}

function onPlayerStateChange(event) {
    console.log('Player State Change:', event.data);
    // If playback starts after user action, ensure unmuted and volume up
    if (event.data === YT.PlayerState.PLAYING && appState.userInteracted) {
        try {
            if (player && player.unMute) {
                player.unMute();
                player.setVolume(100);
                currentVolume = 1;
                const volumeToggle = document.querySelector('.volume-toggle');
                if (volumeToggle) {
                    volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            }
        } catch (_) {}
    }
    if (event.data === YT.PlayerState.ENDED) {
        // When video ends, if autoplay is enabled, play the next video in currentList
        if (appState.autoplayEnabled && Array.isArray(appState.currentList) && appState.currentList.length > 0) {
            const nextIndex = (typeof appState.currentIndex === 'number' ? appState.currentIndex + 1 : 0);
            if (nextIndex < appState.currentList.length) {
                const nextVideoId = appState.currentList[nextIndex];
                appState.currentIndex = nextIndex;
                console.log('Autoplaying next video:', nextVideoId, 'index:', nextIndex);
                playVideo(nextVideoId);
                return;
            }
        }
        // No next video or autoplay disabled — close player
        closeVideoPlayer();
    }
}

function onPlayerError(event) {
    console.error('Player Error:', event.data);
    hideLoading();
    showError('Error playing video. Please try again.');
    closeVideoPlayer();
}

function closeVideoPlayer() {
    if (player && player.stopVideo) {
        player.stopVideo();
    }
    const videoPlayerContainer = document.getElementById('video-player-container');
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    // Reset player state
    isPlaying = false;
    const playPauseBtn = document.querySelector('.play-pause');
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function showVideoPlayer() {
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function playVideo(videoId) {
    if (!videoId) {
        console.error('No video ID provided');
        return;
    }

    console.log('Attempting to play video:', videoId);
    showLoading();
    
    // Get video data and add to history
    const videoCard = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
    if (videoCard) {
        const videoData = {
            title: videoCard.querySelector('.details h3').textContent,
            thumbnails: {
                medium: {
                    url: videoCard.querySelector('.thumbnail img').src
                }
            },
            channelTitle: videoCard.querySelector('.channel-name').textContent
        };
        addToHistory(videoId, videoData);
    }
    // Mark user interaction since this is a click on a video card
    appState.userInteracted = true;
    // Set currentVideo and determine currentIndex
    appState.currentVideo = videoId;
    try {
        const idxFromCard = videoCard ? parseInt(videoCard.dataset.videoIndex, 10) : NaN;
        if (!isNaN(idxFromCard)) {
            appState.currentIndex = idxFromCard;
        } else if (appState.currentList && appState.currentList.length > 0) {
            const found = appState.currentList.indexOf(videoId);
            appState.currentIndex = found >= 0 ? found : appState.currentIndex;
        }
    } catch (e) {
        console.warn('Could not determine video index for autoplay:', e);
    }
    
    if (!playerReady || !player) {
        console.log('Player not ready, queueing video:', videoId);
        videoQueue.push(videoId);
        initYouTubePlayer(); // Try to initialize if not ready
        return;
    }

    try {
        console.log('Loading video:', videoId);
        showVideoPlayer();
        if (appState.autoplayEnabled) {
            player.loadVideoById(videoId);
            if (player && player.playVideo) {
                player.playVideo();
                if (player && player.unMute) {
                    player.unMute();
                    player.setVolume(100);
                    currentVolume = 1;
                    const volumeToggle = document.querySelector('.volume-toggle');
                    if (volumeToggle) {
                        volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
                    }
                }
                isPlaying = true;
                const playPauseBtn = document.querySelector('.play-pause');
                if (playPauseBtn) {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                }
            }
        } else {
            player.cueVideoById(videoId);
            isPlaying = false;
            const playPauseBtn = document.querySelector('.play-pause');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
        hideLoading();
    } catch (error) {
        console.error('Error playing video:', error);
        hideLoading();
        showError('Error playing video. Please try again.');
        closeVideoPlayer();
    }
}

// Load YouTube API
function loadYouTubeAPI() {
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        return; // API already loading
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Display History
function displayHistory() {
    const historyContainer = document.getElementById('video-container');
    historyContainer.innerHTML = '';
    
    if (appState.watchHistory.length === 0) {
        historyContainer.innerHTML = '<div class="no-results">No watch history available</div>';
        return;
    }
    
    appState.watchHistory.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.dataset.videoId = video.videoId;
        videoCard.innerHTML = `
            <div class="thumbnail">
                <img src="${video.thumbnail || 'images/placeholder.jpg'}" 
                     alt="${escapeHtml(video.title)}"
                     onerror="this.src='images/placeholder.jpg'">
                <div class="play-button">
                    <i class="material-icons">play_circle_filled</i>
                </div>
            </div>
            <div class="video-info">
                <div class="channel-icon">
                    <img src="images/default-channel.svg" alt="Channel">
                </div>
                <div class="details">
                    <h3>${escapeHtml(video.title)}</h3>
                    <p class="channel-name">${escapeHtml(video.channelTitle)}</p>
                    <p class="views-time">
                        <span class="time">Watched ${formatDate(video.watchedAt)}</span>
                    </p>
                </div>
            </div>
        `;
    });
}

// Add navigation event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Handle home and trending navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            
            if (page === 'home' || page === 'trending') {
                // Get current region
                const regionSelect = document.getElementById('region-select');
                const selectedRegion = regionSelect ? regionSelect.value : 'US';
                
                // Fetch trending videos for the current region
                fetchTrendingVideos(selectedRegion);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(navLink => {
                    navLink.classList.remove('active');
                });
                link.classList.add('active');
            }
        });
    });
});

// Load trending videos on page load
fetchTrendingVideos('US');