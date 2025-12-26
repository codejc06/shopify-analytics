// Authentication form validation

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    // Password match validation
    registerForm.addEventListener('submit', (e) => {
      if (password.value !== confirmPassword.value) {
        e.preventDefault();
        alert('Passwords do not match!');
        confirmPassword.focus();
        return false;
      }

      if (password.value.length < 6) {
        e.preventDefault();
        alert('Password must be at least 6 characters long!');
        password.focus();
        return false;
      }
    });

    // Real-time password confirmation
    confirmPassword.addEventListener('input', () => {
      if (confirmPassword.value && password.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('Passwords do not match');
      } else {
        confirmPassword.setCustomValidity('');
      }
    });

    // Password strength indicator
    password.addEventListener('input', () => {
      const strength = calculatePasswordStrength(password.value);
      updatePasswordStrength(strength);
    });
  }
});

function calculatePasswordStrength(password) {
  let strength = 0;

  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 3) return 'medium';
  return 'strong';
}

function updatePasswordStrength(strength) {
  const passwordInput = document.getElementById('password');
  let strengthIndicator = document.querySelector('.password-strength');

  if (!strengthIndicator) {
    strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    strengthIndicator.innerHTML = '<div class="password-strength-bar"></div>';
    passwordInput.parentElement.appendChild(strengthIndicator);
  }

  const bar = strengthIndicator.querySelector('.password-strength-bar');
  bar.className = `password-strength-bar ${strength}`;
}
