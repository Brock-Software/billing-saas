# Variables to replace
apple_domain = `<your.apple.id>`
domain = `forgetyourbudget.com`
app_name = `forgetyourbudget`
app_display_name =`forgetyourbudget`
organization = `brock-software`
primary_region = `atl`
primary_fly_vm_id = `<your_app_machine_id>`

### Getting started

1. Create .env file & copy over all values from .env.example
2. Install dependencies w/ `bun install`
3. Migrate the database `bunx prisma migrate dev`
4. Begin development

### Deploying for the first time

- Launch your app on Fly
- Setup Github Action secrets
   - Fly token
   - AWS access token and secret token (for console.tigris.dev)
- Setup Fly Secrets using `fly secrets set` (all secrets in your .env)
   - [Core env variables](https://github.com/epicweb-dev/epic-stack/blob/main/docs/deployment.md)
   - Add any extra secrets you need
- Deploy your app
- Setup the domain on Fly
- (if needed) setup [Resend](https://resend.com) to send emails (use the email in your .env/secret on fly)
- Update the `scripts/backup` & `scripts/restore-latest-backup` script to use (any) one of your machine ids (line 5) and app name

# Database Troubleshooting

## Backups

All backups are automated (if the aws variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` are in github action secrets).
They will happen daily.

## Restore

To restore the latest database in case of emergency, run the following commands:

```
fly ssh console -C "./scripts/restore-latest-backup.sh"
```

# Code Troubleshooting

## Code Rollback

```bash
fly deploy -i `fly releases -j | jq ".[1].ImageRef" -r`
```

Run `fly releases --image` to see the latest images released if you need to
cherry-pick. Only code changes will create a new image (setting or removing
secrets won't create a new image, etc.)
