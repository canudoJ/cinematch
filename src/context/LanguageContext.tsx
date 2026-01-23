'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es';

interface Translations {
    title: string;
    subtitle: string;
    partnerReady: string;
    startSession: string;
    you: string;
    like: string;
    nope: string;
    itsAMatch: string;
    watchOnNetflix: string;
    watchOnPrime: string;
    keepPlaying: string;
    noMoreMovies: string;
    configure: string;
    myList: string;
    library: string; // Added library key
    welcome: string;
    start: string;
    language: string;
    next: string;
    back: string;
    createLobby: string;
    waitingForPlayers: string;
    startGame: string;
    shareCode: string;
    groupSetup: string;
    yourPlatform: string;
    selectContent: string;
    movies: string;
    tvShows: string;
    exitLobby: string;
    playWithFriends: string;
    // Curator Mode
    decks: string;
    myDecks: string;
    friendsDecks: string;
    popularDecks: string;
    createDeck: string;
    playDeck: string;
    deckTitle: string;
    deckDesc: string;
    noDecks: string;
    noFriendsDecks: string;
    // Social Hub
    socialHubTitle: string;
    iceBreakerTitle: string;
    iceBreakerDesc: string;
    russianRouletteTitle: string;
    russianRouletteDesc: string;
    challengeFriendTitle: string;
    challengeFriendDesc: string;
    // Shortlist / Sudden Death
    yourShortlist: string;
    backToShortlist: string;
    weHaveAWinner: string;
    tapToWatch: string;
    tryAgain: string;
    restart: string;
    exit: string;
    cantDecide: string;
    nudgeText: string;
    suddenDeath: string;
    needMoreToPlay: string;
    preparingBattle: string;
    exitBattle: string;
    availableOn: string;
    // Deck UI
    card: string;
    of: string;
    inBasket: string;
    playGame: string;
    save: string;
    deleteDeck: string;
    deleteConfirm: string; // "Are you sure?"
    share: string;
    linkCopied: string;
    cancel: string;
    selectedItems: string;
    searchAdd: string;
    noMatches: string;
    noLikesYet: string;
}

const translations: Record<Language, Translations> = {
    en: {
        title: "CineMatch",
        subtitle: "Stop scrolling. Start watching.\nFind the perfect movie for you.",
        partnerReady: "Your partner is ready:",
        startSession: "Start Session",
        you: "You",
        like: "LIKE",
        nope: "NOPE",
        itsAMatch: "It's a Match!",
        watchOnNetflix: "Watch on Netflix",
        watchOnPrime: "Watch on Prime",
        keepPlaying: "Keep playing",
        noMoreMovies: "No more movies! Try again.",
        noMatches: "No matches found.",
        noLikesYet: "No likes yet. Swipe first!",
        configure: "Configure",
        welcome: 'Welcome to CineMatch',
        start: 'Start',
        language: 'Language',
        myList: 'My List',
        library: 'My Library',
        next: 'Next',
        back: 'Back',
        createLobby: 'Create Lobby 🚪',
        waitingForPlayers: 'Waiting for players...',
        startGame: '🎬 START GAME',
        shareCode: 'Share this code:',
        groupSetup: 'Group Setup',
        yourPlatform: 'Your Platforms',
        selectContent: 'What are we watching?',
        movies: 'Movies',
        tvShows: 'TV Shows',
        exitLobby: 'Exit Lobby',
        playWithFriends: 'Play with Friends',
        // Curator
        decks: "Decks",
        myDecks: "My Decks",
        friendsDecks: "Friends' Decks",
        popularDecks: "Popular",
        createDeck: "Create Deck",
        playDeck: "Play This Deck",
        deckTitle: "Deck Title",
        deckDesc: "Description",
        noDecks: "No decks yet. Create one!",
        noFriendsDecks: "You don't have friends yet. Connect with people to see their decks.",
        // Social Hub
        socialHubTitle: "Choose Your Mode",
        iceBreakerTitle: "Break the Ice",
        iceBreakerDesc: "Answer 5 questions and find your perfect movie match.",
        russianRouletteTitle: "Russian Roulette",
        russianRouletteDesc: "Can't decide? Swipe fast and let fate decide for you.",
        challengeFriendTitle: "Send a Challenge",
        challengeFriendDesc: "Force a friend to watch a movie they hate (or love).",
        // Shortlist / Sudden Death
        yourShortlist: "Your Shortlist",
        backToShortlist: "Back to Shortlist",
        weHaveAWinner: "WE HAVE A WINNER!",
        tapToWatch: "Tap the poster to watch now",
        tryAgain: "Try again?",
        restart: "Restart",
        exit: "Exit",
        cantDecide: "Can't decide?",
        nudgeText: "Tap for Sudden Death! ⚡",
        suddenDeath: "⚡ Sudden Death",
        needMoreToPlay: "Need 2+ to Play",
        preparingBattle: "⚔️ Preparing Battle...",
        exitBattle: "Exit Battle",
        availableOn: "Available on",
        // Deck UI
        card: "Card",
        of: "of",
        inBasket: "in Basket",
        playGame: "Play",
        save: "Save Changes",
        deleteDeck: "Delete Deck",
        deleteConfirm: "Are you sure you want to delete this deck? This action cannot be undone.",
        share: "Share",
        linkCopied: "Link copied!",
        cancel: "Cancel",
        selectedItems: "Selected Items",
        searchAdd: "Search to add..."
    },
    es: {
        welcome: 'Bienvenido a CineMatch',
        start: 'Empezar',
        title: "CineMatch",
        subtitle: "Deja de hacer scroll. Empieza a ver.\nEncuentra la película perfecta para ti.",
        partnerReady: "Tu pareja está lista:",
        startSession: "Empezar Sesión",
        noMoreMovies: "¡No hay más películas! Cambia tus filtros.",
        noMatches: "¡Sin coincidencias!",
        itsAMatch: "¡Es un Match!",
        keepPlaying: "Seguir Jugando",
        language: 'Idioma',
        myList: 'Mi Lista',
        library: 'Mi Videoteca',
        next: 'Siguiente',
        back: 'Volver',
        like: "ME GUSTA",
        nope: "NOPE",
        configure: "Configurar",

        // Multiplayer / Invite
        createLobby: 'Crear Sala 🚪',
        waitingForPlayers: 'Esperando jugadores...',
        startGame: '🎬 A JUGAR',
        shareCode: 'Comparte este código:',
        groupSetup: 'Configuración del Grupo',
        yourPlatform: 'Tus Plataformas',
        selectContent: '¿Qué buscamos?',
        movies: 'Películas',
        tvShows: 'Series',
        exitLobby: 'Salir del Grupo',
        playWithFriends: 'Jugar con Amigos',
        you: 'Tú',
        watchOnNetflix: "Ver en Netflix",
        watchOnPrime: "Ver en Prime Video",
        // Curator
        decks: "Barajas",
        myDecks: "Mis Barajas",
        friendsDecks: "Amigos",
        popularDecks: "Populares",
        createDeck: "Crear Baraja",
        playDeck: "Jugar Baraja",
        deckTitle: "Título del Mazo",
        deckDesc: "Descripción",
        noDecks: "Aún no hay barajas. ¡Crea una!",
        noFriendsDecks: "Aún no tienes amigos, conecta con personas para visualizar sus barajas.",
        // Social Hub
        socialHubTitle: "Elige tu Modo",
        iceBreakerTitle: "Romper el Hielo",
        iceBreakerDesc: "Responded 5 preguntas y encontrad vuestra peli ideal.",
        russianRouletteTitle: "Ruleta Rusa",
        russianRouletteDesc: "¿Indecisos? Haced swipe rápido y que el azar decida.",
        challengeFriendTitle: "Enviar un Reto",
        challengeFriendDesc: "Obliga a un amigo a ver esa peli que odia (o ama).",
        // Shortlist / Sudden Death
        yourShortlist: "Tu Shortlist",
        backToShortlist: "Volver a la Lista",
        weHaveAWinner: "¡TENEMOS GANADOR!",
        tapToWatch: "Toca el póster para verla ahora",
        tryAgain: "¿Intentar de nuevo?",
        restart: "Reiniciar",
        exit: "Salir",
        cantDecide: "¿No te decides?",
        nudgeText: "¡Prueba la Muerte Súbita! ⚡",
        suddenDeath: "⚡ Muerte Súbita",
        needMoreToPlay: "Necesitas 2+ para jugar",
        preparingBattle: "⚔️ Preparando Batalla...",
        exitBattle: "Salir del Torneo",
        availableOn: "Disponible en",
        // Deck UI
        card: "Carta",
        of: "de",
        inBasket: "en cesta",
        playGame: "Jugar",
        save: "Guardar Cambios",
        deleteDeck: "Eliminar Baraja",
        deleteConfirm: "¿Seguro que quieres eliminar esta baraja? No se puede deshacer.",
        share: "Compartir",
        linkCopied: "¡Enlace copiado!",
        cancel: "Cancelar",
        selectedItems: "Elementos Seleccionados",
        searchAdd: "Buscar para añadir...",
        noLikesYet: "Aún no te ha gustado nada."
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('es'); // Default to Spanish as requested

    const value = {
        language,
        setLanguage,
        t: translations[language]
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
