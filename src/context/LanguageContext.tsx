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
    privacyLevel: string;
    privacyPrivate: string;
    privacyFriends: string;
    privacyPublic: string;
    privacyDescription: string;
    // Profile / Theme / Details
    profile: string;
    theme: string;
    lightMode: string;
    darkMode: string;
    viewDirectly: string;
    // Additional translations
    shareDeck: string;
    contentList: string;
    movieCount: (count: number) => string;
    forgotPassword: string;
    resetPassword: string;
    sendResetLink: string;
    usernameTaken: string;
    pendingRequest: string;
    deckMode: string;
    createFirstDeck: string;
    noDescription: string;
    loadingPopularDecks: string;
    loadingFriendDecks: string;
    searching: string;
    noItemsSelected: string;
    searchUser: string;
    searchingUsers: string;
    noUsersFound: string;
    startSwiping: string;
    tryOtherSearch: string;
    watchOn: string;
    watchOnPlatform: string;
    searchGoogle: string;
        remove: string;
        goBack: string;
        loadingData: string;
        tapToChangePhoto: string;
        currentLevel: string;
        nextLevel: string;
        chooseName: string;
        savedSuccessfully: string;
        friendsListEmpty: string;
        inviteFriendsOrShare: string;
        sending: string;
        add: string;
        typeAtLeast: string;
        friendCode: string;
        linkCopiedAlert: string;
        signOut: string;
        yourPlatforms: string;
        selectEverything: string;
        startPlaying: string;
        pendingRequests: string;
        friends: string;
        search: string;
        invite: string;
        configureFirst: string;
        setupDescription: string;
        noMoreMoviesDesc: string;
        exitDeck: string;
        filters: string;
        platform: string;
        all: string;
        sortBy: string;
        sortAlpha: string;
        sortLiked: string;
        sortYear: string;
        noContent: string;
        // Shorts / winner
        watchNow: string;
        details: string;
        tapToChoose: string;
        matchesLeft: string;
        searchingPlatform: string;
        // Challenge mode
        challengeCenter: string;
        sendChallenge: string;
        myChallenges: string;
        sentChallenges: string;
        searchMovieToChallenge: string;
        whoToChallenge: string;
        noReceivedChallenges: string;
        noSentChallenges: string;
        loadingFriends: string;
        noFriendsYet: string;
        // Roulette
        roomCode: string;
        surpriseMe: string;
        confirmExitGame: string;
        matchesRestantes: string;
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
        createLobby: 'Create Lobby',
        waitingForPlayers: 'Waiting for players...',
        startGame: 'START GAME',
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
        nudgeText: "Tap for Sudden Death!",
        suddenDeath: "Sudden Death",
        needMoreToPlay: "Need 2+ to Play",
        preparingBattle: "Preparing Battle...",
        exitBattle: "Exit Battle",
        availableOn: "Available on",
        // Deck UI
        card: "Card",
        of: "of",
        inBasket: "in Basket",
        playGame: "Play",
        save: "Save",
        deleteDeck: "Delete Deck",
        deleteConfirm: "Are you sure you want to delete this deck? This action cannot be undone.",
        share: "Share",
        linkCopied: "Link copied!",
        cancel: "Cancel",
        selectedItems: "Selected Items",
        searchAdd: "Search to add...",
        privacyLevel: "Privacy Level",
        privacyPrivate: "Only you can see it",
        privacyFriends: "Share with friends",
        privacyPublic: "Public",
        privacyDescription: "Choose who can see this deck",
        // Profile / Theme / Details
        profile: "Profile",
        theme: "Theme",
        lightMode: "Light mode",
        darkMode: "Dark mode",
        viewDirectly: "Watch now",
        // Additional translations
        shareDeck: "Share Deck",
        contentList: "Content List",
        movieCount: (count: number) => count === 1 ? "movie" : "movies",
        forgotPassword: "Forgot your password?",
        resetPassword: "Reset Password",
        sendResetLink: "Send reset link",
        usernameTaken: "This username is already taken",
        pendingRequest: "Pending",
        deckMode: "Deck Mode",
        createFirstDeck: "Create your first deck from this tab to start playing.",
        noDescription: "No description",
        loadingPopularDecks: "Loading popular decks...",
        loadingFriendDecks: "Loading friend decks...",
        searching: "Searching...",
        noItemsSelected: "No items selected yet.",
        searchUser: "Search user...",
        searchingUsers: "Searching...",
        noUsersFound: "No users found.",
        startSwiping: "Start swiping and add movies or series to your library.",
        tryOtherSearch: "Try another search or adjust filters.",
        watchOn: "Watch on",
        watchOnPlatform: "Watch on Platform",
        searchGoogle: "Search on Google (last resort)",
        remove: "Remove",
        goBack: "Go back",
        loadingData: "Loading data...",
        tapToChangePhoto: "Tap to change photo",
        currentLevel: "Current Level",
        nextLevel: "Next Level",
        chooseName: "Choose a name...",
        savedSuccessfully: "Saved successfully",
        friendsListEmpty: "Your friends list is empty.",
        inviteFriendsOrShare: "Invite your friends from here or share your code.",
        sending: "Sending...",
        add: "Add",
        typeAtLeast: "Type at least 2 characters to search.",
        friendCode: "Your Friend Code",
        linkCopiedAlert: "Link copied",
        signOut: "Sign Out",
        yourPlatforms: "Your Platforms",
        selectEverything: "Select everything you like:",
        startPlaying: "Start Playing",
        pendingRequests: "Pending Requests",
        friends: "Friends",
        search: "Search",
        invite: "Invite",
        configureFirst: "Configure your preferences first",
        setupDescription: "Select your favorite platforms and content types to start discovering movies and series.",
        noMoreMoviesDesc: "No more content available with your current filters. Try adjusting your preferences.",
        exitDeck: "Exit Deck",
        filters: "Filters",
        platform: "Platform",
        all: "All",
        sortBy: "Sort by",
        sortAlpha: "Alphabetical",
        sortLiked: "By like order",
        sortYear: "By year",
        noContent: "No content found with your current filters.",
        watchNow: "Watch Now",
        details: "Details",
        tapToChoose: "Tap to choose · ⓘ for details",
        matchesLeft: "matches left",
        searchingPlatform: "Searching platform...",
        challengeCenter: "Challenge Center",
        sendChallenge: "Send Challenge",
        myChallenges: "My Challenges",
        sentChallenges: "Sent Challenges",
        searchMovieToChallenge: "Search movie to challenge...",
        whoToChallenge: "WHO DO YOU WANT TO CHALLENGE?",
        noReceivedChallenges: "No received challenges.",
        noSentChallenges: "No sent challenges yet.",
        loadingFriends: "Loading friends...",
        noFriendsYet: "You have no friends added yet. Invite someone from your profile!",
        roomCode: "ROOM CODE",
        surpriseMe: "Surprise Me!",
        confirmExitGame: "Abandon the ongoing game?",
        matchesRestantes: "matches remaining",
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
        createLobby: 'Crear Sala',
        waitingForPlayers: 'Esperando jugadores...',
        startGame: 'Empezar partida',
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
        nudgeText: "¡Prueba la Muerte Súbita!",
        suddenDeath: "Muerte Súbita",
        needMoreToPlay: "Necesitas 2+ para jugar",
        preparingBattle: "Preparando Batalla...",
        exitBattle: "Salir del Torneo",
        availableOn: "Disponible en",
        // Deck UI
        card: "Carta",
        of: "de",
        inBasket: "en cesta",
        playGame: "Jugar",
        save: "Guardar",
        deleteDeck: "Eliminar Baraja",
        deleteConfirm: "¿Seguro que quieres eliminar esta baraja? No se puede deshacer.",
        share: "Compartir",
        linkCopied: "¡Enlace copiado!",
        cancel: "Cancelar",
        selectedItems: "Elementos Seleccionados",
        searchAdd: "Buscar para añadir...",
        noLikesYet: "Aún no te ha gustado nada.",
        privacyLevel: "Nivel de Privacidad",
        privacyPrivate: "Solo lo puedes ver tú",
        privacyFriends: "Compartir con amigos",
        privacyPublic: "Público",
        privacyDescription: "Elige quién puede ver esta baraja",
        // Profile / Theme / Details
        profile: "Perfil",
        theme: "Tema",
        lightMode: "Modo día",
        darkMode: "Modo noche",
        viewDirectly: "Ver directamente",
        // Additional translations
        shareDeck: "Compartir Baraja",
        contentList: "Lista de Contenido",
        movieCount: (count: number) => count === 1 ? "película" : "películas",
        forgotPassword: "¿Olvidaste tu contraseña?",
        resetPassword: "Restablecer Contraseña",
        sendResetLink: "Enviar enlace",
        usernameTaken: "Este nombre ya está en uso",
        pendingRequest: "Pendiente",
        deckMode: "Modo Baraja",
        createFirstDeck: "Crea tu primera baraja desde esta pestaña para empezar a jugar.",
        noDescription: "Sin descripción",
        loadingPopularDecks: "Cargando decks populares...",
        loadingFriendDecks: "Cargando decks de amigos...",
        searching: "Buscando...",
        noItemsSelected: "Aún no hay elementos seleccionados.",
        searchUser: "Buscar usuario...",
        searchingUsers: "Buscando...",
        noUsersFound: "No se encontraron usuarios.",
        startSwiping: "Empieza a hacer swipe y añade pelis o series a tu videoteca.",
        tryOtherSearch: "Prueba con otra búsqueda o ajusta los filtros.",
        watchOn: "Ver en",
        watchOnPlatform: "Ver en Plataforma",
        searchGoogle: "Buscar en Google (último recurso)",
        remove: "Eliminar",
        goBack: "Volver",
        loadingData: "Cargando datos...",
        tapToChangePhoto: "Toca para cambiar foto",
        currentLevel: "Nivel Actual",
        nextLevel: "Siguiente Nivel",
        chooseName: "Elige un nombre...",
        savedSuccessfully: "Guardado correctamente",
        friendsListEmpty: "Tu lista de amigos está vacía.",
        inviteFriendsOrShare: "Invita a tus amigos desde aquí o comparte tu código.",
        sending: "Enviando...",
        add: "Agregar",
        typeAtLeast: "Escribe al menos 2 caracteres para buscar.",
        friendCode: "Tu Código de Amigo",
        linkCopiedAlert: "Enlace copiado",
        signOut: "Cerrar Sesión",
        yourPlatforms: "Tus Plataformas",
        selectEverything: "Selecciona todo lo que te apetezca:",
        startPlaying: "Empezar a Jugar",
        pendingRequests: "Solicitudes Pendientes",
        friends: "Amigos",
        search: "Buscar",
        invite: "Invitar",
        configureFirst: "Configura tus preferencias primero",
        setupDescription: "Selecciona tus plataformas y tipos de contenido favoritos para empezar a descubrir películas y series.",
        noMoreMoviesDesc: "No hay más contenido disponible con tus filtros actuales. Intenta ajustar tus preferencias.",
        exitDeck: "Salir de la baraja",
        filters: "Filtros",
        platform: "Plataforma",
        all: "Todas",
        sortBy: "Ordenar por",
        sortAlpha: "Orden alfabético",
        sortLiked: "Orden de like",
        sortYear: "Fecha",
        noContent: "No hay contenido disponible con tus filtros actuales.",
        watchNow: "Ver Ahora",
        details: "Ver detalles",
        tapToChoose: "Toca para elegir · ⓘ para ver detalles",
        matchesLeft: "combates restantes",
        searchingPlatform: "Buscando plataforma...",
        challengeCenter: "Centro de Retos",
        sendChallenge: "Enviar Reto",
        myChallenges: "Mis Retos",
        sentChallenges: "Retos Enviados",
        searchMovieToChallenge: "Buscar película para retar...",
        whoToChallenge: "¿A QUIÉN QUIERES RETAR?",
        noReceivedChallenges: "No tienes retos recibidos.",
        noSentChallenges: "No has enviado retos aún.",
        loadingFriends: "Cargando amigos...",
        noFriendsYet: "No tienes amigos agregados aún. ¡Invita a alguien desde tu perfil!",
        roomCode: "CÓDIGO DE SALA",
        surpriseMe: "¡Sorpréndeme!",
        confirmExitGame: "¿Abandonar la partida en curso?",
        matchesRestantes: "combates restantes",
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
