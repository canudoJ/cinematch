# 🎬 CineMatch

**Aplicación web para encontrar películas y series en común con tus amigos**

> Proyecto desarrollado como estudiante de 2º de DAM (Desarrollo de Aplicaciones Multiplataforma)

## 📋 Descripción

CineMatch es una aplicación web moderna que resuelve el problema de "¿Qué vemos esta noche?". Permite a los usuarios descubrir películas y series en base a sus plataformas contratadas o aquellas que coinciden con sus preferencias y las de sus amigos, facilitando la decisión de qué ver juntos o descubrir nuevas opciones.

### Características principales

- 🎯 **Sistema de matching**: Encuentra películas que coinciden con tus gustos y los de tus amigos
- 👥 **Sistema social**: Agrega amigos, envía solicitudes y gestiona tu red social
- 🎲 **Múltiples modos de juego**:
  - **Swipe Deck**: Descubre distintas opciones mientras deslizas como en aplicaciones como Tinder
  - **Russian Roulette**: Modo rápido de decisión entre amigos para los mas indecisos
  - **Ice Breaker**: Test de afinidad para descubrir opciones por los gustos en comun.
  - **Challenge Mode**: Reta a tus amigos con peliculas para ver
- 📚 **Decks personalizados**: Crea colecciones personalizadas de películas o series para momentos concretos.
- 🎬 **Integración con TMDB**: Base de datos completa de películas y series
- 🌐 **Multiidioma**: Español e Inglés
- 🔐 **Autenticación segura**: Sistema de usuarios con Supabase

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 16** (App Router) - Framework React
- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first
- **Lucide React** - Iconos

### Backend & Base de Datos
- **Supabase** - Backend as a Service
  - PostgreSQL (base de datos)
  - Autenticación
  - Row Level Security (RLS)
  - Storage (avatars)

### APIs Externas
- **The Movie Database (TMDB)** - API de películas y series

### Herramientas de Desarrollo
- **ESLint** - Linter
- **Git** - Control de versiones


## 🎯 Funcionalidades Implementadas

### Autenticación
- ✅ Registro de usuarios
- ✅ Login/Logout
- ✅ Gestión de perfil (username, avatar)
- ✅ Protección de rutas

### Sistema Social
- ✅ Búsqueda de usuarios
- ✅ Envío/aceptación de solicitudes de amistad
- ✅ Lista de amigos
- ✅ Enlaces de invitación
- ✅ Eliminación de amigos

### Sistema de Retos
- ✅ Envío de retos a amigos
- ✅ Recepción y resolución de retos
- ✅ Historial de retos enviados
- ✅ Persistencia en base de datos

### Decks
- ✅ Creación de decks personalizados
- ✅ Agregar/eliminar películas
- ✅ Tags y descripciones
- ✅ Modo de juego con decks

### Integración TMDB
- ✅ Búsqueda de películas/series
- ✅ Información detallada
- ✅ Enlaces a plataformas de streaming
- ✅ Filtrado por plataformas

## 📚 Documentación Adicional

- [Manual Técnico](./MANUAL_TECNICO.md) - Documentación técnica detallada
- [Manual de Usuario](./MANUAL_USUARIO.md) - Guía de uso de la aplicación

## 🎓 Aprendizajes y Tecnologías

Este proyecto ha sido desarrollado utilizando **programación asistida con IA** como herramienta de aprendizaje, permitiendo:

- Aprender arquitectura moderna de aplicaciones web
- Entender patrones de diseño (Singleton, Context API)
- Trabajar con bases de datos relacionales
- Integrar APIs externas
- Desarrollar interfaces de usuario modernas

## 📝 Notas del Desarrollador

Este proyecto ha sido desarrollado como parte de un aprendizaje, utilizando programación asistida con IA para:
- Acelerar el desarrollo
- Aprender mejores prácticas
- Entender arquitecturas complejas
- Implementar funcionalidades avanzadas
- Aplicar nociones de ingienria de prompts

**Todas las decisiones técnicas, estructura del código y funcionalidades han sido diseñadas y comprendidas por el desarrollador.**

## 📄 Licencia

Este proyecto es de uso personal.

---
## 🚧 Estado del Proyecto

Este proyecto se encuentra actualmente en **fase de desarrollo (WIP)**.
Algunas funcionalidades están pendientes de implementación y es posible encontrar aspectos por pulir. Sigo trabajando activamente en ello para mejorar la experiencia y añadir nuevas características.
---

**Desarrollado por Javier Canudo Tavara usando Next.js, React y Supabase**
