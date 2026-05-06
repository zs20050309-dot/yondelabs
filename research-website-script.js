// Main JavaScript for Research Program Website

// Language switching functionality
let currentLang = 'zh';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initAnnouncementBanner();
    initNavigation();
    initLanguageSwitch();
    initCarousel();
    initModal();
    initApplicationForm();
    initTabs();
    initCountdown();
    initScrollAnimations();
    initDynamicContent();
});

// Announcement Banner
function initAnnouncementBanner() {
    const banner = document.getElementById('announcementBanner');

    if (!banner) return;

    // Banner is always visible on page load - no localStorage persistence
    // User can close it, but it will reappear on refresh
}

function closeAnnouncement() {
    const banner = document.getElementById('announcementBanner');

    if (banner) {
        banner.classList.add('hidden');

        // DO NOT save to localStorage - banner should reappear on refresh
        // Adjust layout
        adjustLayoutForBanner(false);
    }
}

function adjustLayoutForBanner(isVisible) {
    const navbar = document.querySelector('.navbar');
    const hero = document.querySelector('.hero');

    if (isVisible) {
        navbar.style.top = '50px';
        hero.style.marginTop = '122px';
    } else {
        navbar.style.top = '0';
        hero.style.marginTop = '72px';
    }
}

// Navigation scroll effect
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Smooth scroll for navigation links with offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const bannerHeight = document.querySelector('.announcement-banner').classList.contains('hidden') ? 0 : 50;
                const offset = navbarHeight + bannerHeight + 20; // Extra 20px padding

                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Language switching - MINIMAL version
function initLanguageSwitch() {
    // Just add click listeners, NO initial setup
    const langBtns = document.querySelectorAll('.lang-btn');

    langBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const newLang = this.dataset.lang;

            // Update body attribute only
            if (newLang === 'en') {
                document.body.setAttribute('data-lang', 'en');
            } else {
                document.body.removeAttribute('data-lang');
            }

            // Update button states
            document.querySelectorAll('.lang-btn').forEach(b => {
                if (b.dataset.lang === newLang) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });

            currentLang = newLang;
        });
    });
}

// Student Success Carousel
function initCarousel() {
    const cards = document.querySelectorAll('.success-card');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    let currentIndex = 0;

    function showCard(index) {
        cards.forEach(card => card.classList.remove('active'));
        cards[index].classList.add('active');
    }

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            showCard(currentIndex);
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % cards.length;
            showCard(currentIndex);
        });

        // Auto-advance carousel
        setInterval(() => {
            currentIndex = (currentIndex + 1) % cards.length;
            showCard(currentIndex);
        }, 8000);
    }
}

// Modal functionality
function initModal() {
    const modal = document.getElementById('applicationModal');
    const wechatModal = document.getElementById('wechatModal');
    const closeBtn = document.querySelector('.close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === wechatModal) {
            wechatModal.style.display = 'none';
        }
    });
}

// Show application form
function showApplicationForm() {
    const modal = document.getElementById('applicationModal');
    if (modal) {
        modal.style.display = 'block';
        // Track this action for analytics
        trackEvent('Application', 'Open Form', 'Hero CTA');
    }
}

// Download brochure
function downloadBrochure() {
    // Track download
    trackEvent('Download', 'Brochure', 'Hero CTA');

    // Create a temporary download link
    const link = document.createElement('a');
    link.href = '/brochure-2025.pdf'; // You would need to provide actual PDF
    link.download = 'Elite-Research-Program-2025.pdf';
    link.click();

    // Show success message
    showNotification('手册下载已开始 / Brochure download started');
}

// Schedule consultation - Open WeChat modal
function scheduleConsultation() {
    // Track consultation request
    trackEvent('Consultation', 'Schedule', 'CTA');

    // Open WeChat modal
    const modal = document.getElementById('wechatModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close WeChat modal
function closeWechatModal() {
    const modal = document.getElementById('wechatModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Application form handling
function initApplicationForm() {
    const form = document.getElementById('applicationForm');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Track submission
            trackEvent('Application', 'Submit', 'Form');

            // Show loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '提交中 Submitting...';
            submitBtn.disabled = true;

            // Simulate submission (in real app, this would be an API call)
            setTimeout(() => {
                // Hide modal
                document.getElementById('applicationModal').style.display = 'none';

                // Reset form
                form.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

                // Show success message
                showNotification('申请已成功提交！我们会在24小时内联系您。/ Application submitted successfully! We will contact you within 24 hours.');
            }, 2000);
        });
    }
}

// Achievement tabs
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;
            filterAchievements(category);
        });
    });
}

function filterAchievements(category) {
    // In a real application, this would filter the displayed achievements
    console.log('Filtering achievements by:', category);
}

// Countdown timer for application deadline
function initCountdown() {
    // Early Decision deadline
    const deadline = new Date('2024-12-15T23:59:59');

    function updateCountdown() {
        const now = new Date();
        const diff = deadline - now;

        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            // Update countdown display if element exists
            const countdownEl = document.querySelector('.countdown-display');
            if (countdownEl) {
                countdownEl.textContent = `${days} 天 ${hours} 小时`;
            }
        }
    }

    updateCountdown();
    setInterval(updateCountdown, 60000); // Update every minute
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Dynamic content updates
function initDynamicContent() {
    // Update remaining spots dynamically
    updateRemainingSpots();

    // Update testimonials periodically
    rotateTestimonials();
}

function updateRemainingSpots() {
    // Simulate dynamic spot updates
    const spotsElement = document.querySelector('.spots-remaining strong');
    if (spotsElement) {
        // Random number between 8-15 to create urgency
        const spots = Math.floor(Math.random() * 8) + 8;
        spotsElement.textContent = spots;
    }
}

function rotateTestimonials() {
    const testimonials = [
        {
            name: "Timmy L.",
            school: "Phillips Exeter Academy",
            result: "MIT Class of 2028",
            quote: "第一天的时候还没写过一行代码，一周内入门了深度学习和大模型的原理"
        },
        {
            name: "Emily Z.",
            school: "北京十一学校国际部",
            result: "Stanford Class of 2028",
            quote: "在NASA JPL实验室的经历改变了我的人生轨迹"
        },
        {
            name: "Michael W.",
            school: "上海美国学校",
            result: "Caltech Class of 2028",
            quote: "导师的指导让我真正理解了什么是科研精神"
        }
    ];

    // Rotate through testimonials
    let currentTestimonial = 0;
    setInterval(() => {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        // Update testimonial display
    }, 10000);
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : '#ed8936'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Analytics tracking (placeholder)
function trackEvent(category, action, label) {
    // In production, this would send to Google Analytics or similar
    console.log('Event tracked:', { category, action, label });

    // Example GA4 implementation:
    // gtag('event', action, {
    //     'event_category': category,
    //     'event_label': label
    // });
}

// Lab image gallery
function initLabGallery() {
    const thumbnails = document.querySelectorAll('.lab-thumbnails img');
    const mainImage = document.querySelector('.lab-image.main img');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            // Swap images with fade effect
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = this.src;
                mainImage.style.opacity = '1';
            }, 300);
        });
    });
}

// Dynamic typing effect for hero title
function initTypingEffect() {
    const titleElement = document.querySelector('.hero-title .en');
    if (titleElement) {
        const text = titleElement.textContent;
        titleElement.textContent = '';
        let index = 0;

        function type() {
            if (index < text.length) {
                titleElement.textContent += text.charAt(index);
                index++;
                setTimeout(type, 50);
            }
        }

        // Start typing after a delay
        setTimeout(type, 1000);
    }
}

// Parallax effect for hero section
function initParallax() {
    const hero = document.querySelector('.hero');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;

        if (hero) {
            hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        }
    });
}

// Swap lab images
function swapLabImage(thumbnail) {
    const mainImage = document.querySelector('.lab-image.main img');
    const mainLabel = document.querySelector('.lab-label');

    if (mainImage && thumbnail) {
        // Fade out effect
        mainImage.style.opacity = '0';

        setTimeout(() => {
            mainImage.src = thumbnail.src;
            mainLabel.textContent = thumbnail.alt;
            mainImage.style.opacity = '1';
        }, 200);
    }
}

// Outcomes pagination
let currentOutcomesPage = 0;

function changeOutcomesPage(direction) {
    const pages = document.querySelectorAll('.outcomes-page');
    const indicator = document.querySelector('.current-page');
    const totalPages = pages.length;

    // Remove active class from current page
    pages[currentOutcomesPage].classList.remove('active');

    // Calculate new page index
    currentOutcomesPage = (currentOutcomesPage + direction + totalPages) % totalPages;

    // Add active class to new page
    pages[currentOutcomesPage].classList.add('active');

    // Update indicator
    if (indicator) {
        indicator.textContent = currentOutcomesPage + 1;
    }
}

// Initialize additional features
window.addEventListener('load', () => {
    initLabGallery();
    // initTypingEffect(); // DISABLED - causes language switching issues
    initParallax();
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .animated {
        animation: fadeInUp 0.8s ease both;
    }

    .navbar.scrolled {
        padding: 0.5rem 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);