// --- State Variables ---
let currentSphere = 0.00;
let currentCylinder = -2.00;
let currentAxis = 180; // Stores the 0-180 optometric axis
let jccHandleAngle = 90; // JCC handle set to start at 90 axis
let jccFlipped = false; // False for Position 1, True for Position 2 (swaps effective red/green axes)
let tutorStep = 0;      // Controls the progression of tutorial instructions
let isTutorStarted = false; // NEW: Flag to control initial view


// --- DOM Elements ---
// Selector cache for elements that are always expected on this page

// Nullish coalescing operator (`?.`) added for safety in case elements are initially hidden and not fully rendered
const procedureGuide = document.getElementById('jccProcedureGuide');

const trialLens = document.getElementById('trialLens');
const lensAxisDisplay = document.getElementById('lensAngleDisplay');
const cylinderPowerDisplay = document.getElementById('cylinderPowerDisplay');

const jccElement = document.getElementById('jcc');
const jccRedLine = jccElement?.querySelector('.jcc-red-line');
const jccGreenLine = jccElement?.querySelector('.jcc-green-line');
const jccAngleDisplay = document.getElementById('jccAngleDisplay');
const flipJCCButton = document.getElementById('flipJCC');
const jccPositionDisplay = document.getElementById('jccPositionDisplay');

const increasePowerButton = document.getElementById('increasePower');
const decreasePowerButton = document.getElementById('decreasePower');
const confirmAxisButton = document.getElementById('confirmAxis');
const confirmPowerButton = document.getElementById('confirmPower');

const tutorInstructionsBox = document.getElementById('tutorInstructions');
const patientFeedbackBox = document.getElementById('patientFeedback'); // For continuous feedback
const currentRXDisplay = document.getElementById('currentRX');
const finalRXDisplay = document.getElementById('finalRX');

// Notification Box Elements
const jccNotificationBox = document.getElementById('jccNotification');
const notificationMessage = document.getElementById('notificationMessage');
const notificationOkButton = document.getElementById('notificationOkButton');

// Welcome message element
const welcomeMessageDiv = document.getElementById('welcomeMessage');

// Tutor specific back button
const tutorBackToMenuButton = document.getElementById('tutorBackToMenuButton');

// NEW: Tutor Intro Panel elements
const tutorIntroPanel = document.getElementById('tutorIntroPanel');
const startTutorSessionButton = document.getElementById('startTutorSessionButton');
const tutorSimulatorContent = document.getElementById('tutorSimulatorContent');


// SVG Axis Slider Elements
const jccAxisSliderDiv = document.getElementById('jccAxisSlider');
const jccAxisSliderSVG = jccAxisSliderDiv?.querySelector('svg');
const jccSliderThumb = jccAxisSliderDiv?.querySelector('.slider-thumb');
const jccAxisLine = document.getElementById('jccAxisLine');

const lensAxisSliderDiv = document.getElementById('lensAxisSlider');
const lensAxisSliderSVG = lensAxisSliderDiv?.querySelector('svg');
const lensSliderThumb = lensAxisSliderDiv?.querySelector('.slider-thumb');
const lensAxisLine = document.getElementById('lensAxisLine');

let isDraggingJCC = false;
let isDraggingLens = false;

// SVG Path properties (from viewBox="0 0 100 100")
const SVG_VIEWBOX_WIDTH = 100;
const SVG_VIEWBOX_HEIGHT = 100;
const SVG_CENTER_X = 50;
const SVG_CENTER_Y = 50;
const SVG_RADIUS = 40;


// --- Helper Functions ---

function roundTo5Degrees(angle) {
    return Math.round(angle / 5) * 5;
}

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
    if (!thumb) return;

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
    if (!trialLens) return;

    trialLens.style.transform = `rotate(${-currentAxis}deg)`;
    if (lensAxisDisplay) lensAxisDisplay.textContent = `${getDisplayAxis(currentAxis)}°`;
    if (currentRXDisplay) currentRXDisplay.textContent = `${currentSphere.toFixed(2)} DS / ${currentCylinder.toFixed(2)} DC x ${getDisplayAxis(currentAxis)}°`;
    if (cylinderPowerDisplay) cylinderPowerDisplay.textContent = `${currentCylinder.toFixed(2)} DC`;

    if (trialLens.offsetWidth > 0 && trialLens.offsetHeight > 0) {
        const offsetFromCenter = 50;
        const lensDiameter = trialLens.offsetWidth;
        const lensRadius = lensDiameter / 2;

        const angleRad = (currentAxis * Math.PI) / 180;
        const xPos = lensRadius + offsetFromCenter * Math.cos(angleRad);
        const yPos = lensRadius + offsetFromCenter * Math.sin(angleRad);

        if (cylinderPowerDisplay) {
            cylinderPowerDisplay.style.left = `${xPos}px`;
            cylinderPowerDisplay.style.top = `${yPos}px`;
            cylinderPowerDisplay.style.transform = `translate(-50%, -50%) rotate(${currentAxis}deg)`;
        }
    }
    setSvgThumbPosition(lensSliderThumb, currentAxis);
}

function updateJCCDisplay() {
    if (!jccElement) return;

    jccElement.style.transform = `rotate(${-jccHandleAngle}deg)`;
    let redLineRelativeOffset, greenLineRelativeOffset;
    if (!jccFlipped) { // Position 1
        redLineRelativeOffset = -45;
        greenLineRelativeOffset = +45;
        if (jccPositionDisplay) jccPositionDisplay.textContent = "Position 1";
    } else { // Position 2
        redLineRelativeOffset = +45;
        greenLineRelativeOffset = -45;
        if (jccPositionDisplay) jccPositionDisplay.textContent = "Position 2";
    }
    if (jccRedLine) jccRedLine.style.transform = `translateX(-50%) rotate(${redLineRelativeOffset}deg)`;
    if (jccGreenLine) jccGreenLine.style.transform = `translateX(-50%) rotate(${greenLineRelativeOffset}deg)`;
    if (jccPositionDisplay) jccPositionDisplay.style.transform = `translate(-50%, -50%) translateY(-55px) rotate(${jccHandleAngle}deg)`;
    if (jccAngleDisplay) jccAngleDisplay.textContent = `${getDisplayAxis(jccHandleAngle)}°`;
    setSvgThumbPosition(jccSliderThumb, jccHandleAngle);
}

function displayInstruction(text) {
    if (tutorInstructionsBox) tutorInstructionsBox.innerHTML = `<strong>Tutor:</strong> ${text}`;
}

function displayContinuousPatientFeedback(text) {
    if (patientFeedbackBox) patientFeedbackBox.innerHTML = `<strong>Patient:</strong> ${text}`;
}

function showJCCNotification(message, onOkCallback) {
    if (!jccNotificationBox) return;

    notificationMessage.textContent = message;
    jccNotificationBox.classList.remove('hidden');
    disableAllControls();
    if (notificationOkButton) notificationOkButton.disabled = false;
    if (notificationOkButton) notificationOkButton.onclick = () => {
        jccNotificationBox.classList.add('hidden');
        if (notificationOkButton) notificationOkButton.onclick = null;
        onOkCallback();
    };
}

function disableAllControls() {
    if (flipJCCButton) flipJCCButton.disabled = true;
    if (jccAxisSliderDiv) jccAxisSliderDiv.classList.add('disabled');
    if (lensAxisSliderDiv) lensAxisSliderDiv.classList.add('disabled');
    if (increasePowerButton) increasePowerButton.disabled = true;
    if (decreasePowerButton) decreasePowerButton.disabled = true;
    if (confirmAxisButton) confirmAxisButton.disabled = true;
    if (confirmPowerButton) confirmPowerButton.disabled = true;
    if (notificationOkButton) notificationOkButton.disabled = true;
    if (tutorBackToMenuButton) tutorBackToMenuButton.disabled = true;
}

function enableControls(controls) {
    controls.forEach(control => {
        switch(control) {
            case 'flipJCC': if (flipJCCButton) flipJCCButton.disabled = false; break;
            case 'jccRotation': if (jccAxisSliderDiv) jccAxisSliderDiv.classList.remove('disabled'); break;
            case 'lensRotation': if (lensAxisSliderDiv) lensAxisSliderDiv.classList.remove('disabled'); break;
            case 'increasePower': if (increasePowerButton) increasePowerButton.disabled = false; break;
            case 'decreasePower': if (decreasePowerButton) decreasePowerButton.disabled = false; break;
            case 'confirmAxis': if (confirmAxisButton) confirmAxisButton.disabled = false; break;
            case 'confirmPower': if (confirmPowerButton) confirmPowerButton.disabled = false; break;
            case 'tutorBackToMenuButton': if (tutorBackToMenuButton) tutorBackToMenuButton.disabled = false; break;
        }
    });
}

function getJCCRedLineAxis() {
    let redLineOffset;
    if (!jccFlipped) {
        redLineOffset = -45;
    } else {
        redLineOffset = +45;
    }
    let calculatedAxis = jccHandleAngle + redLineOffset;
    return getDisplayAxis(calculatedAxis);
}

function getJCCGreenLineAxis() {
    let greenLineOffset;
    if (!jccFlipped) {
        greenLineOffset = +45;
    } else {
        greenLineOffset = -45;
    }
    let calculatedAxis = jccHandleAngle + greenLineOffset;
    return getDisplayAxis(calculatedAxis);
}

function getSvgCoordinates(event, svgElement) {
    if (!svgElement) return { x: 0, y: 0 };
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
    if (!sliderDiv || sliderDiv.classList.contains('disabled') || !isTutorStarted) return; // Added isTutorStarted check
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

        if (jccAngleDisplay && sliderDiv === jccAxisSliderDiv) { jccAngleDisplay.textContent = `${getDisplayAxis(newOptometricAxis)}°`; }
        else if (lensAxisDisplay && sliderDiv === lensAxisSliderDiv) { lensAxisDisplay.textContent = `${getDisplayAxis(newOptometricAxis)}°`; }
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
        if (afterDragCallback) afterDragCallback();
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


// --- Tutor Flow Logic (nextStep function) ---

function checkSliderValueForNextStep() {
    if (!isTutorStarted) return; // Only proceed if the tutor session has officially started

    switch (tutorStep) {
        case 1: // Initial JCC handle alignment to 180 (patient's current axis)
            if (jccHandleAngle === 180) {
                nextStep();
            }
            break;
        case 8: // Rotate lens to 5 degrees
            if (currentAxis === 5) {
                nextStep();
            }
            break;
        case 9: // Align JCC handle to new lens axis (5 deg)
            if (jccHandleAngle === 5) {
                nextStep();
            }
            break;
        case 17: // Align JCC red line with lens axis for power (JCC handle 45 deg from current lens axis)
            const targetPowerRefineJCCHandleAngle = getDisplayAxis(currentAxis + 45);
            if (jccHandleAngle === targetPowerRefineJCCHandleAngle) {
                nextStep();
            }
            break;
    }
}

function nextStep() {
    if (!isTutorStarted) return; // Only proceed if the tutor session has officially started

    tutorStep++;
    disableAllControls();

    switch (tutorStep) {
        case 1:
            // This case now implicitly starts AFTER the intro panel is gone.
            // The welcome message for the tutorial itself is set in initTutorMode.
            displayContinuousPatientFeedback(`Ready for examination.`);
            setTimeout(() => {
                displayInstruction(`For axis refinement, align the JCC handle with the current cylinder axis. Your trial lens is at 180°. Please set the JCC Handle Angle to 180° using the circular slider.`);
                enableControls(['jccRotation', 'tutorBackToMenuButton']);
            }, 500);
            break;

        case 2:
            displayInstruction(`JCC handle is at ${getDisplayAxis(jccHandleAngle)}°. Click 'Flip JCC' to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 3:
            displayContinuousPatientFeedback(`Position 2 (red line at 40°): Blurred.`);
            showJCCNotification(`Position 2 (red line at 40°): Blurred. Now, click 'Flip JCC' again to view Position 1.`, nextStep);
            break;

        case 4:
            displayInstruction(`Click 'Flip JCC' again to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = true;
            updateJCCDisplay();
            break;

        case 5:
            displayContinuousPatientFeedback(`Position 1 (red line at 140°): Blurred.`);
            showJCCNotification(`Position 1 (red line at 140°): Blurred. Now, click 'Flip JCC' one more time to view Position 2 and finalize.`, nextStep);
            break;

        case 6:
            displayInstruction(`Click 'Flip JCC' one more time to view Position 2 and finalize.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 7:
            displayContinuousPatientFeedback(`Position 2 (red line at 40°): Clearer than Position 1.`);
            showJCCNotification(`Position 2 (red line at 40°): Clearer than Position 1. Rotate the cylinder lens towards the red line (because of minus lens) for 5 degrees (to axis 5°).`, nextStep);
            break;

        case 8:
            displayInstruction(`As instructed, rotate the trial lens cylinder axis to 5° using the circular slider.`);
            enableControls(['lensRotation', 'tutorBackToMenuButton']);
            updateLensDisplay();
            break;

        case 9:
            displayInstruction(`Trial lens is now at ${getDisplayAxis(currentAxis)}°. Now align the JCC handle parallel to this new lens axis (${getDisplayAxis(currentAxis)}°) for further refinement. Please set the JCC Handle Angle to ${getDisplayAxis(currentAxis)}° using the circular slider.`);
            enableControls(['jccRotation', 'tutorBackToMenuButton']);
            updateJCCDisplay();
            break;

        case 10:
            displayInstruction(`JCC handle is at ${getDisplayAxis(jccHandleAngle)}°. Click 'Flip JCC' to show Position 1 for axis confirmation.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 11:
            displayContinuousPatientFeedback(`Position 2 (red line at ${getJCCRedLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Position 2 (red line at ${getJCCRedLineAxis()}°): Equally blurred. Now, click 'Flip JCC' again to view Position 1.`, nextStep);
            break;

        case 12:
            displayInstruction(`Click 'Flip JCC' again to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = true;
            updateJCCDisplay();
            break;

        case 13:
            displayContinuousPatientFeedback(`Position 1 (red line at ${getJCCRedLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Position 1 (red line at ${getJCCRedLineAxis()}°): Equally blurred. Now, click 'Flip JCC' one more time to view Position 2 and finalize.`, nextStep);
            break;

        case 14:
            displayInstruction(`Click 'Flip JCC' one more time to view Position 2 and finalize.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 15:
            displayContinuousPatientFeedback(`Position 2 (red line at ${getJCCRedLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Both positions are 'Equally blurred'. This confirms ${getDisplayAxis(currentAxis)}° as the correct cylinder axis! Now confirm the axis.`, nextStep);
            break;

        case 16:
            displayInstruction(`As indicated by patient feedback, confirm the axis by clicking 'Confirm Axis'.`);
            enableControls(['confirmAxis', 'tutorBackToMenuButton']);
            break;

        case 17:
            const powerRefineJCCHandleAngle = getDisplayAxis(currentAxis + 45);
            displayInstruction(`Axis confirmed at ${getDisplayAxis(currentAxis)}°. Now for power refinement. Align the JCC's red line (minus cylinder axis) parallel to the current lens axis (${getDisplayAxis(currentAxis)}°). For Position 1 (unflipped JCC), this means setting the JCC Handle Angle to ${powerRefineJCCHandleAngle}°. Please set the JCC Handle Angle to ${powerRefineJCCHandleAngle}°.`);
            enableControls(['jccRotation', 'tutorBackToMenuButton']);
            updateJCCDisplay();
            break;

        case 18:
            displayInstruction(`JCC's red line is now aligned with the lens axis at ${getJCCRedLineAxis()}°. Click 'Flip JCC' to show Position 1 for power comparison.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 19:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Clearer than Position 1.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Clearer than Position 1. Now, click 'Flip JCC' again to view Position 1.`, nextStep);
            break;

        case 20:
            displayInstruction(`Click 'Flip JCC' again to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = true;
            updateJCCDisplay();
            break;

        case 21:
            displayContinuousPatientFeedback(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Blurred.`);
            showJCCNotification(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Blurred. Now, click 'Flip JCC' one more time to view Position 2 and finalize.`, nextStep);
            break;

        case 22:
            displayInstruction(`Click 'Flip JCC' one more time to view Position 2 and finalize.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 23:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Clearer than Position 1.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Clearer than Position 1. This means more minus cylinder power is needed. Add -0.25 DC to the lens.`, nextStep);
            break;

        case 24:
            displayInstruction(`Based on patient feedback, click 'Increase Power (-0.25 DC)'.`);
            enableControls(['increasePower', 'decreasePower', 'tutorBackToMenuButton']);
            break;

        case 25:
            displayInstruction(`Cylinder power increased to ${currentCylinder.toFixed(2)} DC. Click 'Flip JCC' again to re-evaluate Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 26:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Still slightly clearer than Position 1.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Still slightly clearer than Position 1. Now, click 'Flip JCC' again to view Position 1.`, nextStep);
            break;

        case 27:
            displayInstruction(`Click 'Flip JCC' again to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = true;
            updateJCCDisplay();
            break;

        case 28:
            displayContinuousPatientFeedback(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Still slightly blurred.`);
            showJCCNotification(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Still slightly blurred. Now, click 'Flip JCC' one more time to view Position 2 and finalize.`, nextStep);
            break;

        case 29:
            displayInstruction(`Click 'Flip JCC' one more time to view Position 2 and finalize.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 30:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Still slightly clearer than Position 1.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Still slightly clearer than Position 1. Let's add another -0.25 DC.`, nextStep);
            break;

        case 31:
            displayInstruction(`Based on patient feedback, click 'Increase Power (-0.25 DC)' again.`);
            enableControls(['increasePower', 'decreasePower', 'tutorBackToMenuButton']);
            break;

        case 32:
            displayInstruction(`Cylinder power increased to ${currentCylinder.toFixed(2)} DC. Click 'Flip JCC' again to re-evaluate Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 33:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Equally blurred. Now, click 'Flip JCC' again to view Position 1.`, nextStep);
            break;

        case 34:
            displayInstruction(`Click 'Flip JCC' again to view Position 1.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = true;
            updateJCCDisplay();
            break;

        case 35:
            displayContinuousPatientFeedback(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Position 1 (green line along ${getDisplayAxis(currentAxis)}°, red line at ${getJCCRedLineAxis()}°): Equally blurred. Now, click 'Flip JCC' one more time to view Position 2 and finalize.`, nextStep);
            break;

        case 36:
            displayInstruction(`Click 'Flip JCC' one more time to view Position 2 and finalize.`);
            enableControls(['flipJCC', 'tutorBackToMenuButton']);
            jccFlipped = false;
            updateJCCDisplay();
            break;

        case 37:
            displayContinuousPatientFeedback(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Equally blurred.`);
            showJCCNotification(`Position 2 (red line along ${getDisplayAxis(currentAxis)}°, green line at ${getJCCGreenLineAxis()}°): Equally blurred. Both positions are now equally blurred! The cylinder power of ${currentCylinder.toFixed(2)} DC at axis ${getDisplayAxis(currentAxis)}° is confirmed. Now confirm the power.`, nextStep);
            break;

        case 38:
            displayInstruction(`As indicated by patient feedback, confirm the power by clicking 'Confirm Power'.`);
            enableControls(['confirmPower', 'tutorBackToMenuButton']);
            break;

        case 39:
            displayInstruction(`Congratulations! You have successfully refined the cylinder axis and power. The final verified prescription is displayed below.`);
            if (finalRXDisplay) finalRXDisplay.textContent = `${currentSphere.toFixed(2)} DS / ${currentCylinder.toFixed(2)} DC x ${getDisplayAxis(currentAxis)}°`;
            disableAllControls();
            enableControls(['tutorBackToMenuButton']);
            break;

        default:
            displayInstruction("Simulation complete. Refresh the page to restart.");
            break;
    }
}

// Function to initialize the tutor mode after the intro panel
function initTutorMode() {
    isTutorStarted = true; // Set flag
    if (tutorIntroPanel) tutorIntroPanel.classList.add('hidden'); // Hide the intro panel
    if (tutorSimulatorContent) tutorSimulatorContent.classList.remove('hidden'); // Show the simulator content

    if (welcomeMessageDiv) welcomeMessageDiv.textContent = `Welcome! Retinoscopy found Plano / -2.00 DC x 180. Your current trial lens is set to this. We'll refine the axis first.`;

    updateLensDisplay();
    updateJCCDisplay();

    tutorStep = 0; // Ensure it starts from 0 so nextStep() increments it to 1
    nextStep(); // Start the tutorial flow
}


// --- Initialization for Tutor Mode ---
document.addEventListener('DOMContentLoaded', () => {
    // Hide the simulator content and show the intro panel initially
    if (tutorSimulatorContent) tutorSimulatorContent.classList.add('hidden');
    if (tutorIntroPanel) tutorIntroPanel.classList.remove('hidden');

    // Display initial welcome message for the intro screen
    if (welcomeMessageDiv) welcomeMessageDiv.textContent = `Welcome to JCC Tutor Mode!`;


    // Attach event listeners for tutor mode controls
    if (jccAxisSliderDiv && jccAxisSliderSVG && jccSliderThumb) {
        jccAxisSliderDiv.addEventListener('mousedown', (e) => startDrag(e, jccAxisSliderDiv, jccAxisSliderSVG, jccSliderThumb, updateJCCRotation, checkSliderValueForNextStep));
        jccAxisSliderDiv.addEventListener('touchstart', (e) => startDrag(e, jccAxisSliderDiv, jccAxisSliderSVG, jccSliderThumb, updateJCCRotation, checkSliderValueForNextStep));
    }
    if (lensAxisSliderDiv && lensAxisSliderSVG && lensSliderThumb) {
        lensAxisSliderDiv.addEventListener('mousedown', (e) => startDrag(e, lensAxisSliderDiv, lensAxisSliderSVG, lensSliderThumb, updateLensRotation, checkSliderValueForNextStep));
        lensAxisSliderDiv.addEventListener('touchstart', (e) => startDrag(e, lensAxisSliderDiv, lensAxisSliderSVG, lensSliderThumb, updateLensRotation, checkSliderValueForNextStep));
    }

    if (flipJCCButton) {
        flipJCCButton.addEventListener('click', () => {
            if (flipJCCButton.disabled || !isTutorStarted) return; // Added isTutorStarted check
            jccFlipped = !jccFlipped;
            updateJCCDisplay();
            nextStep();
        });
    }
    if (increasePowerButton) {
        increasePowerButton.addEventListener('click', () => {
            if (increasePowerButton.disabled || !isTutorStarted) return; // Added isTutorStarted check
            currentCylinder -= 0.25;
            currentSphere += 0.125; // Sphere compensation
            updateLensDisplay();
            if (tutorStep === 24 || tutorStep === 31) {
                nextStep();
            }
        });
    }
    if (decreasePowerButton) {
        decreasePowerButton.addEventListener('click', () => {
            if (decreasePowerButton.disabled || !isTutorStarted) return; // Added isTutorStarted check
            // In tutorial, decreasing power is not an expected step for this fixed scenario.
            // If it were, it would also call nextStep() when appropriate.
            currentCylinder += 0.25;
            currentSphere -= 0.125; // Sphere compensation
            updateLensDisplay();
        });
    }
    if (confirmAxisButton) {
        confirmAxisButton.addEventListener('click', () => {
            if (confirmAxisButton.disabled || !isTutorStarted) return; // Added isTutorStarted check
            if (tutorStep === 16 && currentAxis === 5) {
                nextStep();
            }
        });
    }
    if (confirmPowerButton) {
        confirmPowerButton.addEventListener('click', () => {
            if (confirmPowerButton.disabled || !isTutorStarted) return; // Added isTutorStarted check
            // The final power in the tutorial is -2.50 DC (initial -2.00, then two -0.25 DC increases)
            // And sphere compensation would make sphere 0.00 + 0.125 + 0.125 = +0.25 DS
            if (tutorStep === 38 && currentCylinder.toFixed(2) === "-2.50" && currentSphere.toFixed(2) === "0.25") {
                nextStep();
            }
        });
    }

    if (tutorBackToMenuButton) {
        tutorBackToMenuButton.onclick = () => {
            window.location.href = 'index.html'; // Go back to the main menu
        };
    }

    // NEW: Event listener for the "Start Tutor Session" button
    if (startTutorSessionButton) {
        startTutorSessionButton.onclick = initTutorMode;
    }
});