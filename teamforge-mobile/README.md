# TeamForge Mobile

Flutter client for the existing TeamForge Laravel API. The app lives separately from `teamforge-api/` and `teamforge-web/`.

## Run locally

From this directory:

```sh
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api
```

To launch the current UI in Chrome, use the computer's localhost address:

```sh
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8000/api
```

For a physical Android device, use the development computer's reachable LAN address:

```sh
flutter run --dart-define=API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000/api
```

The API URL defaults to the Android emulator host. Override it for production after confirming the deployed backend URL. The repository deployment configuration currently identifies `https://teamforge-prv0.onrender.com/api`; `teamforge-api/.env.example` contains a conflicting hostname.

## Current implementation

- Riverpod, GoRouter, and a five-destination navigation shell
- TeamForge dark Crystal Glass theme and reusable translucent panels
- Centralized Dio client with configurable base URL, secure Sanctum token lookup, bearer header, timeouts, and API error messages
- Login and registration with protected routing and secure token persistence
- API-backed dashboard, projects, tasks, notifications, profile, team, activity, and GitHub repository screens
- See [WEB_FEATURE_PARITY_REPORT.md](WEB_FEATURE_PARITY_REPORT.md) for the complete web-to-mobile parity scope and remaining enhancements
