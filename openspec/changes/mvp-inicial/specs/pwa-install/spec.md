# PWA Install Specification

## Purpose

Define the install and offline behavior of the app on Android. The app is a Progressive Web App that can be installed from Chrome with the system "Install app" prompt, and can also be packaged as a standalone APK via PWABuilder. After the first install, the app must work without network.

## Requirements

### Requirement: Web App Manifest enables "Install app"

The system MUST publish a Web App Manifest that declares the app name, at least one icon, a theme color, and `display: standalone`. The system MUST be served over HTTPS (or from `localhost`) so that Chrome offers the "Install app" prompt.

#### Scenario: Install from Chrome on Android shows a full-screen icon (covers SC6)

- GIVEN the user opens the deployed PWA in Chrome on Android
- WHEN the user chooses "Instalar app" or "Añadir a pantalla de inicio"
- THEN a launcher icon with the declared name appears on the home screen
- AND opening that icon launches the app with no browser chrome (full screen, standalone display)

### Requirement: Service Worker enables offline use

The system MUST register a service worker that caches the app shell (HTML, CSS, JavaScript, manifest, and icons) on the first load. After the first load, the system MUST serve the app shell from the cache when the network is unavailable, so that the app opens and remains fully usable offline.

#### Scenario: The app opens and works in airplane mode (covers SC8)

- GIVEN the app has been opened at least once on the device
- WHEN the user enables airplane mode and opens the app from its icon
- THEN the app opens to the dashboard
- AND the user can list, add, and delete transactions against the locally stored data

### Requirement: APK packaging via PWABuilder

The system MUST be deployable to a public HTTPS URL and MUST be packageable into a debug-signed Android APK via PWABuilder using that URL. The generated APK, when installed and launched, MUST open the app full-screen with no browser chrome.

#### Scenario: APK installs and launches full-screen on Android (covers SC7)

- GIVEN the user has deployed the PWA to a public HTTPS URL, fed that URL to PWABuilder, downloaded the generated APK, transferred it to an Android device, and enabled installation from unknown sources
- WHEN the user installs the APK and opens it
- THEN the app opens full-screen with no browser chrome
- AND the locally stored transactions are still available
