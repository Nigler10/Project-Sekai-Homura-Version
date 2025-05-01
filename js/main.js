import { setupAudio } from './audio.js';
import { setupFileInputs } from './fileInput.js';
import { setupControls } from './controls.js';
import { setupKeyEvents } from './input.js';
import { gameLoop } from './gameLoop.js';
import { gameState } from './state.js';

setupAudio(gameState);
setupFileInputs(gameState);
setupControls(gameState, gameLoop);
setupKeyEvents(gameState);
