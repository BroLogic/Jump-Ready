const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 200,
    y: 550,
    width: 30,
    height: 30,
    speed: 5,
    jumpForce: 15,
    velocityY: 0,
    isJumping: false
};

const platforms = [];
let score = 0;
let highScore = 0;

function generatePlatform(y) {
    return {
        x: Math.random() * (canvas.width - 70),
        y: y,
        width: 70,
        height: 20
    };
}

// Generate initial platforms
for (let i = 0; i < 5; i++) {
    platforms.push(generatePlatform(i * 120));
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
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`High Score: ${highScore}`, 10, 60);
}

function update() {
    // Apply gravity
    player.velocityY += 0.8;
    player.y += player.velocityY;

    // Check for collision with platforms
    platforms.forEach(platform => {
        if (player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height &&
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.velocityY > 0) {
            player.isJumping = false;
            player.y = platform.y - player.height;
            player.velocityY = 0;
        }
    });

    // Move platforms down and remove off-screen platforms
    if (player.y < 300) {
        player.y += 2;
        platforms.forEach(platform => {
            platform.y += 2;
        });
        score++;
        
        // Remove off-screen platforms and add new ones
        platforms = platforms.filter(platform => platform.y < canvas.height);
        while (platforms.length < 5) {
            platforms.push(generatePlatform(0));
        }
    }

    // Game over if player falls off screen
    if (player.y > canvas.height) {
        if (score > highScore) {
            highScore = score;
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
    player.x = 200;
    player.y = 550;
    player.velocityY = 0;
    platforms.length = 0;
    for (let i = 0; i < 5; i++) {
        platforms.push(generatePlatform(i * 120));
    }
    score = 0;
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
    drawPlayer();
    drawScore();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
        player.x -= player.speed;
    } else if (event.code === 'ArrowRight') {
        player.x += player.speed;
    } else if (event.code === 'Space' && !player.isJumping) {
        player.velocityY = -player.jumpForce;
        player.isJumping = true;
    }
});

gameLoop();
