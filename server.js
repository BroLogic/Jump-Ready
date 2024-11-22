const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

let globalHighScore = 0;

app.use(cors());
app.use(express.json());

app.get('/highscore', (req, res) => {
    res.json({ score: globalHighScore });
});

app.post('/highscore', (req, res) => {
    const newScore = req.body.score;
    if (newScore > globalHighScore) {
        globalHighScore = newScore;
        res.json({ success: true, newHighScore: globalHighScore });
    } else {
        res.json({ success: false, currentHighScore: globalHighScore });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
