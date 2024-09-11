const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 200,
    y: 300,
    width: 30,
    height: 30,
    speed: 5,
    jumpForce: 17,  // Increased jump force
    velocityY: 0,
    isJumping: false,
    moveLeft: false,
    moveRight: false
};

let platforms = [];
let coins = [];
let score = 0;
let coinCount = 0;
let highScore = localStorage.getItem('highScore') || 0;
highScore = parseInt(highScore, 10);

function generatePlatform(y) {
    const minWidth = Math.max(30, 100 - score / 100); // Platform width decreases as score increases
    const width = minWidth + Math.random() * (100 - minWidth);
    return {
        x: Math.random() * (canvas.width - width),
        y: y,
        width: width,
        height: 20
    };
}

function generateCoin(platform) {
    return {
        x: platform.x + platform.width / 2 - 10, // Center the coin above the platform
        y: platform.y - player.height - 20, // Place the coin one player height above the platform, with a larger gap
        width: 20,
        height: 20,
        collected: false
    };
}

// Generate initial platforms and coins
const startY = canvas.height - 200; // Start generating platforms from this y-coordinate
for (let i = 0; i < 7; i++) {
    const platform = generatePlatform(startY - i * 100);
    platforms.push(platform);
    if (Math.random() < 0.7) { // 70% chance to spawn a coin on a platform
        coins.push(generateCoin(platform));
    }
}

function drawPlayer() {
    ctx.fillStyle = '#4a90e2';
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

function drawPlatforms() {
    ctx.fillStyle = '#2ecc71';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 40, 30);
    ctx.fillText(`High Score: ${highScore}`, 40, 60);
    ctx.fillText(`Coins: ${coinCount}`, 40, 90);
}

function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            const centerX = coin.x + coin.width / 2;
            const centerY = coin.y + coin.height / 2;
            const radius = coin.width / 2;

            // Outer circle (gold rim)
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();

            // Inner circle (lighter gold)
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFDF00';
            ctx.fill();

            // Highlight
            ctx.beginPath();
            ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = '#FFF68F';
            ctx.fill();

            // '?' symbol
            ctx.fillStyle = '#FFD700';
            ctx.font = `bold ${radius * 1.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', centerX, centerY);
        }
    });
}

function update() {
    // Apply gravity
    player.velocityY += 0.8;
    player.y += player.velocityY;

    // Handle player movement
    if (player.moveLeft) {
        player.x -= player.speed;
    }
    if (player.moveRight) {
        player.x += player.speed;
    }

    // Check for collision with platforms
    platforms.forEach(platform => {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Collision from above
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.isJumping = false;
                player.y = platform.y - player.height;
                player.velocityY = 0;
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

    // Move platforms and coins down and remove off-screen ones
    if (player.y < 300) {
        const moveDistance = 300 - player.y;
        player.y = 300;
        platforms.forEach(platform => {
            platform.y += moveDistance;
        });
        coins.forEach(coin => {
            coin.y += moveDistance;
        });
        score += Math.floor(moveDistance);
    
        // Remove off-screen platforms and coins, and add new ones
        platforms = platforms.filter(platform => platform.y < canvas.height);
        coins = coins.filter(coin => coin.y < canvas.height);

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
            if (Math.random() < 0.7) { // 70% chance to spawn a coin on a platform
                coins.push(generateCoin(newPlatform));
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
            coinCount++;
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
        alert(`Game Over! Your score: ${score}\nHigh Score: ${highScore}`);
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
    const startY = canvas.height - 200; // Start generating platforms from this y-coordinate
    for (let i = 0; i < 7; i++) {
        platforms.push(generatePlatform(startY - i * 100));
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
    // We don't reset highScore here anymore
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    update();
    drawPlatforms();
    drawCoins();
    drawPlayer();
    drawScore();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
        player.moveLeft = true;
    } else if (event.code === 'ArrowRight') {
        player.moveRight = true;
    } else if (event.code === 'Space') {
        if (!player.isJumping) {
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft') {
        player.moveLeft = false;
    } else if (event.code === 'ArrowRight') {
        player.moveRight = false;
    }
});

resetGame();
gameLoop();
