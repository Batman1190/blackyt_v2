// DOM Elements
const menuIcon = document.querySelector('.menu-icon');
const sidebar = document.querySelector('.sidebar');
const container = document.querySelector('.container');
const content = document.querySelector('.content');

// State
let isSidebarOpen = false;
let overlayTimeout = null;

// Toggle sidebar function
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    
    if (window.innerWidth <= 600) {
        // Mobile view
        if (isSidebarOpen) {
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
            
            sidebar.classList.add('active');
            // Add overlay to prevent interaction with content
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Add active class after a small delay to allow for transition
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });
            
            overlay.addEventListener('click', () => {
                toggleSidebar();
            });
        } else {
            document.body.style.overflow = '';
            sidebar.classList.remove('active');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                // Remove overlay after transition
                clearTimeout(overlayTimeout);
                overlayTimeout = setTimeout(() => {
                    if (overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                }, 300);
            }
        }
    } else {
        // Desktop view
        sidebar.classList.toggle('collapsed');
        content.style.marginLeft = isSidebarOpen ? '250px' : '70px';
        
        // Handle text visibility in sidebar links
        document.querySelectorAll('.nav-link span, .sidebar-image-link span').forEach(span => {
            span.style.display = isSidebarOpen ? 'block' : 'none';
        });
    }
}

// Event Listeners
menuIcon.addEventListener('click', toggleSidebar);

// Handle responsive behavior
function handleResize() {
    if (window.innerWidth <= 600) {
        // Mobile view
        sidebar.classList.remove('collapsed');
        content.style.marginLeft = '0';
        if (!isSidebarOpen) {
            sidebar.classList.remove('active');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
        document.body.style.overflow = '';
    } else {
        // Desktop view
        sidebar.classList.remove('active');
        content.style.marginLeft = isSidebarOpen ? '250px' : '70px';
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        document.body.style.overflow = '';
    }
}

// Listen for window resize
window.addEventListener('resize', handleResize);

// Cleanup on page unload
window.addEventListener('unload', () => {
    clearTimeout(overlayTimeout);
    document.body.style.overflow = '';
});

// Initial setup
handleResize();