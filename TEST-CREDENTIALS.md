# TeamForge QA Test Credentials

> **Scope:** Local/development QA only. Do not use these credentials in production,
> staging, Render, Supabase, or any internet-accessible environment.

## Application roles

TeamForge does not currently define global site-wide roles such as `admin` or
`superadmin`. Roles are assigned per project:

| Role | How the role is assigned | QA purpose |
|---|---|---|
| `owner` | Automatically assigned to the user who creates a project | Test full project management, member management, invitations, and project deletion |
| `manager` | Assigned by the project owner; valid values can be set through the member-management flow | Test project/member administration and task management |
| `member` | Default role for an invited user | Test normal collaboration, assigned tasks, notifications, and restricted actions |

### Role behavior

- Owners and managers can perform administrative project actions.
- Members have normal collaboration access but cannot perform owner/manager-only
  actions.
- A user may have different roles on different projects.
- The `owner` role is not a separate login account or global permission level.

## Available seeded QA account

The current `DatabaseSeeder` creates this account:

| Account | Username/email | Password | Initial role |
|---|---|---|---|
| Seeded test user | `test@example.com` | `password` | `owner` of projects created by this user |

The password is defined by the default `UserFactory` state. The seeded account
does not automatically have a project membership until it creates a project.
When it creates a project, it becomes that project's owner.

## Additional factory accounts

When tests or local development create users through `User::factory()`, the
factory uses:

| Username/email | Password | Role |
|---|---|---|
| Generated unique email | `password` | No project role until added to a project |

Factory-generated email addresses are random and should be read from the test
output or database when needed.

## Recommended QA setup for all roles

Use the seeded account to create a project, then register two additional local
accounts through the application:

| QA account | Suggested email | Suggested password | Assign on the test project |
|---|---|---|---|
| Owner | `test@example.com` | `password` | `owner` |
| Manager | `qa.manager@example.test` | `QaManager!2026` | `manager` |
| Member | `qa.member@example.test` | `QaMember!2026` | `member` |

These two suggested accounts are **not currently seeded by the application**.
Create them through the registration screen/API before testing their role
behavior. Registration requires a password of at least eight characters and a
matching confirmation value.

## Useful QA flows

1. Log in as `test@example.com` / `password`.
2. Create a project; this account becomes the project owner.
3. Register the manager and member accounts listed above.
4. Invite both accounts to the project.
5. As the owner, assign `manager` to the manager account and leave the member
   account as `member`.
6. Verify that:
   - owner and manager can manage project work;
   - the member can access permitted collaboration features;
   - the member cannot perform owner/manager-only actions;
   - the same user can have different roles on different projects.

## Security notes

- These credentials are intentionally simple test credentials.
- Do not commit real database, Supabase, mail, AWS, or API secrets to this
  document.
- Change or remove the seeded password before deploying any shared environment.
- The `.env` file may contain sensitive infrastructure credentials; keep it
  private and provide deployment values through the hosting provider's secret
  configuration.
