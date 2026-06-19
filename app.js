let playersDatabase = [];
let dailyTargets = { easy: null, medium: null, hard: null };
let currentDifficultyStage = "easy"; 
let gameOverCrownComplete = false;

let nationalRoster = []; 
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;

let aggregatedScores = { easy: 0, medium: 0, hard: 0 };
let aggregatedMatrices = { easy: [], medium: [], hard: [] };
let aggregatedGuessesUsed = { easy: 0, medium: 0, hard: 0 };

let runtimeHtmlRowsRecord = { easy: [], medium: [], hard: [] };

const positionOrder = ["GK", "DF", "MF", "FW"];

const countryToFlagMap = {
    "Austria": "🇦🇹", "Belgium": "🇧🇪", "Croatia": "🇭🇷", "Denmark": "🇩🇰", "England": "🏴",
    "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹", "Netherlands": "🇳🇱", "Portugal": "🇵🇹",
    "Serbia": "🇷🇸", "Spain": "🇪🇸", "Switzerland": "🇨🇭", "Ukraine": "🇺🇦", "Poland": "🇵🇱",
    "Scotland": "🏴", "Argentina": "🇦🇷", "Brazil": "🇧🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
    "Ecuador": "🇪🇨", "Paraguay": "🇵🇾", "Peru": "🇵🇪", "Uruguay": "🇺🇾", "Venezuela": "🇻🇪",
    "Canada": "🇨🇦", "Costa Rica": "🇨🇷", "Honduras": "HN", "Jamaica": "🇯🇲", "Mexico": "🇲🇽",
    "Panama": "🇵🇦", "United States": "🇺🇸", "Algeria": "🇩🇿", "Cameroon": "🇨🇲",
    "Egypt": "🇪🇬", "Ghana": "🇬🇭", "Ivory Coast": "🇨🇮", "Morocco": "🇲🇦", "Nigeria": "🇳🇬",
    "Senegal": "🇸🇳", "Tunisia": "🇹🇳", "South Africa": "🇿🇦", "Australia": "🇦🇺", "IR Iran": "🇮🇷",
    "Iraq": "🇮🇶", "Japan": "🇯🇵", "Qatar": "🇶🇦", "Saudi Arabia": "🇸🇦", "South Korea": "🇰🇷",
    "Uzbekistan": "🇺🇿", "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Türkiye": "🇹🇷", "Curaçao": "🇨🇼",
    "Congo DR": "🇨🇩", "Czechia": "🇨🇿", "Bosnia And Herzegovina": "🇧🇦", "Haiti": "🇭🇹",
    "Jordan": "🇯🇴", "Sweden": "🇸🇪", "USA": "🇺🇸", "Cabo Verde": "🇨🇻"
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

function toggleInstructionsModal() {
    const infoModal = document.getElementById('instructions-modal');
    infoModal.classList.toggle('hidden');
}

function synchronizeTrackerVisualStates() {
    const stages = ["easy", "medium", "hard"];
    stages.forEach(stg => {
        const el = document.getElementById(`tag-${stg}`);
        el.classList.remove('active-challenge', 'can-inspect');
        if (stg === currentDifficultyStage) {
            el.classList.add('active-challenge');
        }
        if (gameOverCrownComplete) {
            el.classList.add('can-inspect');
        }
    });
}

function loadCurrentProgressOrStart() {
    const grid = document.getElementById('guess-grid');
    grid.innerHTML = '';
    guessesRemaining = totalGuessesAllowed;
    synchronizeTrackerVisualStates();

    let targetPlayer = dailyTargets[currentDifficultyStage];
    
    if (currentDifficultyStage === "easy") {
        baseDifficultyPoints = 1000;
    } else if (currentDifficultyStage === "medium") {
        baseDifficultyPoints = 2000;
    } else {
        baseDifficultyPoints = 3000;
    }

    const countryFlag = getNationalFlag(targetPlayer.national_team);
    document.getElementById('target-country-clue').innerHTML = `
        <span>${targetPlayer.national_team}</span> 
        <span class="flag-emoji">${countryFlag}</span>
    `;
    
    nationalRoster = playersDatabase.filter(p => p.national_team === targetPlayer.national_team);
    
    // CHANGED: Render 6 blank placeholders instead of 5 so the first hint doesn't leave only 4 rows
    for (let i = 0; i < 6; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'guess-row placeholder-row';
        placeholder.id = `row-slot-${i}`;
        
        for (let t = 0; t < 6; t++) {
            const emptyTile = document.createElement('div');
            emptyTile.className = 'tile';
            emptyTile.innerHTML = '&nbsp;';
            placeholder.appendChild(emptyTile);
        }
        grid.appendChild(placeholder);
    }

// --- UPDATE THIS BLOCK (At the very end of loadCurrentProgressOrStart) ---
    renderRosterSidebar();
    updateStatusUI();
    
    // Trigger the initial wrong guess hint after a 1-second (1000ms) delay
    setTimeout(() => {
        triggerInitialWrongGuess();
    }, 1000); 
}

function inspectHistoricStage(selectedStage) {
    if (!gameOverCrownComplete) return;
    currentDifficultyStage = selectedStage;
    synchronizeTrackerVisualStates();
    
    let targetPlayer = dailyTargets[selectedStage];
    const countryFlag = getNationalFlag(targetPlayer.national_team);
    document.getElementById('target-country-clue').innerHTML = `
        <span>${targetPlayer.national_team}</span> 
        <span class="flag-emoji">${countryFlag}</span>
    `;
    
    const grid = document.getElementById('guess-grid');
    grid.innerHTML = '';
    
    runtimeHtmlRowsRecord[selectedStage].forEach(rowClone => {
        grid.appendChild(rowClone.cloneNode(true));
    });

    const filledRowsCount = runtimeHtmlRowsRecord[selectedStage].length;
    for (let i = filledRowsCount; i < totalGuessesAllowed; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'guess-row placeholder-row';
        placeholder.id = `row-slot-${i}`;
        for (let t = 0; t < 6; t++) {
            const emptyTile = document.createElement('div');
            emptyTile.className = 'tile';
            emptyTile.innerHTML = '&nbsp;';
            placeholder.appendChild(emptyTile);
        }
        grid.appendChild(placeholder);
    }

    document.getElementById('guesses-left').textContent = totalGuessesAllowed - aggregatedGuessesUsed[selectedStage];
    document.getElementById('potential-score').textContent = aggregatedScores[selectedStage];
}

function renderRosterSidebar() {
    positionOrder.forEach(pos => {
        const container = document.getElementById(`roster-list-${pos}`);
        if (container) container.innerHTML = '';
    });

    if (gameOverCrownComplete) return;

    const sortedRoster = [...nationalRoster].sort((a, b) => a.name.localeCompare(b.name));

    sortedRoster.forEach(player => {
        const targetContainer = document.getElementById(`roster-list-${player.position}`);
        if (!targetContainer) return;

        const item = document.createElement('div');
        item.className = 'roster-item';
        item.textContent = player.name;
        item.title = `${player.name} (${player.position})`;
        
        item.addEventListener('click', function handlesRosterClick() {
            if (guessesRemaining <= 0 || gameOverCrownComplete) return;
            evaluateCustomGuess(player, true);
            // FIXED: window.scrollTo({ top: 0 }) has been deleted from here to stop the jumping issue!
        });

        targetContainer.appendChild(item);
    });
}

function triggerInitialWrongGuess() {
    let targetPlayer = dailyTargets[currentDifficultyStage];
    
    const deterministicWrongOptions = nationalRoster
        .filter(p => p.name.toUpperCase() !== targetPlayer.name.toUpperCase())
        .sort((a, b) => a.name.localeCompare(b.name));

    if (deterministicWrongOptions.length > 0) {
        const today = new Date();
        const firstRowSeedString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${currentDifficultyStage}-FIRST_LINE_HINT`;
        
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
    const row = document.createElement('div');
    row.className = 'guess-row';

    let rowEmojis = [];

    // Name
    const nameTile = document.createElement('div');
    const isNameCorrect = guess.name.toUpperCase() === targetPlayer.name.toUpperCase();
    nameTile.className = 'tile ' + (isNameCorrect ? 'correct' : 'incorrect');
    nameTile.textContent = guess.name;
    row.appendChild(nameTile);
    rowEmojis.push(isNameCorrect ? '🟩' : '🟥');

    // Position
    const posTile = document.createElement('div');
    const isPosCorrect = guess.position === targetPlayer.position;
    posTile.className = 'tile ' + (isPosCorrect ? 'correct' : 'incorrect');
    posTile.textContent = guess.position;
    row.appendChild(posTile);
    rowEmojis.push(isPosCorrect ? '🟩' : '🟥');

    // Club
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

    // Age
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

    // Height
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

    // Caps
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

    // Target tracking using saved historical array length
    const currentActiveIndex = runtimeHtmlRowsRecord[currentDifficultyStage].length;
    const targetSlot = document.getElementById(`row-slot-${currentActiveIndex}`);
    
    if (targetSlot) {
        targetSlot.replaceWith(row); 
    } else {
        document.getElementById('guess-grid').appendChild(row);
    }

    runtimeHtmlRowsRecord[currentDifficultyStage].push(row.cloneNode(true));

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

    // Introduce a 1-second pause so the player sees the final correct row lock onto the board first
    setTimeout(() => {
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
    }, 1000); // 1000 milliseconds = 1 second pause
}

function executeModalAdvance() {
    document.getElementById('victory-modal').classList.add('hidden');
    loadCurrentProgressOrStart();
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}

function showIntermediateModal(message, transitionButtonText) {
    document.getElementById('modal-title').textContent = "Stage Complete";
    document.getElementById('victory-text').innerHTML = `${message}<br><br>Get ready for the next tier.`;
    
    const actionsWrapper = document.getElementById('modal-actions-container');
    actionsWrapper.innerHTML = `
        <button onclick=\"executeModalAdvance()\" class=\"btn-primary\" style=\"background:#407a44; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;\">${transitionButtonText} ➔</button>
    `;

    document.getElementById('victory-modal').classList.remove('hidden');
}

function endTripleCrownGame() {
    gameOverCrownComplete = true;
    currentDifficultyStage = "hard";
    synchronizeTrackerVisualStates();
    renderRosterSidebar();
    
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    
    document.getElementById('modal-title').textContent = "Daily Challenge Complete!";
    document.getElementById('victory-text').innerHTML = `
        Three-Player Run Finished!<br>
        Easy: <strong>${aggregatedScores.easy}</strong> pts<br>
        Medium: <strong>${aggregatedScores.medium}</strong> pts<br>
        Hard: <strong>${aggregatedScores.hard}</strong> pts<br><br>
        🥇 Combined Grand Score: <strong>${grandTotalScore}</strong> pts!<br><br>
        <em>Review Tip: Tap the row tags at the top anytime to view your easy & medium boards.</em>
    `;
    
    const actionsWrapper = document.getElementById('modal-actions-container');
    actionsWrapper.innerHTML = `
        <button onclick="shareResults()" class="btn-share" style="background:#2d5a27; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%; margin-bottom:8px;">📊 Share Results</button>
        <button onclick="closeModal()" class="btn-secondary" style="background:#e6eee6; color:#1b3322; padding:11px; font-size:0.95rem; border:1px solid #a3c6a3; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">Close & Review Boards</button>
    `;

    document.getElementById('victory-modal').classList.remove('hidden');
}

function shareResults() {
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    
    const easyFlag = getNationalFlag(dailyTargets.easy ? dailyTargets.easy.national_team : "");
    const medFlag = getNationalFlag(dailyTargets.medium ? dailyTargets.medium.national_team : "");
    const hardFlag = getNationalFlag(dailyTargets.hard ? dailyTargets.hard.national_team : "");

    let shareText = `Ball Knowledge Daily (WC26) 🏆\n🏁 Multi-Stage Grand Score: ${grandTotalScore} pts\n\n`;
    
    shareText += `🟢 Easy (${easyFlag}): ${aggregatedScores.easy} pts\n`;
    shareText += `🟡 Medium (${medFlag}): ${aggregatedScores.medium} pts\n`;
    shareText += `🔴 Hard (${hardFlag}): ${aggregatedScores.hard} pts\n\n`;
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