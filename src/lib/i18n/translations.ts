// lib/i18n/translations.ts

export const translations = {
  en: {
    // Dashboard
    "dashboard.hi": "Hi",
    "dashboard.recentSessions": "Recent sessions",
    // Nav
    "nav.home": "Home",
    "nav.apartments": "Apartments",
    "nav.history": "History",
    "nav.profile": "Profile",
    // Session
    "session.inProgress": "Session in progress",
    "session.startedAt": "Started at",
    "session.endWork": "End Work",
    "session.ending": "Ending session…",
    "session.startWork": "Start Work",
    "session.starting": "Starting…",
    "session.workSession": "Work session",
    "session.startPrompt": "Start a session to begin tracking your time.",
    "session.noCompleted": "No completed sessions yet.",
    // Apartments
    "apartments.title": "Apartments",
    "apartments.addRecord": "Add record",
    "apartments.noRecords": "No records yet",
    "apartments.noRecordsPrompt": "Add your first apartment record.",
    "apartments.aptNumber": "Apartment number",
    "apartments.location": "Location",
    "apartments.notes": "Notes",
    "apartments.save": "Save record",
    "apartments.saving": "Saving...",
    "apartments.saveChanges": "Save changes",
    "apartments.savingChanges": "Saving changes...",
    "apartments.recordedOn": "Recorded on",
    "apartments.lastUpdated": "Last updated",
    "apartments.edit": "Edit",
    "apartments.addApartment": "Add apartment record",
    "apartments.editApartment": "Edit apartment",
    // Profile
    "profile.title": "Profile",
    "profile.email": "Email",
    "profile.accountId": "Account ID",
    "profile.whatsYourName": "What's your name?",
    "profile.namePrompt":
      "We'll use it to personalize your experience. You can always change it later in your profile.",
    "profile.saveName": "Save name",
    "profile.saving": "Saving…",
    "profile.askLater": "Ask me later",
    "profile.nameCantBeEmpty": "Name can't be empty.",
    "profile.newUiTitle": "New apartments UI",
    "profile.newUiDescription":
      "Try the redesigned apartments list with search and filters.",
    "profile.newUiBeta": "Beta",
    "profile.newUiReloadNotice":
      "Reloading in {seconds}s to apply this change.",
    "profile.newUiEnabled": "New UI enabled.",
    "profile.newUiDisabled": "New UI disabled.",
    // Apartments — search & filter (v2)
    "apartments.searchPlaceholder": "Search by number or location...",
    "apartments.filterDate": "Date",
    "apartments.filterAll": "All time",
    "apartments.filterToday": "Today",
    "apartments.filterWeek": "This week",
    "apartments.filterMonth": "This month",
    "apartments.noResults": "No records match your search.",
    "apartments.resultsCount": "records",
    // Common
    "common.back": "Back",
    "common.logout": "Log out",
  },
  es: {
    // Dashboard
    "dashboard.hi": "Hola",
    "dashboard.recentSessions": "Sesiones recientes",
    // Nav
    "nav.home": "Inicio",
    "nav.apartments": "Apartamentos",
    "nav.history": "Historial",
    "nav.profile": "Perfil",
    // Session
    "session.inProgress": "Sesión en progreso",
    "session.startedAt": "Iniciada a las",
    "session.endWork": "Terminar trabajo",
    "session.ending": "Terminando sesión…",
    "session.startWork": "Comenzar trabajo",
    "session.starting": "Iniciando…",
    "session.workSession": "Sesión de trabajo",
    "session.startPrompt":
      "Inicia una sesión para comenzar a registrar tu tiempo.",
    "session.noCompleted": "No hay sesiones completadas aún.",
    // Apartments
    "apartments.title": "Apartamentos",
    "apartments.addRecord": "Agregar registro",
    "apartments.noRecords": "Sin registros aún",
    "apartments.noRecordsPrompt": "Agrega tu primer registro de apartamento.",
    "apartments.aptNumber": "Número de apartamento",
    "apartments.location": "Ubicación",
    "apartments.notes": "Notas",
    "apartments.save": "Guardar registro",
    "apartments.saving": "Guardando...",
    "apartments.saveChanges": "Guardar cambios",
    "apartments.savingChanges": "Guardando cambios...",
    "apartments.recordedOn": "Registrado el",
    "apartments.lastUpdated": "Última actualización",
    "apartments.edit": "Editar",
    "apartments.addApartment": "Agregar registro de apartamento",
    "apartments.editApartment": "Editar apartamento",
    // Profile
    "profile.title": "Perfil",
    "profile.email": "Correo electrónico",
    "profile.accountId": "ID de cuenta",
    "profile.whatsYourName": "¿Cómo te llamas?",
    "profile.namePrompt":
      "Lo usaremos para personalizar tu experiencia. Puedes cambiarlo después en tu perfil.",
    "profile.saveName": "Guardar nombre",
    "profile.saving": "Guardando…",
    "profile.askLater": "Después",
    "profile.nameCantBeEmpty": "El nombre no puede estar vacío.",
    "profile.newUiTitle": "Nueva UI de apartamentos",
    "profile.newUiDescription":
      "Prueba la nueva lista de apartamentos con buscador y filtros.",
    "profile.newUiBeta": "Beta",
    "profile.newUiReloadNotice":
      "Recargando en {seconds}s para aplicar este cambio.",
    "profile.newUiEnabled": "Nueva UI activada.",
    "profile.newUiDisabled": "Nueva UI desactivada.",
    // Apartments — buscador y filtros (v2)
    "apartments.searchPlaceholder": "Buscar por número o ubicación...",
    "apartments.filterDate": "Fecha",
    "apartments.filterAll": "Todo el tiempo",
    "apartments.filterToday": "Hoy",
    "apartments.filterWeek": "Esta semana",
    "apartments.filterMonth": "Este mes",
    "apartments.noResults": "Ningún registro coincide con tu búsqueda.",
    "apartments.resultsCount": "registros",
    // Common
    "common.back": "Volver",
    "common.logout": "Cerrar sesión",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
