document.addEventListener('DOMContentLoaded', () => {
    const startTutorModeButton = document.getElementById('startTutorModeButton');
    const startEasyPracticeButton = document.getElementById('startEasyPracticeButton');
    const startHardPracticeButton = document.getElementById('startHardPracticeButton');
    const welcomeMessageDiv = document.getElementById('welcomeMessage');
    const mainNavigationPanel = document.getElementById('mainNavigationPanel');

    if (welcomeMessageDiv) {
        welcomeMessageDiv.textContent = `Welcome to the JCC Simulator! Select a mode to begin.`;
    }
    if (mainNavigationPanel) {
        mainNavigationPanel.classList.remove('hidden'); // Ensure navigation is visible
    }

    if (startTutorModeButton) {
        startTutorModeButton.onclick = () => {
            window.location.href = 'tutor.html'; // Navigate to the tutor page
        };
    }
    if (startEasyPracticeButton) {
        startEasyPracticeButton.onclick = () => {
            window.location.href = 'practice.html?mode=easy'; // Navigate to practice page with mode
        };
    }
    if (startHardPracticeButton) {
        startHardPracticeButton.onclick = () => {
            window.location.href = 'practice.html?mode=hard'; // Navigate to practice page with mode
        };
    }
});