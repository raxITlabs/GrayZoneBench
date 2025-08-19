# Gray Zone Bench - Dashboard Site

A Next.js dashboard application for visualizing and analyzing AI safety benchmark results from the Gray Zone Bench project by raxit.ai.

## Features

- Interactive data visualization with Nivo charts
- Model performance comparison dashboards
- Detailed evaluation results with rationale formatting
- Responsive design with dark/light theme support
- Real-time data fetching from Google Cloud Storage
- Gray zone evaluation metrics and analysis

## Prerequisites

- Node.js 18+ 
- pnpm (preferred package manager)
- Google Cloud Storage access (for data fetching)

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google Cloud Storage Configuration
GCS_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
GCS_BUCKET_NAME=your-bucket-name

# Optional: Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1
```

### Setting up Google Cloud Storage

1. Create a Google Cloud project and enable the Storage API
2. Create a service account with Storage Object Viewer permissions
3. Download the service account JSON key
4. Set `GCS_SERVICE_ACCOUNT` to the entire JSON content (as a single line string)
5. Set `GCS_BUCKET_NAME` to your GCS bucket name containing the Gray Zone Bench data

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables (see Environment Setup above)

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the dashboard

The page auto-updates as you edit files in the `app/` directory.

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `components/` - React components organized by feature
- `lib/` - Utility functions and configurations
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions

## Deployment

This project is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Set the required environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

Run the validation script to check deployment readiness:
```bash
node scripts/validate-deployment.js
```
