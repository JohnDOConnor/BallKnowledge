// --- GLOBAL CORE ENGINE VARIABLES ---
let playersDatabase = [];
let dailyTargets = { easy: null, medium: null, hard: null };
let currentDifficultyStage = "easy"; 
let gameOverCrownComplete = false;

let isProcessingStageTransition = false; // Freezes clicking during win/loss delay screens
let guessedPlayerNamesThisStage = [];   // Visually greys out already picked players

let nationalRoster = []; 
let guessesRemaining = 5;
const totalGuessesAllowed = 5;
let baseDifficultyPoints = 1000;

let aggregatedScores = { easy: 0, medium: 0, hard: 0 };
let aggregatedMatrices = { easy: [], medium: [], hard: [] };
let aggregatedGuessesUsed = { easy: 0, medium: 0, hard: 0 };

let runtimeHtmlRowsRecord = { easy: [], medium: [], hard: [] };
let countdownInterval = null;            // Manages the midnight countdown safely

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
    "Jordan": "🇯🇴", "Sweden": "🇸🇪", "USA": "🇺🇸", "Cabo Verde": "🇨🇻"
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
    
    const easyPool = playersDatabase.filter(p => p.difficulty === "easy");
    const medPool = playersDatabase.filter(p => p.difficulty === "medium");
    const hardPool = playersDatabase.filter(p => p.difficulty === "hard");

    dailyTargets.easy = easyPool[getDailySeededIndex(dateStamp + "-EASY", easyPool.length)] || playersDatabase[0];
    dailyTargets.medium = medPool[getDailySeededIndex(dateStamp + "-MED", medPool.length)] || playersDatabase[0];
    dailyTargets.hard = hardPool[getDailySeededIndex(dateStamp + "-HARD", hardPool.length)] || playersDatabase[0];
}

function toggleInstructionsModal() {
    const infoModal = document.getElementById('instructions-modal');
    const animatedElements = infoModal.querySelectorAll('.help-fade-row');
    
    // Toggle the hidden wrapper class
    const isNowOpening = infoModal.classList.contains('hidden');
    infoModal.classList.toggle('hidden');
    
    if (isNowOpening) {
        // Force the animation cycle to start completely clean from zero
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            // Trigger a reflow to flush styling state registers
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
    
    setTimeout(() => {
        triggerInitialWrongGuess();
    }, 500); // 0.5s initialization delay
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

    if (gameOverCrownComplete) return;

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
            if (guessesRemaining <= 0 || gameOverCrownComplete || isProcessingStageTransition) return;
            if (guessedPlayerNamesThisStage.includes(player.name.toUpperCase())) return;
            evaluateCustomGuess(player, true);
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
        
        // 1. Lock the player down
        guessedPlayerNamesThisStage.push(dailyIdenticalWrongPlayer.name.toUpperCase());
        
        // 2. FORCE the sidebar to refresh immediately so they turn grey instantly
        renderRosterSidebar();
        
        // 3. Drop them onto the board matrix
        evaluateCustomGuess(dailyIdenticalWrongPlayer, false); 
    }
}

function updateStatusUI() {
    document.getElementById('guesses-left').textContent = guessesRemaining;
    let currentPotential = baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed);
    document.getElementById('potential-score').textContent = Math.round(currentPotential);
}

// --- EVALUATE MATRIX CORE ENGINE ---
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

    const currentActiveIndex = runtimeHtmlRowsRecord[currentDifficultyStage].length;
    const targetSlot = document.getElementById(`row-slot-${currentActiveIndex}`);
    
    if (targetSlot) {
        targetSlot.replaceWith(row); 
    } else {
        document.getElementById('guess-grid').appendChild(row);
    }

    runtimeHtmlRowsRecord[currentDifficultyStage].push(row.cloneNode(true));

    if (!countAsActiveGuess) return;

    // Track active choice values
    guessedPlayerNamesThisStage.push(guess.name.toUpperCase());
    renderRosterSidebar();

    aggregatedMatrices[currentDifficultyStage].push(rowEmojis.join(''));

    if (isNameCorrect) {
        isProcessingStageTransition = true; 
        let currentScore = Math.round(baseDifficultyPoints * (guessesRemaining / totalGuessesAllowed));
        aggregatedScores[currentDifficultyStage] = currentScore;
        aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed - guessesRemaining + 1;
        processStageResolution(true);
        return;
    }

    guessesRemaining--;
    updateStatusUI();

    if (guessesRemaining === 0) {
        isProcessingStageTransition = true; 
        aggregatedScores[currentDifficultyStage] = 0;
        aggregatedGuessesUsed[currentDifficultyStage] = totalGuessesAllowed;
        processStageResolution(false);
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
            <!-- Made the Close Button Smaller (1.15rem) -->
            <button onclick="closeModal()" aria-label="Close" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 1.15rem; font-weight: bold; color: #4b5563; cursor: pointer; line-height: 1; padding: 0;">&times;</button>

            <h2 id="modal-title" style="margin-top: 0; margin-bottom: 2px; text-align: center; font-size: 1.4rem;">Ball Knowledge</h2>
            <div style="font-size: 0.78rem; color: #6b7280; margin-bottom: 18px; text-align: center; font-weight: 500;">${formattedDisplayDate}</div>
            
            <!-- Narrowed container wrapper (195px max width) to pull information columns tight together -->
            <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 6px 10px; max-width: 195px; margin: 0 auto 20px auto; font-size: 1rem; line-height: 1.4; align-items: center; color: #1e293b;">
                
                <!-- Easy Row -->
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${easyFlag}</div>
                <div style="text-align: left; color: #475569;">Easy:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.easy} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <!-- Medium Row -->
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${medFlag}</div>
                <div style="text-align: left; color: #475569;">Medium:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.medium} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <!-- Hard Row -->
                <div style="font-size: 1.1rem; text-align: left; width: 20px;">${hardFlag}</div>
                <div style="text-align: left; color: #475569;">Hard:</div>
                <div style="text-align: right; font-weight: bold;">${aggregatedScores.hard} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>
                
                <!-- Spacer Divider -->
                <div style="grid-column: span 3; border-top: 1px dashed #cbd5e1; margin: 2px 0;"></div>
                
                <!-- Renamed to Total -->
                <div style="font-size: 1.05rem; text-align: left; width: 20px;">🥇</div>
                <div style="text-align: left; font-weight: bold;">Total:</div>
                <div style="text-align: right; font-weight: bold;">${grandTotalScore} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">pts</span></div>

                <!-- Streak Row (Kept default theme text-color block) -->
                <div style="font-size: 1.05rem; text-align: left; width: 20px;">🔥</div>
                <div style="text-align: left; font-weight: bold;">Streak:</div>
                <div style="text-align: right; font-weight: bold;">${currentStreak} days</div>
            </div>

            <div id="modal-actions-container" class="modal-buttons" style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="shareResults()" class="btn-share" style="background:#2d5a27; color:white; padding:11px; font-size:0.95rem; border:none; border-radius:5px; font-weight:bold; cursor:pointer; width:100%;">📊 Share Results</button>
                
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

    // Format individual points to match layout spacing structures seamlessly
    const ptsEasy = `${aggregatedScores.easy} pts`;
    const ptsMed  = `${aggregatedScores.medium} pts`;
    const ptsHard = `${aggregatedScores.hard} pts`;
    const ptsTot  = `${grandTotalScore} pts`;

    // Builds a completely linear monospaced layout grid table
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