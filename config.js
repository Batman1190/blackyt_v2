// YouTube API Configuration
const YOUTUBE_API_KEYS = [
    'AIzaSyBRB8bXp-UFdoNFhTqh9n2hWdthpm--gXk',
    'AIzaSyBi9XME_hKIdmFyKT2sX9Qzq-YW4uwaPGc',
    'AIzaSyAaT_fn6jzNLUjee7n7hQIJAdjvQiKHSTU',
    'AIzaSyD0ZhRR292c95yMkSx-ZPWtsGL-FkwEH2Y',
    'AIzaSyB0z2xXRZX5dh8tMw3PZh9oqfSGgwiWx-U',
    'AIzaSyByQDjEkBdrbJqi3O35UUyOEgGrEqImoXU',
    'AIzaSyA4iPnRBOkNcVnG6i2Osdplr-6KOOidJso',
    'AIzaSyBp1KT6xYFkP5pkq5vldiS5M-275Jyhk1o',
    'AIzaSyBSUK5rvC9NUIfGg7Ol-c5fByZDLxkV4MA',
    'AIzaSyBBN1oCDauSMk_QdRMKfriv3KsP--jGgIE',
    'AIzaSyBzD1zDrYqVl-RH3vTwfmXDkGqjdH3Zlr0',
    'AIzaSyDzoPLaJUFjAB0kSSPRGQfUwiMlywWIO4I',
    'AIzaSyCSMlS_3EpigNZYoyxU7L6mnLPfpFbJ6vA',
    'AIzaSyAvw2xoR4eaQOzsyEBjthCQSFo5x60jNV8',
    'AIzaSyDOd-fwjmHblCWYZWFtu6V0QNGHNBMb0Tw',
    'AIzaSyDKye_UeYzygyeo7H35-bKrM3wgCXb3wPs',
    'AIzaSyBg_4VpFdldAYh4eyEOdJKibMS1HeM7wZQ',
    'AIzaSyDIhTB0yw5Qkbdp3Wpu1n0djdJQXvELGlc',
    'AIzaSyCCgPxoUbeo3yiKo-2i8FTDyMO2MEhVS5Q',
    'AIzaSyDc-OSidO2qU5QAiXi7Ad1qASH3rPGZB3w',
    'AIzaSyA1KrCE-nCrnw_6lCrm0WK3n5iE5LlOpoQ',
    'AIzaSyCHby00rzviTneGRsYoaXPDSTNZ5mByYRs',
    'AIzaSyANh88_Ut5RXlGkw8TgbpgCcHHXTPqgN74',
    'AIzaSyCjgMk3Q_D-545I-slLdpOkcsi5rhUbwLg',
    'AIzaSyBRGmaiOgS9Ma0d6X6GqDxLbfJLFolkgCs',
    'AIzaSyBwQVmWudUVfBSA-Xd0Py3dWaBdubjEKDk',
    'AIzaSyAohDXe4nuKALD07eQGXG7WiCPC9u4j-No',
    'AIzaSyDEDWKHYGpjRJHM_xvgwzqUgCUgTI4BP24'
];

let currentKeyIndex = 0;
let lastUsedKeyIndex = -1;
let lastKeyUsageTime = 0;
const MIN_KEY_USAGE_INTERVAL = 200; // Reduced to 200ms for better performance

export const YOUTUBE_CONFIG = {
    async getAPIKey() {
        const now = Date.now();
        
        // If we've used all keys, start over
        if (currentKeyIndex === lastUsedKeyIndex) {
            currentKeyIndex = 0;
        }
        
        // If we're using the same key too quickly, wait
        if (now - lastKeyUsageTime < MIN_KEY_USAGE_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, MIN_KEY_USAGE_INTERVAL));
        }
        
        const key = YOUTUBE_API_KEYS[currentKeyIndex];
        lastUsedKeyIndex = currentKeyIndex;
        lastKeyUsageTime = now;
        
        // Log the key rotation
        console.log(`Using API key index: ${currentKeyIndex} (Total keys: ${YOUTUBE_API_KEYS.length})`);
        
        // Rotate to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        return key;
    },
    
    rotateKey() {
        // Force rotation to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        console.log(`Manually rotating to API key index: ${currentKeyIndex}`);
        return YOUTUBE_API_KEYS[currentKeyIndex];
    },
    
    // Get total number of available keys
    getKeyCount() {
        return YOUTUBE_API_KEYS.length;
    },
    
    // Get current key index (for debugging)
    getCurrentKeyIndex() {
        return currentKeyIndex;
    }
};
