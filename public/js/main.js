// Main JavaScript for Shopify Analytics SaaS

// Form validation for add store
document.addEventListener('DOMContentLoaded', () => {
  const addStoreForm = document.getElementById('addStoreForm');

  if (addStoreForm) {
    addStoreForm.addEventListener('submit', (e) => {
      const shopifyDomain = document.getElementById('shopifyDomain').value;

      // Basic validation for Shopify domain format
      if (!shopifyDomain.includes('.myshopify.com')) {
        e.preventDefault();
        alert('Please enter a valid Shopify domain (e.g., my-store.myshopify.com)');
        return false;
      }
    });
  }

  // Add loading animation to form submit buttons only (except login/register forms)
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    // Skip auth forms (login/register)
    if (form.action.includes('/auth/login') || form.action.includes('/auth/register')) {
      return;
    }

    form.addEventListener('submit', function(e) {
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }
    });
  });

  // Animate stats on page load
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach(stat => {
    const value = stat.textContent;
    if (!isNaN(parseFloat(value))) {
      animateValue(stat, 0, parseFloat(value), 1000);
    }
  });

  // Add hover effect to store cards
  const storeCards = document.querySelectorAll('.store-card');
  storeCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.borderLeft = '4px solid var(--primary-color)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.borderLeft = 'none';
    });
  });

  // Add smooth scroll for navigation
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Table row highlighting
  const tableRows = document.querySelectorAll('.orders-table tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('click', function() {
      this.style.backgroundColor = 'var(--bg-color)';
      setTimeout(() => {
        this.style.backgroundColor = '';
      }, 300);
    });
  });

  // Bar chart animation on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
          setTimeout(() => {
            bar.style.animation = 'slideUp 0.5s ease-out';
          }, index * 100);
        });
      }
    });
  }, { threshold: 0.5 });

  const barChart = document.querySelector('.bar-chart');
  if (barChart) {
    observer.observe(barChart);
  }

  // Auto-scale numbers to fit their containers
  function scaleNumbersToFit() {
    const numberElements = document.querySelectorAll('.stat-info h3, .stat-value, .report-value, .report-value-large, .recommendation-impact, .recommendation-title');

    numberElements.forEach(el => {
      const parent = el.parentElement;
      if (!parent) return;

      // Reset to original size
      el.style.transform = '';
      el.style.fontSize = '';

      // Force reflow
      void el.offsetWidth;

      const parentWidth = parent.offsetWidth;
      const elementWidth = el.scrollWidth;

      if (elementWidth > parentWidth && parentWidth > 0) {
        const scale = (parentWidth - 10) / elementWidth; // 10px padding
        // Only scale down, never up, and maintain minimum readability
        if (scale < 1 && scale > 0.5) {
          el.style.transform = `scale(${scale})`;
          el.style.transformOrigin = 'left center';
        } else if (scale <= 0.5) {
          // If it needs to scale below 50%, reduce the font size instead
          const computedSize = parseFloat(window.getComputedStyle(el).fontSize);
          el.style.fontSize = `${computedSize * 0.75}px`;
        }
      }
    });
  }

  // Run on load with delay to ensure layout is ready
  setTimeout(scaleNumbersToFit, 100);

  // Run on resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(scaleNumbersToFit, 100);
  });
});

// Utility function to animate numbers
function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }

    // Format the number based on original content
    const originalText = element.textContent;
    if (originalText.includes('$')) {
      element.textContent = '$' + current.toFixed(2);
    } else if (originalText.includes('%')) {
      element.textContent = current.toFixed(0) + '%';
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

// Add CSS animation for bar chart
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: scaleY(0);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }

  .btn-primary.loading {
    position: relative;
    color: transparent;
  }

  .btn-primary.loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    top: 50%;
    left: 50%;
    margin-left: -8px;
    margin-top: -8px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spinner 0.6s linear infinite;
  }

  @keyframes spinner {
    to {
      transform: rotate(360deg);
    }
  }

  .fade-in {
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Add fade-in animation to main content
window.addEventListener('load', () => {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.classList.add('fade-in');
  }
});

// Console message for developers
console.log('%c Shopify Analytics SaaS', 'font-size: 20px; font-weight: bold; color: #5469d4;');
console.log('%cBuilt with Express, MongoDB, and EJS', 'font-size: 12px; color: #718096;');
