let playersDatabase = [];
let nationalRoster = []; 
let targetPlayer = null;
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;

const positionOrder = ["GK", "DF", "MF", "FW"];

fetch('world_cup_players.json')
    .then(response => response.json())
    .then(data => {
        playersDatabase = data;
        startGame();
    })
    .catch(err => console.error("Error loading player database array asset:", err));

function startGame() {
    if (playersDatabase.length === 0) return;
    
    // Pick target player
    targetPlayer = playersDatabase[Math.floor(Math.random() * playersDatabase.length)];
    console.log("Target Debugger (Cheater View):", targetPlayer);

    document.getElementById('target-country-clue').textContent = `Target Nation: ${targetPlayer.national_team}`;
    
    if (targetPlayer.difficulty === "hard") baseDifficultyPoints = 3000;
    else if (targetPlayer.difficulty === "medium") baseDifficultyPoints = 2000;
    else baseDifficultyPoints = 1000;

    // Filter database to construct the specific national roster panel
    nationalRoster = playersDatabase.filter(p => p.national_team === targetPlayer.national_team);
    
    renderRosterSidebar();
    updateStatusUI();
    initFormEngine();

    // Trigger random initial wrong guess
    triggerInitialWrongGuess();
}

function renderRosterSidebar() {
    const rosterList = document.getElementById('roster-list');
    rosterList.innerHTML = '';
    
    // Sort Roster by Position hierarchy (GK -> DF -> MF -> FW) then alphabetically by name
    const sortedRoster = [...nationalRoster].sort((a, b) => {
        let orderA = positionOrder.indexOf(a.position);
        let orderB = positionOrder.indexOf(b.position);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    sortedRoster.forEach(player => {
        const item = document.createElement('div');
        item.className = 'roster-item';
        item.innerHTML = `<span>${player.name}</span> <span class="roster-pos">${player.position}</span>`;
        rosterList.appendChild(item);
    });
}

function triggerInitialWrongGuess() {
    // Select options inside the national roster that are NOT the target player
    const wrongOptions = nationalRoster.filter(p => p.name.toUpperCase() !== targetPlayer.name.toUpperCase());
    
    if (wrongOptions.length > 0) {
        const randomWrongPlayer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        // Add to grid board as hint without reducing the remaining guesses
        evaluateCustomGuess(randomWrongPlayer, false); 
    }
}

function updateStatusUI() {
    document.getElementById('guesses-left').textContent = guessesRemaining;
    let currentPotential = baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed);
    document.getElementById('potential-score').textContent = Math.round(currentPotential);
}

function initFormEngine() {
    const form = document.getElementById('guess-form');
    const nameInput = document.getElementById('input-name');
    const nameList = document.getElementById('name-autofill-list');

    nameInput.addEventListener('input', function() {
        const val = this.value.toUpperCase();
        nameList.innerHTML = '';
        if (!val) return;

        const filteredNames = nationalRoster.filter(p => p.name.toUpperCase().includes(val));

        filteredNames.slice(0, 5).forEach(player => {
            const row = document.createElement('div');
            row.textContent = player.name;
            row.addEventListener('click', () => {
                nameInput.value = player.name;
                nameList.innerHTML = '';
            });
            nameList.appendChild(row);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target !== nameInput) nameList.innerHTML = '';
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (guessesRemaining <= 0) return;

        const enteredName = nameInput.value.trim().toUpperCase();
        const matchedPlayerObj = nationalRoster.find(p => p.name.toUpperCase() === enteredName);

        if (!matchedPlayerObj) {
            alert("Player name not found in this national team roster!");
            return;
        }

        evaluateCustomGuess(matchedPlayerObj, true);
        form.reset();
    });
}

function evaluateCustomGuess(guess, countAsActiveGuess = true) {
    const grid = document.getElementById('guess-grid');
    const row = document.createElement('div');
    row.className = 'guess-row';

    // 1. Name Tile
    const nameTile = document.createElement('div');
    const isNameCorrect = guess.name.toUpperCase() === targetPlayer.name.toUpperCase();
    nameTile.className = 'tile ' + (isNameCorrect ? 'correct' : 'incorrect');
    nameTile.textContent = guess.name;
    row.appendChild(nameTile);

    // 2. Position Tile
    const posTile = document.createElement('div');
    posTile.className = 'tile ' + (guess.position === targetPlayer.position ? 'correct' : 'incorrect');
    posTile.textContent = guess.position;
    row.appendChild(posTile);

    // 3. Club / League Country Tile
    const clubTile = document.createElement('div');
    const isClubCorrect = guess.club.toUpperCase() === targetPlayer.club.toUpperCase();
    const isLeagueCorrect = guess.league_country && targetPlayer.league_country && (guess.league_country.toUpperCase() === targetPlayer.league_country.toUpperCase());
    
    if (isClubCorrect) {
        clubTile.className = 'tile correct';
    } else if (isLeagueCorrect) {
        clubTile.className = 'tile partial'; // Yellow indicator if playing within the same league country
    } else {
        clubTile.className = 'tile incorrect';
    }
    clubTile.textContent = guess.club;
    row.appendChild(clubTile);

    // 4. Age Tile (+ Up/Down Directional Arrows)
    const ageTile = document.createElement('div');
    const ageDiff = Math.abs(guess.age - targetPlayer.age);
    let ageArrow = guess.age < targetPlayer.age ? ' ↑' : ' ↓';
    if (guess.age === targetPlayer.age) {
        ageTile.className = 'tile correct';
        ageTile.textContent = guess.age;
    } else if (ageDiff <= 2) {
        ageTile.className = 'tile partial';
        ageTile.textContent = `${guess.age}${ageArrow}`;
    } else {
        ageTile.className = 'tile incorrect';
        ageTile.textContent = `${guess.age}${ageArrow}`;
    }
    row.appendChild(ageTile);

    // 5. Height Tile (+ Up/Down Directional Arrows)
    const heightTile = document.createElement('div');
    const heightDiff = Math.abs(guess.height_cm - targetPlayer.height_cm);
    let heightArrow = guess.height_cm < targetPlayer.height_cm ? ' ↑' : ' ↓';
    if (guess.height_cm === targetPlayer.height_cm) {
        heightTile.className = 'tile correct';
        heightTile.textContent = `${guess.height_cm} cm`;
    } else if (heightDiff <= 5) {
        heightTile.className = 'tile partial';
        heightTile.textContent = `${guess.height_cm} cm${heightArrow}`;
    } else {
        heightTile.className = 'tile incorrect';
        heightTile.textContent = `${guess.height_cm} cm${heightArrow}`; 
    }
    row.appendChild(heightTile);

    // 6. Caps Tile (+ Up/Down Directional Arrows)
    const capsTile = document.createElement('div');
    const capsDiff = Math.abs(guess.caps - targetPlayer.caps);
    let capsArrow = guess.caps < targetPlayer.caps ? ' ↑' : ' ↓';
    if (guess.caps === targetPlayer.caps) {
        capsTile.className = 'tile correct';
        capsTile.textContent = guess.caps;
    } else if (capsDiff <= 10) {
        capsTile.className = 'tile partial';
        capsTile.textContent = `${guess.caps}${capsArrow}`;
    } else {
        capsTile.className = 'tile incorrect';
        capsTile.textContent = `${guess.caps}${capsArrow}`;
    }
    row.appendChild(capsTile);

    grid.appendChild(row);

    if (!countAsActiveGuess) return;

    // Evaluate Win Condition
    if (isNameCorrect) {
        let finalScore = Math.round(baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed));
        endGame(true, `🎉 Masterclass! You guessed the player correctly!<br><br>Player: <strong>${targetPlayer.name}</strong><br>Difficulty Tier: <strong>${targetPlayer.difficulty.toUpperCase()}</strong><br>Final Calculated Score: <strong>${finalScore}</strong> pts!`);
        return;
    }

    guessesRemaining--;
    updateStatusUI();

    if (guessesRemaining === 0) {
        endGame(false, `❌ Out of chances! The player was actually <strong>${targetPlayer.name}</strong>.<br>Specs: ${targetPlayer.position} | ${targetPlayer.club} | ${targetPlayer.age} yrs | ${targetPlayer.height_cm}cm | ${targetPlayer.caps} caps.`);
    }
}

function endGame(isWin, message) {
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-btn').style.background = '#3a3a3c';
    document.getElementById('submit-btn').textContent = "Game Over";
    
    setTimeout(() => {
        document.getElementById('modal-title').textContent = isWin ? "🏆 Spec Mastery! 🏆" : "💥 Defeat 💥";
        document.getElementById('victory-text').innerHTML = message;
        document.getElementById('victory-modal').classList.remove('hidden');
    }, 600);
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}