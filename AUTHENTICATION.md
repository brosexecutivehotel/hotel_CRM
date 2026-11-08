# Staff authentication

The application is linked to the `bros-executive-hotel` Clerk application and currently uses its **development** instance. Production Clerk credentials have not been configured.

The application uses Clerk for staff sign-in. `/` sends each authenticated staff member to the dashboard assigned to their Clerk role:

| Clerk `privateMetadata.role` | Dashboard |
| --- | --- |
| `management` | `/management` |
| `front_desk` | `/front-desk` |
| `crm` | `/crm` |

Set the `role` value in the user's **private metadata** in the Clerk Dashboard. Do not use public metadata or user-editable profile fields for authorization. Dashboard pages validate the role server-side; an authenticated user without an assigned role is sent to `/access-pending`, and users opening another role's dashboard are redirected to their own.

Staff accounts are invitation-only in this application. Create or invite staff from the Clerk Dashboard, then assign each user's private role metadata. The `/sign-up` page intentionally does not create accounts.

The Clerk CLI stores development credentials in `.env.local`. Keep that file out of version control. For production, create/configure a Clerk production instance and set the variables listed in `.env.example` as deployment secrets; never commit Clerk keys.

The role values above select a dashboard only. As additional hotel modules and APIs are implemented, enforce their individual permissions at the server-side data and mutation boundaries as well.
