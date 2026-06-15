let playersDatabase = [];
let dailyTargets = { easy: null, medium: null, hard: null };
let currentDifficultyStage = "easy"; 

let nationalRoster = []; 
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;

let aggregatedScores = { easy: 0, medium: 0, hard: 0 };
let aggregatedMatrices = { easy: [], medium: [], hard: [] };
let aggregatedGuessesUsed = { easy: 0, medium: 0, hard: 0 };

const positionOrder = ["GK", "DF", "MF", "FW"];

const countryToFlagMap = {
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Croatia": "🇭🇷",
    "Denmark": "🇩🇰",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
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
    "Argentina": "🇦🇷",
    "Brazil": "🇧🇷",
    "Chile": "🇨🇱",
    "Colombia": "🇨🇴",
    "Ecuador": "🇪🇨",
    "Paraguay": "🇵🇾",
    "Peru": "🇵🇪",
    "Uruguay": "🇺🇾",
    "Venezuela": "🇻🇪",
    "Canada": "🇨🇦",
    "Costa Rica": "🇨🇷",
    "Honduras": "🇭🇳",
    "Jamaica": "🇯🇲",
    "Mexico": "🇲🇽",
    "Panama": "🇵🇦",
    "United States": "🇺🇸",
    "Algeria": "🇩🇿",
    "Cameroan": "🇨🇲", 
    "Cameroon": "🇨🇲", 
    "Egypt": "🇪🇬",
    "Ghana": "🇬🇭",
    "Ivory Coast": "🇨🇮",
    "Morocco": "🇲🇦",
    "Nigeria": "🇳🇬",
    "Senegal": "🇸🇳",
    "Tunisia": "🇹🇳",
    "South Africa": "🇿🇦",
    "Australia": "🇦🇺",
    "IR Iran": "🇮🇷",
    "Iraq": "🇮🇶",
    "Japan": "🇯🇵",
    "Qatar": "🇶🇦",
    "Saudi Arabia": "🇸🇦",
    "South Korea": "🇰🇷",
    "Uzbekistan": "🇺🇿",
    "New Zealand": "🇳🇿",
    "Norway": "🇳🇴",
    "Türkiye": "🇹🇷",
    "Curaçao": "🇨🇼",
    "Congo DR": "🇨🇩",
    "Czechia": "🇨🇿",
    "Bosnia And Herzegovina": "🇧🇦",
    "Haiti": "🇭🇹",
    "Korea Republic": "🇰🇷",
    "Jordan": "🇯🇴",
    "Sweden": "🇸🇪",
    "USA": "🇺🇸",
    "Cabo Verde": "🇨🇻"
};

function getNationalFlag(countryName) {
    if (!countryName) return "🏳️";
    return countryToFlagMap[countryName] || "🏳️";
}

function getDailySeededIndex(seedString, maxRange) {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % maxRange;
}

fetch('world_cup_players.json')
    .then(response => response.json())
    .then(data => {
        playersDatabase = data;
        generateDailyTargets();
        loadCurrentProgressOrStart();
    })
    .catch(err => console.error("Error loading database asset collection:", err));

function generateDailyTargets() {
    const today = new Date();
    const dateStamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const easyPool = playersDatabase.filter(p => p.difficulty === "easy");
    const medPool = playersDatabase.filter(p => p.difficulty === "medium");
    const hardPool = playersDatabase.filter(p => p.difficulty === "hard");

    dailyTargets.easy = easyPool[getDailySeededIndex(dateStamp + "-EASY", easyPool.length)] || playersDatabase[0];
    dailyTargets.medium = medPool[getDailySeededIndex(dateStamp + "-MED", medPool.length)] || playersDatabase[0];
    dailyTargets.hard = hardPool[getDailySeededIndex(dateStamp + "-HARD", hardPool.length)] || playersDatabase[0];
}

function loadCurrentProgressOrStart() {
    document.getElementById('guess-grid').innerHTML = '';
    guessesRemaining = totalGuessesAllowed;

    let targetPlayer = dailyTargets[currentDifficultyStage];
    
    // UI Layout Synchronization: Isolates difficulty styling from the target country element block
    const badgeTag = document.getElementById('difficulty-level-tag');
    badgeTag.className = ""; // Wipe older configuration tracking states cleanly
    badgeTag.classList.add(`stage-${currentDifficultyStage}`);
    badgeTag.textContent = `${currentDifficultyStage.toUpperCase()} CHALLENGE`;
    
    if (currentDifficultyStage === "easy") {
        baseDifficultyPoints = 1000;
    } else if (currentDifficultyStage === "medium") {
        baseDifficultyPoints = 2000;
    } else {
        baseDifficultyPoints = 3000;
    }

    const countryFlag = getNationalFlag(targetPlayer.national_team);
    document.getElementById('target-country-clue').innerHTML = `
        <span>Target Nation: ${targetPlayer.national_team}</span> 
        <span class="flag-emoji">${countryFlag}</span>
    `;
    
    document.getElementById('roster-title').textContent = `${targetPlayer.national_team} Team Sheet`;
    
    nationalRoster = playersDatabase.filter(p => p.national_team === targetPlayer.national_team);
    
    renderRosterSidebar();
    updateStatusUI();
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
        
        item.addEventListener('click', () => {
            if (guessesRemaining <= 0) return;
            evaluateCustomGuess(player, true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        rosterList.appendChild(item);
    });
}

// FIXED: Calendar date seeding guarantees every user globally shares the exact same initial hint row
function triggerInitialWrongGuess() {
    let targetPlayer = dailyTargets[currentDifficultyStage];
    
    // Explicitly sort alphabetically to prevent raw variations across server processing environments
    const deterministicWrongOptions = nationalRoster
        .filter(p => p.name.toUpperCase() !== targetPlayer.name.toUpperCase())
        .sort((a, b) => a.name.localeCompare(b.name));

    if (deterministicWrongOptions.length > 0) {
        const today = new Date();
        const firstRowSeedString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${currentDifficultyStage}-FIRST_LINE_HINT`;
        
        // Pick the same wrong player index based on the calculated date seed
        const targetStaticIndex = getDailySeededIndex(firstRowSeedString, deterministicWrongOptions.length);
        const dailyIdenticalWrongPlayer = deterministicWrongOptions[targetStaticIndex];
        
        evaluateCustomGuess(dailyIdenticalWrongPlayer, false); 
    }
}

function updateStatusUI() {
    document.getElementById('guesses-left').textContent = guessesRemaining;
    let currentPotential = baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed);
    document.getElementById('potential-score').textContent = Math.round(currentPotential);
}

function evaluateCustomGuess(guess, countAsActiveGuess = true) {
    let targetPlayer = dailyTargets[currentDifficultyStage];
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

    // 3. Club / Country Tile
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

    aggregatedMatrices[currentDifficultyStage].push(rowEmojis.join(''));

    if (isNameCorrect) {
        let currentScore = Math.round(baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed));
        aggregatedScores[currentDifficultyStage] = currentScore;
        aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed - guessesRemaining + 1;
        processStageResolution(true);
        return;
    }

    guessesRemaining--;
    updateStatusUI();

    if (guessesRemaining === 0) {
        aggregatedScores[currentDifficultyStage] = 0;
        aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed;
        processStageResolution(false);
    }
}

function processStageResolution(isWin) {
    let targetPlayer = dailyTargets[currentDifficultyStage];
    let message = "";

    if (currentDifficultyStage === "easy") {
        message = isWin ? `🟢 Found Easy Target: <strong>${targetPlayer.name}</strong>!` : `❌ Missed Easy Target. It was <strong>${targetPlayer.name}</strong>.`;
        currentDifficultyStage = "medium";
        showIntermediateModal(message, "Advance to Medium");
    } else if (currentDifficultyStage === "medium") {
        message = isWin ? `🟡 Found Medium Target: <strong>${targetPlayer.name}</strong>!` : `❌ Missed Medium Target. It was <strong>${targetPlayer.name}</strong>.`;
        currentDifficultyStage = "hard";
        showIntermediateModal(message, "Advance to Hard");
    } else {
        endTripleCrownGame();
    }
}

function showIntermediateModal(message, transitionButtonText) {
    const items = document.querySelectorAll('.roster-item');
    items.forEach(el => el.style.pointerEvents = 'none');
    
    setTimeout(() => {
        document.getElementById('modal-title').textContent = "Stage Complete";
        document.getElementById('victory-text').innerHTML = `${message}<br><br>Get ready for the next tier.`;
        
        const buttonsContainer = document.querySelector('.modal-buttons');
        buttonsContainer.innerHTML = `
            <button onclick="closeModalAndLoadNext()" class="btn-primary" style="background:#538d4e; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; color:white;">${transitionButtonText} ➔</button>
        `;
        document.getElementById('victory-modal').classList.remove('hidden');
    }, 600);
}

function closeModalAndLoadNext() {
    document.getElementById('victory-modal').classList.add('hidden');
    loadCurrentProgressOrStart();
}

function endTripleCrownGame() {
    const items = document.querySelectorAll('.roster-item');
    items.forEach(el => el.style.pointerEvents = 'none');
    
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    
    setTimeout(() => {
        document.getElementById('modal-title').textContent = "🏁 Daily Challenge Complete! 🏁";
        document.getElementById('victory-text').innerHTML = `
            Three-Player Run Finished!<br>
            Easy: <strong>${aggregatedScores.easy}</strong> pts<br>
            Medium: <strong>${aggregatedScores.medium}</strong> pts<br>
            Hard: <strong>${aggregatedScores.hard}</strong> pts<br><br>
            🥇 Combined Grand Score: <strong>${grandTotalScore}</strong> pts!
        `;
        
        const buttonsContainer = document.querySelector('.modal-buttons');
        buttonsContainer.innerHTML = `
            <button onclick="shareResults()" class="btn-share" style="background:#00bcd4; color:white; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; margin-right:10px;">📊 Share Tri-Score Results</button>
            <button onclick="closeModal()" class="btn-secondary" style="background:#3a3a3c; color:white; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Close & Review Matrix</button>
        `;
        document.getElementById('victory-modal').classList.remove('hidden');
    }, 600);
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}

function shareResults() {
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    let shareText = `Ball Knowledge Daily (WC26) 🏆\n🏁 Multi-Stage Grand Score: ${grandTotalScore} pts\n\n`;
    
    shareText += `🟢 Easy: ${aggregatedScores.easy} pts (${aggregatedScores.easy > 0 ? aggregatedGuessesUsed.easy + '/5' : 'X/5'})\n` + aggregatedMatrices.easy.join('\n') + `\n\n`;
    shareText += `🟡 Med: ${aggregatedScores.medium} pts (${aggregatedScores.medium > 0 ? aggregatedGuessesUsed.medium + '/5' : 'X/5'})\n` + aggregatedMatrices.medium.join('\n') + `\n\n`;
    shareText += `🔴 Hard: ${aggregatedScores.hard} pts (${aggregatedScores.hard > 0 ? aggregatedGuessesUsed.hard + '/5' : 'X/5'})\n` + aggregatedMatrices.hard.join('\n') + `\n\n`;
    shareText += `Play today's puzzle: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({ title: 'Ball Knowledge Daily (WC26)', text: shareText }).catch(err => console.log(err));
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            const toast = document.getElementById('toast-notification');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2500);
        }).catch(() => {
            alert("Could not copy score automatically. Copy text block below:\n\n" + shareText);
        });
    }
}