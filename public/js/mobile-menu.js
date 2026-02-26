// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuPane = document.getElementById('mobileMenuPane');
    const menuToggles = document.querySelectorAll('.mobile-menu-toggle');

    // Toggle menu visibility
    if (mobileMenuBtn && mobileMenuPane) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuPane.classList.toggle('hidden');
        });
    }

    // Toggle menu items
    menuToggles.forEach(button => {
        button.addEventListener('click', function() {
            const content = this.closest('.mobile-menu-group').querySelector('.mobile-menu-content');
            const icon = this.querySelector('.toggle-icon');
            
            if (content && icon) {
                content.classList.toggle('hidden');
                icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    });

    // Close menu when clicking on a link
    if (mobileMenuPane) {
        const menuLinks = mobileMenuPane.querySelectorAll('a:not(.mobile-menu-toggle)');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuPane.classList.add('hidden');
                // Reset all open menus
                document.querySelectorAll('.mobile-menu-content').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.toggle-icon').forEach(el => el.style.transform = 'rotate(0deg)');
            });
        });
    }
});
