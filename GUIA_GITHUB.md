# 📚 Guía Completa: Subir CineMatch a GitHub

Esta guía te ayudará a subir tu proyecto CineMatch a GitHub de forma **segura y profesional** para presentarlo en tu solicitud de prácticas.

---

## 🔒 PASO 1: Verificación de Seguridad (CRÍTICO)

Antes de subir nada, asegúrate de que **NO** estás exponiendo información sensible.

### ✅ Verificar archivos sensibles

1. **Revisa tu `.env.local`** (NO debe subirse):
   ```bash
   # Abre .env.local y verifica que contiene:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - TMDB_API_KEY (si la usas directamente)
   ```

2. **Verifica que `.gitignore` incluye**:
   - `.env*` (ya está incluido ✅)
   - `node_modules/`
   - `.next/`
   - Archivos de configuración local

3. **Busca credenciales hardcodeadas** en tu código:
   ```bash
   # Busca en tu código si hay:
   # - API keys directamente escritas
   # - URLs de base de datos con credenciales
   # - Tokens de acceso
   ```

---

## 🛠️ PASO 2: Configuración Inicial de Git

### 2.1 Verificar si ya tienes Git instalado

```bash
git --version
```

Si no está instalado, descárgalo de: https://git-scm.com/download/win

### 2.2 Configurar tu identidad (solo la primera vez)

```bash
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu-email@ejemplo.com"
```

**⚠️ IMPORTANTE**: Usa el mismo email que usarás en GitHub.

### 2.3 Inicializar el repositorio Git

Abre PowerShell o Terminal en la carpeta del proyecto (`C:\Users\jcanu\OneDrive\Desktop\cinematch`) y ejecuta:

```bash
# Inicializar Git
git init

# Verificar estado
git status
```

---

## 📦 PASO 3: Preparar el Proyecto para Subir

### 3.1 Verificar qué archivos se van a subir

```bash
git status
```

Deberías ver:
- ✅ Archivos de código fuente (`.tsx`, `.ts`, `.json`, etc.)
- ✅ Archivos de documentación (`.md`)
- ❌ NO deberías ver `.env.local`, `node_modules/`, `.next/`

### 3.2 Agregar archivos al staging

```bash
# Agregar todos los archivos (excepto los del .gitignore)
git add .

# Verificar qué se agregó
git status
```

### 3.3 Crear el primer commit

```bash
git commit -m "Initial commit: CineMatch - Aplicación web para encontrar películas y series en común"
```

---

## 🐙 PASO 4: Crear Repositorio en GitHub

### 4.1 Crear cuenta en GitHub (si no tienes)

1. Ve a: https://github.com
2. Clic en **"Sign up"**
3. Completa el registro

### 4.2 Crear nuevo repositorio

1. Clic en el botón **"+"** (arriba derecha) → **"New repository"**
2. **Repository name**: `cinematch` (o el nombre que prefieras)
3. **Description**: 
   ```
   🎬 Aplicación web para encontrar películas y series en común con tus amigos. 
   Proyecto desarrollado como estudiante de 2º DAM.
   ```
4. **Visibilidad**:
   - ✅ **Public**: Para que los reclutadores puedan verlo fácilmente
   - ⚠️ **Private**: Si prefieres compartirlo solo con enlaces
5. **NO marques**:
   - ❌ "Add a README file" (ya tienes uno)
   - ❌ "Add .gitignore" (ya tienes uno)
   - ❌ "Choose a license" (opcional, puedes agregarlo después)
6. Clic en **"Create repository"**

### 4.3 Copiar la URL del repositorio

GitHub te mostrará una página con instrucciones. **Copia la URL** que aparece, será algo como:
```
https://github.com/tu-usuario/cinematch.git
```

---

## ⬆️ PASO 5: Conectar y Subir el Código

### 5.1 Conectar tu repositorio local con GitHub

```bash
# Reemplaza 'tu-usuario' y 'cinematch' con tus valores reales
git remote add origin https://github.com/tu-usuario/cinematch.git

# Verificar que se agregó correctamente
git remote -v
```

### 5.2 Renombrar la rama principal (si es necesario)

```bash
# Asegurar que la rama principal se llama 'main'
git branch -M main
```

### 5.3 Subir el código

```bash
# Subir código a GitHub
git push -u origin main
```

**Si te pide autenticación**:
- GitHub ya no acepta contraseñas, necesitas un **Personal Access Token**
- Ve a: https://github.com/settings/tokens
- Clic en **"Generate new token"** → **"Generate new token (classic)"**
- Nombre: `CineMatch Upload`
- Expiración: `90 days` (o la que prefieras)
- Permisos: Marca **`repo`** (acceso completo a repositorios)
- Clic en **"Generate token"**
- **Copia el token** (solo se muestra una vez)
- Úsalo como contraseña cuando Git te la pida

---

## 🎨 PASO 6: Configurar el Repositorio en GitHub

### 6.1 Agregar descripción y topics

1. Ve a tu repositorio en GitHub
2. Clic en el icono de **⚙️ Settings** (o el engranaje)
3. En la sección **"About"** (lado derecho):
   - **Description**: `🎬 Aplicación web para encontrar películas y series en común con tus amigos`
   - **Topics**: Agrega estos tags (presiona Enter después de cada uno):
     - `nextjs`
     - `react`
     - `typescript`
     - `supabase`
     - `tmdb-api`
     - `web-app`
     - `dam`
     - `student-project`
     - `cinema`
     - `movies`

### 6.2 Agregar README destacado

Tu README.md ya está bien, pero puedes mejorarlo:
- Asegúrate de que tiene una buena descripción
- Incluye capturas de pantalla (opcional pero recomendado)
- Agrega badges (opcional)

### 6.3 Configurar página principal del repositorio

1. Ve a **Settings** → **Pages** (si quieres GitHub Pages)
2. O simplemente deja el README como página principal (ya está configurado)

---

## 🔐 PASO 7: Configuración de Seguridad

### 7.1 Variables de entorno (para deployment)

Si vas a desplegar en Vercel u otra plataforma:

1. **NO subas** `.env.local` a GitHub (ya está en .gitignore ✅)
2. En la plataforma de deployment, configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TMDB_API_KEY` (si es necesario)

### 7.2 Crear archivo de ejemplo para otros desarrolladores

Crea un archivo `.env.example` (este SÍ se sube a GitHub):

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
TMDB_API_KEY=your_tmdb_api_key_here
```

Este archivo muestra qué variables se necesitan sin exponer valores reales.

---

## 📝 PASO 8: Mejores Prácticas para Commits

### 8.1 Estructura de commits profesionales

```bash
# Para nuevas funcionalidades
git commit -m "feat: Agregar sistema de amigos"

# Para correcciones de bugs
git commit -m "fix: Corregir error al guardar decks"

# Para documentación
git commit -m "docs: Actualizar README con instrucciones de instalación"

# Para mejoras de código
git commit -m "refactor: Limpiar código de debugging"
```

### 8.2 Hacer commits frecuentes

```bash
# Después de hacer cambios
git add .
git commit -m "Descripción clara de los cambios"
git push
```

---

## 🔄 PASO 9: Actualizar el Proyecto

Cada vez que hagas cambios:

```bash
# 1. Ver qué cambió
git status

# 2. Agregar cambios
git add .

# 3. Hacer commit
git commit -m "Descripción de los cambios"

# 4. Subir a GitHub
git push
```

---

## 📤 PASO 10: Compartir el Proyecto

### 10.1 Compartir el repositorio

**Opción 1: Enlace directo**
```
https://github.com/tu-usuario/cinematch
```

**Opción 2: Enlace con descripción**
```
Proyecto CineMatch: https://github.com/tu-usuario/cinematch
```

### 10.2 Agregar al CV/Portfolio

En tu CV o portfolio, incluye:
- **Nombre del proyecto**: CineMatch
- **Repositorio**: [GitHub - CineMatch](https://github.com/tu-usuario/cinematch)
- **Descripción breve**: Aplicación web para encontrar películas en común con amigos
- **Tecnologías**: Next.js, React, TypeScript, Supabase, TMDB API

### 10.3 Crear un README profesional

Tu README.md ya está bien, pero puedes agregar:
- 📸 Capturas de pantalla
- 🚀 Enlace a demo en vivo (si tienes Vercel deployment)
- 📋 Lista de características más detallada
- 🛠️ Instrucciones de instalación más claras

---

## ✅ Checklist Final

Antes de compartir, verifica:

- [ ] ✅ `.env.local` NO está en el repositorio
- [ ] ✅ `node_modules/` NO está en el repositorio
- [ ] ✅ README.md está completo y profesional
- [ ] ✅ Descripción del repositorio en GitHub está completa
- [ ] ✅ Topics/tags agregados al repositorio
- [ ] ✅ Todos los commits tienen mensajes claros
- [ ] ✅ El código está limpio (sin console.log de debugging)
- [ ] ✅ Documentación técnica y de usuario están incluidas
- [ ] ✅ `.gitignore` está configurado correctamente

---

## 🆘 Solución de Problemas Comunes

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/tu-usuario/cinematch.git
```

### Error: "failed to push some refs"
```bash
# Si alguien más hizo cambios (o creaste archivos en GitHub)
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Error de autenticación
- Asegúrate de usar un **Personal Access Token**, no tu contraseña
- El token debe tener permisos de `repo`

### Subí accidentalmente un archivo sensible
```bash
# Eliminar del historial (CUIDADO: esto reescribe la historia)
git rm --cached .env.local
git commit -m "Remove sensitive file"
git push
```

---

## 📚 Recursos Adicionales

- [Documentación oficial de Git](https://git-scm.com/doc)
- [Guía de GitHub](https://guides.github.com/)
- [GitHub Student Pack](https://education.github.com/pack) (si eres estudiante)
- [Guía de Vercel Deployment](./GUIA_VERCEL.md) (si quieres desplegar)

---

## 🎯 Próximos Pasos

1. ✅ Subir el código a GitHub
2. ✅ Configurar el repositorio profesionalmente
3. 📝 Agregar capturas de pantalla al README (opcional)
4. 🚀 Desplegar en Vercel para tener una demo en vivo (opcional pero recomendado)
5. 📧 Compartir el enlace en tu solicitud de prácticas

---

**¡Listo!** Tu proyecto está ahora en GitHub de forma segura y profesional. 🎉
