const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Track key states
const keys = {};

// Sound elements
const revSound = document.getElementById('revSound');
const jumpSound = document.getElementById('jumpSound');

// Load sounds
window.addEventListener('load', () => {
    console.log('Loading sound files...');
    
    revSound.src = 'rev.mp3';
    revSound.addEventListener('canplaythrough', () => {
        console.log('Rev sound loaded successfully');
    });
    revSound.addEventListener('error', (e) => {
        console.error('Error loading rev sound:', e);
    });
    
    jumpSound.src = 'boing.mp3';
    jumpSound.addEventListener('canplaythrough', () => {
        console.log('Jump sound loaded successfully');
    });
    jumpSound.addEventListener('error', (e) => {
        console.error('Error loading jump sound:', e);
    });
});

// Sound functions
function playRevSound() {
    console.log("Attempting to play rev sound...");
    console.log("Rev sound ready state:", revSound.readyState);
    try {
        if (revSound.readyState >= 2) { // HAVE_CURRENT_DATA or better
            revSound.currentTime = 0;
            revSound.play()
                .then(() => console.log("Rev sound played successfully"))
                .catch(error => console.error('Error playing rev sound:', error));
        } else {
            console.log("Rev sound not ready yet");
        }
    } catch (error) {
        console.error('Error playing rev sound:', error);
    }
}

function playJumpSound() {
    console.log("Attempting to play jump sound...");
    console.log("Jump sound ready state:", jumpSound.readyState);
    try {
        if (jumpSound.readyState >= 2) { // HAVE_CURRENT_DATA or better
            jumpSound.currentTime = 0;
            jumpSound.play()
                .then(() => console.log("Jump sound played successfully"))
                .catch(error => console.error('Error playing jump sound:', error));
        } else {
            console.log("Jump sound not ready yet");
        }
    } catch (error) {
        console.error('Error playing jump sound:', error);
    }
}

const skins = {
    default: {
        name: 'Default',
        color: '#4a90e2',
        price: 0,
        owned: true,
        trail: {
            color: '#4a90e2',
            type: 'sparkle'
        }
    },
    red: {
        name: 'Red Hot',
        color: '#e74c3c',
        price: 50,
        owned: false,
        trail: {
            color: '#ff6b6b',
            type: 'fire'
        }
    },
    green: {
        name: 'Emerald',
        color: '#2ecc71',
        price: 100,
        owned: false,
        trail: {
            color: '#7bed9f',
            type: 'leaves'
        }
    },
    gold: {
        name: 'Golden',
        color: '#f1c40f',
        price: 200,
        owned: false,
        trail: {
            color: '#ffd700',
            type: 'stars'
        }
    },
    rainbow: {
        name: 'Rainbow',
        color: '#e056fd',
        price: 500,
        owned: false,
        trail: {
            color: '#e056fd',
            type: 'rainbow'
        }
    }
};

const player = {
    x: 200,
    y: 300,
    width: 30,
    height: 30,
    isInvincible: false,
    invincibilityTimer: 0,
    invincibilityDuration: 300, // 5 seconds at 60fps
    baseSpeed: 4, // Base movement speed
    jumpForce: 28,
    velocityY: 0,
    isJumping: false,
    moveLeft: false,
    moveRight: false,
    hasJetpack: false,
    jetpackReady: false,
    jetpackTimer: 0,
    jetpackDuration: 180,
    currentSkin: 'default',
    trailPoints: []
};

let platforms = [];
let coins = [];
let jetpacks = [];
let spikes = [];
let meteors = [];
let powerups = [];
let score = 0;
let platformsSinceLastJetpack = 0;
let coinCount = parseInt(localStorage.getItem('coinCount') || 0, 10);
let highScore = parseInt(localStorage.getItem('highScore') || 0, 10);

function generateJetpack(platform) {
    return {
        x: platform.x + platform.width / 2 - 15,
        y: platform.y - 40,
        width: 30,
        height: 40,
        collected: false
    };
}

function generatePlatform(y, isStarting = false) {
    const minWidth = Math.max(30, 100 - score / 100);
    const width = minWidth + Math.random() * (100 - minWidth);
    const isShortcut = !isStarting && Math.random() < 0.1;
    
    // Platform type probabilities (only for non-starting platforms)
    let platformType = 'normal';
    if (!isStarting) {
        // Generate a safe platform at least every third platform
        if (platforms.length >= 2 && 
            platforms[platforms.length-1].type === 'spiky' && 
            platforms[platforms.length-2].type === 'spiky') {
            // Force a safe platform
            const rand = Math.random();
            if (rand < 0.5) platformType = 'normal';
            else if (rand < 0.75) platformType = 'iceberg';
            else platformType = 'bouncy';
        } else {
            const rand = Math.random();
            if (rand < 0.15) platformType = 'bouncy';
        }
    }
    
    return {
        x: Math.random() * (canvas.width - width),
        y: y,
        width: width,
        height: 20,
        isMoving: !isShortcut && Math.random() < 0.25,
        direction: 1,
        speed: 1 + Math.random() * 2,
        isCrumbling: !isStarting && !isShortcut && Math.random() < 0.25,
        isShortcut: isShortcut,
        crumbleTimer: 0,
        type: platformType,
        bounceForce: platformType === 'bouncy' ? 20 : 0,
        color: getPlatformColor(platformType, isShortcut)
    };
}

function getPlatformColor(type, isShortcut) {
    if (isShortcut) return '#e74c3c';
    switch (type) {
        case 'bouncy': return '#FFA500';
        default: return '#2ecc71';
    }
}

function generateCoin(platform) {
    const isBlue = Math.random() < 0.1; // 10% chance for blue coin
    return {
        x: platform.x + platform.width / 2 - 10, // Center the coin above the platform
        y: platform.y - player.height - 20, // Place the coin one player height above the platform, with a larger gap
        width: 20,
        height: 20,
        collected: false,
        type: isBlue ? 'blue' : 'regular'
    };
}

// Generate initial platforms and coins
const startY = canvas.height - 200; // Start generating platforms from this y-coordinate
for (let i = 0; i < 7; i++) {
    const platform = generatePlatform(startY - i * 100);
    platforms.push(platform);
    if (Math.random() < 0.7) { // 70% chance to spawn a coin on a platform
        const newCoin = generateCoin(platform);
        newCoin.platformIndex = platforms.length - 1; // Store the platform index
        coins.push(newCoin);
    }
}

function drawPowerups() {
    powerups.forEach(powerup => {
        if (!powerup.collected) {
            // Draw star shape
            ctx.save();
            ctx.translate(powerup.x + powerup.width/2, powerup.y + powerup.height/2);
            ctx.rotate(Date.now() / 1000);
            
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5;
                const x = Math.cos(angle) * powerup.width/2;
                const y = Math.sin(angle) * powerup.height/2;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    });
}

function drawPlayer() {
    // Add rainbow effect when invincible
    if (player.isInvincible) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = `hsl(${Date.now() % 360}, 100%, 50%)`;
        ctx.lineWidth = 4;
        ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
        ctx.restore();
    }

    // Draw jetpack if active
    if (player.hasJetpack) {
        // Jetpack body
        ctx.fillStyle = '#707070';
        ctx.fillRect(player.x - 10, player.y + 5, 10, 20);
        
        // Flame effect
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(player.x - 10, player.y + 25);
        ctx.lineTo(player.x - 5, player.y + 35);
        ctx.lineTo(player.x, player.y + 25);
        ctx.fill();
    }

    // Player body with current skin
    ctx.fillStyle = skins[player.currentSkin].color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 5, player.y + 5, 8, 8);
    ctx.fillRect(player.x + player.width - 13, player.y + 5, 8, 8);
    
    // Draw pupils
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 7, player.y + 7, 4, 4);
    ctx.fillRect(player.x + player.width - 11, player.y + 7, 4, 4);
}

function drawShop() {
    if (!shopOpen) return;
    
    // Shop background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Shop title
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Skin Shop', canvas.width/2, 50);
    
    // Draw jetpack purchase option
    let y = 100;
    if (jetpackPurchaseAvailable) {
        // Jetpack icon
        ctx.fillStyle = '#505050';
        ctx.fillRect(canvas.width/2 - 100, y, 30, 30);
        
        // Jetpack name
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '18px Arial';
        ctx.fillText('Starter Jetpack', canvas.width/2 - 50, y + 20);
        
        // Price (moved further right)
        ctx.fillStyle = coinCount >= 100 ? '#2ecc71' : '#e74c3c';
        ctx.fillText('100 coins', canvas.width/2 + 100, y + 20);
        
        y += 50;
    }

    // Draw skins
    Object.entries(skins).forEach(([id, skin]) => {
        // Skin preview box
        ctx.fillStyle = skin.color;
        ctx.fillRect(canvas.width/2 - 100, y, 30, 30);
        
        // Skin name and price
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.font = '18px Arial';
        ctx.fillText(skin.name, canvas.width/2 - 50, y + 20);
        
        // Price or "Owned" status
        if (skin.owned) {
            if (player.currentSkin === id) {
                ctx.fillStyle = '#2ecc71';
                ctx.fillText('EQUIPPED', canvas.width/2 + 50, y + 20);
            } else {
                ctx.fillStyle = '#3498db';
                ctx.fillText('OWNED', canvas.width/2 + 50, y + 20);
            }
        } else {
            ctx.fillStyle = coinCount >= skin.price ? '#2ecc71' : '#e74c3c';
            ctx.fillText(`${skin.price} coins`, canvas.width/2 + 50, y + 20);
        }
        y += 50;
    });
    
    // Close button
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(canvas.width - 60, 20, 40, 40);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('X', canvas.width - 40, 45);
}

function drawPlatforms() {
    platforms.forEach(platform => {
        // Base platform
        ctx.fillStyle = platform.isCrumbling ? '#8e44ad' : platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Special platform features
        switch (platform.type) {
            case 'bouncy':
                drawBouncyPlatform(platform);
                break;
        }
    });
}


function drawBouncyPlatform(platform) {
    // Spring coils
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    const coilWidth = 10;
    const numCoils = Math.floor(platform.width / 20);
    for (let i = 0; i < numCoils; i++) {
        const x = platform.x + (i * platform.width / numCoils) + coilWidth;
        ctx.beginPath();
        ctx.moveTo(x, platform.y);
        ctx.lineTo(x, platform.y + platform.height);
        ctx.stroke();
    }
}


function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 100, 30);
    ctx.fillText(`Personal Best: ${highScore}`, 100, 60);
    ctx.fillText(`Coins: ${coinCount}`, 100, 90);
    
    // Draw jetpack timer if active
    if (player.hasJetpack) {
        const timeLeft = Math.ceil((player.jetpackDuration - player.jetpackTimer) / 60); // Convert to seconds
        ctx.fillStyle = timeLeft <= 3 ? 'red' : 'black';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Jetpack: ${timeLeft}s`, canvas.width / 2, canvas.height - 30);
        ctx.textAlign = 'left'; // Reset text alignment
    }
}

function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            const centerX = coin.x + coin.width / 2;
            const centerY = coin.y + coin.height / 2;
            const radius = coin.width / 2;

            // Colors based on coin type
            const colors = coin.type === 'blue' ? {
                outer: '#4169E1',    // Royal Blue
                inner: '#6495ED',    // Cornflower Blue
                highlight: '#87CEFA' // Light Sky Blue
            } : {
                outer: '#FFD700',    // Gold
                inner: '#FFDF00',    // Yellow
                highlight: '#FFF68F' // Light Yellow
            };

            // Outer circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = colors.outer;
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = colors.inner;
            ctx.fill();

            // Highlight
            ctx.beginPath();
            ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = colors.highlight;
            ctx.fill();

            // Symbol
            ctx.fillStyle = colors.outer;
            ctx.font = `bold ${radius * 1.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(coin.type === 'blue' ? '10' : '?', centerX, centerY);
        }
    });
}

function drawTrail() {
    const skin = skins[player.currentSkin];
    const trail = skin.trail;
    
    // Add new trail point
    if (player.velocityY !== 0 || player.moveLeft || player.moveRight) {
        player.trailPoints.push({
            x: player.x + player.width / 2,
            y: player.y + player.height,
            age: 0
        });
    }
    
    // Update and draw trail points
    for (let i = player.trailPoints.length - 1; i >= 0; i--) {
        const point = player.trailPoints[i];
        point.age++;
        
        if (point.age > 20) {
            player.trailPoints.splice(i, 1);
            continue;
        }
        
        const opacity = 1 - (point.age / 20);
        ctx.globalAlpha = opacity;
        
        switch (trail.type) {
            case 'fire':
                drawFireParticle(point, trail.color);
                break;
            case 'leaves':
                drawLeafParticle(point, trail.color);
                break;
            case 'stars':
                drawStarParticle(point, trail.color);
                break;
            case 'sparkle':
                drawSparkleParticle(point, trail.color);
                break;
            case 'rainbow':
                drawRainbowParticle(point);
                break;
        }
    }
    ctx.globalAlpha = 1;
}

function drawFireParticle(point, color) {
    const size = 10 - (point.age / 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x - size/2, point.y - size);
    ctx.lineTo(point.x + size/2, point.y - size);
    ctx.closePath();
    ctx.fill();
}

function drawLeafParticle(point, color) {
    const size = 8 - (point.age / 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, size, size/2, point.age/2, 0, Math.PI * 2);
    ctx.fill();
}

function drawStarParticle(point, color) {
    const size = 8 - (point.age / 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5;
        const x = point.x + Math.cos(angle) * size;
        const y = point.y + Math.sin(angle) * size;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawSparkleParticle(point, color) {
    const size = 6 - (point.age / 4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
}


function drawRainbowParticle(point) {
    const size = 8 - (point.age / 3);
    // Cycle through rainbow colors based on age
    const hue = (point.age * 20) % 360;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
}


function createMeteor() {
    return {
        x: Math.random() * canvas.width,
        y: -30,
        size: 20 + Math.random() * 20,
        speed: 5 + Math.random() * 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
    };
}

function generatePowerup(platform) {
    return {
        x: platform.x + platform.width / 2 - 15,
        y: platform.y - 30,
        width: 30,
        height: 30,
        collected: false,
        type: 'invincibility'
    };
}

function update() {
    // Update invincibility
    if (player.isInvincible) {
        player.invincibilityTimer++;
        if (player.invincibilityTimer >= player.invincibilityDuration) {
            player.isInvincible = false;
            player.invincibilityTimer = 0;
        }
    }

    // Spawn meteors based on score
    if (score > 2000 && Math.random() < 0.002 + (score / 100000)) {
        meteors.push(createMeteor());
    }

    // Update meteors
    meteors.forEach((meteor, index) => {
        meteor.y += meteor.speed;
        meteor.rotation += meteor.rotationSpeed;
        
        // Check collision with player
        const dx = (player.x + player.width/2) - (meteor.x + meteor.size/2);
        const dy = (player.y + player.height/2) - (meteor.y + meteor.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width/2 + meteor.size/2) && !player.isInvincible) {
            resetGame();
            return;
        }
        
        // Remove meteors that are off screen
        if (meteor.y > canvas.height) {
            meteors.splice(index, 1);
        }
    });

    // Handle jetpack physics and timer
    if (player.hasJetpack) {
        player.jetpackTimer++;
        if (player.jetpackTimer >= player.jetpackDuration) {
            player.hasJetpack = false;
            player.jetpackTimer = 0;
        }
        player.velocityY = -8;
    }

    // Apply gravity if not using jetpack
    if (!player.hasJetpack) {
        player.velocityY += 2.0;
    }
    player.y += player.velocityY;

    // Check for jetpack collection
    jetpacks.forEach(jetpack => {
        if (!jetpack.collected &&
            player.x < jetpack.x + jetpack.width &&
            player.x + player.width > jetpack.x &&
            player.y < jetpack.y + jetpack.height &&
            player.y + player.height > jetpack.y) {
            jetpack.collected = true;
            player.jetpackReady = true;
            player.hasJetpack = false;
            player.jetpackTimer = 0;
            // Add lightning effect at jetpack position
            lightningEffects.push(createLightningEffect(
                jetpack.x + jetpack.width/2,
                jetpack.y + jetpack.height/2
            ));
        }
    });

    // Calculate current speed based on score (no maximum speed)
    const speedIncrease = score / 500;
    const currentSpeed = player.baseSpeed + speedIncrease;

    // Handle player movement with dynamic speed
    if (player.moveLeft) {
        player.x -= currentSpeed;
    }
    if (player.moveRight) {
        player.x += currentSpeed;
    }

    // Update and check for collision with platforms
    platforms.forEach((platform, index) => {
        // Move platform if it's a moving platform
        if (platform.isMoving) {
            const moveAmount = platform.direction * platform.speed;
            platform.x += moveAmount;
            if (platform.x <= 0 || platform.x + platform.width >= canvas.width) {
                platform.direction *= -1; // Reverse direction when hitting the edge
            }
        
        }

        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Collision from above
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                // Check for spiky platform collision from above
                if (platform.type === 'spiky') {
                    resetGame();
                    return;
                }
                
                player.isJumping = false;
                player.y = platform.y - player.height;
                
                // Handle bouncy platforms
                if (platform.type === 'bouncy') {
                    player.velocityY = -platform.bounceForce;
                    playJumpSound();
                } else {
                    player.velocityY = 0;
                }
                
                // Handle iceberg physics (slippery)
                if (platform.type === 'iceberg') {
                    if (player.moveLeft) player.x -= player.speed * 1.5;
                    if (player.moveRight) player.x += player.speed * 1.5;
                }
                
                // Move player with the platform if it's moving horizontally
                if (platform.isMoving) {
                    player.x += platform.direction * platform.speed;
                }

                // Handle crumbling and shortcut platforms
                if (platform.isCrumbling || platform.isShortcut) {
                    platform.crumbleTimer++;
                    const timeout = platform.isShortcut ? 60 : 60;
                    if (platform.crumbleTimer > timeout) {
                        platforms.splice(index, 1);
                    }
                }
            }
            // Collision from below
            else if (player.velocityY < 0 && player.y - player.velocityY >= platform.y + platform.height) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Collision from the side
            else {
                if (player.x + player.width / 2 < platform.x + platform.width / 2) {
                    player.x = platform.x - player.width;
                } else {
                    player.x = platform.x + platform.width;
                }
            }
        }
    });

    // Move platforms, coins, and jetpacks down and remove off-screen ones
    if (player.y < 300) {
        const moveDistance = 300 - player.y;
        player.y = 300;
        platforms.forEach(platform => {
            platform.y += moveDistance;
        });
        coins.forEach(coin => {
            coin.y += moveDistance;
        });
        jetpacks.forEach(jetpack => {
            jetpack.y += moveDistance;
        });
        score += Math.floor(moveDistance);
    
        // Remove off-screen platforms, coins, and jetpacks, and add new ones
        platforms = platforms.filter(platform => platform.y < canvas.height);
        coins = coins.filter(coin => coin.y < canvas.height);
        jetpacks = jetpacks.filter(jetpack => jetpack.y < canvas.height);

        // Add new platforms and coins
        while (platforms.length < 7 || platforms[platforms.length - 1].y > 0) {
            const highestPlatform = platforms.reduce((prev, current) => 
                (prev.y < current.y) ? prev : current
            );
            const minDistance = 80; // Minimum vertical distance between platforms
            const maxDistance = 150; // Maximum vertical distance between platforms
            const newPlatformY = highestPlatform.y - minDistance - Math.random() * (maxDistance - minDistance);
            const newPlatform = generatePlatform(newPlatformY);
            platforms.push(newPlatform);
            
            // Add coin or jetpack
            platformsSinceLastJetpack++;
            
            // Only spawn items on non-moving platforms
            if (!newPlatform.isMoving) {
                if (platformsSinceLastJetpack >= 25 && platformsSinceLastJetpack <= 55 && Math.random() < 0.2) { // 20% chance within valid range
                    const newJetpack = generateJetpack(newPlatform);
                    newJetpack.platformIndex = platforms.length - 1; // Store the platform index
                    jetpacks.push(newJetpack);
                    platformsSinceLastJetpack = 0;
                } else if (Math.random() < 0.7) { // 70% chance to spawn a coin or powerup
                    if (Math.random() < 0.15) { // 15% chance for powerup instead of coin
                        const powerup = generatePowerup(newPlatform);
                        powerups.push(powerup);
                    } else {
                        const coin = generateCoin(newPlatform);
                        coins.push(coin);
                    }
                }
            }
        }
    }

    // Check for coin collection
    coins.forEach(coin => {
        if (!coin.collected &&
            player.x < coin.x + coin.width &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.height &&
            player.y + player.height > coin.y) {
            coin.collected = true;
            coinCount += coin.type === 'blue' ? 10 : 1;
            localStorage.setItem('coinCount', coinCount);
        }
    });

    // Sort platforms by y-coordinate (highest to lowest)
    platforms.sort((a, b) => a.y - b.y);

    // Game over if player falls off screen
    if (player.y > canvas.height) {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
        resetGame();
    }

    // Wrap player around screen edges
    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }
}

function resetGame() {
    platforms.length = 0;
    coins.length = 0;
    jetpacks.length = 0;
    meteors.length = 0;
    powerups.length = 0;
    gameStartTime = Date.now();
    if (!player.hasJetpack) {
        jetpackPurchaseAvailable = true;
    }
    playRevSound(); // Play rev sound when game starts/restarts
    const startY = canvas.height - 200; // Start generating platforms from this y-coordinate
    for (let i = 0; i < 7; i++) {
        const platform = generatePlatform(startY - i * 100, i === 0); // The first platform (i === 0) is the starting platform
        platforms.push(platform);
        if (Math.random() < 0.7) { // 70% chance to spawn a coin on a platform
            coins.push(generateCoin(platform));
        }
    }
    
    // Place the player on the lowest platform
    const lowestPlatform = platforms[0];
    player.x = lowestPlatform.x + lowestPlatform.width / 2 - player.width / 2;
    player.y = lowestPlatform.y - player.height;
    player.velocityY = 0;
    player.moveLeft = false;
    player.moveRight = false;
    player.isJumping = false;
    score = 0;
    platformsSinceLastJetpack = 0;
    // We don't reset highScore or coinCount here anymore
}

// Store stars and planets as global variables
const stars = Array(200).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 3, // Extended height for scrolling
    size: Math.random() * 2 + 1
}));

const planets = [
    { x: 50, baseY: -500, size: 40, color: '#FF6B6B', hasRings: false, details: 3 },  // Red planet
    { x: 300, baseY: -1200, size: 60, color: '#4ECDC4', hasRings: true, details: 2 }, // Saturn-like
    { x: 150, baseY: -2000, size: 80, color: '#96CEB4', hasRings: false, details: 4 }, // Gas giant
    { x: 250, baseY: -2800, size: 45, color: '#FFB347', hasRings: true, details: 2 }  // Orange ringed planet
];

function drawStar(x, y, size) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlanet(x, y, size, color, hasRings, details) {
    // Main planet body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw rings if the planet has them
    if (hasRings) {
        // Outer ring
        ctx.beginPath();
        ctx.ellipse(x, y, size * 1.8, size * 0.5, -Math.PI / 6, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = size * 0.2;
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.ellipse(x, y, size * 1.5, size * 0.4, -Math.PI / 6, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}AA`;
        ctx.lineWidth = size * 0.15;
        ctx.stroke();
    }
    
    // Surface details
    for (let i = 0; i < details; i++) {
        const angle = (Math.PI * 2 * i) / details;
        const detailX = x + Math.cos(angle) * (size * 0.4);
        const detailY = y + Math.sin(angle) * (size * 0.4);
        const detailSize = size * (0.2 + Math.random() * 0.3);
        
        ctx.fillStyle = `${color}88`;
        ctx.beginPath();
        ctx.arc(detailX, detailY, detailSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Highlight effect
    const gradient = ctx.createRadialGradient(
        x - size * 0.3, y - size * 0.3, size * 0.1,
        x, y, size
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

function drawMilkyWay(y) {
    const gradient = ctx.createRadialGradient(
        canvas.width/2, y, 0,
        canvas.width/2, y, canvas.width
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(155, 176, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - canvas.width/2, canvas.width, canvas.width);
}

function createLightningEffect(x, y) {
    return {
        x: x,
        y: y,
        segments: [],
        age: 0,
        maxAge: 15,
        generate: function() {
            this.segments = [];
            // Create multiple lightning bolts across the screen
            for (let j = 0; j < 5; j++) {
                let currentX = Math.random() * canvas.width;
                let currentY = 0;
                const segments = [];
                for (let i = 0; i < 8; i++) {
                    const endX = currentX + (Math.random() * 100 - 50);
                    const endY = currentY + canvas.height / 8;
                    segments.push({
                        x1: currentX,
                        y1: currentY,
                        x2: endX,
                        y2: endY
                    });
                    currentX = endX;
                    currentY = endY;
                }
                this.segments.push(...segments);
            }
        }
    };
}

let lightningEffects = [];

function drawLightningEffects() {
    lightningEffects = lightningEffects.filter(effect => {
        if (effect.age === 0) {
            effect.generate();
        }
        
        // Create a full-screen flash
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * (1 - effect.age / effect.maxAge)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw lightning bolts
        effect.segments.forEach(segment => {
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - effect.age / effect.maxAge})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(segment.x1, segment.y1);
            ctx.lineTo(segment.x2, segment.y2);
            ctx.stroke();
        });
        
        effect.age++;
        return effect.age < effect.maxAge;
    });
}

function drawMeteor(meteor) {
    ctx.save();
    ctx.translate(meteor.x + meteor.size/2, meteor.y + meteor.size/2);
    ctx.rotate(meteor.rotation);
    
    // Draw meteor body
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(0, 0, meteor.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw crater details
    ctx.fillStyle = '#cc3300';
    for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const craterX = Math.cos(angle) * meteor.size/4;
        const craterY = Math.sin(angle) * meteor.size/4;
        ctx.beginPath();
        ctx.arc(craterX, craterY, meteor.size/6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw fire trail
    ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-meteor.size/2, meteor.size/2);
    ctx.lineTo(0, meteor.size * 1.5);
    ctx.lineTo(meteor.size/2, meteor.size/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawBackground() {
    // Calculate how dark the sky should be based on score
    const darkness = Math.min(0.8, score / 10000); // Max darkness of 0.8
    
    // Create gradient from sky blue to space
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, "#87CEEB"); // Sky blue
    gradient.addColorStop(1, `rgba(0, 0, ${40 + (1-darkness)*75}, ${1-darkness})`); // Fade to space
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Milky Way (visible in higher scores)
    if (score > 2000) {
        drawMilkyWay(-1000 + (score/10) % 2000);
    }
    
    // Draw stars with parallax effect
    stars.forEach(star => {
        const adjustedY = (star.y - (score/2)) % (canvas.height * 3);
        if (adjustedY < canvas.height) {
            const brightness = Math.min(1, score / 2000);
            ctx.globalAlpha = brightness;
            drawStar(star.x, adjustedY, star.size);
        }
    });
    
    // Draw planets
    planets.forEach(planet => {
        const adjustedY = planet.baseY + (score/2) % 3000;
        if (adjustedY > -100 && adjustedY < canvas.height + 100) {
            drawPlanet(planet.x, adjustedY, planet.size, planet.color, planet.hasRings, planet.details);
        }
    });
    
    ctx.globalAlpha = 1; // Reset global alpha
}

function drawJetpacks() {
    jetpacks.forEach(jetpack => {
        if (!jetpack.collected) {
            // Draw jetpack body
            ctx.fillStyle = '#505050';
            ctx.fillRect(jetpack.x, jetpack.y, jetpack.width, jetpack.height);
            
            // Draw straps
            ctx.fillStyle = '#303030';
            ctx.fillRect(jetpack.x + 5, jetpack.y, 5, 10);
            ctx.fillRect(jetpack.x + 20, jetpack.y, 5, 10);
            
            // Draw nozzles
            ctx.fillStyle = '#606060';
            ctx.fillRect(jetpack.x + 5, jetpack.y + 30, 7, 10);
            ctx.fillRect(jetpack.x + 18, jetpack.y + 30, 7, 10);
        }
    });
}

let shopOpen = false;
let gameStartTime = Date.now();
let jetpackPurchaseAvailable = true;

// Touch control areas
const touchControls = {
    left: { x: 60, y: canvas.height - 60, radius: 40 },
    jump: { x: 160, y: canvas.height - 60, radius: 40 },
    right: { x: 260, y: canvas.height - 60, radius: 40 }
};

// Check if the device is mobile/tablet
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

function addTouchControls() {
    // Only show touch controls on mobile devices
    if (!isMobileDevice()) return;

    // Shop button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(shopButton.x + 20, shopButton.y + 20, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🛍️', shopButton.x + 20, shopButton.y + 25);

    // Left button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(touchControls.left.x, touchControls.left.y, touchControls.left.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('←', touchControls.left.x, touchControls.left.y + 10);

    // Right button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(touchControls.right.x, touchControls.right.y, touchControls.right.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('→', touchControls.right.x, touchControls.right.y + 10);

    // Jump button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(touchControls.jump.x, touchControls.jump.y, touchControls.jump.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('↑', touchControls.jump.x, touchControls.jump.y + 10);
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    update();
    drawLightningEffects();
    drawPlatforms();
    drawCoins();
    drawJetpacks();
    drawTrail();
    drawPowerups();
    drawPlayer();
    drawScore();
    drawShop();
    
    // Draw GitHub button
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(githubButton.x + 20, githubButton.y + 20, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw GitHub icon
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱', githubButton.x + 20, githubButton.y + 20);

    // Draw help button
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.arc(helpButton.x + 20, helpButton.y + 20, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw controller emoji
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎮', helpButton.x + 20, helpButton.y + 20);
    
    // Draw controls popup if visible
    if (helpButton.isPopupVisible) {
        const controls = [
            '🎮 Game Controls:',
            '→ or D : Move Right',
            '← or A : Move Left',
            '↑ or W or SPACE : Jump',
            'S : Open/Close Shop',
            'Any key : Activate Jetpack'
        ];
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.roundRect(helpButton.x - 160, helpButton.y - 150, 180, 150, 8);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        controls.forEach((text, i) => {
            ctx.fillText(text, helpButton.x - 150, helpButton.y - 130 + (i * 22));
        });
    }
    
    // Draw meteors
    // Check for powerup collection
    powerups.forEach(powerup => {
        if (!powerup.collected &&
            player.x < powerup.x + powerup.width &&
            player.x + player.width > powerup.x &&
            player.y < powerup.y + powerup.height &&
            player.y + player.height > powerup.y) {
            powerup.collected = true;
            if (powerup.type === 'invincibility') {
                player.isInvincible = true;
                player.invincibilityTimer = 0;
            }
        }
    });

    meteors.forEach(meteor => drawMeteor(meteor));
    
    addTouchControls();
    requestAnimationFrame(gameLoop);
}

function handleShopClick(event) {
    if (!shopOpen) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Close button
    if (x >= canvas.width - 60 && x <= canvas.width - 20 && y >= 20 && y <= 60) {
        shopOpen = false;
        return;
    }
    
    // Check jetpack purchase
    const jetpackY = 100;
    if (jetpackPurchaseAvailable && !player.hasJetpack &&
        y >= jetpackY && y <= jetpackY + 30 && 
        x >= canvas.width/2 - 100 && x <= canvas.width/2 + 100) {
        if (coinCount >= 100) {
            coinCount -= 100;
            player.jetpackReady = true;
            player.hasJetpack = false;
            player.jetpackTimer = 0;
            jetpackPurchaseAvailable = false;
            localStorage.setItem('coinCount', coinCount);
        }
        return;
    }

    // Check skin clicks
    let skinY = jetpackPurchaseAvailable ? 150 : 100;
    Object.entries(skins).forEach(([id, skin]) => {
        if (y >= skinY && y <= skinY + 30 && x >= canvas.width/2 - 100 && x <= canvas.width/2 + 100) {
            if (skin.owned) {
                player.currentSkin = id;
            } else if (coinCount >= skin.price) {
                coinCount -= skin.price;
                skin.owned = true;
                player.currentSkin = id;
                localStorage.setItem('coinCount', coinCount);
                localStorage.setItem('skins', JSON.stringify(skins));
            }
        }
        skinY += 50;
    });
}

document.addEventListener('keydown', (event) => {
    // Activate jetpack on any key press if it's ready
    if (player.jetpackReady) {
        player.hasJetpack = true;
        player.jetpackReady = false;
    }

    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        player.moveLeft = true;
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        player.moveRight = true;
    } else if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        if (!player.isJumping) {
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
            playJumpSound(); // Play boing sound when jumping
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        player.moveLeft = false;
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        player.moveRight = false;
    } else if (!isMobileDevice() && event.code === 'KeyS') {
        shopOpen = !shopOpen;
    }
});

canvas.addEventListener('click', handleShopClick);

// Button states
const helpButton = {
    x: canvas.width - 50,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    isPopupVisible: false
};

const shopButton = {
    x: canvas.width - 50,
    y: 20,
    width: 40,
    height: 40
};

const githubButton = {
    x: canvas.width - 100,
    y: canvas.height - 50,
    width: 40,
    height: 40
};

// Handle button clicks
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if shop button was clicked (mobile only)
    if (isMobileDevice() &&
        clickX >= shopButton.x && clickX <= shopButton.x + shopButton.width &&
        clickY >= shopButton.y && clickY <= shopButton.y + shopButton.height) {
        shopOpen = !shopOpen;
        return;
    }

    // Check if help button was clicked
    if (clickX >= helpButton.x && clickX <= helpButton.x + helpButton.width &&
        clickY >= helpButton.y && clickY <= helpButton.y + helpButton.height) {
        helpButton.isPopupVisible = !helpButton.isPopupVisible;
    } else {
        helpButton.isPopupVisible = false;
    }

    // Check if GitHub button was clicked
    if (clickX >= githubButton.x && clickX <= githubButton.x + githubButton.width &&
        clickY >= githubButton.y && clickY <= githubButton.y + githubButton.height) {
        document.getElementById('githubLink').click();
    }
});

// Load saved skins on startup
const savedSkins = localStorage.getItem('skins');
if (savedSkins) {
    const loadedSkins = JSON.parse(savedSkins);
    Object.keys(skins).forEach(id => {
        if (loadedSkins[id]) {
            skins[id].owned = loadedSkins[id].owned;
        }
    });
}

// Touch event handlers
function handleTouchStart(event) {
    if (!isMobileDevice()) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touches = event.touches;

    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Check left button
        if (distance(x, y, touchControls.left.x, touchControls.left.y) < touchControls.left.radius) {
            player.moveLeft = true;
        }
        // Check right button
        if (distance(x, y, touchControls.right.x, touchControls.right.y) < touchControls.right.radius) {
            player.moveRight = true;
        }
        // Check jump button
        if (distance(x, y, touchControls.jump.x, touchControls.jump.y) < touchControls.jump.radius) {
            if (!player.isJumping) {
                player.velocityY = -player.jumpForce;
                player.isJumping = true;
                playJumpSound();
            }
        }
    }
}

function handleTouchEnd(event) {
    if (!isMobileDevice()) return;
    event.preventDefault();
    player.moveLeft = false;
    player.moveRight = false;
}

function handleTouchMove(event) {
    if (!isMobileDevice()) return;
    event.preventDefault();
}

// Add touch event listeners
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchend', handleTouchEnd);
canvas.addEventListener('touchmove', handleTouchMove);

resetGame();
gameLoop();
