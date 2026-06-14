let playersDatabase = [];
let nationalRoster = []; 
let targetPlayer = null;
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;
let finalCalculatedScore = 0;

let emojiResultMatrix = [];
const positionOrder = ["GK", "DF", "MF", "FW"];

const countryToFlagMap = {
// --- UEFA (Europe) ---
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Croatia": "🇭🇷",
    "Denmark": "🇩🇰",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷",
    "Germany": "🇩🇪",
    "Italy": "🇮🇹",
    "Netherlands": "🇳🇱",
    "Portugal": "🇵🇹",
    "Serbia": "🇷🇸",
    "Spain": "🇪🇸",
    "Switzerland": "🇨🇭",
    "Ukraine": "🇺🇦",
    "Poland": "🇵🇱",
    "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",

    // --- CONMEBOL (South America) ---
    "Argentina": "🇦🇷",
    "Brazil": "🇧🇷",
    "Chile": "🇨🇱",
    "Colombia": "🇨🇴",
    "Ecuador": "🇪🇨",
    "Paraguay": "🇵🇾",
    "Peru": "🇵🇪",
    "Uruguay": "🇺🇾",
    "Venezuela": "🇻🇪",

    // --- CONCACAF (North/Central America & Caribbean) ---
    "Canada": "🇨🇦",
    "Costa Rica": "🇨🇷",
    "Honduras": "🇭🇳",
    "Jamaica": "🇯🇲",
    "Mexico": "🇲🇽",
    "Panama": "🇵🇦",
    "USA": "🇺🇸",

    // --- CAF (Africa) ---
    "Algeria": "🇩🇿",
    "Cameroan": "🇨🇲",
    "Egypt": "🇪🇬",
    "Ghana": "🇬🇭",
    "Ivory Coast": "🇨🇮",
    "Morocco": "🇲🇦",
    "Nigeria": "🇳🇬",
    "Senegal": "🇸🇳",
    "Tunisia": "🇹🇳",
    "South Africa": "🇿🇦",

    // --- AFC (Asia) ---
    "Australia": "🇦🇺",
    "Iran": "🇮🇷",
    "Iraq": "🇮🇶",
    "Japan": "🇯🇵",
    "Qatar": "🇶🇦",
    "Saudi Arabia": "🇸🇦",
    "South Korea": "🇰🇷",
    "Uzbekistan": "🇺🇿",

    // --- OFC (Oceania) ---
    "New Zealand": "🇳🇿",
	"IR Iran": "🇮🇷",
	"Czechia": "🇨🇿",
    "Bosnia And Herzegovina": "🇧🇦",
    "Haiti": "🇭🇹",
	"Norway": "🇳🇴",
    "Türkiye": "🇹🇷",
    "Curaçao": "🇨🇼",
    "Congo DR": "🇨🇩",
	"Cabo Verde": "🇨🇻",
	"Jordan": "🇯🇴",
	"Korea Republic": "🇰🇷"
};

function getNationalFlag(countryName) {
    return countryToFlagMap[countryName] || "🏳️";
}

fetch('world_cup_players.json')
    .then(response => response.json())
    .then(data => {
        playersDatabase = data;
        startGame();
    })
    .catch(err => console.error("Error loading player database asset:", err));

function startGame() {
    if (playersDatabase.length === 0) return;
    
    targetPlayer = playersDatabase[Math.floor(Math.random() * playersDatabase.length)];
    console.log("Target Debugger (Cheater View):", targetPlayer);

    const countryFlag = getNationalFlag(targetPlayer.national_team);
    
    // Make the header content highly prominent using structured semantic spans
    document.getElementById('target-country-clue').innerHTML = `
        <span>${targetPlayer.national_team}</span> 
        <span class="flag-emoji">${countryFlag}</span>
    `;
    
    // Update the Sidebar Title dynamically with the active country name
    document.getElementById('roster-title').textContent = `${targetPlayer.national_team} Team Sheet`;
    
    if (targetPlayer.difficulty === "hard") baseDifficultyPoints = 3000;
    else if (targetPlayer.difficulty === "medium") baseDifficultyPoints = 2000;
    else baseDifficultyPoints = 1000;

    nationalRoster = playersDatabase.filter(p => p.national_team === targetPlayer.national_team);
    
    renderRosterSidebar();
    updateStatusUI();
    initFormEngine();
    triggerInitialWrongGuess();
}

function renderRosterSidebar() {
    const rosterList = document.getElementById('roster-list');
    rosterList.innerHTML = '';
    
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
    const wrongOptions = nationalRoster.filter(p => p.name.toUpperCase() !== targetPlayer.name.toUpperCase());
    if (wrongOptions.length > 0) {
        const randomWrongPlayer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
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
            alert("Player name not found in this team sheet!");
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

    let rowEmojis = [];

    // 1. Name Tile
    const nameTile = document.createElement('div');
    const isNameCorrect = guess.name.toUpperCase() === targetPlayer.name.toUpperCase();
    nameTile.className = 'tile ' + (isNameCorrect ? 'correct' : 'incorrect');
    nameTile.textContent = guess.name;
    row.appendChild(nameTile);
    rowEmojis.push(isNameCorrect ? '🟩' : '🟥');

    // 2. Position Tile
    const posTile = document.createElement('div');
    const isPosCorrect = guess.position === targetPlayer.position;
    posTile.className = 'tile ' + (isPosCorrect ? 'correct' : 'incorrect');
    posTile.textContent = guess.position;
    row.appendChild(posTile);
    rowEmojis.push(isPosCorrect ? '🟩' : '🟥');

    // 3. Club / League Country Tile
    const clubTile = document.createElement('div');
    const isClubCorrect = guess.club.toUpperCase() === targetPlayer.club.toUpperCase();
    const isLeagueCorrect = guess.league_country && targetPlayer.league_country && (guess.league_country.toUpperCase() === targetPlayer.league_country.toUpperCase());
    
    if (isClubCorrect) {
        clubTile.className = 'tile correct';
        rowEmojis.push('🟩');
    } else if (isLeagueCorrect) {
        clubTile.className = 'tile partial';
        rowEmojis.push('🟨');
    } else {
        clubTile.className = 'tile incorrect';
        rowEmojis.push('🟥');
    }
    clubTile.textContent = guess.club;
    row.appendChild(clubTile);

    // 4. Age Tile
    const ageTile = document.createElement('div');
    const ageDiff = Math.abs(guess.age - targetPlayer.age);
    let ageArrow = guess.age < targetPlayer.age ? ' ↑' : ' ↓';
    if (guess.age === targetPlayer.age) {
        ageTile.className = 'tile correct';
        ageTile.textContent = guess.age;
        rowEmojis.push('🟩');
    } else if (ageDiff <= 2) {
        ageTile.className = 'tile partial';
        ageTile.textContent = `${guess.age}${ageArrow}`;
        rowEmojis.push('🟨');
    } else {
        ageTile.className = 'tile incorrect';
        ageTile.textContent = `${guess.age}${ageArrow}`;
        rowEmojis.push('🟥');
    }
    row.appendChild(ageTile);

    // 5. Height Tile
    const heightTile = document.createElement('div');
    const heightDiff = Math.abs(guess.height_cm - targetPlayer.height_cm);
    let heightArrow = guess.height_cm < targetPlayer.height_cm ? ' ↑' : ' ↓';
    if (guess.height_cm === targetPlayer.height_cm) {
        heightTile.className = 'tile correct';
        heightTile.textContent = guess.height_cm;
        rowEmojis.push('🟩');
    } else if (heightDiff <= 5) {
        heightTile.className = 'tile partial';
        heightTile.textContent = `${guess.height_cm}${heightArrow}`;
        rowEmojis.push('🟨');
    } else {
        heightTile.className = 'tile incorrect';
        heightTile.textContent = `${guess.height_cm}${heightArrow}`; 
        rowEmojis.push('🟥');
    }
    row.appendChild(heightTile);

    // 6. Caps Tile
    const capsTile = document.createElement('div');
    const capsDiff = Math.abs(guess.caps - targetPlayer.caps);
    let capsArrow = guess.caps < targetPlayer.caps ? ' ↑' : ' ↓';
    if (guess.caps === targetPlayer.caps) {
        capsTile.className = 'tile correct';
        capsTile.textContent = guess.caps;
        rowEmojis.push('🟩');
    } else if (capsDiff <= 10) {
        capsTile.className = 'tile partial';
        capsTile.textContent = `${guess.caps}${capsArrow}`;
        rowEmojis.push('🟨');
    } else {
        capsTile.className = 'tile incorrect';
        capsTile.textContent = `${guess.caps}${capsArrow}`;
        rowEmojis.push('🟥');
    }
    row.appendChild(capsTile);

    grid.appendChild(row);

    if (!countAsActiveGuess) return;

    emojiResultMatrix.push(rowEmojis.join(''));

    if (isNameCorrect) {
        finalCalculatedScore = Math.round(baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed));
        endGame(true, `🎉 Masterclass! You found the player!<br><br>Target: <strong>${targetPlayer.name}</strong><br>Score: <strong>${finalCalculatedScore}</strong> pts!`);
        return;
    }

    guessesRemaining--;
    updateStatusUI();

    if (guessesRemaining === 0) {
        finalCalculatedScore = 0;
        endGame(false, `❌ Out of chances!<br>The target player was <strong>${targetPlayer.name}</strong>.`);
    }
}

function endGame(isWin, message) {
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-btn').style.background = '#3a3a3c';
    document.getElementById('submit-btn').textContent = "Ended";
    
    setTimeout(() => {
        document.getElementById('modal-title').textContent = isWin ? "🏆 Victory! 🏆" : "💥 Defeat 💥";
        document.getElementById('victory-text').innerHTML = message;
        document.getElementById('victory-modal').classList.remove('hidden');
    }, 600);
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}

function shareResults() {
    const totalGuessesTaken = totalGuessesAllowed - guessesRemaining;
    const guessDisplayCount = guessesRemaining === 0 && !emojiResultMatrix[emojiResultMatrix.length - 1].includes('🟩🟩🟩🟩🟩🟩') ? 'X' : totalGuessesTaken;
    const countryFlag = getNationalFlag(targetPlayer.national_team);
    
    let shareText = `Ball Knowledge (WC26) - ${targetPlayer.national_team} ${countryFlag}\n🔮 ${guessDisplayCount}/${totalGuessesAllowed} Guesses\n🎯 Score: ${finalCalculatedScore} pts\n\n`;
    shareText += emojiResultMatrix.join('\n');
    shareText += `\n\nPlay here: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({
            title: 'Ball Knowledge (WC26)',
            text: shareText
        }).catch(err => console.log('Error sharing:', err));
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            const toast = document.getElementById('toast-notification');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2500);
        }).catch(err => {
            alert("Could not copy score automatically. Copy from here:\n\n" + shareText);
        });
    }
}