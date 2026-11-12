# TeamForge Web Feature Parity Report

## Purpose

This report inventories the implemented `teamforge-web` behavior and translates it
into a mobile parity scope for `teamforge-mobile`. It is based on the web routes,
screens, components, and API clients currently in the repository.

## Executive summary

The web app is an authenticated TeamForge workspace. Its core capabilities are:

1. Account registration, login, session restore, logout, and profile management.
2. Workspace dashboard with project/task summaries and task completion toggling.
3. Full project CRUD, status/date tracking, progress summaries, and project members.
4. Full task CRUD, project/assignee/status/priority/date fields, search, and filters.
5. Team directory, project invitations, role management, and member removal.
6. Activity history with project/type/date filters and pagination.
7. Notification inbox with unread state and invitation accept/reject actions.
8. GitHub connection, repository sync/browse/search/filter, details, and project import.
9. Theme preference and session settings.

The mobile app currently has five navigation destinations, but each screen is a
placeholder. It has reusable API/token infrastructure and image-picker dependencies,
but no mobile feature currently calls the web API.

## Web route inventory

| Route | Web behavior | Mobile parity |
|---|---|---|
| `/login` | Email/password login, validation, password visibility toggle | Missing |
| `/register` | Name/email/password/confirmation registration | Missing |
| `/` | Dashboard overview, project/task loading, task search, task completion toggle | Placeholder only |
| `/projects` | Project list, search, status filter, create | Placeholder only |
| `/projects/:projectId` | Project details, edit, delete, dates, progress, member management | Missing |
| `/tasks` | Task list, search, project/status/priority filters, create | Placeholder only |
| `/tasks/:taskId` | Task details, edit, delete, assignee/status/priority/date | Missing |
| `/team-members` | Directory, search, role/project filters, invite, role update, removal | Missing |
| `/activity` | Activity feed, type/project/date filters, refresh, pagination | Missing |
| `/profile` | Update display name, upload/remove JPG/PNG/WebP avatar | Partial shell only |
| `/settings` | System/light/dark theme, session information, sign out | Missing |
| `/github/repositories` | Connect/disconnect GitHub, sync, search, visibility filter, pagination, import | Missing |
| `/github/repositories/:owner/:name` | Repository details, open GitHub, import to project | Missing |
| Notification popover | Polling, unread count, mark read/all read, invitation actions | Placeholder destination only |

## Functional requirements for mobile parity

### Authentication and account

- **REQ-001**: The mobile app shall allow a user to register with full name, email,
  password, and password confirmation, with client-side validation matching the web
  behavior.
- **REQ-002**: The mobile app shall allow a user to sign in with email and password,
  persist the bearer token securely, restore the session on launch, and clear the
  session after an unauthorized response.
- **REQ-003**: The mobile app shall allow a user to sign out and return to the login
  screen.
- **REQ-004**: The mobile app shall display and update the authenticated user's name
  and email, and allow avatar upload/removal using JPG, PNG, or WebP files up to 5 MB.

### Dashboard

- **REQ-005**: The mobile home screen shall show the user's time-aware greeting,
  project count, active task count, completed task count, active project preview, and
  upcoming task preview.
- **REQ-006**: The mobile home screen shall allow a user to search tasks and toggle a
  task between incomplete and completed states.
- **REQ-007**: Dashboard values shall show loading, empty, and recoverable error states
  rather than silently presenting fabricated data.

### Projects

- **REQ-008**: The mobile app shall list accessible projects and support search by
  project name or description.
- **REQ-009**: The mobile app shall filter projects by planning, in-progress,
  completed, and on-hold status.
- **REQ-010**: The mobile app shall create and edit projects with name, description,
  status, start date, and due date, rejecting a due date earlier than the start date.
- **REQ-011**: The mobile app shall show project details including dates, task totals,
  completed-task totals, progress, and member access.
- **REQ-012**: The mobile app shall allow an authorized project owner/manager to delete
  a project and confirm the destructive action.

### Tasks

- **REQ-013**: The mobile app shall list tasks and support search by task title,
  description, or project name.
- **REQ-014**: The mobile app shall filter tasks by project, to-do/in-progress/
  completed status, and low/medium/high/urgent priority.
- **REQ-015**: The mobile app shall create and edit tasks with project, title,
  description, assignee, status, priority, and due date.
- **REQ-016**: The mobile app shall load project members when selecting an assignee
  and support an unassigned task.
- **REQ-017**: The mobile app shall show task details and allow authorized users to
  delete a task after confirmation.

### Collaboration and invitations

- **REQ-018**: The mobile app shall show a deduplicated team directory with each
  member's name, email, avatar, projects, and project-specific role.
- **REQ-019**: The mobile app shall search team members by name/email and filter by
  role and project.
- **REQ-020**: An authorized owner/manager shall be able to invite a member by email
  to a project.
- **REQ-021**: An authorized owner/manager shall be able to change a non-owner's role
  between member and manager, or remove that member from a project.
- **REQ-022**: The mobile app shall list pending project invitations and allow the
  invitee to accept or reject them.

### Activity and notifications

- **REQ-023**: The mobile app shall display project, task, invitation, and membership
  activity with actor, project, description, and relative time.
- **REQ-024**: The mobile app shall filter activity by project, event type, from date,
  and to date, validate the date range, refresh the feed, and paginate results.
- **REQ-025**: The mobile app shall show notification unread count, list notifications,
  mark one notification read, mark all read, and refresh/poll for updates.
- **REQ-026**: Notification invitation actions shall update the notification state and
  handle failures visibly.

### GitHub integration

- **REQ-027**: The mobile app shall show GitHub connection status and allow connect or
  disconnect.
- **REQ-028**: The mobile app shall sync and browse GitHub repositories with search,
  public/private visibility filtering, and pagination.
- **REQ-029**: The mobile app shall show repository details including visibility,
  language, stars, forks, default branch, description, and an external GitHub link.
- **REQ-030**: The mobile app shall import a repository into a selected TeamForge
  project and report success or failure.

### Preferences and reliability

- **REQ-031**: The mobile app shall support system, light, and dark theme preferences
  and apply the preference across the app.
- **REQ-032**: Every API-backed mobile screen shall expose loading, empty, validation,
  permission, connection, and server-error states consistent with the existing
  `apiErrorMessage` behavior.
- **REQ-033**: Destructive actions shall require confirmation and successful mutations
  shall refresh or update the affected local view.

## Web API contract map

The mobile implementation should reuse the existing Laravel API paths. The web
clients document these endpoints:

| Area | Endpoints |
|---|---|
| Auth/account | `POST /register`, `POST /login`, `GET /user`, `PATCH /profile`, `POST /profile/photo`, `DELETE /profile/photo`, `POST /logout` |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/{id}` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}` |
| Members | `GET /team-members`, `GET /projects/{id}/members`, `PATCH/DELETE /projects/{id}/members/{userId}` |
| Invitations | `GET /invitations`, `POST /projects/{id}/invitations`, `POST /invitations/{id}/accept`, `POST /invitations/{id}/reject` |
| Activity | `GET /activities` with project/type/from/to/page/per_page query parameters |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` |
| GitHub | `GET /github/status`, `GET /github/connect`, `DELETE /github/connect`, `POST /github/repositories/sync`, `GET /github/repositories`, `GET /github/repositories/{owner}/{name}`, `POST /github/repositories/{owner}/{name}/import` |

## Current mobile baseline

### Already available

- Riverpod application scope and GoRouter shell.
- Dio client with configurable API base URL.
- Secure bearer-token storage.
- Unauthorized-token cleanup.
- Shared API error message mapping.
- `cached_network_image` and `image_picker` dependencies suitable for avatars.
- Bottom navigation for Home, Projects, Tasks, Notifications, and Profile.

### Missing or incomplete

- Login, registration, protected routing, and auth state provider.
- API data models/repositories for all web domains.
- All CRUD forms and detail routes.
- Team members and project-member management.
- Activity feed and filters.
- GitHub integration.
- Theme settings screen and persisted theme preference.
- Real notification data/actions; current notifications screen is a placeholder.
- Dashboard implementation; current home screen is a placeholder.

## Recommended implementation order

1. **Foundation**: auth provider, login/register routes, protected routing, shared
   async/error state widgets, API models and repositories.
2. **Core workspace**: projects list/detail/CRUD and tasks list/detail/CRUD.
3. **Dashboard**: real counts, previews, task search, and completion toggle.
4. **Collaboration**: project members, team directory, invitations, role changes,
   and member removal.
5. **Notifications/activity**: notification actions and activity filters/pagination.
6. **Account**: profile editing/avatar management, theme settings, and logout.
7. **GitHub**: OAuth handoff, connection status, repository list/detail, sync, and
   import flow.
8. **Parity validation**: verify every requirement above against the same API with
   authenticated owner, manager, member, and invitee scenarios.

## Important parity notes

- The web dashboard intentionally displays `—` for team-member count and hours
  tracked; those are not implemented web features and should not be invented on
  mobile.
- The web help-center action only shows “Help center is coming soon”; it is not a
  mobile parity requirement.
- The web profile page cannot change an email address; mobile should display it as
  read-only.
- Project and member permissions are project-specific. Do not treat a user's role
  in one project as their role everywhere.
- The mobile app should use secure storage, not browser-style local storage, for the
  bearer token.

## Source evidence

- Web route composition: `teamforge-web/src/main.tsx`
- Dashboard behavior: `teamforge-web/src/App.tsx`
- Project behavior: `teamforge-web/src/pages/ProjectsPage.tsx`
- Task behavior: `teamforge-web/src/pages/TasksPage.tsx`
- Team/member behavior: `teamforge-web/src/pages/TeamMembersPage.tsx`,
  `teamforge-web/src/components/ProjectMembersPanel.tsx`, and
  `teamforge-web/src/components/InvitationsPanel.tsx`
- Activity behavior: `teamforge-web/src/pages/ActivityPage.tsx`
- Notification behavior: `teamforge-web/src/components/NotificationBell.tsx`
- GitHub behavior: `teamforge-web/src/pages/GitHubRepositoriesPage.tsx`,
  `teamforge-web/src/pages/GitHubRepositoryDetailsPage.tsx`, and related GitHub
  components
- API contracts: `teamforge-web/src/api/*.ts` and `teamforge-web/src/services/api.ts`
- Mobile baseline: `teamforge-mobile/lib/routing/app_router.dart`,
  `teamforge-mobile/lib/routing/app_shell.dart`, and
  `teamforge-mobile/lib/core/network/api_client.dart`

