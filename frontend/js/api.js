// Fetch home page data and render it dynamically
async function loadHomeData() {
    try {
        const response = await fetch('/api/home');
        const data = await response.json();
        
        // Update DOM with fetched data
        document.getElementById('home-title').textContent = data.title;
        document.getElementById('home-subtitle').textContent = data.subtitle;
    } catch (error) {
        console.error('Error loading home data:', error);
        document.getElementById('home-subtitle').textContent = 'Error loading data';
    }
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadHomeData);
