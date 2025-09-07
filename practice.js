// --- State Variables ---
let currentSphere = 0.00;
let currentCylinder = -1.00; // Starting cylinder for practice
let currentAxis = 90; // Starting axis for practice

let targetSphere = 0.00;
let targetCylinder = -2.00; // This will be set by random prescription
let targetAxis = 180; // This will be set by random prescription

let jccHandleAngle = 90;
let jccFlipped = false; // False for Position 1, True for Position 2

let currentMode = 'easy'; // 'easy' or 'hard', determined from URL parameter

let practiceStage = 'INITIAL_SETUP'; // States: 'INITIAL_SETUP', 'AXIS_HANDLE_ALIGNMENT', 'AXIS_REFINEMENT', 'AXIS_CONFIRMED_SETUP_POWER', 'POWER_REFINEMENT', 'COMPLETE'
let hasJCCBeenFlippedThisStage = false;

// Adjustable power limits for user interaction
const MIN_ADJUSTABLE_SPHERE = -2.00;
const MAX_ADJUSTABLE_SPHERE = 2.00;
const MIN_ADJUSTABLE_CYLINDER = -4.00; // Max minus cylinder power allowed (e.g., -4.00 DC)
const MAX_ADJUSTABLE_CYLINDER = 0.00;  // Min minus cylinder power allowed (i.e., plano cyl, 0.00 DC)


// --- DOM Elements ---
// Selector cache for elements that are always expected on this page
const simulatorElements = document.querySelectorAll('.controls, .eye-container, .bottom-panel');
// Note: procedureGuide is NOT present on practice.html, so don't query it.

const trialLens = document.getElementById('trialLens');
const lensAxisDisplay = document.getElementById('lensAngleDisplay');
const cylinderPowerDisplay = document.getElementById('cylinderPowerDisplay');

const jccElement = document.getElementById('jcc');
const jccRedLine = jccElement.querySelector('.jcc-red-line');
const jccGreenLine = jccElement.querySelector('.jcc-green-line');
const jccAngleDisplay = document.getElementById('jccAngleDisplay');
const flipJCCButton = document.getElementById('flipJCC');
const jccPositionDisplay = document.getElementById('jccPositionDisplay');

const increasePowerButton = document.getElementById('increasePower');
const decreasePowerButton = document.getElementById('decreasePower');
const confirmAxisButton = document.getElementById('confirmAxis');
const confirmPowerButton = document.getElementById('confirmPower');

const practiceInstructionsBox = document.getElementById('tutorInstructions'); // Re-using this ID
const patientFeedbackBox = document.getElementById('patientFeedback');
const currentRXDisplay = document.getElementById('currentRX');
const finalRXDisplay = document.getElementById('finalRX');
const welcomeMessageDiv = document.getElementById('welcomeMessage');

// Notification Box Elements
const jccNotificationBox = document.getElementById('jccNotification');
const notificationMessage = document.getElementById('notificationMessage');
const notificationOkButton = document.getElementById('notificationOkButton');

// Practice Mode Specific Buttons
const practiceControlPanel = document.getElementById('practiceControlPanel');
const backToMenuButton = document.getElementById('backToMenuButton');
const nextPrescriptionButton = document.getElementById('nextPrescriptionButton');
const restartPrescriptionButton = document.getElementById('restartPrescriptionButton');

// SVG Axis Slider Elements
const jccAxisSliderDiv = document.getElementById('jccAxisSlider');
const jccAxisSliderSVG = jccAxisSliderDiv.querySelector('svg');
const jccSliderThumb = jccAxisSliderDiv.querySelector('.slider-thumb');
const jccAxisLine = document.getElementById('jccAxisLine'); 

const lensAxisSliderDiv = document.getElementById('lensAxisSlider');
const lensAxisSliderSVG = lensAxisSliderDiv.querySelector('svg');
const lensSliderThumb = lensAxisSliderDiv.querySelector('.slider-thumb');
const lensAxisLine = document.getElementById('lensAxisLine'); 

let isDraggingJCC = false;
let isDraggingLens = false;

// SVG Path properties (from viewBox="0 0 100 100")
const SVG_VIEWBOX_WIDTH = 100;
const SVG_VIEWBOX_HEIGHT = 100;
const SVG_CENTER_X = 50; 
const SVG_CENTER_Y = 50; 
const SVG_RADIUS = 40; 


// --- Helper Functions (copied from common, specific callback to practice mode) ---

/**
 * Rounds an angle to the nearest 5-degree increment.
 * @param {number} angle
 * @returns {number} Rounded angle.
 */
function roundTo5Degrees(angle) {
    return Math.round(angle / 5) * 5;
}

/**
 * Rounds a diopter value to the nearest 0.25 D increment.
 * @param {number} diopterValue
 * @returns {number} Rounded diopter value.
 */
function roundToQuarterDiopter(diopterValue) {
    return Math.round(diopterValue * 4) / 4;
}

/**
 * Gets the display axis value (ensuring 0 is always displayed as 180 for optometric consistency).
 * This also ensures the final output is 0-180 and snapped to 5 degrees.
 * @param {number} angle A raw angle (could be outside 0-180, e.g., from calculations).
 * @returns {number} Display angle (0-180, where 0 becomes 180).
 */
function getDisplayAxis(angle) {
    let displayAngle = roundTo5Degrees(angle);
    displayAngle = displayAngle % 180;
    if (displayAngle < 0) {
        displayAngle += 180;
    }
    if (displayAngle === 0) {
        return 180;
    }
    return displayAngle;
}

function setSvgThumbPosition(thumb, visualAngle360) {
    const angleRad = (visualAngle360 * Math.PI) / 180;
    const x = SVG_CENTER_X + SVG_RADIUS * Math.cos(angleRad);
    const y = SVG_CENTER_Y + SVG_RADIUS * Math.sin(angleRad);
    thumb.setAttribute('cx', x);
    thumb.setAttribute('cy', y);

    let axisLine;
    if (thumb === jccSliderThumb) {
        axisLine = jccAxisLine;
    } else if (thumb === lensSliderThumb) {
        axisLine = lensAxisLine;
    }
    if (axisLine) {
        axisLine.setAttribute('x1', SVG_CENTER_X);
        axisLine.setAttribute('y1', SVG_CENTER_Y);
        axisLine.setAttribute('x2', x);
        axisLine.setAttribute('y2', y);
    }
}

function updateLensDisplay() {
    trialLens.style.transform = `rotate(${-currentAxis}deg)`; 
    lensAxisDisplay.textContent = `${getDisplayAxis(currentAxis)}°`;
    currentRXDisplay.textContent = `${currentSphere.toFixed(2)} DS / ${currentCylinder.toFixed(2)} DC x ${getDisplayAxis(currentAxis)}°`;
    cylinderPowerDisplay.textContent = `${currentCylinder.toFixed(2)} DC`;
    
    // Only proceed with positioning if trialLens is visible and has a calculated size
    if (trialLens.offsetWidth > 0 && trialLens.offsetHeight > 0) {
        const offsetFromCenter = 50; 
        const lensDiameter = trialLens.offsetWidth; 
        const lensRadius = lensDiameter / 2;

        const angleRad = (currentAxis * Math.PI) / 180; 
        const xPos = lensRadius + offsetFromCenter * Math.cos(angleRad);
        const yPos = lensRadius + offsetFromCenter * Math.sin(angleRad);

        cylinderPowerDisplay.style.left = `${xPos}px`;
        cylinderPowerDisplay.style.top = `${yPos}px`;
        cylinderPowerDisplay.style.transform = `translate(-50%, -50%) rotate(${currentAxis}deg)`;
    }
    setSvgThumbPosition(lensSliderThumb, currentAxis); 
}

function updateJCCDisplay() {
    jccElement.style.transform = `rotate(${-jccHandleAngle}deg)`;
    let redLineRelativeOffset, greenLineRelativeOffset;
    if (!jccFlipped) { // Position 1: Minus axis is handle - 45
        redLineRelativeOffset = -45; 
        greenLineRelativeOffset = +45; 
        jccPositionDisplay.textContent = "Position 1";
    } else { // Position 2: Minus axis is handle + 45
        redLineRelativeOffset = +45; 
        greenLineRelativeOffset = -45; 
        jccPositionDisplay.textContent = "Position 2";
    }
    jccRedLine.style.transform = `translateX(-50%) rotate(${redLineRelativeOffset}deg)`;
    jccGreenLine.style.transform = `translateX(-50%) rotate(${greenLineRelativeOffset}deg)`;
    jccPositionDisplay.style.transform = `translate(-50%, -50%) translateY(-55px) rotate(${jccHandleAngle}deg)`;
    jccAngleDisplay.textContent = `${getDisplayAxis(jccHandleAngle)}°`;
    setSvgThumbPosition(jccSliderThumb, jccHandleAngle); 
}

function displayInstruction(text) {
    practiceInstructionsBox.innerHTML = `<strong>Instructions:</strong> ${text}`;
}

function displayContinuousPatientFeedback(text) {
    patientFeedbackBox.innerHTML = `<strong>Patient:</strong> ${text}`;
}

function showJCCNotification(message, onOkCallback) {
    notificationMessage.textContent = message;
    jccNotificationBox.classList.remove('hidden');
    disableAllControls();
    notificationOkButton.disabled = false;
    notificationOkButton.onclick = () => {
        jccNotificationBox.classList.add('hidden');
        notificationOkButton.onclick = null; 
        onOkCallback(); 
    };
}

function disableAllControls() {
    flipJCCButton.disabled = true;
    jccAxisSliderDiv.classList.add('disabled');
    lensAxisSliderDiv.classList.add('disabled');
    increasePowerButton.disabled = true;
    decreasePowerButton.disabled = true;
    confirmAxisButton.disabled = true;
    confirmPowerButton.disabled = true;
    notificationOkButton.disabled = true;
    // Practice mode specific
    nextPrescriptionButton.disabled = true;
    restartPrescriptionButton.disabled = true;
    backToMenuButton.disabled = true;
}

function enableControls(controls) {
    controls.forEach(control => {
        switch(control) {
            case 'flipJCC': flipJCCButton.disabled = false; break;
            case 'jccRotation': jccAxisSliderDiv.classList.remove('disabled'); break;
            case 'lensRotation': lensAxisSliderDiv.classList.remove('disabled'); break;
            case 'increasePower': increasePowerButton.disabled = false; break;
            case 'decreasePower': decreasePowerButton.disabled = false; break;
            case 'confirmAxis': confirmAxisButton.disabled = false; break;
            case 'confirmPower': confirmPowerButton.disabled = false; break;
            case 'nextPrescription': nextPrescriptionButton.disabled = false; break;
            case 'restartPrescription': restartPrescriptionButton.disabled = false; break;
            case 'backToMenuButton': backToMenuButton.disabled = false; break;
        }
    });
}

function getJCCRedLineAxis() {
    let redLineOffset;
    if (!jccFlipped) { // Position 1: Minus axis is handle - 45
        redLineOffset = -45;
    } else { // Position 2: Minus axis is handle + 45
        redLineOffset = +45;
    }
    let calculatedAxis = jccHandleAngle + redLineOffset;
    return getDisplayAxis(calculatedAxis); 
}

function getJCCGreenLineAxis() {
    let greenLineOffset;
    if (!jccFlipped) { // Position 1: Plus axis is handle + 45
        greenLineOffset = +45;
    } else { // Position 2: Plus axis is handle - 45
        greenLineOffset = -45;
    }
    let calculatedAxis = jccHandleAngle + greenLineOffset;
    return getDisplayAxis(calculatedAxis); 
}

function getSvgCoordinates(event, svgElement) {
    const rect = svgElement.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const svgX = (clientX - rect.left) / rect.width * SVG_VIEWBOX_WIDTH;
    const svgY = (clientY - rect.top) / rect.height * SVG_VIEWBOX_HEIGHT;
    return { x: svgX, y: svgY };
}

function svgCoordsToOptometricAxis(svgCoords) {
    const deltaX = svgCoords.x - SVG_CENTER_X;
    const deltaY = svgCoords.y - SVG_CENTER_Y;

    let angleRad = Math.atan2(-deltaY, deltaX);
    let angleDeg = angleRad * 180 / Math.PI;
    angleDeg = (angleDeg + 360) % 360;

    let optometricAxis = angleDeg;
    if (optometricAxis > 180) {
        optometricAxis -= 180;
    }
    return Math.round(optometricAxis); 
}

function startDrag(e, sliderDiv, sliderSvg, thumbElement, updateValueCallback, afterDragCallback) {
    if (sliderDiv.classList.contains('disabled')) return;
    if (e.type === 'touchstart') { e.preventDefault(); }

    if (sliderDiv === jccAxisSliderDiv) { isDraggingJCC = true; } 
    else if (sliderDiv === lensAxisSliderDiv) { isDraggingLens = true; }

    const moveHandler = (moveEvent) => {
        if (!isDraggingJCC && !isDraggingLens) return;
        if (moveEvent.type === 'touchmove') { moveEvent.preventDefault(); }

        const svgCoords = getSvgCoordinates(moveEvent, sliderSvg);
        const newOptometricAxis = svgCoordsToOptometricAxis(svgCoords);

        const currentDeltaX = svgCoords.x - SVG_CENTER_X;
        const currentDeltaY = svgCoords.y - SVG_CENTER_Y;
        let currentRawVisualAngle360 = (Math.atan2(currentDeltaY, currentDeltaX) * 180 / Math.PI + 360) % 360;

        updateValueCallback(newOptometricAxis);
        setSvgThumbPosition(thumbElement, currentRawVisualAngle360);
        
        if (sliderDiv === jccAxisSliderDiv) { jccAngleDisplay.textContent = `${getDisplayAxis(newOptometricAxis)}°`; } 
        else if (sliderDiv === lensAxisSliderDiv) { lensAxisDisplay.textContent = `${getDisplayAxis(newOptometricAxis)}°`; } 
    };

    const upHandler = () => {
        isDraggingJCC = false;
        isDraggingLens = false;
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', upHandler);

        let finalOptometricAxis;
        if (sliderDiv === jccAxisSliderDiv) {
            finalOptometricAxis = getDisplayAxis(jccHandleAngle); 
            jccHandleAngle = finalOptometricAxis;
            updateJCCDisplay(); 
        } else if (sliderDiv === lensAxisSliderDiv) {
            finalOptometricAxis = getDisplayAxis(currentAxis); 
            currentAxis = finalOptometricAxis;
            updateLensDisplay(); 
        }
        if (afterDragCallback) afterDragCallback(); // Call the specific callback for tutor/practice
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', upHandler);

    const initialSvgCoords = getSvgCoordinates(e, sliderSvg);
    const initialDeltaX = initialSvgCoords.x - SVG_CENTER_X;
    const initialDeltaY = initialSvgCoords.y - SVG_CENTER_Y; 
    let initialRawVisualAngle360 = (Math.atan2(initialDeltaY, initialDeltaX) * 180 / Math.PI + 360) % 360;
    setSvgThumbPosition(thumbElement, initialRawVisualAngle360);
    updateValueCallback(getDisplayAxis(svgCoordsToOptometricAxis(initialSvgCoords)));
}

function updateJCCRotation(angle) { jccHandleAngle = angle; }
function updateLensRotation(angle) { currentAxis = angle; }


// --- Practice Mode Specific Logic ---

// Function to get URL parameters (used to determine 'mode')
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function generateRandomPracticePrescription() {
    // Sphere: -2.00 DS to +2.00 DS, in 0.25 steps
    targetSphere = roundToQuarterDiopter(Math.random() * (MAX_ADJUSTABLE_SPHERE - MIN_ADJUSTABLE_SPHERE) + MIN_ADJUSTABLE_SPHERE); 
    
    // Cylinder: -0.50 DC to -4.00 DC, in 0.25 steps (negative for JCC convention)
    targetCylinder = roundToQuarterDiopter(-(Math.random() * 3.5 + 0.5)); // Range is -0.50 to -4.00 DC
    
    // Axis: 0 to 175 degrees, in 5-degree steps
    targetAxis = roundTo5Degrees(Math.random() * 180);
    if (targetAxis === 0) targetAxis = 180; // Ensure 0 is always 180 for display

    // Determine initial deviation based on difficulty mode
    let numCylSteps = (currentMode === 'easy') ? 2 : 3; // 2 steps = 0.50DC, 3 steps = 0.75DC
    let numAxisSteps = (currentMode === 'easy') ? 2 : 3; // 2 steps = 10deg, 3 steps = 15deg

    let initialCylDeviationAmount = numCylSteps * 0.25;
    let initialAxisDeviationAmount = numAxisSteps * 5;

    // Set currentSphere (starting at target sphere)
    currentSphere = targetSphere;

    // Set initial currentCylinder, ensuring it's off target and within limits
    let initialCylCandidate;
    let attemptsCyl = 0;
    do {
        const direction = (Math.random() > 0.5 ? -1 : 1);
        initialCylCandidate = roundToQuarterDiopter(targetCylinder + (direction * initialCylDeviationAmount));
        attemptsCyl++;
        if (attemptsCyl > 10) { 
            if (targetCylinder + 0.25 <= MAX_ADJUSTABLE_CYLINDER) {
                initialCylCandidate = roundToQuarterDiopter(targetCylinder + 0.25);
            } else if (targetCylinder - 0.25 >= MIN_ADJUSTABLE_CYLINDER) {
                initialCylCandidate = roundToQuarterDiopter(targetCylinder - 0.25);
            } else { 
                initialCylCandidate = targetCylinder; 
            }
            break;
        }
    } while (initialCylCandidate === targetCylinder || initialCylCandidate < MIN_ADJUSTABLE_CYLINDER || initialCylCandidate > MAX_ADJUSTABLE_CYLINDER);
    currentCylinder = initialCylCandidate;


    // Set initial currentAxis, ensuring it's off target
    let initialAxisCandidate;
    let attemptsAxis = 0;
    do {
        const direction = (Math.random() > 0.5 ? -1 : 1);
        initialAxisCandidate = getDisplayAxis(targetAxis + (direction * initialAxisDeviationAmount));
        attemptsAxis++;
        if (attemptsAxis > 10) { 
            initialAxisCandidate = getDisplayAxis(targetAxis + 5); 
            break;
        }
    } while (initialAxisCandidate === targetAxis);
    currentAxis = initialAxisCandidate;
    

    jccHandleAngle = 90; // Neutral start for JCC handle
    jccFlipped = false;
}

function loadRandomPrescription() {
    currentMode = getUrlParameter('mode'); // 'easy' or 'hard'
    
    generateRandomPracticePrescription(); // Generate new target RX and initial current RX

    // Reset stage and feedback flipped flag
    practiceStage = 'AXIS_HANDLE_ALIGNMENT';
    hasJCCBeenFlippedThisStage = false; // Reset for a new prescription

    updateLensDisplay();
    updateJCCDisplay();
    
    // Enable core controls for initial setup, disable others
    disableAllControls();
    enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']); 

    displayInstruction(`Refine the cylinder axis and power for a hidden prescription in ${currentMode.toUpperCase()} mode.`);
    displayContinuousPatientFeedback(`Initial lens set to ${currentSphere.toFixed(2)} DS / ${currentCylinder.toFixed(2)} DC x ${getDisplayAxis(currentAxis)}°.`);
    finalRXDisplay.textContent = ``; // Clear previous final RX

    // Initial prompt for axis alignment
    showJCCNotification(`Please align the JCC handle with the current trial lens axis (${getDisplayAxis(currentAxis)}°) to begin axis refinement.`, () => {
        enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
        // After OK, the stage is still AXIS_HANDLE_ALIGNMENT, so updatePatientFeedback will re-evaluate.
        updatePatientFeedback(); // Show continuous feedback now
    });
}

// Dynamic Patient Feedback for Practice Mode
function updatePatientFeedback() {
    let feedback = '';
    const AXIS_SLIGHT_TOLERANCE_FOR_FEEDBACK = 5; // degrees for "slightly clearer"
    const AXIS_EQUAL_TOLERANCE_FOR_FEEDBACK = 2; // degrees for "equally blurred"
    const POWER_SLIGHT_TOLERANCE_FOR_FEEDBACK = 0.18; // halfway between 0.125 and 0.25
    const POWER_EQUAL_TOLERANCE_FOR_FEEDBACK = 0.06; // half of 0.125

    // Stage-dependent checks and feedback
    if (practiceStage === 'AXIS_HANDLE_ALIGNMENT') {
        const jccHandleDiffToCurrentAxis = Math.min(Math.abs(jccHandleAngle - currentAxis), 180 - Math.abs(jccHandleAngle - currentAxis));
        if (jccHandleDiffToCurrentAxis <= 5) { // JCC handle aligned
            feedback = `JCC handle aligned. Now flip the JCC to compare Position 1 and 2.`;
            // Enable controls for axis refinement, and confirm axis button
            enableControls(['flipJCC', 'jccRotation', 'lensRotation', 'confirmAxis', 'restartPrescription', 'backToMenuButton']);
            hasJCCBeenFlippedThisStage = false; // Reset for the new refinement stage
            practiceStage = 'AXIS_REFINEMENT'; // Advance stage implicitly after correct setup
            updatePatientFeedback(); // Re-evaluate for the new stage
            return;
        } else {
            feedback = `Please align the JCC handle with the current trial lens axis (${getDisplayAxis(currentAxis)}°).`;
            enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
            confirmAxisButton.disabled = true; // Ensure Confirm Axis is disabled until handle is aligned
        }
    } else if (practiceStage === 'AXIS_REFINEMENT') {
        // Check if JCC handle is aligned with current lens axis for axis refinement
        const jccHandleDiffToCurrentAxis = Math.min(Math.abs(jccHandleAngle - currentAxis), 180 - Math.abs(jccHandleAngle - currentAxis));
        if (jccHandleDiffToCurrentAxis > 5) { // JCC handle not aligned with current lens axis
            feedback = `Please align the JCC handle with the current trial lens axis (${getDisplayAxis(currentAxis)}°) before continuing axis refinement.`;
            enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
            confirmAxisButton.disabled = true; // Ensure Confirm Axis is disabled
            hasJCCBeenFlippedThisStage = false; // Reset if handle moves off alignment
            displayContinuousPatientFeedback(feedback); 
            return; // Exit early to prevent other axis feedback
        }

        if (!hasJCCBeenFlippedThisStage) {
            feedback = `Please flip the JCC (using the 'Flip JCC' button) to compare Position 1 and 2.`;
            enableControls(['flipJCC', 'jccRotation', 'lensRotation', 'confirmAxis', 'restartPrescription', 'backToMenuButton']);
        } else {
            const redAxisPos1 = getDisplayAxis(jccHandleAngle - 45); // Effective red axis for Position 1 (unflipped)
            const redAxisPos2 = getDisplayAxis(jccHandleAngle + 45); // Effective red axis for Position 2 (flipped)

            // Calculate the difference between each JCC minus axis and the target axis
            const diffToTargetPos1 = Math.min(Math.abs(redAxisPos1 - targetAxis), 180 - Math.abs(redAxisPos1 - targetAxis));
            const diffToTargetPos2 = Math.min(Math.abs(redAxisPos2 - targetAxis), 180 - Math.abs(redAxisPos2 - targetAxis));

            if (Math.abs(diffToTargetPos1 - diffToTargetPos2) <= AXIS_EQUAL_TOLERANCE_FOR_FEEDBACK) { // Both positions are equally blurred
                feedback = `Both positions are equally blurred. Your axis feels good. Click 'Confirm Axis'.`;
                enableControls(['lensRotation', 'flipJCC', 'jccRotation', 'confirmAxis', 'restartPrescription', 'backToMenuButton']);
            } else {
                // Determine which of the two positions (1 or 2) is objectively clearer
                const isPos1Clearer = diffToTargetPos1 < diffToTargetPos2;

                if (isPos1Clearer) {
                    feedback = `Position 1 (red line at ${redAxisPos1}°) is clearer. Rotate lens axis TOWARDS ${redAxisPos1}°.`;
                } else { // Position 2 is clearer
                    feedback = `Position 2 (red line at ${redAxisPos2}°) is clearer. Rotate lens axis TOWARDS ${redAxisPos2}°.`;
                }
                enableControls(['lensRotation', 'flipJCC', 'jccRotation', 'confirmAxis', 'restartPrescription', 'backToMenuButton']); 
            }
        }
    } else if (practiceStage === 'AXIS_CONFIRMED_SETUP_POWER') {
        // JCC handle needs to be 45 deg from current axis for power refinement
        const expectedJCCHandleAngleForPower = getDisplayAxis(currentAxis + 45);
        const diffJCCHandle = Math.min(Math.abs(jccHandleAngle - expectedJCCHandleAngleForPower), 180 - Math.abs(jccHandleAngle - expectedJCCHandleAngleForPower));
        
        if (diffJCCHandle <= 5) {
            feedback = `JCC handle aligned for power. Now flip the JCC to compare Position 1 and 2.`;
            // Enable controls for power refinement and confirm power button
            enableControls(['flipJCC', 'jccRotation', 'increasePower', 'decreasePower', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
            hasJCCBeenFlippedThisStage = false; // Reset for the new refinement stage
            practiceStage = 'POWER_REFINEMENT'; // Advance stage implicitly
            updatePatientFeedback(); // Re-evaluate for the new stage
            return;
        } else {
            feedback = `Please align the JCC handle 45° from the current lens axis (${getDisplayAxis(currentAxis)}°). This means setting the JCC Handle Angle to ${expectedJCCHandleAngleForPower}°.`;
            enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
            confirmPowerButton.disabled = true; // Ensure Confirm Power is disabled until handle is aligned
        }
    } else if (practiceStage === 'POWER_REFINEMENT') {
        // Check if JCC handle is aligned for power refinement
        const expectedJCCHandleAngleForPower = getDisplayAxis(currentAxis + 45);
        const diffJCCHandle = Math.min(Math.abs(jccHandleAngle - expectedJCCHandleAngleForPower), 180 - Math.abs(jccHandleAngle - expectedJCCHandleAngleForPower));
        
        if (diffJCCHandle > 5) { // JCC handle not correctly aligned for power refinement
            feedback = `Please align the JCC handle 45° from the current lens axis (${getDisplayAxis(currentAxis)}°). This means setting the JCC Handle Angle to ${expectedJCCHandleAngleForPower}°.`;
            enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
            confirmPowerButton.disabled = true; // Ensure Confirm Power is disabled
            hasJCCBeenFlippedThisStage = false; // Reset if handle moves off alignment
            displayContinuousPatientFeedback(feedback);
            return; // Exit early
        }

        if (!hasJCCBeenFlippedThisStage) {
            feedback = `Please flip the JCC (using the 'Flip JCC' button) to compare Position 1 and 2 for power refinement.`;
            enableControls(['flipJCC', 'jccRotation', 'increasePower', 'decreasePower', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
        } else {
            // Power refinement feedback logic
            const cylPowerDiff = targetCylinder - currentCylinder; 

            // Check if current cylinder is at a limit and target requires moving beyond it
            const isAtMaxCylLimit = currentCylinder === MAX_ADJUSTABLE_CYLINDER; // e.g., current is 0.00 DC
            const isAtMinCylLimit = currentCylinder === MIN_ADJUSTABLE_CYLINDER; // e.g., current is -4.00 DC

            if (Math.abs(cylPowerDiff) <= POWER_EQUAL_TOLERANCE_FOR_FEEDBACK) { 
                // Current power is optically good (within a small tolerance of the target)
                feedback = `Both positions are equally blurred. Current power feels good. Click 'Confirm Power'.`;
                enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
            } else if (cylPowerDiff < 0) { // Patient needs MORE minus cylinder (current is not negative enough) -> prefers RED side
                if (isAtMinCylLimit) {
                    feedback = `Position 1 (red side aligned with lens axis) is clearer, but cylinder power cannot be made more negative than ${MIN_ADJUSTABLE_CYLINDER.toFixed(2)} DC.`;
                } else {
                    feedback = `Position 1 (red side aligned with lens axis) is clearer. Add more minus cylinder (-0.25 DC).`;
                }
                enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
            } else if (cylPowerDiff > 0) { // Patient needs LESS minus cylinder (current is too negative) -> prefers GREEN side
                if (isAtMaxCylLimit) {
                    feedback = `Position 2 (green side aligned with lens axis) is clearer, but cylinder power cannot be made less negative than ${MAX_ADJUSTABLE_CYLINDER.toFixed(2)} DC.`;
                } else {
                    feedback = `Position 2 (green side aligned with lens axis) is clearer. Reduce minus cylinder (+0.25 DC).`;
                }
                enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
            } else { // Close, but not "equally blurred"
                feedback = `One position might be slightly clearer. Fine-tune your power.`;
                enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
            }
        }
    } else if (practiceStage === 'COMPLETE') {
        feedback = `Prescription completed! Click 'Next Prescription' for another challenge or 'Back to Main Menu'.`;
        disableAllControls();
        enableControls(['nextPrescription', 'restartPrescription', 'backToMenuButton']);
    } else {
        feedback = `Something went wrong with the stage. Please restart the prescription.`;
        enableControls(['restartPrescription', 'backToMenuButton']);
    }

    displayContinuousPatientFeedback(feedback);
}


function checkRefinementComplete(showNotification = false) {
    const AXIS_TOLERANCE_FINAL = 5; // +/- 5 degrees for final check
    const POWER_TOLERANCE_FINAL = 0.25; // +/- 0.25 D for final check
    const SPHERE_TOLERANCE_FINAL = 0.25; // +/- 0.25 D for final sphere equivalent check

    const axisMatches = Math.min(Math.abs(currentAxis - targetAxis), 180 - Math.abs(currentAxis - targetAxis)) <= AXIS_TOLERANCE_FINAL;
    const powerMatches = Math.abs(currentCylinder - targetCylinder) <= POWER_TOLERANCE_FINAL;
    const sphereMatches = Math.abs(currentSphere - targetSphere) <= SPHERE_TOLERANCE_FINAL; // Check current sphere against target sphere

    if (axisMatches && powerMatches && sphereMatches) {
        finalRXDisplay.textContent = `${targetSphere.toFixed(2)} DS / ${targetCylinder.toFixed(2)} DC x ${getDisplayAxis(targetAxis)}°`; // Display target as verified
        practiceStage = 'COMPLETE';
        if (showNotification) { // Only show notification if explicitly requested (e.g., after successful confirmation)
            showJCCNotification(`Congratulations! You've accurately refined this prescription! Target: ${targetSphere.toFixed(2)} DS / ${targetCylinder.toFixed(2)} DC x ${getDisplayAxis(targetAxis)}°.`, () => {
                displayInstruction('Well done! Click "Next Prescription" for another challenge or "Back to Main Menu".');
            });
        }
        disableAllControls(); // Disable all controls initially
        enableControls(['nextPrescription', 'restartPrescription', 'backToMenuButton']); // Re-enable these specifically after notification
    } else {
        finalRXDisplay.textContent = ``; // Clear if not complete
    }
}

function restartCurrentPrescription() {
    // Store current target, then generate starting point based on it
    const storedTargetRx = { sphere: targetSphere, cylinder: targetCylinder, axis: targetAxis };
    
    generateRandomPracticePrescription(); // This will generate a new random target.
    // We actually want to re-use the *current* target, but randomize the starting point.
    targetSphere = storedTargetRx.sphere;
    targetCylinder = storedTargetRx.cylinder;
    targetAxis = storedTargetRx.axis;

    // Now, randomize the starting point based on the *stored* target.
    let numCylSteps = (currentMode === 'easy') ? 2 : 3;
    let numAxisSteps = (currentMode === 'easy') ? 2 : 3;

    let initialCylDeviationAmount = numCylSteps * 0.25;
    let initialAxisDeviationAmount = numAxisSteps * 5;

    currentSphere = targetSphere; // Start with target sphere for simplicity

    let initialCylCandidate;
    let attemptsCyl = 0;
    do {
        const direction = (Math.random() > 0.5 ? -1 : 1);
        initialCylCandidate = roundToQuarterDiopter(targetCylinder + (direction * initialCylDeviationAmount));
        attemptsCyl++;
        if (attemptsCyl > 10) { 
            if (targetCylinder + 0.25 <= MAX_ADJUSTABLE_CYLINDER) {
                initialCylCandidate = roundToQuarterDiopter(targetCylinder + 0.25);
            } else if (targetCylinder - 0.25 >= MIN_ADJUSTABLE_CYLINDER) {
                initialCylCandidate = roundToQuarterDiopter(targetCylinder - 0.25);
            } else { 
                initialCylCandidate = targetCylinder; 
            }
            break;
        }
    } while (initialCylCandidate === targetCylinder || initialCylCandidate < MIN_ADJUSTABLE_CYLINDER || initialCylCandidate > MAX_ADJUSTABLE_CYLINDER);
    currentCylinder = initialCylCandidate;

    let initialAxisCandidate;
    let attemptsAxis = 0;
    do {
        const direction = (Math.random() > 0.5 ? -1 : 1);
        initialAxisCandidate = getDisplayAxis(targetAxis + (direction * initialAxisDeviationAmount));
        attemptsAxis++;
        if (attemptsAxis > 10) { 
            initialAxisCandidate = getDisplayAxis(targetAxis + 5); 
            break;
        }
    } while (initialAxisCandidate === targetAxis);
    currentAxis = initialAxisCandidate;
    
    jccHandleAngle = 90;
    jccFlipped = false;

    practiceStage = 'AXIS_HANDLE_ALIGNMENT'; // Reset stage
    hasJCCBeenFlippedThisStage = false; // Reset for restart

    updateLensDisplay();
    updateJCCDisplay();
    
    disableAllControls();
    enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']); 

    displayInstruction(`Prescription restarted. Refine the cylinder axis and power in ${currentMode.toUpperCase()} mode.`);
    displayContinuousPatientFeedback(`Initial lens set to ${currentSphere.toFixed(2)} DS / ${currentCylinder.toFixed(2)} DC x ${getDisplayAxis(currentAxis)}°.`);
    finalRXDisplay.textContent = ``;

    showJCCNotification(`Prescription restarted. Please align the JCC handle with the current trial lens axis (${getDisplayAxis(currentAxis)}°) to begin axis refinement.`, () => {
        enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
        practiceStage = 'AXIS_HANDLE_ALIGNMENT'; // Confirm stage
        updatePatientFeedback();
    });
}


// --- Initialization for Practice Mode ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners for practice mode controls
    if (jccAxisSliderDiv) {
        jccAxisSliderDiv.addEventListener('mousedown', (e) => startDrag(e, jccAxisSliderDiv, jccAxisSliderSVG, jccSliderThumb, updateJCCRotation, updatePatientFeedback));
        jccAxisSliderDiv.addEventListener('touchstart', (e) => startDrag(e, jccAxisSliderDiv, jccAxisSliderSVG, jccSliderThumb, updateJCCRotation, updatePatientFeedback));
    }
    if (lensAxisSliderDiv) {
        lensAxisSliderDiv.addEventListener('mousedown', (e) => startDrag(e, lensAxisSliderDiv, lensAxisSliderSVG, lensSliderThumb, updateLensRotation, updatePatientFeedback));
        lensAxisSliderDiv.addEventListener('touchstart', (e) => startDrag(e, lensAxisSliderDiv, lensAxisSliderSVG, lensSliderThumb, updateLensRotation, updatePatientFeedback));
    }

    if (flipJCCButton) {
        flipJCCButton.addEventListener('click', () => {
            if (flipJCCButton.disabled) return;
            jccFlipped = !jccFlipped;
            hasJCCBeenFlippedThisStage = true; // Set to true after flip
            updateJCCDisplay();
            updatePatientFeedback(); // Re-evaluate feedback after flip
        });
    }

    if (increasePowerButton) {
        increasePowerButton.addEventListener('click', () => {
            if (increasePowerButton.disabled) return;
            let newCylinder = roundToQuarterDiopter(currentCylinder - 0.25); 
            let newSphere = roundToQuarterDiopter(currentSphere + 0.125); 

            if (newCylinder >= MIN_ADJUSTABLE_CYLINDER) {
                currentCylinder = newCylinder;
                currentSphere = newSphere;
            } else {
                showJCCNotification(`Cylinder power cannot be set more negative than ${MIN_ADJUSTABLE_CYLINDER.toFixed(2)} DC.`, () => {
                    enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
                    updatePatientFeedback();
                });
                return;
            }
            updateLensDisplay();
            updatePatientFeedback();
        });
    }

    if (decreasePowerButton) {
        decreasePowerButton.addEventListener('click', () => {
            if (decreasePowerButton.disabled) return;
            let newCylinder = roundToQuarterDiopter(currentCylinder + 0.25);
            let newSphere = roundToQuarterDiopter(currentSphere - 0.125); 

            if (newCylinder <= MAX_ADJUSTABLE_CYLINDER) {
                currentCylinder = newCylinder;
                currentSphere = newSphere;
            } else {
                showJCCNotification(`Cylinder power cannot be set less negative than ${MAX_ADJUSTABLE_CYLINDER.toFixed(2)} DC (i.e., less astigmatism).`, () => {
                    enableControls(['increasePower', 'decreasePower', 'flipJCC', 'jccRotation', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
                    updatePatientFeedback();
                });
                return;
            }
            updateLensDisplay();
            updatePatientFeedback();
        });
    }

    if (confirmAxisButton) {
        confirmAxisButton.addEventListener('click', () => {
            if (confirmAxisButton.disabled || practiceStage !== 'AXIS_REFINEMENT') return;

            const AXIS_TOLERANCE_FOR_CONFIRM = 5; 
            const axisMatches = Math.min(Math.abs(currentAxis - targetAxis), 180 - Math.abs(currentAxis - targetAxis)) <= AXIS_TOLERANCE_FOR_CONFIRM;

            if (axisMatches) {
                showJCCNotification(`Axis confirmed at ${getDisplayAxis(currentAxis)}°. Now let's refine the power.`, () => {
                    displayInstruction(`Axis confirmed. For power refinement, align the JCC handle 45° from the current lens axis (${getDisplayAxis(currentAxis)}°).`);
                    practiceStage = 'AXIS_CONFIRMED_SETUP_POWER';
                    disableAllControls();
                    enableControls(['jccRotation', 'restartPrescription', 'backToMenuButton']);
                    updatePatientFeedback();
                });
            } else {
                showJCCNotification(`Your current axis (${getDisplayAxis(currentAxis)}°) is not yet accurate enough (within ${AXIS_TOLERANCE_FOR_CONFIRM}°). Please continue refining.`, () => {
                    enableControls(['flipJCC', 'jccRotation', 'lensRotation', 'confirmAxis', 'restartPrescription', 'backToMenuButton']);
                    updatePatientFeedback();
                });
            }
        });
    }

    if (confirmPowerButton) {
        confirmPowerButton.addEventListener('click', () => {
            if (confirmPowerButton.disabled || practiceStage !== 'POWER_REFINEMENT') return;

            const POWER_TOLERANCE_FOR_CONFIRM = 0.25;
            const SPHERE_TOLERANCE_FOR_CONFIRM = 0.25;
            
            const powerMatches = Math.abs(currentCylinder - targetCylinder) <= POWER_TOLERANCE_FOR_CONFIRM;
            const sphereMatches = Math.abs(currentSphere - targetSphere) <= SPHERE_TOLERANCE_FOR_CONFIRM;

            if (powerMatches && sphereMatches) {
                showJCCNotification(`Power confirmed at ${currentCylinder.toFixed(2)} DC. Sphere at ${currentSphere.toFixed(2)} DS. You've completed this prescription!`, () => {
                    practiceStage = 'COMPLETE';
                    checkRefinementComplete(false);
                    displayInstruction('Well done! Click "Next Prescription" for another challenge or "Back to Main Menu".');
                });
            } else {
                let message = `Your current power (${currentCylinder.toFixed(2)} DC) and sphere (${currentSphere.toFixed(2)} DS) are not yet accurate enough (within ${POWER_TOLERANCE_FOR_CONFIRM}D). Please continue refining.`;
                showJCCNotification(message, () => {
                    enableControls(['flipJCC', 'jccRotation', 'lensRotation', 'increasePower', 'decreasePower', 'confirmPower', 'restartPrescription', 'backToMenuButton']);
                    updatePatientFeedback();
                });
            }
        });
    }

    // Practice mode navigation buttons
    if (backToMenuButton) {
        backToMenuButton.addEventListener('click', () => {
            window.location.href = 'index.html'; // Go back to the main menu
        });
    }

    if (nextPrescriptionButton) {
        nextPrescriptionButton.addEventListener('click', loadRandomPrescription);
    }

    if (restartPrescriptionButton) {
        restartPrescriptionButton.addEventListener('click', restartCurrentPrescription);
    }

    // Start the practice mode flow
    loadRandomPrescription();
    welcomeMessageDiv.textContent = `JCC Practice Mode: ${currentMode.toUpperCase()}`;
});