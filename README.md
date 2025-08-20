# NATS Documentation

[![Deploy to GitHub Pages](https://github.com/nats-io/nats.docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/nats-io/nats.docs/actions/workflows/deploy.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)

This is the official documentation site for NATS, built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

This site supports multiple deployment options:

### Automatic Deployments

#### Production (GitHub Pages)
- **Automatic**: Pushes to `main` branch trigger deployment
- **URL**: Configure in GitHub Settings → Pages

#### PR Previews
- **Netlify**: Each PR gets a unique preview URL
- **Vercel**: Alternative preview deployment option

See [.github/workflows/README.md](.github/workflows/README.md) for setup instructions.

### Manual Deployment

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

## Development

### Requirements
- Node.js 18+ 
- npm 8+

### Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Build for production: `npm run build`

### Project Structure
- `/docs` - Documentation content (Markdown/MDX)
- `/src` - React components and custom pages
- `/static` - Static assets (images, fonts)
- `/nats-branding` - Official NATS brand assets
