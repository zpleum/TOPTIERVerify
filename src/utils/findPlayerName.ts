// utils/findPlayerName.ts
export function findPlayerName(): string | null {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlayerName = urlParams.get('player');
    const hash = window.location.hash;
    const hashMatch = hash.match(/[?&]player=([^&]+)/);
    const hashPlayerName = hashMatch ? decodeURIComponent(hashMatch[1]) : null;
    const cookieValue = document.cookie.split('; ').find((row) => row.startsWith('playerName='))?.split('=')[1];
    const sessionPlayerName = sessionStorage.getItem('playerName');
  
    return urlPlayerName || hashPlayerName || cookieValue || sessionPlayerName;
  }
  