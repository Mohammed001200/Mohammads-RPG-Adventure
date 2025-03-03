// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get UI elements
const startScreen = document.getElementById('start-screen');
const loadingScreen = document.getElementById('loading');
const gameOverScreen = document.getElementById('game-over');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Game variables
let gameRunning = false;
let gameTime = 0;
let lastTime = 0;
let score = 0;
let animationFrameId;
let player;
let bullets = [];
let enemies = [];
let effects = [];
let items = [];
let mouseX = 0;
let mouseY = 0;

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
    ' ': false // Space
};

// Initialize game
function initGame() {
    // Set canvas size
    canvas.width = window.innerWidth - 40;
    canvas.height = window.innerHeight - 200;
    
    // Initialize game variables
    gameRunning = true;
    gameTime = 0;
    lastTime = 0;
    score = 0;
    
    // Initialize player
    player = {
        x: canvas.width / 2 - 25,
        y: canvas.height / 2 - 25,
        width: 50,
        height: 50,
        speed: 5,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        coins: 0,
        direction: 'down',
        isMoving: false,
        isAttacking: false,
        frame: 0,
        frameCount: 4,
        frameTimer: 0,
        frameDelay: 5,
        attackCooldown: 0,
        attackCooldownMax: 15,
        bulletSize: 10,
        bulletPower: 3,
        bulletColor: '#ffffff',
        bulletEffect: 'normal',
        shieldActive: false,
        shieldTimer: 0,
        shieldDuration: 300
    };
    
    // Initialize arrays
    bullets = [];
    enemies = [];
    effects = [];
    items = [];
    
    // Update UI
    updateUI();
    
    // Create initial enemies
    for (let i = 0; i < 5; i++) {
        spawnEnemy();
    }
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    try {
        // Calculate delta time
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        gameTime += deltaTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update game objects
        updatePlayer(deltaTime);
        updateBullets();
        updateEnemies(deltaTime);
        updateEffects();
        
        // Spawn enemies
        if (enemies.length < 5 + Math.floor(gameTime / 10000)) {
            spawnEnemy();
        }
        
        // Draw game objects
        drawBackground();
        drawItems();
        drawEnemies();
        drawPlayer();
        drawBullets();
        drawEffects();
        drawUI();
        
        // Debug info
        drawDebugInfo();
        
    } catch (error) {
        console.error("Error in game loop:", error);
    }
    
    // Continue game loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Update player
function updatePlayer(deltaTime) {
    // Movement
    let moveX = 0;
    let moveY = 0;
    
    if ((keys.w || keys.ArrowUp) && player.y > 0) {
        moveY -= player.speed;
        player.direction = 'up';
    }
    if ((keys.s || keys.ArrowDown) && player.y < canvas.height - player.height) {
        moveY += player.speed;
        player.direction = 'down';
    }
    if ((keys.a || keys.ArrowLeft) && player.x > 0) {
        moveX -= player.speed;
        player.direction = 'left';
    }
    if ((keys.d || keys.ArrowRight) && player.x < canvas.width - player.width) {
        moveX += player.speed;
        player.direction = 'right';
    }
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
        const factor = 1 / Math.sqrt(2);
        moveX *= factor;
        moveY *= factor;
    }
    
    player.x += moveX;
    player.y += moveY;
    
    // Check if player is moving
    player.isMoving = moveX !== 0 || moveY !== 0;
    
    // Attack cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }
    
    // Mana regeneration
    if (player.mana < player.maxMana) {
        player.mana += 0.05;
        if (player.mana > player.maxMana) {
            player.mana = player.maxMana;
        }
        updateUI();
    }
    
    // Check for item collection
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (checkCollision(player, item)) {
            // Handle different item types
            switch(item.type) {
                case 'coin':
                    player.coins += 1;
                    showMessage("+1 Coin", '#ffd700');
                    break;
                    
                case 'health':
                    player.health = Math.min(player.maxHealth, player.health + 20);
                    showMessage("+20 Health", '#ff0000');
                    break;
                    
                case 'mana':
                    player.mana = Math.min(player.maxMana, player.mana + 20);
                    showMessage("+20 Mana", '#0000ff');
                    break;
                    
                case 'powerup':
                    // Handle different power-up types
                    if (item.powerType) {
                        switch(item.powerType) {
                            case 'fire':
                            case 'ice':
                            case 'poison':
                            case 'explosive':
                            case 'multi':
                                addBulletEffect(item.powerType);
                                break;
                                
                            case 'power':
                                upgradeBullets();
                                break;
                        }
                    }
                    break;
            }
            
            // Remove collected item
            items.splice(i, 1);
            updateUI();
        }
    }
    
    // Handle status effects
    if (player.shieldActive) {
        player.shieldTimer++;
        if (player.shieldTimer >= player.shieldDuration) {
            player.shieldActive = false;
        }
    }
}

// Draw player
function drawPlayer() {
    // Draw player body
    ctx.fillStyle = player.shieldActive ? '#4a90e2' : '#ff5555';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player details (face direction)
    ctx.fillStyle = '#ffffff';
    
    // Eyes and details based on direction
    switch(player.direction) {
        case 'down':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 15, player.y + 35, 20, 5);
            break;
        case 'up':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 15, player.y + 30, 20, 5);
            break;
        case 'left':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 10, player.y + 35, 15, 5);
            break;
        case 'right':
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 25, player.y + 35, 15, 5);
            break;
    }
    
    // Draw weapon/attack animation
    if (player.isAttacking) {
        ctx.fillStyle = '#ffff00';
        
        switch(player.direction) {
            case 'down':
                ctx.fillRect(player.x + 20, player.y + player.height, 10, 20);
                break;
            case 'up':
                ctx.fillRect(player.x + 20, player.y - 20, 10, 20);
                break;
            case 'left':
                ctx.fillRect(player.x - 20, player.y + 20, 20, 10);
                break;
            case 'right':
                ctx.fillRect(player.x + player.width, player.y + 20, 20, 10);
                break;
        }
    }
    
    // Draw shield effect if active
    if (player.shieldActive) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 
                player.width/2 + 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Spawn enemy
function spawnEnemy() {
    // Determine spawn position (outside screen)
    let x, y;
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    
    switch(side) {
        case 0: // top
            x = Math.random() * canvas.width;
            y = -50;
            break;
        case 1: // right
            x = canvas.width + 50;
            y = Math.random() * canvas.height;
            break;
        case 2: // bottom
            x = Math.random() * canvas.width;
            y = canvas.height + 50;
            break;
        case 3: // left
            x = -50;
            y = Math.random() * canvas.height;
            break;
    }
    
    // Determine enemy type
    const types = ['slime', 'goblin', 'skeleton'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Determine if boss (every 10th enemy)
    const isBoss = enemies.length > 0 && (enemies.length + 1) % 10 === 0;
    
    // Create enemy
    const enemy = {
        x: x,
        y: y,
        width: isBoss ? 80 : 40,
        height: isBoss ? 80 : 40,
        speed: isBoss ? 1.5 : 2.5,
        baseSpeed: isBoss ? 1.5 : 2.5,
        health: isBoss ? 100 : 20,
        maxHealth: isBoss ? 100 : 20,
        type: isBoss ? 'boss' : type,
        color: isBoss ? '#ff0000' : (type === 'slime' ? '#00ff00' : (type === 'goblin' ? '#663300' : '#cccccc')),
        isBoss: isBoss,
        direction: 'down',
        isMoving: true,
        frame: 0,
        frameCount: 4,
        frameTimer: 0,
        frameDelay: 10,
        burning: false,
        burnTimer: 0,
        burnDuration: 0,
        poisoned: false,
        poisonTimer: 0,
        poisonDuration: 0,
        frozenTimer: 0,
        frozenDuration: 0
    };
    
    enemies.push(enemy);
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        // Draw enemy body
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw enemy details based on type
        switch(enemy.type) {
            case 'slime':
                // Draw slime eyes
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(enemy.x + enemy.width * 0.25, enemy.y + enemy.height * 0.3, 
                            enemy.width * 0.15, enemy.height * 0.15);
                ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + enemy.height * 0.3, 
                            enemy.width * 0.15, enemy.height * 0.15);
                break;
                
            case 'goblin':
                // Draw goblin face
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                ctx.fillRect(enemy.x + enemy.width * 0.65, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                
                // Goblin mouth
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.6, 
                            enemy.width * 0.4, enemy.height * 0.1);
                break;
                
            case 'skeleton':
                // Draw skeleton face
                ctx.fillStyle = '#000000';
                ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                ctx.fillRect(enemy.x + enemy.width * 0.65, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                
                // Skeleton teeth
                ctx.fillStyle = '#000000';
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(enemy.x + enemy.width * (0.3 + i * 0.2), 
                                enemy.y + enemy.height * 0.6, 
                                enemy.width * 0.1, enemy.height * 0.1);
                }
                break;
                
            case 'boss':
                // Draw boss face
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                ctx.fillRect(enemy.x + enemy.width * 0.65, enemy.y + enemy.height * 0.25, 
                            enemy.width * 0.15, enemy.height * 0.15);
                
                // Boss mouth
                ctx.fillStyle = '#000000';
                ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.6, 
                            enemy.width * 0.4, enemy.height * 0.15);
                
                // Boss horns
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width * 0.2, enemy.y);
                ctx.lineTo(enemy.x + enemy.width * 0.1, enemy.y - enemy.height * 0.3);
                ctx.lineTo(enemy.x + enemy.width * 0.3, enemy.y);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width * 0.8, enemy.y);
                ctx.lineTo(enemy.x + enemy.width * 0.9, enemy.y - enemy.height * 0.3);
                ctx.lineTo(enemy.x + enemy.width * 0.7, enemy.y);
                ctx.fill();
                break;
        }
        
        // Draw health bar for enemies
        const healthBarWidth = enemy.width;
        const healthBarHeight = 5;
        const healthPercentage = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth * healthPercentage, healthBarHeight);
    });
}

// Update enemies
function updateEnemies(deltaTime) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move enemy towards player
        const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
        const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
            
            // Set direction
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.direction = dx > 0 ? 'right' : 'left';
            } else {
                enemy.direction = dy > 0 ? 'down' : 'up';
            }
            
            enemy.isMoving = true;
        } else {
            enemy.isMoving = false;
        }
        
        // Animation
        if (enemy.isMoving) {
            enemy.frameTimer++;
            if (enemy.frameTimer > enemy.frameDelay) {
                enemy.frameTimer = 0;
                enemy.frame = (enemy.frame + 1) % enemy.frameCount;
            }
        } else {
            enemy.frame = 0;
        }
        
        // Handle status effects
        if (enemy.burning) {
            enemy.burnTimer++;
            if (enemy.burnTimer % 20 === 0) {
                enemy.health -= 1;
                createEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'fire');
            }
            
            if (enemy.burnTimer >= enemy.burnDuration) {
                enemy.burning = false;
                enemy.color = enemy.isBoss ? '#ff0000' : (enemy.type === 'slime' ? '#00ff00' : (enemy.type === 'goblin' ? '#663300' : '#cccccc'));
            }
        }
        
        if (enemy.poisoned) {
            enemy.poisonTimer++;
            if (enemy.poisonTimer % 30 === 0) {
                enemy.health -= 0.5;
                createEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'poison');
            }
            
            if (enemy.poisonTimer >= enemy.poisonDuration) {
                enemy.poisoned = false;
                enemy.color = enemy.isBoss ? '#ff0000' : (enemy.type === 'slime' ? '#00ff00' : (enemy.type === 'goblin' ? '#663300' : '#cccccc'));
            }
        }
        
        if (enemy.frozenTimer < enemy.frozenDuration) {
            enemy.frozenTimer++;
            if (enemy.frozenTimer >= enemy.frozenDuration) {
                enemy.speed = enemy.baseSpeed;
                enemy.color = enemy.isBoss ? '#ff0000' : (enemy.type === 'slime' ? '#00ff00' : (enemy.type === 'goblin' ? '#663300' : '#cccccc'));
            }
        }
        
        // Check for collision with player
        if (checkCollision(enemy, player) && !player.shieldActive) {
            // Damage player
            player.health -= 5;
            
            // Knockback player
            const knockbackDistance = 30;
            const knockbackX = (dx / distance) * knockbackDistance;
            const knockbackY = (dy / distance) * knockbackDistance;
            
            player.x -= knockbackX;
            player.y -= knockbackY;
            
            // Keep player in bounds
            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
            
            // Check for game over
            if (player.health <= 0) {
                gameOver();
            }
            
            updateUI();
        }
        
        // Check if enemy is defeated
        if (enemy.health <= 0) {
            // Create death effect
            createEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'explosion');
            
            // Drop item chance
            if (Math.random() < 0.3) {
                const itemType = Math.random() < 0.6 ? 'coin' : 
                                (Math.random() < 0.5 ? 'health' : 'mana');
                createItem(enemy.x + enemy.width/2, enemy.y + enemy.height/2, itemType);
            }
            
            // Chance to drop power-up
            if (Math.random() < 0.1 || enemy.isBoss) {
                createPowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
            }
            
            // Add XP and score
            const xpGain = enemy.isBoss ? 50 : 10;
            const scoreGain = enemy.isBoss ? 100 : 20;
            player.xp += xpGain;
            score += scoreGain;
            
            // Check for level up
            if (player.xp >= player.xpToNextLevel) {
                levelUp();
            }
            
            // Remove enemy
            enemies.splice(i, 1);
            updateUI();
        }
    }
}

// Create bullet
function shootBullet() {
    try {
        if (player.attackCooldown <= 0) {
            const angle = Math.atan2(
                mouseY - (player.y + player.height/2), 
                mouseX - (player.x + player.width/2)
            );
            
            // Handle different bullet effects
            switch(player.bulletEffect) {
                case 'multi':
                    // Shoot 3 bullets in a spread
                    for (let i = -1; i <= 1; i++) {
                        const spreadAngle = angle + (i * 0.2);
                        createBullet(spreadAngle);
                    }
                    break;
                    
                case 'explosive':
                    // Create a single explosive bullet
                    createBullet(angle, true);
                    break;
                    
                default:
                    // Create a single normal bullet
                    createBullet(angle);
                    break;
            }
            
            player.attackCooldown = player.attackCooldownMax;
            player.isAttacking = true;
            
            // Reset attack animation after a short delay
            setTimeout(() => {
                player.isAttacking = false;
            }, 200);
        }
    } catch (error) {
        console.error("Error in shootBullet:", error);
    }
}

// Helper function to create a bullet
function createBullet(angle, isExplosive = false) {
    bullets.push({
        x: player.x + player.width/2 - player.bulletSize/2,
        y: player.y + player.height/2 - player.bulletSize/2,
        width: player.bulletSize,
        height: player.bulletSize,
        angle: angle,
        speed: 10,
        color: player.bulletColor,
        power: player.bulletPower,
        effect: player.bulletEffect,
        isExplosive: isExplosive
    });
}

// Draw bullets
function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Update bullets
function updateBullets() {
    try {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Move bullet
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            
            // Create trail effect based on bullet type
            if (bullet.effect === 'fire' || bullet.effect === 'poison' || bullet.effect === 'ice') {
                if (Math.random() < 0.3) {
                    createEffect(
                        bullet.x + bullet.width/2, 
                        bullet.y + bullet.height/2, 
                        bullet.effect
                    );
                }
            }
            
            // Check if bullet is out of bounds
            if (bullet.x < -bullet.width || bullet.x > canvas.width || 
                bullet.y < -bullet.height || bullet.y > canvas.height) {
                
                // If explosive bullet, create explosion at edge
                if (bullet.isExplosive) {
                    createExplosion(bullet.x, bullet.y);
                }
                
                bullets.splice(i, 1);
                continue;
            }
            
            // Check for collision with enemies
            let hitEnemy = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision(bullet, enemy)) {
                    // Apply damage based on bullet effect
                    switch(bullet.effect) {
                        case 'fire':
                            enemy.health -= bullet.power * 1.5;
                            // Apply burn effect
                            if (!enemy.burning) {
                                enemy.burning = true;
                                enemy.burnTimer = 0;
                                enemy.burnDuration = 100;
                                enemy.color = '#ff6600';
                            }
                            break;
                            
                        case 'ice':
                            enemy.health -= bullet.power;
                            // Apply slow effect
                            enemy.speed = enemy.baseSpeed * 0.5;
                            enemy.frozenTimer = 0;
                            enemy.frozenDuration = 100;
                            enemy.color = '#00ccff';
                            break;
                            
                        case 'poison':
                            enemy.health -= bullet.power * 0.7;
                            // Apply poison effect
                            if (!enemy.poisoned) {
                                enemy.poisoned = true;
                                enemy.poisonTimer = 0;
                                enemy.poisonDuration = 150;
                                enemy.color = '#00ff00';
                            }
                            break;
                            
                        case 'explosive':
                            // Create explosion and damage all nearby enemies
                            createExplosion(bullet.x, bullet.y);
                            break;
                            
                        default:
                            enemy.health -= bullet.power;
                            break;
                    }
                    
                    // Create hit effect
                    createEffect(bullet.x, bullet.y, 'hit');
                    
                    // Remove bullet unless it's explosive (which continues)
                    if (!bullet.isExplosive || bullet.effect !== 'explosive') {
                        bullets.splice(i, 1);
                        hitEnemy = true;
                    }
                    
                    break;
                }
            }
            
            if (hitEnemy) {
                continue;
            }
        }
    } catch (error) {
        console.error("Error in updateBullets:", error);
    }
}

// Create explosion effect that damages nearby enemies
function createExplosion(x, y) {
    // Visual effect
    createEffect(x, y, 'explosion');
    
    // Damage radius
    const radius = 100;
    
    // Check all enemies in radius
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyCenter = {
            x: enemy.x + enemy.width/2,
            y: enemy.y + enemy.height/2
        };
        
        const dx = enemyCenter.x - x;
        const dy = enemyCenter.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
            // Calculate damage based on distance (more damage closer to explosion)
            const damageMultiplier = 1 - (distance / radius);
            const damage = player.bulletPower * 2 * damageMultiplier;
            
            enemy.health -= damage;
            
            // Knockback effect
            const knockbackPower = 10 * damageMultiplier;
            const angle = Math.atan2(dy, dx);
            enemy.x += Math.cos(angle) * knockbackPower;
            enemy.y += Math.sin(angle) * knockbackPower;
        }
    }
}

// Create visual effect
function createEffect(x, y, type) {
    try {
        let color, size, duration;
        
        switch (type) {
            case 'explosion':
                color = '#ff6600';
                size = 40;
                duration = 20;
                break;
            case 'fire':
                color = '#ff6600';
                size = 20;
                duration = 10;
                break;
            case 'ice':
                color = '#00ccff';
                size = 20;
                duration = 15;
                break;
            case 'poison':
                color = '#00ff00';
                size = 15;
                duration = 20;
                break;
            case 'hit':
                color = '#ffffff';
                size = 10;
                duration = 5;
                break;
            case 'special':
                color = '#00ffff';
                size = 60;
                duration = 15;
                break;
            case 'heal':
                color = '#00ff00';
                size = 50;
                duration = 30;
                break;
            case 'shield':
                color = '#ffff00';
                size = 60;
                duration = 40;
                break;
            default:
                color = '#ffffff';
                size = 30;
                duration = 10;
        }
        
        effects.push({
            x: x - size/2,
            y: y - size/2,
            width: size,
            height: size,
            type: type,
            color: color,
            frame: 0,
            maxFrame: duration
        });
    } catch (error) {
        console.error("Error in createEffect:", error);
    }
}

// Draw player
function drawPlayer() {
    // Draw player body
    ctx.fillStyle = player.shieldActive ? '#4a90e2' : '#f0d090';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player details (face direction)
    ctx.fillStyle = '#663300';
    
    // Eyes and details based on direction
    switch(player.direction) {
        case 'down':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 15, player.y + 35, 20, 5);
            break;
        case 'up':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 15, player.y + 30, 20, 5);
            break;
        case 'left':
            ctx.fillRect(player.x + 10, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 10, player.y + 35, 15, 5);
            break;
        case 'right':
            ctx.fillRect(player.x + 32, player.y + 15, 8, 8);
            ctx.fillRect(player.x + 25, player.y + 35, 15, 5);
            break;
    }
}

// Draw background
function drawBackground() {
    // Draw stars
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    stars.forEach(star => {
        const brightness = 0.5 + Math.sin(gameTime * 0.001 * star.speed) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        // Draw enemy body
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw health bar
        const healthBarWidth = enemy.width;
        const healthBarHeight = 5;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(enemy.x, enemy.y - 10, healthBarWidth * healthPercent, healthBarHeight);
    });
}

// Draw bullets
function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw effects
function drawEffects() {
    effects.forEach(effect => {
        if (effect.type === 'explosion') {
            const gradient = ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.size
            );
            gradient.addColorStop(0, 'rgba(255, 255, 0, ' + effect.alpha + ')');
            gradient.addColorStop(0.5, 'rgba(255, 128, 0, ' + effect.alpha + ')');
            gradient.addColorStop(1, 'rgba(255, 0, 0, ' + effect.alpha * 0.5 + ')');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw items
function drawItems() {
    items.forEach(item => {
        switch(item.type) {
            case 'health':
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(item.x, item.y, item.width, item.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(item.x + item.width * 0.4, item.y + item.height * 0.2, 
                            item.width * 0.2, item.height * 0.6);
                ctx.fillRect(item.x + item.width * 0.2, item.y + item.height * 0.4, 
                            item.width * 0.6, item.height * 0.2);
                break;
            case 'mana':
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(item.x, item.y, item.width, item.height);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(item.x + item.width/2, item.y + item.height/2, 
                      item.width * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'coin':
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(item.x + item.width/2, item.y + item.height/2, 
                      item.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
        }
    });
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        
        // Check if bullet is out of bounds
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check for collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (checkCollision(bullet, enemy)) {
                // Damage enemy
                enemy.health -= bullet.power;
                
                // Create hit effect
                createEffect(bullet.x, bullet.y, 'hit');
                
                // Remove bullet
                bullets.splice(i, 1);
                
                // Check if enemy is defeated
                if (enemy.health <= 0) {
                    // Add score
                    score += enemy.scoreValue;
                    
                    // Add XP
                    addXP(enemy.xpValue);
                    
                    // Create death effect
                    createEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'explosion');
                    
                    // Chance to drop item
                    if (Math.random() < 0.3) {
                        dropItem(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    }
                    
                    // Remove enemy
                    enemies.splice(j, 1);
                    enemiesDefeated++;
                }
                
                break;
            }
        }
    }
}

// Update enemies
function updateEnemies() {
    enemies.forEach(enemy => {
        // Move towards player
        const dx = player.x + player.width/2 - (enemy.x + enemy.width/2);
        const dy = player.y + player.height/2 - (enemy.y + enemy.height/2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
            
            // Update direction
            if (Math.abs(dx) > Math.abs(dy)) {
                enemy.direction = dx > 0 ? 'right' : 'left';
            } else {
                enemy.direction = dy > 0 ? 'down' : 'up';
            }
        }
    });
}

// Update effects
function updateEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        
        effect.timer--;
        
        if (effect.timer <= 0) {
            effects.splice(i, 1);
            continue;
        }
        
        if (effect.type === 'explosion') {
            effect.size += 1;
            effect.alpha = effect.timer / effect.maxTimer;
        }
    }
}

// Update items
function updateItems() {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        
        // Check for collision with player
        if (checkCollision(player, item)) {
            // Apply item effect
            switch(item.type) {
                case 'health':
                    player.health = Math.min(player.maxHealth, player.health + 20);
                    showMessage("+20 Health", "#ff0000");
                    break;
                case 'mana':
                    player.mana = Math.min(player.maxMana, player.mana + 20);
                    showMessage("+20 Mana", "#0000ff");
                    break;
                case 'coin':
                    player.coins += 1;
                    score += 10;
                    showMessage("+1 Coin", "#ffd700");
                    break;
            }
            
            // Update UI
            updateUI();
            
            // Remove item
            items.splice(i, 1);
        }
    }
}

// Create effect
function createEffect(x, y, type) {
    let effect;
    
    switch(type) {
        case 'explosion':
            effect = {
                x: x,
                y: y,
                size: 10,
                alpha: 1,
                type: type,
                timer: 30,
                maxTimer: 30
            };
            break;
        case 'hit':
            effect = {
                x: x,
                y: y,
                size: 5,
                alpha: 1,
                type: type,
                timer: 10,
                maxTimer: 10
            };
            break;
    }
    
    effects.push(effect);
}

// Drop item
function dropItem(x, y) {
    const types = ['health', 'mana', 'coin'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const item = {
        x: x - 10,
        y: y - 10,
        width: 20,
        height: 20,
        type: type
    };
    
    items.push(item);
}

// Add XP
function addXP(amount) {
    player.xp += amount;
    
    // Check for level up
    if (player.xp >= player.xpToNextLevel) {
        player.level++;
        player.xp -= player.xpToNextLevel;
        player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
        
        // Show level up screen
        document.getElementById('new-level').textContent = player.level;
        levelUpScreen.classList.remove('hidden');
        
        // Pause game
        gameRunning = false;
    }
    
    updateUI();
}

// Update UI
function updateUI() {
    // Update health bar
    const healthPercent = player.health / player.maxHealth * 100;
    document.querySelector('.health-fill').style.width = healthPercent + '%';
    document.querySelector('.health-fill').nextElementSibling.textContent = 
        Math.floor(player.health) + '/' + player.maxHealth;
    
    // Update mana bar
    const manaPercent = player.mana / player.maxMana * 100;
    document.querySelector('.mana-fill').style.width = manaPercent + '%';
    document.querySelector('.mana-fill').nextElementSibling.textContent = 
        Math.floor(player.mana) + '/' + player.maxMana;
    
    // Update XP bar
    const xpPercent = player.xp / player.xpToNextLevel * 100;
    document.querySelector('.xp-fill').style.width = xpPercent + '%';
    
    // Update coins
    document.getElementById('coinCount').textContent = player.coins;
    
    // Update level
    document.getElementById('levelCount').textContent = player.level;
}

// Show message
function showMessage(text, color) {
    messageElement.textContent = text;
    messageElement.style.color = color;
    messageElement.classList.add('show');
    
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 2000);
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Game over
function gameOver() {
    gameRunning = false;
    
    // Show game over screen
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-wave').textContent = currentWave;
    gameOverScreen.classList.remove('hidden');
}

// Start game
function startGame() {
    // Hide start screen
    startScreen.classList.add('hidden');
    
    // Show UI
    uiContainer.style.display = 'flex';
    abilityBar.style.display = 'flex';
    
    // Initialize game
    initGame();
    
    // Start game loop
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Simulate loading
    simulateLoading();
    
    // Hide UI initially
    uiContainer.style.display = 'none';
    abilityBar.style.display = 'none';
    
    // Start button
    startButton.addEventListener('click', startGame);
    
    // Restart button
    restartButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        startGame();
    });
    
    // Skill options
    document.querySelectorAll('.skill-option').forEach(option => {
        option.addEventListener('click', () => {
            const skill = option.getAttribute('data-skill');
            
            switch(skill) {
                case 'strength':
                    player.bulletPower *= 1.2;
                    showMessage("Attack damage increased!", "#ffcc00");
                    break;
                case 'vitality':
                    player.maxHealth += 25;
                    player.health += 25;
                    showMessage("Max health increased!", "#ff0000");
                    break;
                case 'agility':
                    player.attackCooldownMax *= 0.85;
                    showMessage("Attack speed increased!", "#00ff00");
                    break;
            }
            
            levelUpScreen.classList.add('hidden');
            gameRunning = true;
            updateUI();
        });
    });
    
    // Keyboard input
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
        }
        
        // Number keys for abilities
        if (gameRunning) {
            if (e.key === '1') {
                fireBasicAttack();
            } else if (e.key === '2' && player.mana >= 20) {
                fireSpecialAttack();
                player.mana -= 20;
                updateUI();
            } else if (e.key === '3' && player.mana >= 30) {
                healPlayer();
                player.mana -= 30;
                updateUI();
            } else if (e.key === '4' && player.mana >= 40) {
                activateShield();
                player.mana -= 40;
                updateUI();
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
        }
    });
    
    // Mouse input
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    canvas.addEventListener('click', () => {
        if (gameRunning && player.attackCooldown <= 0) {
            fireBasicAttack();
        }
    });
    
    // Ability buttons
    document.querySelectorAll('.ability').forEach(ability => {
        ability.addEventListener('click', () => {
            if (!gameRunning) return;
            
            const type = ability.getAttribute('data-ability');
            
            switch(type) {
                case 'attack':
                    fireBasicAttack();
                    break;
                case 'special':
                    if (player.mana >= 20) {
                        fireSpecialAttack();
                        player.mana -= 20;
                        updateUI();
                    }
                    break;
                case 'heal':
                    if (player.mana >= 30) {
                        healPlayer();
                        player.mana -= 30;
                        updateUI();
                    }
                    break;
                case 'shield':
                    if (player.mana >= 40) {
                        activateShield();
                        player.mana -= 40;
                        updateUI();
                    }
                    break;
            }
        });
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        if (gameRunning) {
            canvas.width = window.innerWidth - 40;
            canvas.height = window.innerHeight - 200;
            createStars();
        }
    });
});

// Fire basic attack
function fireBasicAttack() {
    if (player.attackCooldown > 0) return;
    
    // Set attack cooldown
    player.attackCooldown = player.attackCooldownMax;
    
    // Set player attacking state
    player.isAttacking = true;
    setTimeout(() => {
        player.isAttacking = false;
    }, 200);
    
    // Calculate bullet direction
    let dx = mouseX - (player.x + player.width/2);
    let dy = mouseY - (player.y + player.height/2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
        dx = dx / dist * 10;
        dy = dy / dist * 10;
    } else {
        // Default direction if mouse is on player
        switch(player.direction) {
            case 'up': dx = 0; dy = -10; break;
            case 'down': dx = 0; dy = 10; break;
            case 'left': dx = -10; dy = 0; break;
            case 'right': dx = 10; dy = 0; break;
        }
    }
    
    // Create bullet
    const bullet = {
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        size: player.bulletSize,
        dx: dx,
        dy: dy,
        power: player.bulletPower,
        color: player.bulletColor,
        effect: player.bulletEffect
    };
    
    bullets.push(bullet);
    
    // Multi-shot if player has the ability
    if (player.multiShotLevel > 0) {
        const spreadAngle = 15 * Math.PI / 180; // 15 degrees in radians
        
        for (let i = 1; i <= player.multiShotLevel; i++) {
            const angle1 = Math.atan2(dy, dx) + spreadAngle * i;
            const angle2 = Math.atan2(dy, dx) - spreadAngle * i;
            
            const dx1 = Math.cos(angle1) * 10;
            const dy1 = Math.sin(angle1) * 10;
            const dx2 = Math.cos(angle2) * 10;
            const dy2 = Math.sin(angle2) * 10;
            
            const bullet1 = {
                x: player.x + player.width/2,
                y: player.y + player.height/2,
                size: player.bulletSize,
                dx: dx1,
                dy: dy1,
                power: player.bulletPower * 0.8,
                color: player.bulletColor,
                effect: player.bulletEffect
            };
            
            const bullet2 = {
                x: player.x + player.width/2,
                y: player.y + player.height/2,
                size: player.bulletSize,
                dx: dx2,
                dy: dy2,
                power: player.bulletPower * 0.8,
                color: player.bulletColor,
                effect: player.bulletEffect
            };
            
            bullets.push(bullet1);
            bullets.push(bullet2);
        }
    }
}

// Fire special attack
function fireSpecialAttack() {
    // Create multiple bullets in a circle
    const bulletCount = 12;
    
    for (let i = 0; i < bulletCount; i++) {
        const angle = (i / bulletCount) * Math.PI * 2;
        const dx = Math.cos(angle) * 8;
        const dy = Math.sin(angle) * 8;
        
        const bullet = {
            x: player.x + player.width/2,
            y: player.y + player.height/2,
            size: player.bulletSize,
            dx: dx,
            dy: dy,
            power: player.bulletPower * 1.5,
            color: '#ff00ff',
            effect: 'special'
        };
        
        bullets.push(bullet);
    }
    
    // Create effect
    createEffect(player.x + player.width/2, player.y + player.height/2, 'explosion');
    
    // Show message
    showMessage("Special Attack!", "#ff00ff");
}

// Heal player
function healPlayer() {
    const healAmount = player.maxHealth * 0.3;
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    
    // Create effect
    createEffect(player.x + player.width/2, player.y + player.height/2, 'heal');
    
    // Show message
    showMessage("Healed " + Math.floor(healAmount) + " HP", "#00ff00");
}

// Activate shield
function activateShield() {
    player.shieldActive = true;
    player.shieldTimer = player.shieldDuration;
    
    // Show message
    showMessage("Shield Activated!", "#4a90e2");
    
    // Deactivate shield after duration
    setTimeout(() => {
        player.shieldActive = false;
        showMessage("Shield Expired", "#4a90e2");
    }, player.shieldDuration * 16); // Convert game ticks to milliseconds
}

