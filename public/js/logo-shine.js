// Logo Shine Effect
document.addEventListener('DOMContentLoaded', function() {
    const logoContainers = document.querySelectorAll('.logo-container');
    
    logoContainers.forEach(container => {
        // Create shine overlay
        const shine = document.createElement('div');
        shine.className = 'logo-shine';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.appendChild(shine);
        
        // Trigger shine animation every 4 seconds
        setInterval(() => {
            shine.style.animation = 'none';
            setTimeout(() => {
                shine.style.animation = 'shine 1.5s ease-in-out';
            }, 10);
        }, 4000);
    });
});
