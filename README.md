# Variables to replace
apple_domain = `<your.apple.id>`
domain = `billing-saas`
app_name = `billing-saas`
app_display_name =`billing-saas`
organization = `brock-software`
primary_region = `atl`
primary_fly_vm_id = `<your_app_machine_id>`

### Getting started

1. Create .env file & copy over all values from .env.example
2. Install dependencies w/ `bun install`
3. Migrate the database `bunx prisma migrate dev`
4. Begin development

### Deploying for the first time

- Launch your app on Fly with `fly launch` > Select 'y' to configure settings
  - In the browser popup, select the correct organization
  - Select 'n' when asked if you want to create a .dockerignore
  - Select 'save' (or 'confirm' or whatever)
  - Back in the terminal, exit the deployment with ctrl+c (we don't need to do this yet, we'll do it shortly)
- Delete the Dockerfile that was created (we already have one in the `other/` folder)
- Setup the fly deploy token in Github
  - Create a new "Production" environment under Settings (if one doesn't already exist)
  - Create new environment secrets
    - FLY_AUTH_TOKEN = Run `fly tokens create deploy` in the terminal and use the output token
    - AWS_ACCESS_KEY_ID = Visit console.tigris.dev, create a bucket under the right org, and then create an Access Key - use the key id here, and save the value in the repo .env file
    - AWS_SECRET_ACCESS_KEY = See access key id instructions ^ - use the access secret key here, and save the value in the repo .env file
- Setup Fly Secrets with `fly secrets set` (all secrets in your .env)
   - Required secrets: `fly secrets set SESSION_SECRET=$(openssl rand -hex 32) INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32) HONEYPOT_SECRET=$(openssl rand -hex 32)`
   - AWS Secrets: `fly secrets set AWS_ACCESS_KEY_ID=<value_from_prev_step> AWS_SECRET_ACCESS_KEY=<value_from_prev_step>`
   - Add any extra secrets you need
- Deploy your app with `fly deploy` (or push to main)
- Setup the domain on Fly
- Setup [Resend](https://resend.com) to send emails (use the email in your .env/secret on fly)
- Update the `scripts/backup` & `scripts/restore-latest-backup` script to use (any) one of your machine ids (line 5), app name, and Tigris bucket name (should be the same as app name)

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
