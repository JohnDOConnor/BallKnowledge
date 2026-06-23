// --- GLOBAL CORE ENGINE VARIABLES ---
let playersDatabase = [];
let dailyTargets = { easy: null, medium: null, hard: null };
let freePlayTarget = null; // Holds the active target when in free play mode
let currentGameMode = "daily"; // 'daily' or 'free'
let currentDifficultyStage = "easy"; 
let gameOverCrownComplete = false;

let isProcessingStageTransition = false; 
let guessedPlayerNamesThisStage = [];   

let nationalRoster = []; 
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;

let aggregatedScores = { easy: 0, medium: 0, hard: 0 };
let aggregatedMatrices = { easy: [], medium: [], hard: [] };
let aggregatedGuessesUsed = { easy: 0, medium: 0, hard: 0 };

let runtimeHtmlRowsRecord = { easy: [], medium: [], hard: [] };
let freePlayRowsRecord = []; // Tracks rows specifically for free play mode
let countdownInterval = null;            

let freePlayGuessesCount = 0; // Tracks structural rows rendered to the grid container

const positionOrder = ["GK", "DF", "MF", "FW"];

const countryToFlagMap = {
    "Austria": "🇦🇹", "Belgium": "🇧🇪", "Croatia": "🇭🇷", "Denmark": "🇩🇰", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹", "Netherlands": "🇳🇱", "Portugal": "🇵🇹",
    "Serbia": "🇷🇸", "Spain": "🇪🇸", "Switzerland": "🇨🇭", "Ukraine": "🇺🇦", "Poland": "🇵🇱",
    "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Argentina": "🇦🇷", "Brazil": "🇧🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
    "Ecuador": "🇪🇨", "Paraguay": "🇵🇾", "Peru": "🇵🇪", "Uruguay": "🇺🇾", "Venezuela": "🇻🇪",
    "Canada": "🇨🇦", "Costa Rica": "🇨🇷", "Honduras": "HN", "Jamaica": "🇯🇲", "Mexico": "🇲🇽",
    "Panama": "🇵🇦", "United States": "🇺🇸", "Algeria": "🇩🇿", "Cameroon": "🇨🇲",
    "Egypt": "🇪🇬", "Ghana": "🇬🇭", "Ivory Coast": "🇨🇮", "Morocco": "🇲🇦", "Nigeria": "🇳🇬",
    "Senegal": "🇸🇳", "Tunisia": "🇹🇳", "South Africa": "🇿🇦", "Australia": "🇦🇺", "IR Iran": "🇮🇷",
    "Iraq": "🇮🇶", "Japan": "🇯🇵", "Qatar": "🇶🇦", "Saudi Arabia": "🇸🇦", "Korea Republic": "🇰🇷",
    "Uzbekistan": "🇺🇿", "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Türkiye": "🇹🇷", "Curaçao": "🇨🇼",
    "Congo DR": "🇨🇩", "Czechia": "🇨🇿", "Bosnia And Herzegovina": "🇧🇦", "Haiti": "🇭🇹",
    "Jordan": "🇯🇴", "Sweden": "🇸🇪", "USA": "🇺🇸", "Cabo Verde": "🇨🇻", "Cote d'Ivoire": "🇨🇮"
};

function getNationalFlag(countryName) {
    if (!countryName) return "🏳️";
    return countryToFlagMap[countryName] || "🏳️";
}

function getTodayDateString() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function getDailySeededIndex(seedString, maxRange) {
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % maxRange;
}

// --- APP INITIALIZATION ---
fetch('world_cup_players.json')
    .then(response => response.json())
    .then(data => {
        playersDatabase = data;
        generateDailyTargets();
        populateCountrySelectGrid();
        
        const lastPlayedDate = localStorage.getItem('lastPlayedDate');
        const today = getTodayDateString();
        
        if (lastPlayedDate === today) {
            gameOverCrownComplete = true;
            currentDifficultyStage = "hard";
            
            aggregatedScores.easy = parseInt(localStorage.getItem('savedScoreEasy')) || 0;
            aggregatedScores.medium = parseInt(localStorage.getItem('savedScoreMedium')) || 0;
            aggregatedScores.hard = parseInt(localStorage.getItem('savedScoreHard')) || 0;
            
            synchronizeTrackerVisualStates();
            endTripleCrownGame();
        } else {
            loadCurrentProgressOrStart();
            
            const hasSeenRules = localStorage.getItem('hasSeenRulesInstance');
            if (!hasSeenRules) {
                toggleInstructionsModal();
                localStorage.setItem('hasSeenRulesInstance', 'true');
            }
        }
    })
    .catch(err => console.error("Error loading database asset collection:", err));

function generateDailyTargets() {
    const today = new Date();
    const dateStamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    let easyPool = playersDatabase.filter(p => p.difficulty === "easy");
    let medPool = playersDatabase.filter(p => p.difficulty === "medium");
    let hardPool = playersDatabase.filter(p => p.difficulty === "hard");

    // Seed and pick Easy target
    let easyTarget = easyPool[getDailySeededIndex(dateStamp + "-EASY", easyPool.length)] || playersDatabase[0];
    dailyTargets.easy = easyTarget;

    // Filter out Easy team from Medium pool to prevent duplicate teams
    let filteredMedPool = medPool.filter(p => p.national_team !== easyTarget.national_team);
    if (filteredMedPool.length === 0) filteredMedPool = medPool; // Fallback safety
    let mediumTarget = filteredMedPool[getDailySeededIndex(dateStamp + "-MED", filteredMedPool.length)] || playersDatabase[0];
    dailyTargets.medium = mediumTarget;

    // Filter out Easy and Medium teams from Hard pool
    let filteredHardPool = hardPool.filter(p => p.national_team !== easyTarget.national_team && p.national_team !== mediumTarget.national_team);
    if (filteredHardPool.length === 0) filteredHardPool = hardPool; // Fallback safety
    dailyTargets.hard = filteredHardPool[getDailySeededIndex(dateStamp + "-HARD", filteredHardPool.length)] || playersDatabase[0];
}

function switchGameMode(mode) {
    // UI Visual Toggle for Buttons
    const dailyBtn = document.getElementById('btn-mode-daily');
    const freeBtn = document.getElementById('btn-mode-free');
    if (dailyBtn) dailyBtn.classList.toggle('active-mode', mode === 'daily');
    if (freeBtn) freeBtn.classList.toggle('active-mode', mode === 'free');
    
    currentGameMode = mode;
    
    if (mode === 'daily') {
        document.getElementById('difficulty-badge-container').classList.remove('hidden');
        document.getElementById('country-select-screen').classList.add('hidden');
        document.getElementById('game-board-area').classList.remove('hidden');
        
        const lastPlayedDate = localStorage.getItem('lastPlayedDate');
        if (lastPlayedDate === getTodayDateString()) {
            gameOverCrownComplete = true;
            endTripleCrownGame();
        } else {
            loadCurrentProgressOrStart();
        }
    } else {
        // FIX: Forcefully toggle display screen containers so the grid comes back into view
        document.getElementById('difficulty-badge-container').classList.add('hidden');
        document.getElementById('game-board-area').classList.add('hidden');
        document.getElementById('country-select-screen').classList.remove('hidden');
        
        // Regenerate the grid cleanly to ensure all 48 teams are click-ready
        populateCountrySelectGrid();
    }
}

function showFreePlayResolutionModal(isWin, targetName) {
    const currentCountry = freePlayTarget ? freePlayTarget.national_team : "";

    document.getElementById('modal-title').textContent = isWin ? "🏆 Congratulations!" : "Game Over";
    document.getElementById('victory-text').innerHTML = isWin 
        ? `🎉 Great job! You successfully found <strong>${targetName}</strong> for ${currentCountry}!` 
        : `❌ Out of guesses! The hidden target player was <strong>${targetName}</strong>.`;
    
    const actionsWrapper = document.getElementById('modal-actions-container');
    
    // Explicitly call switchGameMode('free') and hide the window overlay block right away
    actionsWrapper.innerHTML = `
        <button onclick="replayCurrentFreePlayTeam('${currentCountry}')" class="btn-primary" style="background:#407a44; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%; margin-bottom: 8px;">🔄 Play Same Team Again</button>
        <button onclick="switchGameMode('free'); document.getElementById('victory-modal').classList.add('hidden');" class="btn-secondary" style="background:#e6eee6; color:#1b3322; border:1px solid #a3c6a3; padding:11px; font-size:0.95rem; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">🌍 Select New Team</button>
    `;
    
    document.getElementById('victory-modal').classList.remove('hidden');
}

function populateCountrySelectGrid() {
    const gridContainer = document.getElementById('country-grid');
    gridContainer.innerHTML = '';
    
    // Gather unique countries present in your loaded JSON structure
    const uniqueCountries = [...new Set(playersDatabase.map(p => p.national_team))].sort();
    
    uniqueCountries.forEach(country => {
        const flag = getNationalFlag(country);
        const card = document.createElement('div');
        card.className = 'country-card';
        card.innerHTML = `
            <div class="country-card-flag">${flag}</div>
            <div class="country-card-name">${country}</div>
        `;
        card.addEventListener('click', () => startFreePlayCountry(country));
        gridContainer.appendChild(card);
    });
}

function startFreePlayCountry(countryName) {
    document.getElementById('country-select-screen').classList.add('hidden');
    document.getElementById('game-board-area').classList.remove('hidden');
    
    const countryPool = playersDatabase.filter(p => p.national_team === countryName);
    freePlayTarget = countryPool[Math.floor(Math.random() * countryPool.length)];
    
    isProcessingStageTransition = false;
    guessedPlayerNamesThisStage = [];
    freePlayRowsRecord = [];
    freePlayGuessesCount = 0; // Reset row element counter completely
    guessesRemaining = totalGuessesAllowed;
    
    const grid = document.getElementById('guess-grid');
    grid.innerHTML = '';
    
    document.getElementById('target-country-clue').innerHTML = `
        <span>${freePlayTarget.national_team} (Free Play)</span> 
        <span class="flag-emoji">${getNationalFlag(freePlayTarget.national_team)}</span>
    `;
    
    nationalRoster = countryPool;
    
    // Explicitly generate 6 structural slot identifiers (0 for initial hint, 1-5 for player guesses)
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
    
    renderRosterSidebar();
    
    document.getElementById('guesses-left').textContent = guessesRemaining;
    const scoreEl = document.getElementById('potential-score');
    if (scoreEl) scoreEl.textContent = "---";

    setTimeout(() => {
        triggerInitialWrongGuess();
    }, 500);
}

function toggleInstructionsModal() {
    const infoModal = document.getElementById('instructions-modal');
    const animatedElements = infoModal.querySelectorAll('.help-fade-row');
    const isNowOpening = infoModal.classList.contains('hidden');
    infoModal.classList.toggle('hidden');
    
    if (isNowOpening) {
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; 
            el.style.animation = '';
        });
    }
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
    if (currentGameMode === 'free') return;
    
    isProcessingStageTransition = false; 
    guessedPlayerNamesThisStage = [];

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
    
    // FIX: Clear any previously generated daily HTML rows row record caches if we are starting a fresh daily session view context
    runtimeHtmlRowsRecord[currentDifficultyStage] = [];

    // Initialize clean grid rows
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

    renderRosterSidebar();
    updateStatusUI();
    
    // Triggers the initial hint guess smoothly on row index 0
    setTimeout(() => {
        triggerInitialWrongGuess();
    }, 500);
}

function inspectHistoricStage(selectedStage) {
    if (!gameOverCrownComplete || currentGameMode === 'free') return;
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
    
    if (runtimeHtmlRowsRecord[selectedStage] && runtimeHtmlRowsRecord[selectedStage].length > 0) {
        runtimeHtmlRowsRecord[selectedStage].forEach(rowClone => {
            grid.appendChild(rowClone.cloneNode(true));
        });
    }

    const filledRowsCount = runtimeHtmlRowsRecord[selectedStage] ? runtimeHtmlRowsRecord[selectedStage].length : 0;
    for (let i = filledRowsCount; i < totalGuessesAllowed + 1; i++) {
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

    // MODIFIED: Only lock out selection on game complete if the user is in Daily Challenge mode
    if (gameOverCrownComplete && currentGameMode === 'daily') return;

    const sortedRoster = [...nationalRoster].sort((a, b) => a.name.localeCompare(b.name));

    sortedRoster.forEach(player => {
        const targetContainer = document.getElementById(`roster-list-${player.position}`);
        if (!targetContainer) return;

        const item = document.createElement('div');
        item.className = 'roster-item';
        item.textContent = player.name;
        item.title = `${player.name} (${player.position})`;
        
        if (guessedPlayerNamesThisStage.includes(player.name.toUpperCase())) {
            item.classList.add('disabled-roster-item');
        }

        item.addEventListener('click', function handlesRosterClick() {
            if (guessesRemaining <= 0 || isProcessingStageTransition) return;
            
            // MODIFIED: Explicitly allow clicks in free play even if the daily crown is completed
            if (currentGameMode === 'daily' && gameOverCrownComplete) return;
            if (guessedPlayerNamesThisStage.includes(player.name.toUpperCase())) return;
            
            evaluateCustomGuess(player, true);
        });

        targetContainer.appendChild(item);
    });
}

function triggerInitialWrongGuess() {
    // REMOVED: "if (currentGameMode === 'free') return;" to allow initial guesses in Free Play
    let targetPlayer = (currentGameMode === 'daily') ? dailyTargets[currentDifficultyStage] : freePlayTarget;
    if (!targetPlayer) return;
    
    const deterministicWrongOptions = nationalRoster
        .filter(p => p.name.toUpperCase() !== targetPlayer.name.toUpperCase())
        .sort((a, b) => a.name.localeCompare(b.name));

    if (deterministicWrongOptions.length > 0) {
        const today = new Date();
        // Fallback or unique seed modifier depending on mode
        const seedModifier = currentGameMode === 'daily' ? currentDifficultyStage : targetPlayer.national_team;
        const firstRowSeedString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${seedModifier}-FIRST_LINE_HINT`;
        
        const targetStaticIndex = getDailySeededIndex(firstRowSeedString, deterministicWrongOptions.length);
        const dailyIdenticalWrongPlayer = deterministicWrongOptions[targetStaticIndex];
        
        guessedPlayerNamesThisStage.push(dailyIdenticalWrongPlayer.name.toUpperCase());
        renderRosterSidebar();
        evaluateCustomGuess(dailyIdenticalWrongPlayer, false); 
    }
}

function updateStatusUI() {
    if (currentGameMode === 'free') return;
    document.getElementById('guesses-left').textContent = guessesRemaining;
    let currentPotential = baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed);
    document.getElementById('potential-score').textContent = Math.round(currentPotential);
}

// --- EVALUATE MATRIX CORE ENGINE ---
function evaluateCustomGuess(guess, countAsActiveGuess = true) {
    let targetPlayer = (currentGameMode === 'daily') ? dailyTargets[currentDifficultyStage] : freePlayTarget;
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
    let ageArrow = guess.age < targetPlayer.age ? ' <span class="anim-arrow-up">↑</span>' : ' <span class="anim-arrow-down">↓</span>';
    if (guess.age === targetPlayer.age) {
        ageTile.className = 'tile correct';
        ageTile.textContent = guess.age;
        rowEmojis.push('🟩');
    } else if (ageDiff <= 2) {
        ageTile.className = 'tile partial';
        ageTile.innerHTML = `${guess.age}${ageArrow}`;
        rowEmojis.push('🟨');
    } else {
        ageTile.className = 'tile incorrect';
        ageTile.innerHTML = `${guess.age}${ageArrow}`;
        rowEmojis.push('🟥');
    }
    row.appendChild(ageTile);

    // Height
    const heightTile = document.createElement('div');
    const heightDiff = Math.abs(guess.height_cm - targetPlayer.height_cm);
    let heightArrow = guess.height_cm < targetPlayer.height_cm ? ' <span class="anim-arrow-up">↑</span>' : ' <span class="anim-arrow-down">↓</span>';
    if (guess.height_cm === targetPlayer.height_cm) {
        heightTile.className = 'tile correct';
        heightTile.textContent = guess.height_cm;
        rowEmojis.push('🟩');
    } else if (heightDiff <= 5) {
        heightTile.className = 'tile partial';
        heightTile.innerHTML = `${guess.height_cm}${heightArrow}`;
        rowEmojis.push('🟨');
    } else {
        heightTile.className = 'tile incorrect';
        heightTile.innerHTML = `${guess.height_cm}${heightArrow}`; 
        rowEmojis.push('🟥');
    }
    row.appendChild(heightTile);

    // Caps
    const capsTile = document.createElement('div');
    const capsDiff = Math.abs(guess.caps - targetPlayer.caps);
    let capsArrow = guess.caps < targetPlayer.caps ? ' <span class="anim-arrow-up">↑</span>' : ' <span class="anim-arrow-down">↓</span>';
    if (guess.caps === targetPlayer.caps) {
        capsTile.className = 'tile correct';
        capsTile.textContent = guess.caps;
        rowEmojis.push('🟩');
    } else if (capsDiff <= 10) {
        capsTile.className = 'tile partial';
        capsTile.innerHTML = `${guess.caps}${capsArrow}`;
        rowEmojis.push('🟨');
    } else {
        capsTile.className = 'tile incorrect';
        capsTile.innerHTML = `${guess.caps}${capsArrow}`;
        rowEmojis.push('🟥');
    }
    row.appendChild(capsTile);

    const currentActiveIndex = (currentGameMode === 'daily') ? runtimeHtmlRowsRecord[currentDifficultyStage].length : freePlayGuessesCount;
    const targetSlot = document.getElementById(`row-slot-${currentActiveIndex}`);
    
    if (targetSlot) {
        targetSlot.replaceWith(row); 
    } else {
        document.getElementById('guess-grid').appendChild(row);
    }

    if (currentGameMode === 'daily') {
        runtimeHtmlRowsRecord[currentDifficultyStage].push(row.cloneNode(true));
    } else {
        freePlayRowsRecord.push(row.cloneNode(true));
        freePlayGuessesCount++;
    }

    if (!countAsActiveGuess) return;

    guessedPlayerNamesThisStage.push(guess.name.toUpperCase());
    renderRosterSidebar();

    if (currentGameMode === 'daily') {
        aggregatedMatrices[currentDifficultyStage].push(rowEmojis.join(''));
    }

    // --- WIN RESOLUTION ---
    if (isNameCorrect) {
        isProcessingStageTransition = true; 
        if (currentGameMode === 'daily') {
            let currentScore = Math.round(baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed));
            aggregatedScores[currentDifficultyStage] = currentScore;
            aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed - guessesRemaining + 1;
            processStageResolution(true);
        } else {
            // FIX: Run an isolated timeout that only opens your free play modal
            setTimeout(() => {
                showFreePlayResolutionModal(true, targetPlayer.name);
            }, 600);
        }
        return;
    }

    guessesRemaining--;
    
    const guessesLeftEl = document.getElementById('guesses-left');
    if (guessesLeftEl) guessesLeftEl.textContent = guessesRemaining;

    if (currentGameMode === 'daily') {
        updateStatusUI();
    }

    // --- LOSS RESOLUTION ---
    if (guessesRemaining === 0) {
        isProcessingStageTransition = true; 
        if (currentGameMode === 'daily') {
            aggregatedScores[currentDifficultyStage] = 0;
            aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed;
            processStageResolution(false);
        } else {
            // FIX: Run an isolated timeout that only opens your free play modal
            setTimeout(() => {
                showFreePlayResolutionModal(false, targetPlayer.name);
            }, 600);
        }
    }
}

// --- MODALS & SCENE TRANSITIONS ---
function processStageResolution(isWin) {
    let targetPlayer = dailyTargets[currentDifficultyStage];
    let message = "";

    setTimeout(() => {
        if (currentDifficultyStage === "easy") {
            message = isWin ? `🟢 Found Easy Player: <strong>${targetPlayer.name}</strong>!` : `❌ Missed Easy Player. It was <strong>${targetPlayer.name}</strong>.`;
            currentDifficultyStage = "medium";
            showIntermediateModal(message, "Advance to Medium");
        } else if (currentDifficultyStage === "medium") {
            message = isWin ? `🟡 Found Medium Player: <strong>${targetPlayer.name}</strong>!` : `❌ Missed Medium Player. It was <strong>${targetPlayer.name}</strong>.`;
            currentDifficultyStage = "hard";
            showIntermediateModal(message, "Advance to Hard");
        } else {
            handleStreakAndSave();
            endTripleCrownGame();
        }
    }, 1000);
}

function showIntermediateModal(message, transitionButtonText) {
    document.getElementById('modal-title').textContent = "Stage Complete";
    document.getElementById('victory-text').innerHTML = `${message}<br><br>Get ready for the next tier.`;
    
    const actionsWrapper = document.getElementById('modal-actions-container');
    actionsWrapper.innerHTML = `
        <button onclick="executeModalAdvance()" class="btn-primary" style="background:#407a44; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">${transitionButtonText} ➔</button>
    `;

    document.getElementById('victory-modal').classList.remove('hidden');
}

function showFreePlayResolutionModal(isWin, targetName) {
    const currentCountry = freePlayTarget ? freePlayTarget.national_team : "";

    document.getElementById('freeplay-modal-title').textContent = isWin ? "🏆 Congratulations!" : "Game Over";
    document.getElementById('freeplay-modal-text').innerHTML = isWin 
        ? `🎉 Great job! You successfully found <strong>${targetName}</strong> for ${currentCountry}!` 
        : `❌ Out of guesses! The hidden target player was <strong>${targetName}</strong>.`;
    
    const actionsWrapper = document.querySelector('#freeplay-modal .modal-buttons');
    
    // Injects all 3 dynamic options cleanly structured
    actionsWrapper.innerHTML = `
        <button onclick="replayCurrentFreePlayTeamFromModal()" class="btn-primary" style="background:#407a44; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">🔄 Play Same Team Again</button>
        <button onclick="exitFreePlayToGridFromModal()" class="btn-secondary" style="background:#e6eee6; color:#1b3322; border:1px solid #a3c6a3; padding:11px; font-size:0.95rem; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">🌍 Select New Team</button>
        <button onclick="switchFromModalToDailyChallenge()" class="btn-secondary" style="background:#2d5a27; color:white; border:none; padding:11px; font-size:0.95rem; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">📅 Back to Daily Challenge</button>
    `;
    
    document.getElementById('freeplay-modal').classList.remove('hidden');
}

// Added structural action helper wrapper to route the player seamlessly out of free play
function switchFromModalToDailyChallenge() {
    document.getElementById('freeplay-modal').classList.add('hidden');
    switchGameMode('daily');
}

// Redirect execution to instantly clear the custom popup and refresh the current team squad sheet
function replayCurrentFreePlayTeamFromModal() {
    document.getElementById('freeplay-modal').classList.add('hidden');
    if (freePlayTarget && freePlayTarget.national_team) {
        startFreePlayCountry(freePlayTarget.national_team);
    }
}

// Redirect execution to safely switch back to the main grid choice menu
function exitFreePlayToGridFromModal() {
    document.getElementById('freeplay-modal').classList.add('hidden');
    switchGameMode('free');
}

function executeModalAdvance() {
    isProcessingStageTransition = false; 
    document.getElementById('victory-modal').classList.add('hidden');
    loadCurrentProgressOrStart();
}

function closeModal() {
    document.getElementById('victory-modal').classList.add('hidden');
}

function handleStreakAndSave() {
    const today = getTodayDateString();
    const lastPlayedDate = localStorage.getItem('lastPlayedDate');
    let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;

    if (lastPlayedDate !== today) {
        if (lastPlayedDate) {
            const lastDate = new Date(lastPlayedDate);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak += 1;
            } else {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }

        localStorage.setItem('lastPlayedDate', today);
        localStorage.setItem('currentStreak', currentStreak);
        
        localStorage.setItem('savedScoreEasy', aggregatedScores.easy);
        localStorage.setItem('savedScoreMedium', aggregatedScores.medium);
        localStorage.setItem('savedScoreHard', aggregatedScores.hard);

        if (typeof gtag === 'function') {
            let totalPoints = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
            gtag('event', 'game_complete', {
                'grand_total_score': totalPoints,
                'streak_length': currentStreak
            });
        }
    }
}

function endTripleCrownGame() {
    gameOverCrownComplete = true;
    currentDifficultyStage = "hard";
    synchronizeTrackerVisualStates();
    renderRosterSidebar();
    
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    let currentStreak = localStorage.getItem('currentStreak') || 1;
    
    if (countdownInterval) clearInterval(countdownInterval);

    const easyFlag = getNationalFlag(dailyTargets.easy ? dailyTargets.easy.national_team : "");
    const medFlag = getNationalFlag(dailyTargets.medium ? dailyTargets.medium.national_team : "");
    const hardFlag = getNationalFlag(dailyTargets.hard ? dailyTargets.hard.national_team : "");

    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDisplayDate = new Date().toLocaleDateString('en-GB', dateOptions);

    const modalContent = document.querySelector('#victory-modal .modal-content');
    
    if (modalContent) {
        modalContent.style.position = 'relative';
        modalContent.style.paddingTop = '30px';

        modalContent.innerHTML = `
            <button onclick="closeModal()" aria-label="Close" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 1.15rem; font-weight: bold; color: #4b5563; cursor: pointer; line-height: 1; padding: 0;">&times;</button>

            <h2 id="modal-title" style="margin-top: 0; margin-bottom: 2px; text-align: center; font-size: 1.4rem;">Ball Knowledge</h2>
            <div style="font-size: 0.78rem; color: #6b7280; margin-bottom: 18px; text-align: center; font-weight: 500;">${formattedDisplayDate}</div>
            
            <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 6px 10px; max-width: 195px; margin: 0 auto 20px auto; font-size: 1rem; line-height: 1.4; align-items: center; color: #1e293b;">
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${easyFlag}</div>
                <div style="text-align: left; color: #475569;">Easy:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.easy} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${medFlag}</div>
                <div style="text-align: left; color: #475569;">Medium:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.medium} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${hardFlag}</div>
                <div style="text-align: left; color: #475569;">Hard:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.hard} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <div style="grid-column: span 3; border-top: 1px dashed #cbd5e1; margin: 2px 0;"></div>
                
                <div style="font-size: 1.05rem; text-align: left; width: 20px;">🥇</div>
                <div style="text-align: left; font-weight: bold;">Total:</div>
                <div style="text-align: right; font-weight: bold;">${grandTotalScore} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>

                <div style="font-size: 1.05rem; text-align: left; width: 20px;">🔥</div>
                <div style="text-align: left; font-weight: bold;">Streak:</div>
                <div style="text-align: right; font-weight: bold;">${currentStreak} days</div>
            </div>

            <div id="modal-actions-container" class="modal-buttons" style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="shareResults()" class="btn-share" style="background:#2d5a27; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">📊 Share Results</button>
                
                <!-- NEW: Standalone jump shortcut option styled using the matching off-white secondary tab profile -->
                <button onclick="switchFromDailyModalToFreePlay()" class="btn-secondary" style="background:#ffffff; color:#1b3322; border:2px solid #cbd5e1; padding:11px; font-size:0.95rem; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">🌍 Go to Free Play Mode</button>
                
                <div id="game-countdown-wrapper" style="padding: 6px 10px; background: rgba(0,0,0,0.05); border-radius: 5px; font-size: 0.8rem; text-align: center; color: #4b5563;">
                    Next puzzle in: <strong id="next-puzzle-timer" style="color:#2d5a27; font-family:monospace; font-size:0.9rem;">00:00:00</strong>
                </div>
            </div>
        `;
    }

    document.getElementById('victory-modal').classList.remove('hidden');

    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
}

// Simple direct interface router to seamlessly clear daily windows and unpack the country picker grid
function switchFromDailyModalToFreePlay() {
    document.getElementById('victory-modal').classList.add('hidden');
    switchGameMode('free');
}

function updateCountdownDisplay() {
    const timerElement = document.getElementById('next-puzzle-timer');
    if (!timerElement) {
        clearInterval(countdownInterval);
        return;
    }

    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diffMs = midnight - now;
    if (diffMs <= 0) {
        timerElement.innerHTML = "<span style='color:#407a44; font-weight:bold;'>New Puzzle Available! Refresh page.</span>";
        clearInterval(countdownInterval);
        return;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (num) => String(num).padStart(2, '0');
    timerElement.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function shareResults() {
    let grandTotalScore = aggregatedScores.easy + aggregatedScores.medium + aggregatedScores.hard;
    let currentStreak = localStorage.getItem('currentStreak') || 1;
    
    const easyFlag = getNationalFlag(dailyTargets.easy ? dailyTargets.easy.national_team : "");
    const medFlag = getNationalFlag(dailyTargets.medium ? dailyTargets.medium.national_team : "");
    const hardFlag = getNationalFlag(dailyTargets.hard ? dailyTargets.hard.national_team : "");

    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDisplayDate = new Date().toLocaleDateString('en-GB', dateOptions);

    const ptsEasy = `${aggregatedScores.easy} pts`;
    const ptsMed  = `${aggregatedScores.medium} pts`;
    const ptsHard = `${aggregatedScores.hard} pts`;
    const ptsTot  = `${grandTotalScore} pts`;

    let shareText = `Ball Knowledge Daily Complete!\n${formattedDisplayDate}\n\n\`\`\`\n`;
    shareText += `${easyFlag} Easy:   ${ptsEasy.padStart(8)}\n`;
    shareText += `${medFlag} Medium: ${ptsMed.padStart(8)}\n`;
    shareText += `${hardFlag} Hard:   ${ptsHard.padStart(8)}\n`;
    shareText += `--------------------\n`;
    shareText += `🥇 Total:  ${ptsTot.padStart(8)}\n`;
    shareText += `🔥 Streak: ${(currentStreak + " days").padStart(8)}\n`;
    shareText += `\`\`\`\n${window.location.href}`;

    if (navigator.share) {
        navigator.share({ title: 'Ball Knowledge Daily', text: shareText }).catch(err => console.log(err));
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            const toast = document.getElementById('toast-notification');
            if (toast) {
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 2500);
            } else {
                alert("Results copied to clipboard!");
            }
        }).catch(() => {
            alert("Could not copy score automatically. Copy text block below:\n\n" + shareText);
        });
    }
}