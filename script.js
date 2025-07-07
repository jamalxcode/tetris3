// Industry-Standard Tetris Game Implementation
// Version: 2.0.0 - Production Ready

// Game configuration constants
const SHAPES = [
    // T shape
    [
        [[1, 1, 1], [0, 1, 0]],
        [[0, 1], [1, 1], [0, 1]],
        [[0, 1, 0], [1, 1, 1]],
        [[1, 0], [1, 1], [1, 0]]
    ],
    // J shape
    [
        [[1, 0, 0], [1, 1, 1]],
        [[0, 1], [0, 1], [1, 1]],
        [[1, 1, 1], [0, 0, 1]],
        [[1, 1], [1, 0], [1, 0]]
    ],
    // L shape
    [
        [[0, 0, 1], [1, 1, 1]],
        [[1, 1], [0, 1], [0, 1]],
        [[1, 1, 1], [1, 0, 0]],
        [[1, 0], [1, 0], [1, 1]]
    ],
    // O shape
    [
        [[1, 1], [1, 1]]
    ],
    // S shape
    [
        [[0, 1, 1], [1, 1, 0]],
        [[1, 0], [1, 1], [0, 1]]
    ],
    // Z shape
    [
        [[1, 1, 0], [0, 1, 1]],
        [[0, 1], [1, 1], [1, 0]]
    ],
    // I shape
    [
        [[1, 1, 1, 1]],
        [[1], [1], [1], [1]]
    ]
];

const COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844'];

// Custom Error Classes
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class GameError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'GameError';
        this.context = context;
    }
}

// Security Validator Class
class SecurityValidator {
    sanitizeGameData(data) {
        const sanitized = {};
        
        for (let key in data) {
            const value = data[key];
            if (typeof value === 'number') {
                sanitized[key] = Math.max(0, Math.min(999999999, Math.floor(value)));
            } else if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            } else {
                sanitized[key] = 0;
            }
        }
        
        return sanitized;
    }
    
    sanitizeString(str) {
        return str.replace(/[<>'"&]/g, '');
    }
    
    validateInput(input) {
        if (typeof input !== 'string') return false;
        
        // Check for potential XSS patterns
        const xssPatterns = [
            /<script/i, /javascript:/i, /on\w+=/i, /<iframe/i, 
            /<object/i, /<embed/i, /vbscript:/i, /data:/i
        ];
        
        return !xssPatterns.some(pattern => pattern.test(input));
    }
}

// Enhanced Input Handler Class
class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.keyDebounce = {};
        this.lastKeyTime = {};
        this.eventListeners = [];
        this.bindEvents();
    }
    
    bindEvents() {
        this.keyDownHandler = this.handleKeyDown.bind(this);
        this.keyUpHandler = this.handleKeyUp.bind(this);
        this.blurHandler = this.handleBlur.bind(this);
        this.focusHandler = this.handleFocus.bind(this);
        this.visibilityHandler = this.handleVisibilityChange.bind(this);
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        window.addEventListener('blur', this.blurHandler);
        window.addEventListener('focus', this.focusHandler);
        document.addEventListener('visibilitychange', this.visibilityHandler);
        
        this.eventListeners.push(
            { element: document, event: 'keydown', handler: this.keyDownHandler },
            { element: document, event: 'keyup', handler: this.keyUpHandler },
            { element: window, event: 'blur', handler: this.blurHandler },
            { element: window, event: 'focus', handler: this.focusHandler },
            { element: document, event: 'visibilitychange', handler: this.visibilityHandler }
        );
    }
    
    handleKeyDown(e) {
        if (this.keys[e.key]) return; // Prevent key repeat
        this.keys[e.key] = true;
        
        const now = Date.now();
        const debounceKey = ['ArrowUp', ' '].includes(e.key);
        
        if (debounceKey && this.lastKeyTime[e.key] && 
            now - this.lastKeyTime[e.key] < this.game.CONFIG.KEY_DEBOUNCE_TIME) {
            return;
        }
        
        this.lastKeyTime[e.key] = now;
        this.processKeyInput(e);
    }
    
    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    handleBlur() {
        if (this.game.gameState.gameRunning && !this.game.gameState.gameOver) {
            this.game.pauseGame();
        }
    }
    
    handleFocus() {
        // Reset inactivity timer when window gains focus
        this.game.gameState.inactivityTimer = 0;
    }
    
    handleVisibilityChange() {
        if (document.hidden && this.game.gameState.gameRunning && !this.game.gameState.gameOver) {
            this.game.pauseGame();
        }
    }
    
    processKeyInput(e) {
        try {
            if (this.game.gameState.gameOver) {
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    this.game.restart();
                }
                return;
            }
            
            // Reset inactivity timer on valid game input
            if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
                this.game.gameState.inactivityTimer = 0;
            }
            
            if (this.game.gameState.gamePaused) {
                if (e.key === 'p' || e.key === 'P') {
                    e.preventDefault();
                    this.game.pauseGame();
                }
                return;
            }
            
            if (!this.game.gameState.currentPiece || !this.game.gameState.gameRunning) {
                return;
            }
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.game.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.game.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.game.movePiece(0, 1)) {
                        this.game.gameState.score += 1;
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.game.rotatePiece();
                    break;
                case ' ':
                    e.preventDefault();
                    this.game.hardDrop();
                    break;
                case 'p':
                case 'P':
                    e.preventDefault();
                    this.game.pauseGame();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    this.game.restart();
                    break;
            }
        } catch (error) {
            this.game.handleGameError('Input processing error', error);
        }
    }
    
    reset() {
        this.keys = {};
        this.keyDebounce = {};
        this.lastKeyTime = {};
    }
    
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

// Main Tetris Game Class
class TetrisGame {
    constructor(config = {}) {
        // Validate and set configuration
        this.CONFIG = this.validateConfig({
            BOARD_WIDTH: config.boardWidth || 12,
            BOARD_HEIGHT: config.boardHeight || 20,
            BLOCK_SIZE: config.blockSize || 20,
            MAX_LEVEL: config.maxLevel || 100,
            KEY_DEBOUNCE_TIME: config.keyDebounceTime || 150,
            MAX_INACTIVITY: config.maxInactivity || 60000,
            MAX_ERRORS: config.maxErrors || 5
        });
        
        // Performance monitoring
        this.performanceMetrics = {
            frameCount: 0,
            startTime: performance.now(),
            lastFrameTime: 0,
            avgFrameTime: 0,
            memoryUsage: 0,
            fps: 60
        };
        
        // Error handling
        this.errorCount = 0;
        this.criticalErrors = [];
        
        // Memory management
        this.eventListeners = [];
        this.animationId = null;
        this.timers = [];
        this.performanceInterval = null;
        
        // Cross-browser compatibility
        this.setupPolyfills();
        
        // Game state
        this.gameState = this.createInitialGameState();
        
        // Input handling
        this.inputHandler = new InputHandler(this);
        
        // Security measures
        this.securityValidator = new SecurityValidator();
        
        // Global error handler
        this.setupErrorHandling();
        
        this.init();
    }
    
    validateConfig(config) {
        const errors = [];
        
        if (config.BOARD_WIDTH < 4 || config.BOARD_WIDTH > 50) {
            errors.push('Board width must be between 4 and 50');
        }
        if (config.BOARD_HEIGHT < 4 || config.BOARD_HEIGHT > 50) {
            errors.push('Board height must be between 4 and 50');
        }
        if (config.BLOCK_SIZE < 1 || config.BLOCK_SIZE > 100) {
            errors.push('Block size must be between 1 and 100');
        }
        if (config.MAX_LEVEL < 1 || config.MAX_LEVEL > 1000) {
            errors.push('Max level must be between 1 and 1000');
        }
        
        if (errors.length > 0) {
            throw new ValidationError('Configuration validation failed: ' + errors.join(', '));
        }
        
        return config;
    }
    
    setupPolyfills() {
        // RequestAnimationFrame polyfill
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
                                         window.mozRequestAnimationFrame ||
                                         window.oRequestAnimationFrame ||
                                         window.msRequestAnimationFrame ||
                                         function(callback) {
                                             return window.setTimeout(callback, 1000 / 60);
                                         };
        }
        
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = window.webkitCancelAnimationFrame ||
                                        window.mozCancelAnimationFrame ||
                                        window.oCancelAnimationFrame ||
                                        window.msCancelAnimationFrame ||
                                        function(id) {
                                            clearTimeout(id);
                                        };
        }
        
        // Performance.now polyfill
        if (!window.performance || !window.performance.now) {
            window.performance = window.performance || {};
            window.performance.now = Date.now || function() {
                return new Date().getTime();
            };
        }
        
        // Array.isArray polyfill
        if (!Array.isArray) {
            Array.isArray = function(arg) {
                return Object.prototype.toString.call(arg) === '[object Array]';
            };
        }
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleGameError('Global error', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGameError('Unhandled promise rejection', event.reason);
        });
    }
    
    createInitialGameState() {
        return {
            board: this.createBoard(),
            currentPiece: null,
            score: 0,
            level: 1,
            lines: 0,
            highScore: this.loadHighScore(),
            dropCounter: 0,
            dropInterval: 1000,
            gameRunning: false,
            gamePaused: false,
            gameOver: false,
            inactivityTimer: 0
        };
    }
    
    init() {
        try {
            this.initializeCanvas();
            this.initializeUI();
            this.spawnPiece();
            this.gameState.gameRunning = true;
            this.startPerformanceMonitoring();
            this.updateDisplay();
            this.gameLoop();
            return true;
        } catch (error) {
            this.handleCriticalError('Initialization failed', error);
            return false;
        }
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('tetris');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Cannot get 2D context');
        }
        
        // Test canvas functionality
        try {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, 1, 1);
            this.ctx.scale(this.CONFIG.BLOCK_SIZE, this.CONFIG.BLOCK_SIZE);
        } catch (error) {
            throw new Error('Canvas context is not functional: ' + error.message);
        }
    }
    
    initializeUI() {
        // Initialize performance display
        this.updatePerformanceDisplay();
    }
    
    createBoard() {
        return Array(this.CONFIG.BOARD_HEIGHT).fill().map(() => 
               Array(this.CONFIG.BOARD_WIDTH).fill(0));
    }
    
    spawnPiece() {
        try {
            const shapeIndex = Math.floor(Math.random() * SHAPES.length);
            const shape = SHAPES[shapeIndex];
            
            if (!shape || shape.length === 0) {
                throw new Error('Invalid shape selected');
            }
            
            const rotation = Math.floor(Math.random() * shape.length);
            const selectedShape = shape[rotation];
            
            this.gameState.currentPiece = {
                shape: selectedShape,
                x: Math.floor(this.CONFIG.BOARD_WIDTH / 2) - Math.floor(selectedShape[0].length / 2),
                y: 0,
                shapeIndex: shapeIndex,
                rotation: rotation
            };
            
            // Check for game over
            if (this.isCollision(this.gameState.currentPiece)) {
                this.endGame();
            }
        } catch (error) {
            this.handleGameError('Piece spawning error', error);
        }
    }
    
    validatePiece(piece) {
        if (!piece || typeof piece !== 'object') return false;
        if (!Array.isArray(piece.shape)) return false;
        if (typeof piece.x !== 'number' || typeof piece.y !== 'number') return false;
        if (piece.shape.length === 0) return false;
        
        // Validate shape structure
        for (let row of piece.shape) {
            if (!Array.isArray(row) || row.length === 0) return false;
        }
        
        return true;
    }
    
    isCollision(piece, offsetX = 0, offsetY = 0) {
        // Input validation
        if (!this.validatePiece(piece)) {
            console.error('Invalid piece in collision detection');
            return true;
        }
        
        if (typeof offsetX !== 'number' || typeof offsetY !== 'number') {
            console.error('Invalid offset parameters');
            return true;
        }
        
        const { shape, x, y } = piece;
        
        // Boundary pre-check
        if (x < -10 || x > this.CONFIG.BOARD_WIDTH + 10 || 
            y < -10 || y > this.CONFIG.BOARD_HEIGHT + 10) {
            console.warn('Piece position out of reasonable bounds');
            return true;
        }
        
        try {
            for (let row = 0; row < shape.length; row++) {
                if (!Array.isArray(shape[row])) {
                    throw new Error(`Invalid shape row at index ${row}`);
                }
                
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const newX = x + col + offsetX;
                        const newY = y + row + offsetY;
                        
                        // Comprehensive boundary checking
                        if (newX < 0 || newX >= this.CONFIG.BOARD_WIDTH || 
                            newY >= this.CONFIG.BOARD_HEIGHT) {
                            return true;
                        }
                        
                        // Safe array access with bounds checking
                        if (newY >= 0 && 
                            newY < this.gameState.board.length && 
                            newX >= 0 && 
                            newX < this.gameState.board[newY].length && 
                            this.gameState.board[newY][newX]) {
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
            this.handleGameError('Collision detection error', error);
            return true; // Fail-safe approach
        }
        
        return false;
    }
    
    movePiece(dx, dy) {
        try {
            if (!this.gameState.currentPiece || !this.validatePiece(this.gameState.currentPiece)) {
                return false;
            }
            
            if (!this.isCollision(this.gameState.currentPiece, dx, dy)) {
                this.gameState.currentPiece.x += dx;
                this.gameState.currentPiece.y += dy;
                return true;
            }
            return false;
        } catch (error) {
            this.handleGameError('Piece movement error', error);
            return false;
        }
    }
    
    rotatePiece() {
        try {
            if (!this.gameState.currentPiece || !this.validatePiece(this.gameState.currentPiece)) {
                return;
            }
            
            const { shapeIndex, rotation } = this.gameState.currentPiece;
            const shapes = SHAPES[shapeIndex];
            
            if (!shapes || shapes.length === 0) {
                throw new Error('Invalid shape data for rotation');
            }
            
            const newRotation = (rotation + 1) % shapes.length;
            const newShape = shapes[newRotation];
            
            const testPiece = {
                ...this.gameState.currentPiece,
                shape: newShape,
                rotation: newRotation
            };
            
            if (!this.isCollision(testPiece)) {
                this.gameState.currentPiece = testPiece;
            }
        } catch (error) {
            this.handleGameError('Piece rotation error', error);
        }
    }
    
    hardDrop() {
        try {
            while (this.movePiece(0, 1)) {
                this.gameState.score += 1;
            }
            this.mergePiece();
        } catch (error) {
            this.handleGameError('Hard drop error', error);
        }
    }
    
    mergePiece() {
        try {
            if (!this.gameState.currentPiece || !this.validatePiece(this.gameState.currentPiece)) {
                this.spawnPiece();
                return;
            }
            
            const { shape, x, y, shapeIndex } = this.gameState.currentPiece;
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const boardY = y + row;
                        const boardX = x + col;
                        
                        if (boardY >= 0 && boardY < this.CONFIG.BOARD_HEIGHT &&
                            boardX >= 0 && boardX < this.CONFIG.BOARD_WIDTH) {
                            this.gameState.board[boardY][boardX] = shapeIndex + 1;
                        }
                    }
                }
            }
            
            this.clearLines();
            this.spawnPiece();
        } catch (error) {
            this.handleGameError('Piece merge error', error);
        }
    }
    
    clearLines() {
        try {
            let linesCleared = 0;
            
            for (let row = this.CONFIG.BOARD_HEIGHT - 1; row >= 0; row--) {
                if (this.gameState.board[row].every(cell => cell !== 0)) {
                    this.gameState.board.splice(row, 1);
                    this.gameState.board.unshift(Array(this.CONFIG.BOARD_WIDTH).fill(0));
                    linesCleared++;
                    row++; // Check the same row again
                }
            }
            
            if (linesCleared > 0) {
                this.gameState.lines += linesCleared;
                this.gameState.score += linesCleared * 100 * this.gameState.level;
                this.gameState.level = Math.min(this.CONFIG.MAX_LEVEL, Math.floor(this.gameState.lines / 10) + 1);
                this.gameState.dropInterval = Math.max(100, 1000 - (this.gameState.level - 1) * 50);
                
                this.flashEffect();
                this.updateDisplay();
            }
        } catch (error) {
            this.handleGameError('Line clearing error', error);
        }
    }
    
    flashEffect() {
        try {
            const flash = document.getElementById('flash');
            if (flash) {
                flash.classList.add('active');
                setTimeout(() => {
                    flash.classList.remove('active');
                }, 100);
            }
        } catch (error) {
            console.warn('Flash effect error:', error);
        }
    }
    
    updateDisplay() {
        try {
            const sanitizedData = this.securityValidator.sanitizeGameData({
                score: this.gameState.score,
                level: this.gameState.level,
                lines: this.gameState.lines,
                highScore: this.gameState.highScore
            });
            
            this.safeUpdateElement('score', sanitizedData.score);
            this.safeUpdateElement('level', sanitizedData.level);
            this.safeUpdateElement('lines', sanitizedData.lines);
            this.safeUpdateElement('highscore', sanitizedData.highScore);
            this.safeUpdateElement('errors', this.errorCount);
        } catch (error) {
            this.handleGameError('Display update error', error);
        }
    }
    
    safeUpdateElement(id, value) {
        try {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = String(value);
            }
        } catch (error) {
            console.warn(`Failed to update element ${id}:`, error);
        }
    }
    
    draw() {
        try {
            if (!this.ctx || !this.canvas) {
                console.error('Canvas context not available');
                return;
            }
            
            // Validate canvas dimensions
            if (this.canvas.width <= 0 || this.canvas.height <= 0) {
                throw new Error('Invalid canvas dimensions');
            }
            
            // Clear canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.CONFIG.BOARD_WIDTH, this.CONFIG.BOARD_HEIGHT);
            
            // Draw board
            this.drawBoard();
            
            // Draw current piece
            if (this.gameState.currentPiece) {
                this.drawPiece(this.gameState.currentPiece);
            }
        } catch (error) {
            this.handleGameError('Canvas drawing error', error);
        }
    }
    
    drawBoard() {
        for (let row = 0; row < this.CONFIG.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.CONFIG.BOARD_WIDTH; col++) {
                if (this.gameState.board[row][col]) {
                    const colorIndex = this.gameState.board[row][col] - 1;
                    if (colorIndex >= 0 && colorIndex < COLORS.length) {
                        this.ctx.fillStyle = COLORS[colorIndex];
                        this.ctx.fillRect(col, row, 1, 1);
                        
                        // Add border
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 0.05;
                        this.ctx.strokeRect(col, row, 1, 1);
                    }
                }
            }
        }
    }
    
    drawPiece(piece) {
        if (!this.validatePiece(piece)) return;
        
        const { shape, x, y, shapeIndex } = piece;
        
        if (shapeIndex >= 0 && shapeIndex < COLORS.length) {
            this.ctx.fillStyle = COLORS[shapeIndex];
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        this.ctx.fillRect(x + col, y + row, 1, 1);
                        
                        // Add border
                        this.ctx.strokeStyle = '#fff';
                        this.ctx.lineWidth = 0.05;
                        this.ctx.strokeRect(x + col, y + row, 1, 1);
                    }
                }
            }
        }
    }
    
    gameLoop(time = 0) {
        if (!this.gameState.gameRunning || this.gameState.gameOver) {
            this.animationId = null;
            return;
        }
        
        try {
            const deltaTime = this.calculateDeltaTime(time);
            
            if (!this.gameState.gamePaused) {
                this.updateGameLogic(deltaTime);
                this.updateInactivityTimer(deltaTime);
            }
            
            this.draw();
            
        } catch (error) {
            this.handleGameError('Game loop error', error);
        }
        
        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    calculateDeltaTime(time) {
        const deltaTime = time - (this.lastTime || 0);
        this.lastTime = time;
        return deltaTime;
    }
    
    updateGameLogic(deltaTime) {
        this.gameState.dropCounter += deltaTime;
        
        if (this.gameState.dropCounter > this.gameState.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.mergePiece();
            }
            this.gameState.dropCounter = 0;
        }
    }
    
    updateInactivityTimer(deltaTime) {
        this.gameState.inactivityTimer += deltaTime;
        
        if (this.gameState.inactivityTimer > this.CONFIG.MAX_INACTIVITY) {
            this.pauseGame(true);
        }
    }
    
    pauseGame(inactivity = false) {
        this.gameState.gamePaused = !this.gameState.gamePaused;
        
        if (this.gameState.gamePaused) {
            const overlay = inactivity ? 
                document.getElementById('inactivityOverlay') : 
                document.getElementById('pauseOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
            
            if (inactivity) {
                this.gameState.inactivityTimer = 0;
            }
        } else {
            this.hideOverlay('pauseOverlay');
            this.hideOverlay('inactivityOverlay');
            this.gameState.inactivityTimer = 0;
        }
    }
    
    hideOverlay(id) {
        const overlay = document.getElementById(id);
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    endGame() {
        this.gameState.gameOver = true;
        this.gameState.gameRunning = false;
        
        if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
            this.saveHighScore(this.gameState.highScore);
            this.updateDisplay();
        }
        
        this.safeUpdateElement('finalScore', this.gameState.score);
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }
    
    restart() {
        this.cleanup();
        this.gameState = this.createInitialGameState();
        this.errorCount = 0;
        this.criticalErrors = [];
        
        // Hide overlays
        this.hideOverlay('gameOverOverlay');
        this.hideOverlay('pauseOverlay');
        this.hideOverlay('inactivityOverlay');
        
        this.inputHandler.reset();
        this.updateDisplay();
        this.spawnPiece();
        this.gameState.gameRunning = true;
        this.gameLoop();
    }
    
    // Performance monitoring
    startPerformanceMonitoring() {
        this.performanceMetrics.startTime = performance.now();
        this.performanceInterval = setInterval(() => {
            this.updatePerformanceMetrics();
        }, 1000);
    }
    
    updatePerformanceMetrics() {
        const now = performance.now();
        this.performanceMetrics.frameCount++;
        
        // Calculate FPS
        const elapsed = now - this.performanceMetrics.startTime;
        this.performanceMetrics.fps = Math.round((this.performanceMetrics.frameCount * 1000) / elapsed);
        
        // Calculate average frame time
        if (this.performanceMetrics.lastFrameTime > 0) {
            const frameDelta = now - this.performanceMetrics.lastFrameTime;
            this.performanceMetrics.avgFrameTime = 
                (this.performanceMetrics.avgFrameTime + frameDelta) / 2;
        }
        this.performanceMetrics.lastFrameTime = now;
        
        // Monitor memory usage (if available)
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        
        this.updatePerformanceDisplay();
        
        // Performance alerts
        if (this.performanceMetrics.fps < 30) {
            console.warn('Low FPS detected:', this.performanceMetrics.fps);
        }
        
        if (this.performanceMetrics.memoryUsage > 50) {
            console.warn('High memory usage detected:', this.performanceMetrics.memoryUsage, 'MB');
        }
    }
    
    updatePerformanceDisplay() {
        this.safeUpdateElement('fps', this.performanceMetrics.fps);
        this.safeUpdateElement('memory', this.performanceMetrics.memoryUsage);
    }
    
    stopPerformanceMonitoring() {
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
    }
    
    // Enhanced error handling
    handleGameError(context, error) {
        this.errorCount++;
        const errorInfo = {
            context,
            error: error.message || error,
            timestamp: new Date().toISOString(),
            gameState: this.getGameStateSnapshot()
        };
        
        this.criticalErrors.push(errorInfo);
        console.error('Game error:', errorInfo);
        
        if (this.errorCount >= this.CONFIG.MAX_ERRORS) {
            this.handleCriticalError('Too many errors occurred', error);
            return;
        }
        
        // Attempt graceful recovery
        this.attemptRecovery(context, error);
    }
    
    handleCriticalError(message, error) {
        console.error('Critical error:', message, error);
        this.showErrorMessage(message + '. Game will restart.');
        
        const timer = setTimeout(() => {
            this.restart();
        }, 2000);
        
        this.timers.push(timer);
    }
    
    attemptRecovery(context, error) {
        try {
            switch (context) {
                case 'Collision detection error':
                    if (!this.gameState.currentPiece) {
                        this.spawnPiece();
                    }
                    break;
                case 'Canvas drawing error':
                    this.initializeCanvas();
                    break;
                case 'Input processing error':
                    this.inputHandler.reset();
                    break;
                case 'Piece spawning error':
                    this.gameState.currentPiece = null;
                    this.spawnPiece();
                    break;
                default:
                    this.validateAndFixGameState();
            }
        } catch (recoveryError) {
            this.handleCriticalError('Recovery failed', recoveryError);
        }
    }
    
    validateAndFixGameState() {
        // Validate and fix board
        if (!Array.isArray(this.gameState.board) || 
            this.gameState.board.length !== this.CONFIG.BOARD_HEIGHT) {
            this.gameState.board = this.createBoard();
        }
        
        // Validate current piece
        if (this.gameState.currentPiece && !this.validatePiece(this.gameState.currentPiece)) {
            this.spawnPiece();
        }
        
        // Validate numeric values
        this.gameState.score = Math.max(0, Math.floor(this.gameState.score || 0));
        this.gameState.level = Math.max(1, Math.min(this.CONFIG.MAX_LEVEL, Math.floor(this.gameState.level || 1)));
        this.gameState.lines = Math.max(0, Math.floor(this.gameState.lines || 0));
        this.gameState.dropInterval = Math.max(100, Math.floor(this.gameState.dropInterval || 1000));
    }
    
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        const timer = setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
        
        this.timers.push(timer);
    }
    
    getGameStateSnapshot() {
        return {
            score: this.gameState.score,
            level: this.gameState.level,
            lines: this.gameState.lines,
            gameRunning: this.gameState.gameRunning,
            gamePaused: this.gameState.gamePaused,
            gameOver: this.gameState.gameOver,
            errorCount: this.errorCount,
            performanceMetrics: { ...this.performanceMetrics }
        };
    }
    
    // Safe localStorage operations
    loadHighScore() {
        try {
            const stored = localStorage.getItem('tetrisHighScore');
            if (stored === null) return 0;
            
            const score = parseInt(stored, 10);
            if (isNaN(score) || score < 0 || score > 999999999) {
                console.warn('Invalid high score in storage, resetting');
                localStorage.removeItem('tetrisHighScore');
                return 0;
            }
            
            return score;
        } catch (error) {
            console.error('LocalStorage read error:', error);
            return 0;
        }
    }
    
    saveHighScore(score) {
        try {
            if (typeof score !== 'number' || score < 0 || score > 999999999) {
                throw new Error('Invalid score value: ' + score);
            }
            
            const sanitizedScore = Math.floor(score);
            localStorage.setItem('tetrisHighScore', sanitizedScore.toString());
        } catch (error) {
            console.error('LocalStorage write error:', error);
        }
    }
    
    // Memory management
    cleanup() {
        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];
        
        // Stop performance monitoring
        this.stopPerformanceMonitoring();
        
        // Clear input handler
        if (this.inputHandler) {
            this.inputHandler.cleanup();
        }
        
        // Clear game state references
        this.gameState.board = null;
        this.gameState.currentPiece = null;
    }
}

// Game initialization with comprehensive error handling
window.addEventListener('load', () => {
    try {
        window.tetrisGame = new TetrisGame();
        console.log('Tetris game initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Tetris game:', error);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        errorMessage.innerHTML = `
            <h2>Game Loading Error</h2>
            <p>Unable to start the game: ${error.message}</p>
            <p>Please refresh the page to try again.</p>
        `;
        document.body.appendChild(errorMessage);
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TetrisGame, SecurityValidator, InputHandler };
}
