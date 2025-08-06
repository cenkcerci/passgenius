class PasswordGenerator {
    constructor() {
        this.lengthSlider = document.getElementById('length-slider');
        this.lengthDisplay = document.getElementById('length-display');
        this.uppercaseCheckbox = document.getElementById('uppercase');
        this.lowercaseCheckbox = document.getElementById('lowercase');
        this.numbersCheckbox = document.getElementById('numbers');
        this.symbolsCheckbox = document.getElementById('symbols');
        this.generateBtn = document.getElementById('generate-btn');
        this.passwordOutput = document.getElementById('password-output');
        this.copyBtn = document.getElementById('copy-btn');
        this.copyFeedback = document.getElementById('copy-feedback');
        this.errorMessage = document.getElementById('error-message');
        
        // New elements for additional features
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');
        this.exportCsvBtn = document.getElementById('export-csv-btn');
        
        // New feature elements
        this.pronounceableCheckbox = document.getElementById('pronounceable');
        this.checkLeakedCheckbox = document.getElementById('check-leaked');
        this.bulkCountSelect = document.getElementById('bulk-count');
        this.singlePasswordContainer = document.getElementById('single-password-container');
        this.bulkPasswordContainer = document.getElementById('bulk-password-container');
        this.bulkPasswordList = document.getElementById('bulk-password-list');
        this.copyAllBtn = document.getElementById('copy-all-btn');
        this.downloadBulkBtn = document.getElementById('download-bulk-btn');
        this.leakCheckResult = document.getElementById('leak-check-result');
        this.leakStatus = document.getElementById('leak-status');
        
        // Password history storage
        this.passwordHistory = this.loadPasswordHistory();
        this.renderTimeout = null;
        this.isRendering = false;
        this.currentBulkPasswords = [];

        // Character sets for password generation
        this.charSets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        // Predefined syllables for pronounceable passwords (only truly pronounceable ones)
        this.syllables = [
            'ba', 'be', 'bi', 'bo', 'bu',
            'ca', 'ce', 'ci', 'co', 'cu',
            'da', 'de', 'di', 'do', 'du',
            'fa', 'fe', 'fi', 'fo', 'fu',
            'ga', 'ge', 'gi', 'go', 'gu',
            'ha', 'he', 'hi', 'ho', 'hu',
            'ja', 'je', 'ji', 'jo', 'ju',
            'ka', 'ke', 'ki', 'ko', 'ku',
            'la', 'le', 'li', 'lo', 'lu',
            'ma', 'me', 'mi', 'mo', 'mu',
            'na', 'ne', 'ni', 'no', 'nu',
            'pa', 'pe', 'pi', 'po', 'pu',
            'ra', 're', 'ri', 'ro', 'ru',
            'sa', 'se', 'si', 'so', 'su',
            'ta', 'te', 'ti', 'to', 'tu',
            'va', 've', 'vi', 'vo', 'vu',
            'wa', 'we', 'wi', 'wo', 'wu',
            'za', 'ze', 'zi', 'zo', 'zu'
        ];

        // Session statistics and performance tracking
        this.sessionStats = {
            passwordsGenerated: 0,
            bulkPasswordsGenerated: 0,
            leakChecksPerformed: 0
        };
        this.leakCheckDebounceTimer = null;

        this.init();
    }

    init() {
        // Event listeners
        this.lengthSlider.addEventListener('input', () => this.updateLengthDisplay());
        this.generateBtn.addEventListener('click', () => this.generatePassword());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Add event listeners to checkboxes for real-time validation
        [this.uppercaseCheckbox, this.lowercaseCheckbox, this.numbersCheckbox, this.symbolsCheckbox]
            .forEach(checkbox => {
                checkbox.addEventListener('change', () => this.validateOptions());
            });

        // New feature event listeners
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.exportCsvBtn.addEventListener('click', () => this.exportToCsv());
        this.bulkCountSelect.addEventListener('change', () => this.toggleBulkMode());
        this.copyAllBtn.addEventListener('click', () => this.copyAllPasswords());
        this.downloadBulkBtn.addEventListener('click', () => this.downloadBulkPasswords());
        this.pronounceableCheckbox.addEventListener('change', () => this.handlePrononceableToggle());
        this.checkLeakedCheckbox.addEventListener('change', () => this.debouncedLeakCheck());

        // Initialize display and features
        this.updateLengthDisplay();
        this.validateOptions();
        
        // Load dark mode preference FIRST, then apply theme class
        this.loadDarkModePreference();
        
        // Ensure theme class is applied immediately after loading preference
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            this.isDarkMode = true;
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            this.isDarkMode = false;
        }
        this.renderPasswordHistory();
        this.toggleBulkMode();
        
        // Set initial logo based on theme
        this.updateLogoColors();
    }

    updateLengthDisplay() {
        this.lengthDisplay.textContent = this.lengthSlider.value;
    }

    // Modular function to get current options
    getOptions() {
        return {
            length: parseInt(this.lengthSlider.value),
            uppercase: this.uppercaseCheckbox.checked,
            lowercase: this.lowercaseCheckbox.checked,
            numbers: this.numbersCheckbox.checked,
            symbols: this.symbolsCheckbox.checked,
            pronounceable: this.pronounceableCheckbox.checked,
            checkLeaked: this.checkLeakedCheckbox.checked,
            bulkCount: parseInt(this.bulkCountSelect.value)
        };
    }

    validateOptions() {
        const options = this.getOptions();
        const hasAtLeastOneOption = options.uppercase || options.lowercase || 
                                   options.numbers || options.symbols;

        if (!hasAtLeastOneOption) {
            this.showErrorMessage('Please select at least one character type!', true);
            this.generateBtn.disabled = true;
            return false;
        } else {
            this.hideErrorMessage();
            this.generateBtn.disabled = false;
            return true;
        }
    }

    // Enhanced error message display
    showErrorMessage(message, animate = false) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('show');
        if (animate) {
            this.errorMessage.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                this.errorMessage.style.animation = '';
            }, 500);
        }
    }

    hideErrorMessage() {
        this.errorMessage.classList.remove('show');
    }

    // Handle pronounceable password options - allows symbols and numbers
    handlePrononceableToggle() {
        // Simply validate - no special logic needed
        this.validateOptions();
    }

    // Debounced leak checking
    debouncedLeakCheck() {
        if (this.leakCheckDebounceTimer) {
            clearTimeout(this.leakCheckDebounceTimer);
        }
        
        this.leakCheckDebounceTimer = setTimeout(() => {
            // Only perform leak check if there's a current password
            if (this.passwordOutput.value.trim()) {
                this.checkPasswordLeak(this.passwordOutput.value);
            }
        }, 500); // 500ms debounce
    }

    generatePassword() {
        // Validate options before generating
        if (!this.validateOptions()) {
            return;
        }

        const bulkCount = parseInt(this.bulkCountSelect.value);
        
        if (bulkCount === 1) {
            this.generateSinglePassword();
        } else {
            this.generateBulkPasswords(bulkCount);
        }
    }

    generateSinglePassword() {
        const password = this.createPassword();
        
        this.passwordOutput.value = password;
        this.copyBtn.disabled = false;
        
        // Update session stats
        this.sessionStats.passwordsGenerated++;
        
        // Add to history using modular function
        this.saveToHistory(password);
        
        // Check for leaked password if enabled
        if (this.checkLeakedCheckbox.checked) {
            this.checkPasswordLeak(password);
        } else {
            this.leakCheckResult.style.display = 'none';
        }
        
        // Add visual feedback for generation
        this.passwordOutput.style.borderColor = '#48bb78';
        setTimeout(() => {
            this.passwordOutput.style.borderColor = '#e2e8f0';
        }, 1000);
    }

    // Modular function to generate a set of passwords
    generatePasswordSet(count) {
        const passwords = [];
        for (let i = 0; i < count; i++) {
            passwords.push(this.createPassword());
        }
        return passwords;
    }

    // Modular function to save password to history
    saveToHistory(password) {
        const historyItem = {
            password: password,
            timestamp: new Date().toISOString()
        };
        
        // Add to the beginning of history
        this.passwordHistory.unshift(historyItem);
        
        // Keep only last 100 passwords
        if (this.passwordHistory.length > 100) {
            this.passwordHistory = this.passwordHistory.slice(0, 100);
        }
        
        this.savePasswordHistory();
        this.renderPasswordHistory();
    }

    async generateBulkPasswords(count) {
        this.currentBulkPasswords = [];
        
        // Update session stats
        this.sessionStats.bulkPasswordsGenerated += count;
        
        // Use modular function to generate passwords
        const passwords = this.generatePasswordSet(count);
        
        for (let i = 0; i < passwords.length; i++) {
            const password = passwords[i];
            
            this.currentBulkPasswords.push({
                password: password,
                timestamp: new Date().toLocaleString()
            });
            
            // Add to history using modular function
            this.saveToHistory(password);
        }
        
        this.renderBulkPasswords();
        
        // Check for leaked passwords if enabled
        if (this.checkLeakedCheckbox.checked) {
            await this.checkBulkPasswordLeaks();
        } else {
            this.leakCheckResult.style.display = 'none';
        }
    }
    
    async checkBulkPasswordLeaks() {
        this.leakCheckResult.style.display = 'block';
        this.leakStatus.className = 'leak-status checking';
        this.leakStatus.textContent = 'Checking passwords against known breaches...';
        
        let leakedCount = 0;
        let totalBreaches = 0;
        
        try {
            for (let i = 0; i < this.currentBulkPasswords.length; i++) {
                const password = this.currentBulkPasswords[i].password;
                
                // Hash the password using SHA-1
                const encoder = new TextEncoder();
                const passwordData = encoder.encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-1', passwordData);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
                
                // Use k-anonymity: send only first 5 characters of hash
                const prefix = hashHex.substring(0, 5);
                const suffix = hashHex.substring(5);
                
                const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'User-Agent': 'QuickPwd-Password-Generator'
                    }
                });
                
                if (response.ok) {
                    const responseData = await response.text();
                    const hashes = responseData.split('\r\n');
                    
                    for (let hash of hashes) {
                        const [hashSuffix, breachCount] = hash.split(':');
                        if (hashSuffix === suffix) {
                            leakedCount++;
                            totalBreaches += parseInt(breachCount);
                            break;
                        }
                    }
                }
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Display results
            if (leakedCount > 0) {
                this.leakStatus.className = 'leak-status leaked';
                this.leakStatus.textContent = `⚠️ ${leakedCount} of ${this.currentBulkPasswords.length} passwords found in data breaches (total: ${totalBreaches.toLocaleString()} breaches). Consider regenerating.`;
            } else {
                this.leakStatus.className = 'leak-status safe';
                this.leakStatus.textContent = `✅ All ${this.currentBulkPasswords.length} passwords are safe - not found in known data breaches.`;
            }
            
        } catch (error) {
            console.error('Error checking bulk password leaks:', error);
            this.leakStatus.className = 'leak-status error';
            this.leakStatus.textContent = '⚠️ Unable to check passwords against breaches. Please try again later.';
        }
    }

    createPassword() {
        const length = parseInt(this.lengthSlider.value);
        
        if (this.pronounceableCheckbox.checked) {
            return this.generatePronounceablePassword(length);
        } else {
            return this.generateRandomPassword(length);
        }
    }

    generateRandomPassword(length) {
        let availableChars = '';

        // Build character set based on selected options
        if (this.uppercaseCheckbox.checked) {
            availableChars += this.charSets.uppercase;
        }
        if (this.lowercaseCheckbox.checked) {
            availableChars += this.charSets.lowercase;
        }
        if (this.numbersCheckbox.checked) {
            availableChars += this.charSets.numbers;
        }
        if (this.symbolsCheckbox.checked) {
            availableChars += this.charSets.symbols;
        }

        // Generate password using secure random values
        let password = '';
        const array = new Uint32Array(length);
        
        // Use Web Crypto API for secure random number generation
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
        } else {
            // Fallback for older browsers (less secure)
            for (let i = 0; i < length; i++) {
                array[i] = Math.floor(Math.random() * availableChars.length);
            }
        }

        for (let i = 0; i < length; i++) {
            const randomIndex = array[i] % availableChars.length;
            password += availableChars[randomIndex];
        }

        // Ensure password contains at least one character from each selected type
        password = this.ensureCharacterRequirements(password, availableChars, length);
        
        return password;
    }

    generatePronounceablePassword(length) {
        let syllableList = [];
        let currentLength = 0;
        
        // Add syllables until we reach the desired length
        while (currentLength < length) {
            const syllable = this.getRandomElement(this.syllables);
            
            // Check if adding this syllable would exceed length
            const wouldExceed = this.estimatePasswordLength(syllableList.concat([syllable])) > length;
            
            if (!wouldExceed) {
                syllableList.push(syllable);
                currentLength = this.estimatePasswordLength(syllableList);
            } else {
                // If we can't fit another full syllable, break
                break;
            }
        }
        
        // Ensure we have at least 2 syllables for readability
        if (syllableList.length < 2) {
            syllableList.push(this.getRandomElement(this.syllables));
        }
        
        // Apply character type formatting
        return this.formatPronounceablePassword(syllableList, length);
    }
    
    estimatePasswordLength(syllableList) {
        let estimatedLength = syllableList.reduce((total, syllable) => total + syllable.length, 0);
        
        // Add separators if symbols are selected
        if (this.symbolsCheckbox.checked && syllableList.length > 1) {
            estimatedLength += syllableList.length - 1; // dashes between syllables
        }
        
        // Add numbers if selected (2 digits)
        if (this.numbersCheckbox.checked) {
            estimatedLength += 2;
            if (this.symbolsCheckbox.checked) {
                estimatedLength += 1; // dash before number
            }
        }
        
        return estimatedLength;
    }

    formatPronounceablePassword(syllableList, targetLength) {
        let formattedSyllables = [...syllableList];
        let password = '';
        
        // Join syllables with or without separators first
        if (this.symbolsCheckbox.checked) {
            password = formattedSyllables.join('-');
        } else {
            password = formattedSyllables.join('');
        }
        
        // Apply uppercase formatting based on selection
        if (this.uppercaseCheckbox.checked && !this.lowercaseCheckbox.checked) {
            // Only uppercase selected: capitalize entire password
            password = password.toUpperCase();
        } else if (this.uppercaseCheckbox.checked && this.lowercaseCheckbox.checked) {
            // Both selected: capitalize only first letter of entire password
            password = password.charAt(0).toUpperCase() + password.slice(1);
        }
        // If only lowercase or neither selected: keep password as-is (lowercase)
        
        // Add numbers if selected
        if (this.numbersCheckbox.checked) {
            const randomNumber = Math.floor(this.getSecureRandom() * 90) + 10; // 2-digit number (10-99)
            
            if (this.symbolsCheckbox.checked) {
                password += '-' + randomNumber;
            } else {
                password += randomNumber;
            }
        }
        
        // Trim to exact length if needed
        if (password.length > targetLength) {
            password = password.substring(0, targetLength);
        }
        
        return password;
    }

    getRandomElement(array) {
        return array[Math.floor(this.getSecureRandom() * array.length)];
    }

    ensureCharacterRequirements(password, availableChars, length) {
        const requirements = [];
        
        if (this.uppercaseCheckbox.checked) {
            requirements.push(this.charSets.uppercase);
        }
        if (this.lowercaseCheckbox.checked) {
            requirements.push(this.charSets.lowercase);
        }
        if (this.numbersCheckbox.checked) {
            requirements.push(this.charSets.numbers);
        }
        if (this.symbolsCheckbox.checked) {
            requirements.push(this.charSets.symbols);
        }

        let passwordArray = password.split('');
        
        // Check if password meets all requirements
        for (let i = 0; i < requirements.length; i++) {
            const reqCharSet = requirements[i];
            const hasRequiredChar = passwordArray.some(char => reqCharSet.includes(char));
            
            if (!hasRequiredChar) {
                // Replace a random character with a character from the missing set
                const randomIndex = Math.floor(this.getSecureRandom() * passwordArray.length);
                const randomChar = reqCharSet[Math.floor(this.getSecureRandom() * reqCharSet.length)];
                passwordArray[randomIndex] = randomChar;
            }
        }

        return passwordArray.join('');
    }

    getSecureRandom() {
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            return array[0] / (0xFFFFFFFF + 1);
        }
        return Math.random();
    }

    async copyToClipboard() {
        const password = this.passwordOutput.value;
        
        if (!password) {
            return;
        }

        try {
            // Modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
            } else {
                // Fallback for older browsers
                this.passwordOutput.select();
                this.passwordOutput.setSelectionRange(0, 99999); // For mobile devices
                document.execCommand('copy');
            }

            this.showCopyFeedback();
        } catch (err) {
            console.error('Failed to copy password: ', err);
            // Show error feedback
            this.copyFeedback.textContent = 'Failed to copy password';
            this.copyFeedback.style.background = '#fed7d7';
            this.copyFeedback.style.color = '#c53030';
            this.showCopyFeedback();
            
            // Reset feedback after showing error
            setTimeout(() => {
                this.copyFeedback.textContent = 'Password copied to clipboard!';
                this.copyFeedback.style.background = '#c6f6d5';
                this.copyFeedback.style.color = '#22543d';
            }, 2000);
        }
    }

    showCopyFeedback() {
        this.copyFeedback.classList.add('show');
        
        // Hide feedback after 2 seconds
        setTimeout(() => {
            this.copyFeedback.classList.remove('show');
        }, 2000);
    }



    // Dark mode functionality
    toggleDarkMode() {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            localStorage.setItem('darkMode', 'false');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        }
        this.updateButtonStyling();
        this.updateLogoColors();
    }

    // Switch between logo files for different themes
    updateLogoColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const logoImg = document.querySelector('.header-logo');
        
        if (logoImg) {
            if (isDarkMode) {
                logoImg.src = 'logo-white.svg';
            } else {
                logoImg.src = 'logo.svg';
            }
        }
    }
    
    updateButtonStyling() {
        const button = document.getElementById('dark-mode-toggle');
        if (!button) {
            console.log('Button not found!');
            return;
        }
        
        console.log('Applying comprehensive button styling...', document.body.classList.contains('dark-mode') ? 'DARK' : 'LIGHT');
        
        // Complete button styling with proper theme and mobile support
        const isDarkMode = document.body.classList.contains('dark-mode');
        const isMobile = window.innerWidth <= 390;
        
        // Base styling that works for both desktop and mobile
        const baseStyles = {
            'border-radius': '8px',
            'cursor': 'pointer', 
            'transition': 'all 0.3s ease',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'min-width': isMobile ? '36px' : '48px',
            'min-height': isMobile ? '36px' : '48px',
            'padding': isMobile ? '8px' : '12px'
        };
        
        // Theme-specific styling
        const themeStyles = isDarkMode ? {
            'background': 'rgba(255, 255, 255, 0.08)',
            'border': '2px solid rgba(255, 255, 255, 0.5)',
            'color': 'white',
            'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)'
        } : {
            'background': 'rgba(255, 255, 255, 0.95)',
            'border': '1px solid rgba(0, 0, 0, 0.15)', 
            'color': '#2d3748',
            'box-shadow': '0 2px 4px rgba(0, 0, 0, 0.1)'
        };
        
        // Mobile positioning (only for mobile)
        const mobileStyles = isMobile ? {
            'position': 'absolute !important',
            'top': '10px !important',
            'right': '10px !important',
            'left': 'auto !important',
            'margin': '0 !important',
            'transform': 'none !important'
        } : {};
        
        // Clear existing styles completely first
        button.style.cssText = '';
        button.className = 'header-button-forced';
        
        // Apply all styles with maximum priority
        const allStyles = {...baseStyles, ...themeStyles, ...mobileStyles};
        Object.entries(allStyles).forEach(([prop, value]) => {
            button.style.setProperty(prop, value, 'important');
        });
        
        // Force SVG styling with maximum specificity
        const svg = button.querySelector('svg');
        if (svg) {
            svg.style.cssText = '';
            svg.style.setProperty('stroke', 'currentColor', 'important');
            svg.style.setProperty('color', 'inherit', 'important');
            svg.style.setProperty('fill', 'none', 'important');
            svg.style.setProperty('width', '20px', 'important');
            svg.style.setProperty('height', '20px', 'important');
        }
        
        // Force immediate visual refresh
        button.style.display = 'none';
        button.offsetHeight; // Trigger reflow
        button.style.display = 'flex';
        
        console.log('Comprehensive button styling applied');
    }

    loadDarkModePreference() {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else if (savedMode === 'false') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
        // If no preference saved, let system preference handle it
        
        // Apply button styling once after theme loads
        setTimeout(() => {
            if (!this.buttonStyled) {
                this.updateButtonStyling();
                this.buttonStyled = true;
            }
        }, 100);
    }

    // Password history functionality
    loadPasswordHistory() {
        const history = localStorage.getItem('passwordHistory');
        return history ? JSON.parse(history) : [];
    }

    savePasswordHistory() {
        localStorage.setItem('passwordHistory', JSON.stringify(this.passwordHistory));
    }

    addToHistory(password) {
        // Check for duplicate password (don't add if same password already exists at top)
        if (this.passwordHistory.length > 0 && this.passwordHistory[0].password === password) {
            return; // Skip adding duplicate
        }
        
        const historyItem = {
            password: password,
            timestamp: new Date().toLocaleString(),
            id: Date.now() + Math.random() // Ensure unique ID
        };
        
        this.passwordHistory.unshift(historyItem);
        
        // Keep only last 100 passwords to prevent excessive memory usage
        if (this.passwordHistory.length > 100) {
            this.passwordHistory = this.passwordHistory.slice(0, 100);
        }
        
        this.savePasswordHistory();
        
        // Debounce rendering to prevent display corruption from rapid clicks
        clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => {
            this.renderPasswordHistory();
        }, 50);
    }

    renderPasswordHistory() {
        // Prevent concurrent rendering calls
        if (this.isRendering) return;
        this.isRendering = true;
        
        try {
            if (this.passwordHistory.length === 0) {
                this.historyList.innerHTML = '<div class="history-empty">No passwords generated yet</div>';
                this.exportCsvBtn.disabled = true;
                this.clearHistoryBtn.disabled = true;
                return;
            }

            this.exportCsvBtn.disabled = false;
            this.clearHistoryBtn.disabled = false;

            // Use document fragment for better performance and no display corruption
            const fragment = document.createDocumentFragment();
            
            this.passwordHistory.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-password">${this.escapeHtml(item.password)}</div>
                    <div class="history-meta">
                        <div class="history-timestamp">${item.timestamp}</div>
                    </div>
                    <div class="history-actions">
                        <button class="history-copy-btn" onclick="passwordGenerator.copyHistoryPassword('${this.escapeHtml(item.password)}')" title="Copy password">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                `;
                fragment.appendChild(historyItem);
            });

            // Single DOM update to prevent flicker
            this.historyList.innerHTML = '';
            this.historyList.appendChild(fragment);
            
        } finally {
            this.isRendering = false;
        }
    }
    
    // Helper method to escape HTML for security
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyHistoryPassword(password) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
            } else {
                // Fallback method
                const textArea = document.createElement('textarea');
                textArea.value = password;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            // Show feedback
            this.copyFeedback.textContent = 'Password copied from history!';
            this.showCopyFeedback();
            
            // Reset feedback text
            setTimeout(() => {
                this.copyFeedback.textContent = 'Password copied to clipboard!';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy password from history: ', err);
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all password history?')) {
            this.passwordHistory = [];
            this.savePasswordHistory();
            this.renderPasswordHistory();
        }
    }

    exportToCsv() {
        if (this.passwordHistory.length === 0) {
            alert('No password history to export');
            return;
        }

        const csvHeader = 'Password\n';
        const csvData = this.passwordHistory.map(item => {
            return `"${item.password}"`;
        }).join('\n');

        const csvContent = csvHeader + csvData;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `password-history-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // New feature methods
    toggleBulkMode() {
        const bulkCount = parseInt(this.bulkCountSelect.value);
        
        if (bulkCount === 1) {
            this.singlePasswordContainer.style.display = 'flex';
            this.bulkPasswordContainer.style.display = 'none';
        } else {
            this.singlePasswordContainer.style.display = 'none';
            this.bulkPasswordContainer.style.display = 'block';
        }
    }

    renderBulkPasswords() {
        const passwordsHtml = this.currentBulkPasswords.map((item, index) => {
            return `
                <div class="bulk-password-item">
                    <div class="bulk-password-text">${item.password}</div>
                    <button class="bulk-password-copy" onclick="passwordGenerator.copyBulkPassword('${item.password}')" title="Copy password">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        this.bulkPasswordList.innerHTML = passwordsHtml;
    }

    async copyBulkPassword(password) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = password;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            this.copyFeedback.textContent = 'Password copied!';
            this.showCopyFeedback();
            
            setTimeout(() => {
                this.copyFeedback.textContent = 'Password copied to clipboard!';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy bulk password: ', err);
        }
    }

    async copyAllPasswords() {
        const allPasswords = this.currentBulkPasswords.map(item => item.password).join('\n');
        
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(allPasswords);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = allPasswords;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            // Show enhanced confirmation toast
            this.showToast(`All ${this.currentBulkPasswords.length} passwords copied to clipboard!`, 'success');
        } catch (err) {
            console.error('Failed to copy all passwords: ', err);
            this.showToast('Failed to copy passwords', 'error');
        }
    }

    downloadBulkPasswords() {
        const content = this.currentBulkPasswords.map(item => item.password).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        // Create timestamped filename  
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `securepass-pro-passwords-${timestamp}.txt`;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async checkPasswordLeak(password) {
        this.leakCheckResult.style.display = 'block';
        this.leakStatus.className = 'leak-status checking';
        this.leakStatus.textContent = 'Checking password against known breaches...';

        try {
            // Hash the password using SHA-1
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-1', passwordData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            // Use k-anonymity: send only first 5 characters of hash
            const prefix = hashHex.substring(0, 5);
            const suffix = hashHex.substring(5);
            
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'User-Agent': 'QuickPwd-Password-Generator'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.text();
            const hashes = responseData.split('\r\n');
            
            let isLeaked = false;
            let count = 0;
            
            for (let hash of hashes) {
                const [hashSuffix, breachCount] = hash.split(':');
                if (hashSuffix === suffix) {
                    isLeaked = true;
                    count = parseInt(breachCount);
                    break;
                }
            }
            
            if (isLeaked) {
                this.leakStatus.className = 'leak-status leaked';
                this.leakStatus.textContent = `⚠️ This password has been found in ${count.toLocaleString()} data breaches. Consider using a different password.`;
            } else {
                this.leakStatus.className = 'leak-status safe';
                this.leakStatus.textContent = '✅ This password has not been found in known data breaches.';
            }
            
        } catch (error) {
            console.error('Error checking password leak:', error);
            this.leakStatus.className = 'leak-status error';
            
            // More specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.leakStatus.textContent = '⚠️ Network error - check your internet connection and try again.';
            } else if (error.message.includes('404')) {
                this.leakStatus.textContent = '⚠️ Breach checking service temporarily unavailable.';
            } else if (error.message.includes('429')) {
                this.leakStatus.textContent = '⚠️ Too many requests - please wait a moment and try again.';
            } else {
                this.leakStatus.textContent = '⚠️ Unable to check password against breaches. Please try again later.';
            }
        }
        
        // Update session stats
        this.sessionStats.leakChecksPerformed++;
    }

    // Toast notification system for enhanced user feedback
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        
        // Add styles dynamically
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            fontSize: '14px',
            zIndex: '9999',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set background color based on type
        const colors = {
            success: '#48bb78',
            error: '#f56565',
            warning: '#ed8936',
            info: '#667eea'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Restore desktop layout for larger screens  
function restoreDesktopLayout() {
    const headerRow = document.querySelector('.header-row');
    const headerLogo = document.querySelector('.header-logo');
    const headerText = document.querySelector('.header-text');
    const headerButton = document.querySelector('.header-button');
    
    if (headerRow && headerLogo && headerText && headerButton) {
        // Apply desktop layout styles directly
        headerRow.style.cssText = `
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 15px 20px !important;
            margin-bottom: 25px !important;
            background: rgba(255, 255, 255, 0.95) !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            position: relative !important;
            height: 68px !important;
            min-height: 68px !important;
        `;
        
        headerLogo.style.cssText = `
            display: block !important;
            height: 40px !important;
            width: auto !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
        `;
        
        headerText.style.cssText = `
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            font-size: 1.3rem !important;
            font-weight: 600 !important;
            color: var(--text-primary) !important;
            margin: 0 !important;
            white-space: nowrap !important;
            text-align: center !important;
            line-height: 1 !important;
            display: block !important;
        `;
        
        // Don't clear button styles - let updateButtonStyling handle it
        console.log('Desktop layout restored with proper sizing');
    }
}

// Force mobile layout function
function forceMobileLayout() {
    const headerRow = document.querySelector('.header-row');
    const headerLogo = document.querySelector('.header-logo');
    const headerText = document.querySelector('.header-text');
    const headerButton = document.querySelector('.header-button');
    
    if (headerRow && headerLogo && headerText && headerButton) {
        console.log('Forcing mobile layout...');
        
        // Apply mobile styles directly via JavaScript
        // Apply mobile header styling with proper dark mode support
        const isDarkMode = document.body.classList.contains('dark-mode');
        const headerBackground = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)';
        
        headerRow.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            position: relative !important;
            height: auto !important;
            min-height: 90px !important;
            padding: 20px 50px 20px 20px !important;
            background: ${headerBackground} !important;
            border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'} !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            gap: 10px !important;
        `;
        
        headerLogo.style.cssText = `
            display: block !important;
            height: 36px !important;
            width: auto !important;
            margin: 0 !important;
            position: static !important;
            transform: none !important;
            left: auto !important;
            top: auto !important;
            flex-shrink: 0 !important;
            order: 1 !important;
        `;
        
        headerText.style.cssText = `
            display: block !important;
            font-size: 0.95rem !important;
            line-height: 1.1 !important;
            margin: 0 !important;
            text-align: center !important;
            position: static !important;
            transform: none !important;
            left: auto !important;
            top: auto !important;
            opacity: 1 !important;
            font-weight: 600 !important;
            color: ${isDarkMode ? 'white' : 'var(--text-secondary)'} !important;
            text-shadow: ${isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'} !important;
            visibility: visible !important;
            z-index: 10 !important;
            flex-shrink: 0 !important;
            order: 2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: calc(100vw - 120px) !important;
        `;
        
        // Mobile layout complete - trigger button restyling
        setTimeout(() => {
            const generator = window.passwordGenerator;
            if (generator && generator.updateButtonStyling) {
                generator.updateButtonStyling();
            }
        }, 50);
        
        console.log('Mobile layout forced successfully');
        
        // Mobile layout applied successfully
    }
}

// Initialize the password generator when the DOM is loaded
let passwordGenerator;
document.addEventListener('DOMContentLoaded', () => {
    passwordGenerator = new PasswordGenerator();
    
    // Apply appropriate layout based on screen size
    console.log('Screen width:', window.innerWidth);
    if (window.innerWidth <= 390) {
        setTimeout(() => forceMobileLayout(), 100);
    } else {
        setTimeout(() => {
            console.log('Applying desktop layout...');
            restoreDesktopLayout();
        }, 100);
    }
    
    // Debounced resize handler to prevent flickering
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth <= 390) {
                forceMobileLayout();
            } else {
                restoreDesktopLayout();
            }
            // Ensure button styling is correct after resize
            if (passwordGenerator && passwordGenerator.updateButtonStyling) {
                passwordGenerator.updateButtonStyling();
            }
        }, 50);
    });
    
    // Update mobile layout and button styling when theme changes
    const observer = new MutationObserver(() => {
        // Immediate button styling update to prevent color flicker
        if (passwordGenerator && passwordGenerator.updateButtonStyling) {
            passwordGenerator.updateButtonStyling();
        }
        
        // Then apply layout changes
        if (window.innerWidth <= 390) {
            setTimeout(() => {
                forceMobileLayout();
                // Re-apply button styling after layout change
                if (passwordGenerator && passwordGenerator.updateButtonStyling) {
                    passwordGenerator.updateButtonStyling();
                }
            }, 10);
        } else {
            setTimeout(() => {
                restoreDesktopLayout();
                // Re-apply button styling after layout change
                if (passwordGenerator && passwordGenerator.updateButtonStyling) {
                    passwordGenerator.updateButtonStyling();
                }
            }, 10);
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Generate password with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const generateBtn = document.getElementById('generate-btn');
        if (!generateBtn.disabled) {
            generateBtn.click();
        }
    }
    
    // Copy password with Ctrl/Cmd + C when password field is focused
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const passwordOutput = document.getElementById('password-output');
        if (document.activeElement === passwordOutput && passwordOutput.value) {
            // Let the default copy behavior work, but also trigger our copy feedback
            setTimeout(() => {
                const generator = new PasswordGenerator();
                generator.showCopyFeedback();
            }, 100);
        }
    }
});

// Contact modal function
window.showContactModal = function() {
    const contactContent = `
        <h2 style="color: #1a202c; margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">Contact Us</h2>
        <p style="color: #2d3748; margin-bottom: 20px;">If you have any questions, feedback, or business inquiries, feel free to reach out:</p>
        
        <ul style="color: #2d3748; padding-left: 20px; margin-bottom: 20px;">
          <li style="margin-bottom: 8px;"><strong style="color: #1a202c;">Company:</strong> Ace Ventures LLC</li>
          <li style="margin-bottom: 8px;"><strong style="color: #1a202c;">Email:</strong> <a href="mailto:aceventuresllc.hq@gmail.com" style="color: #667eea; text-decoration: none;">aceventuresllc.hq@gmail.com</a></li>
          <li style="margin-bottom: 8px;"><strong style="color: #1a202c;">Location:</strong> Connecticut, USA</li>
        </ul>
        
        <p style="color: #4a5568; margin-bottom: 0;">We usually respond within 24–48 hours.</p>
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        color: #1a202c;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        line-height: 1.6;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 30px;
        cursor: pointer;
        color: #4a5568;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
    `;
    
    modalContent.innerHTML = contactContent;
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add hover effect for close button
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.color = '#1a202c';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.color = '#4a5568';
    });
    
    // Close handlers
    const closeModal = () => document.body.removeChild(modal);
    closeButton.onclick = closeModal;
    modal.onclick = (e) => e.target === modal && closeModal();
    
    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};
// Cache refresh: Tue Aug  5 04:05:28 PM UTC 2025
