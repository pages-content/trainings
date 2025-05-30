// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Import Bootstrap
    const bootstrap = window.bootstrap;

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add animation to feature cards on scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .testimonial-card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Set initial state for animation
    const cards = document.querySelectorAll('.feature-card, .testimonial-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Run animation on load and scroll
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on page load

    // Course filter functionality (for courses.html)
    const filterButtons = document.querySelectorAll('.nav-pills .nav-link');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Here you would typically filter the courses based on category
                // This is a placeholder for actual filtering logic
                const category = this.textContent.trim().toLowerCase();
                console.log(`Filtering by: ${category}`);
                
                // For demo purposes, we'll just log the action
                // In a real implementation, you would show/hide course cards based on category
            });
        });
    }

    // Course content accordion (for course-detail.ftl)
    const accordionItems = document.querySelectorAll('.accordion-item');
    if (accordionItems.length > 0) {
        // Add click event to all video links in the accordion
        const videoLinks = document.querySelectorAll('.accordion-body .list-group-item');
        videoLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.querySelector('.fas.fa-play-circle')) {
                    e.preventDefault();
                    // Here you would typically handle video playback
                    console.log('Video clicked: ' + this.textContent.trim());
                }
            });
        });
    }
});