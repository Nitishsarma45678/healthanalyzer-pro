// Multi-step form functionality
class HealthFormWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
        this.validationRules = {
            username: { required: true, minLength: 2 },
            age: { required: true, min: 1, max: 120 },
            gender: { required: true },
            sugar: { required: true, min: 20, max: 600 },
            urine_ph: { required: true, min: 4.0, max: 10.0 },
            bp_systolic: { required: true, min: 60, max: 250 },
            bp_diastolic: { required: true, min: 40, max: 150 }
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateProgress();
        this.setupRealTimeValidation();
        this.autoHideToasts();
    }

    bindEvents() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const form = document.getElementById('healthForm');

        nextBtn?.addEventListener('click', () => this.nextStep());
        prevBtn?.addEventListener('click', () => this.prevStep());
        
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input[required], input[type="number"]');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateField(input));
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Gender radio buttons
        const genderInputs = document.querySelectorAll('input[name="gender"]');
        genderInputs.forEach(input => {
            input.addEventListener('change', () => this.validateField(input));
        });
    }

    validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        const rules = this.validationRules[fieldName];
        const feedback = field.parentElement.querySelector('.input-feedback');
        
        if (!rules) return true;

        let isValid = true;
        let message = '';

        // Required field validation
        if (rules.required && !value) {
            isValid = false;
            message = 'This field is required';
        }
        
        // Specific validations
        if (value) {
            switch (fieldName) {
                case 'username':
                    if (value.length < rules.minLength) {
                        isValid = false;
                        message = `Name must be at least ${rules.minLength} characters`;
                    } else {
                        message = '✓ Valid name';
                    }
                    break;
                    
                case 'age':
                    const age = parseInt(value);
                    if (age < rules.min || age > rules.max) {
                        isValid = false;
                        message = `Age must be between ${rules.min} and ${rules.max}`;
                    } else {
                        message = '✓ Valid age';
                    }
                    break;
                    
                case 'sugar':
                    const sugar = parseFloat(value);
                    if (sugar < rules.min || sugar > rules.max) {
                        isValid = false;
                        message = `Blood sugar must be between ${rules.min} and ${rules.max} mg/dL`;
                    } else {
                        if (sugar < 70) message = '⚠️ Low blood sugar level';
                        else if (sugar > 140) message = '⚠️ High blood sugar level';
                        else message = '✓ Normal range';
                    }
                    break;
                    
                case 'urine_ph':
                    const ph = parseFloat(value);
                    if (ph < rules.min || ph > rules.max) {
                        isValid = false;
                        message = `Urine pH must be between ${rules.min} and ${rules.max}`;
                    } else {
                        if (ph < 6.0 || ph > 7.5) message = '⚠️ Outside normal range';
                        else message = '✓ Normal range';
                    }
                    break;
                    
                case 'bp_systolic':
                    const systolic = parseInt(value);
                    if (systolic < rules.min || systolic > rules.max) {
                        isValid = false;
                        message = `Systolic BP must be between ${rules.min} and ${rules.max}`;
                    } else {
                        if (systolic > 140) message = '⚠️ High blood pressure';
                        else if (systolic < 90) message = '⚠️ Low blood pressure';
                        else message = '✓ Normal range';
                    }
                    break;
                    
                case 'bp_diastolic':
                    const diastolic = parseInt(value);
                    if (diastolic < rules.min || diastolic > rules.max) {
                        isValid = false;
                        message = `Diastolic BP must be between ${rules.min} and ${rules.max}`;
                    } else {
                        if (diastolic > 90) message = '⚠️ High blood pressure';
                        else if (diastolic < 60) message = '⚠️ Low blood pressure';
                        else message = '✓ Normal range';
                    }
                    break;
            }
        }

        // Update field styling
        field.classList.remove('valid', 'invalid', 'warning');
        if (feedback) {
            feedback.classList.remove('success', 'error', 'warning');
            feedback.textContent = message;
            
            if (isValid) {
                if (message.includes('⚠️')) {
                    field.classList.add('warning');
                    feedback.classList.add('warning');
                } else if (message.includes('✓')) {
                    field.classList.add('valid');
                    feedback.classList.add('success');
                }
            } else {
                field.classList.add('invalid');
                feedback.classList.add('error');
            }
        }

        return isValid;
    }

    validateStep(stepNumber) {
        const currentStepElement = document.getElementById(`step${stepNumber}`);
        const requiredFields = currentStepElement.querySelectorAll('input[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Special validation for gender (radio buttons)
        if (stepNumber === 1) {
            const genderSelected = document.querySelector('input[name="gender"]:checked');
            if (!genderSelected) {
                isValid = false;
                this.showToast('Please select your gender', 'error');
            }
        }

        return isValid;
    }

    nextStep() {
        if (this.validateStep(this.currentStep)) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.showStep();
                this.updateProgress();
                this.updateButtons();
            }
        } else {
            this.showToast('Please complete all required fields correctly', 'error');
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep();
            this.updateProgress();
            this.updateButtons();
        }
    }

    showStep() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    updateProgress() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }

    updateButtons() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');

        // Previous button
        if (prevBtn) {
            prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
        }

        // Next/Submit buttons
        if (this.currentStep === this.totalSteps) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (submitBtn) submitBtn.style.display = 'none';
        }
    }

    submitForm() {
        if (this.validateStep(this.currentStep)) {
            const form = document.getElementById('healthForm');
            const submitBtn = document.getElementById('submitBtn');
            
            // Show loading state
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
                submitBtn.disabled = true;
            }

            // Submit the form
            setTimeout(() => {
                form.submit();
            }, 1000);
        } else {
            this.showToast('Please complete all required fields correctly', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('flash-messages') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'flash-messages';
        document.body.appendChild(container);
        return container;
    }

    autoHideToasts() {
        // Auto-hide existing flash messages
        setTimeout(() => {
            const toasts = document.querySelectorAll('#flash-messages .toast');
            toasts.forEach(toast => {
                toast.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            });
        }, 5000);
    }
}

// Additional utility functions
function formatNumber(input, decimals = 1) {
    input.addEventListener('input', function() {
        let value = parseFloat(this.value);
        if (!isNaN(value)) {
            this.value = value.toFixed(decimals);
        }
    });
}

// Initialize the form wizard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new HealthFormWizard();
    
    // Format number inputs
    const sugarInput = document.getElementById('sugar');
    const phInput = document.getElementById('urine_ph');
    
    if (sugarInput) formatNumber(sugarInput, 0);
    if (phInput) formatNumber(phInput, 1);
});

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
